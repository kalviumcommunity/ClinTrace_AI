require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const OpenAI = require("openai");
const { cosineSimilarity } = require("./embedding-sanity-check");

class InMemoryVectorStore {
  constructor(records, embeddingModel) {
    if (!Array.isArray(records) || records.length === 0) {
      throw new Error("A vector store requires at least one record");
    }
    if (!embeddingModel) throw new Error("A document embedding model is required");

    this.records = records;
    this.embeddingModel = embeddingModel;
  }

  search(queryEmbedding, k) {
    if (!Number.isInteger(k) || k <= 0) throw new Error("k must be a positive integer");

    return this.records
      .map((record) => ({
        text: record.text,
        metadata: record.metadata,
        score: cosineSimilarity(queryEmbedding, record.embedding),
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, k)
      .map((result, index) => ({
        ...result,
        rank: index + 1,
        score: Number(result.score.toFixed(6)),
      }));
  }
}

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "before", "does", "for", "how", "is", "of", "the", "what", "when",
]);

function tokenize(text) {
  return new Set(
    text.toLowerCase().match(/[a-z0-9]+/g)?.filter((token) => !STOP_WORDS.has(token)) ?? [],
  );
}

function lexicalRelevance(query, text) {
  const queryTokens = tokenize(query);
  const textTokens = tokenize(text);
  if (queryTokens.size === 0) return 0;

  let matches = 0;
  for (const token of queryTokens) {
    if (textTokens.has(token)) matches += 1;
  }
  return Number((matches / queryTokens.size).toFixed(6));
}

function rerankCandidates(query, candidates) {
  return candidates
    .map((candidate) => {
      const rerankScore = lexicalRelevance(query, candidate.text);
      return {
        ...candidate,
        rerank_score: rerankScore,
        combined_score: Number((candidate.score * 0.2 + rerankScore * 0.8).toFixed(6)),
      };
    })
    .sort((left, right) => right.combined_score - left.combined_score)
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}

function createClient({ apiKey, baseURL }) {
  return new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
}

async function embedQuery(query, client, model) {
  if (!query || !client?.embeddings?.create || !model) {
    throw new Error("A query, embeddings client, and model are required");
  }

  const response = await client.embeddings.create({ model, input: query });
  const embedding = response?.data?.[0]?.embedding;
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error("Embedding API returned an invalid query vector");
  }
  return embedding;
}

async function retrieveTopK(query, { client, model, vectorStore, k }) {
  if (vectorStore.embeddingModel !== model) {
    throw new Error("Query and document embeddings must use the same model");
  }

  const queryEmbedding = await embedQuery(query, client, model);
  return {
    query,
    model,
    query_vector_length: queryEmbedding.length,
    k,
    results: vectorStore.search(queryEmbedding, k),
  };
}

async function retrieveAndRerank(query, {
  client, model, vectorStore, k, candidateK = Math.max(k * 3, 10),
}) {
  if (!Number.isInteger(k) || k <= 0) throw new Error("k must be a positive integer");
  if (!Number.isInteger(candidateK) || candidateK < k) {
    throw new Error("candidateK must be an integer greater than or equal to k");
  }

  const initial = await retrieveTopK(query, {
    client, model, vectorStore, k: candidateK,
  });
  const reranked = rerankCandidates(query, initial.results);

  return {
    ...initial,
    k,
    candidate_k: candidateK,
    candidate_results: initial.results,
    reranked_results: reranked,
    results: reranked.slice(0, k),
  };
}

function loadPreparedVectorStore(model) {
  const fixturePath = path.join(__dirname, "embedding-sanity-fixture.json");
  const { chunks } = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  return new InMemoryVectorStore(chunks, model);
}

async function runRetrievalDemo() {
  const { getEmbeddingConfig } = require("./embed-corpus");
  const config = getEmbeddingConfig();
  const client = createClient(config);
  const vectorStore = loadPreparedVectorStore(config.model);
  const query = "How does consent relate to account processing?";
  const results = await retrieveAndRerank(query, {
    client, model: config.model, vectorStore, candidateK: 3, k: 2,
  });

  console.log(JSON.stringify(results, null, 2));
  return results;
}

if (require.main === module) {
  runRetrievalDemo().catch((error) => {
    console.error(`Retrieval failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  InMemoryVectorStore,
  embedQuery,
  loadPreparedVectorStore,
  lexicalRelevance,
  rerankCandidates,
  retrieveAndRerank,
  retrieveTopK,
  runRetrievalDemo,
};