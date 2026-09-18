const fs = require("node:fs");
const path = require("node:path");
const {
  cosineSimilarity,
  rankChunks,
} = require("./embedding-sanity-check");
const { rerankCandidates } = require("./vector-store-retrieval");

const DEFAULT_K_VALUES = [1, 2];

function chunkId(chunk) {
  return `${chunk.metadata.source_document}#${chunk.metadata.chunk_index}`;
}

function rankWithIds(queryEmbedding, chunks) {
  return rankChunks(queryEmbedding, chunks).map((result) => {
    const matchingChunk = chunks.find((chunk) => chunkId(chunk) === `${result.metadata.source_document}#${result.metadata.chunk_index}`);
    return {
      ...result,
      text: matchingChunk.text,
      chunk_id: `${result.metadata.source_document}#${result.metadata.chunk_index}`,
    };
  });
}

function rankWithReranking(query, vectorRanking) {
  return rerankCandidates(query, vectorRanking.map((result) => ({
    ...result,
  }))).map((result) => ({
    ...result,
    chunk_id: chunkId({ metadata: result.metadata }),
  }));
}

function metricAtK(ranking, expectedChunkIds, k) {
  const expected = new Set(expectedChunkIds);
  const retrieved = ranking.slice(0, k);
  const relevantRetrieved = retrieved.filter((result) => expected.has(result.chunk_id)).length;
  return {
    k,
    relevant_retrieved: relevantRetrieved,
    recall: Number((relevantRetrieved / expected.size).toFixed(3)),
    precision: Number((relevantRetrieved / k).toFixed(3)),
  };
}

function summarizeMetrics(results, stage, kValues) {
  return kValues.reduce((summary, k) => {
    const metrics = results.map((result) => result[stage].metrics.find((metric) => metric.k === k));
    summary[`recall_at_${k}`] = Number(
      (metrics.reduce((total, metric) => total + metric.recall, 0) / metrics.length).toFixed(3),
    );
    summary[`precision_at_${k}`] = Number(
      (metrics.reduce((total, metric) => total + metric.precision, 0) / metrics.length).toFixed(3),
    );
    return summary;
  }, {});
}

function runRetrievalEvaluation({ chunks, queries, kValues = DEFAULT_K_VALUES }) {
  const results = queries.map((query) => {
    const vectorRanking = rankWithIds(query.embedding, chunks);
    const reranked = rankWithReranking(query.text, vectorRanking);
    const expected = query.expected_chunk_ids;
    return {
      id: query.id,
      query: query.text,
      expected_chunk_ids: expected,
      vector_only: {
        top_results: vectorRanking.slice(0, Math.max(...kValues)).map((result) => ({
          rank: result.rank,
          chunk_id: result.chunk_id,
          source: result.source,
          score: Number(result.score.toFixed(6)),
        })),
        metrics: kValues.map((k) => metricAtK(vectorRanking, expected, k)),
      },
      reranked: {
        top_results: reranked.slice(0, Math.max(...kValues)).map((result) => ({
          rank: result.rank,
          chunk_id: result.chunk_id,
          source: result.metadata.source_document,
          combined_score: result.combined_score,
        })),
        metrics: kValues.map((k) => metricAtK(reranked, expected, k)),
      },
      note: query.likely_cause,
    };
  });

  const failure_analysis = results.flatMap((result) => {
    const vectorMiss = result.vector_only.metrics.some((metric) => metric.recall < 1);
    const rerankerMiss = result.reranked.metrics.some((metric) => metric.recall < 1);
    if (!vectorMiss && !rerankerMiss) return [];
    return [{
      id: result.id,
      failed_stage: rerankerMiss ? "reranked" : "vector_only",
      likely_cause: result.note,
      observed: vectorMiss && !rerankerMiss
        ? "Vector ranking missed the expected chunk, but lexical reranking recovered it."
        : "The expected chunk was still absent from the evaluated ranking.",
      improvement: "Use richer labelled data, query decomposition, and embedding-model checks before production rollout.",
    }];
  });

  return {
    query_count: results.length,
    k_values: kValues,
    metrics: {
      vector_only: summarizeMetrics(results, "vector_only", kValues),
      reranked: summarizeMetrics(results, "reranked", kValues),
    },
    results,
    failure_analysis,
  };
}

function loadEvaluationInputs() {
  const fixture = JSON.parse(fs.readFileSync(
    path.join(__dirname, "embedding-sanity-fixture.json"),
    "utf8",
  ));
  const labels = JSON.parse(fs.readFileSync(
    path.join(__dirname, "labelled-retrieval-queries.json"),
    "utf8",
  ));
  return { chunks: fixture.chunks, queries: labels.queries };
}

function writeEvaluationReport(report) {
  const reportPath = path.join(__dirname, "retrieval-evaluation-results.json");
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return reportPath;
}

if (require.main === module) {
  const report = runRetrievalEvaluation(loadEvaluationInputs());
  const reportPath = writeEvaluationReport(report);
  console.log(JSON.stringify(report, null, 2));
  console.log(`Wrote ${reportPath}`);
}

module.exports = {
  loadEvaluationInputs,
  metricAtK,
  runRetrievalEvaluation,
  summarizeMetrics,
};