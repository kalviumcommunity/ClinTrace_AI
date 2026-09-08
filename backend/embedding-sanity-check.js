const fs = require("node:fs");
const path = require("node:path");

function cosineSimilarity(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
    throw new Error("Vectors must be arrays with the same dimension");
  }

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] ** 2;
    rightMagnitude += right[index] ** 2;
  }

  const denominator = Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude);
  if (denominator === 0) throw new Error("Cannot compare a zero vector");
  return dot / denominator;
}

function rankChunks(queryEmbedding, chunks) {
  return chunks
    .map((chunk) => ({
      source: chunk.metadata.source_document,
      metadata: chunk.metadata,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .sort((left, right) => right.score - left.score)
    .map((result, index) => ({ ...result, rank: index + 1 }));
}

function runSanityChecks({ chunks, queries }) {
  const results = queries.map((query) => {
    const ranking = rankChunks(query.embedding, chunks);
    const top = ranking[0];
    return {
      id: query.id,
      query: query.text,
      expected_source: query.expected_source,
      pass: top.source === query.expected_source,
      top_ranked_source: top.source,
      top_score: Number(top.score.toFixed(6)),
      ranking: ranking.map((result) => ({
        rank: result.rank,
        source: result.source,
        score: Number(result.score.toFixed(6)),
      })),
      note: query.note,
    };
  });

  return {
    test_count: results.length,
    pass_count: results.filter((result) => result.pass).length,
    failure_count: results.filter((result) => !result.pass).length,
    results,
  };
}

function loadFixture() {
  const fixturePath = path.join(__dirname, "embedding-sanity-fixture.json");
  return JSON.parse(fs.readFileSync(fixturePath, "utf8"));
}

function writeSanityReport(report) {
  const reportPath = path.join(__dirname, "embedding-sanity-report.json");
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return reportPath;
}

if (require.main === module) {
  const report = runSanityChecks(loadFixture());
  const reportPath = writeSanityReport(report);
  console.log(JSON.stringify(report, null, 2));
  console.log(`Wrote ${reportPath}`);
}

module.exports = { cosineSimilarity, rankChunks, runSanityChecks };