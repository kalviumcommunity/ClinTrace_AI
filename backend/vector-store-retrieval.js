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
  const query = "What is required before indexing a patient record?";
  const results = [];

  for (const k of [1, 2]) {
    results.push(await retrieveTopK(query, { client, model: config.model, vectorStore, k }));
  }

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
  retrieveTopK,
  runRetrievalDemo,
};