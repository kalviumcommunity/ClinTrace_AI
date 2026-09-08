require("dotenv").config();

const OpenAI = require("openai");

const PREPARED_CORPUS = [
  {
    text: "Consent is required before a patient record can be indexed.",
    metadata: { source_document: "intake-policy.md", chunk_index: 0, section: "Consent" },
  },
  {
    text: "After consent, the record is normalized and sent to retrieval.",
    metadata: { source_document: "intake-policy.md", chunk_index: 1, section: "Indexing" },
  },
];

function getEmbeddingConfig(environment = process.env) {
  const missing = ["OPENAI_API_KEY", "EMBEDDING_MODEL"].filter(
    (name) => !environment[name],
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}`,
    );
  }

  return {
    apiKey: environment.OPENAI_API_KEY,
    baseURL: environment.OPENAI_BASE_URL,
    model: environment.EMBEDDING_MODEL,
    expectedDimension: environment.EMBEDDING_DIMENSIONS
      ? Number(environment.EMBEDDING_DIMENSIONS)
      : undefined,
  };
}

function createEmbeddingClient({ apiKey, baseURL }) {
  return new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
}

async function embedCorpus(chunks, client, { model, expectedDimension } = {}) {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    throw new Error("At least one prepared chunk is required");
  }
  if (!client?.embeddings?.create || !model) {
    throw new Error("An embeddings client and model are required");
  }

  const response = await client.embeddings.create({
    model,
    input: chunks.map((chunk) => chunk.text),
  });
  const vectors = response?.data;

  if (!Array.isArray(vectors) || vectors.length !== chunks.length) {
    throw new Error("Embedding API returned an unexpected number of vectors");
  }

  const vectorLength = vectors[0]?.embedding?.length;
  if (!Number.isInteger(vectorLength) || vectorLength === 0) {
    throw new Error("Embedding API returned an invalid vector");
  }
  if (expectedDimension !== undefined && vectorLength !== expectedDimension) {
    throw new Error(
      `Embedding dimension mismatch: expected ${expectedDimension}, received ${vectorLength}`,
    );
  }

  return chunks.map((chunk, index) => {
    const embedding = vectors[index]?.embedding;
    if (!Array.isArray(embedding) || embedding.length !== vectorLength) {
      throw new Error("Embedding API returned inconsistent vector dimensions");
    }

    return {
      text: chunk.text,
      metadata: chunk.metadata,
      embedding,
    };
  });
}

function verificationOutput(records, previewLength = 5) {
  const vectorLength = records[0]?.embedding?.length ?? 0;
  return {
    chunks_embedded: records.length,
    vector_length: vectorLength,
    samples: records.slice(0, 3).map((record) => ({
      text: record.text,
      metadata: record.metadata,
      vector_length: record.embedding.length,
      vector_preview: record.embedding.slice(0, previewLength),
    })),
  };
}

async function runEmbeddingDemo() {
  const config = getEmbeddingConfig();
  const client = createEmbeddingClient(config);
  const records = await embedCorpus(PREPARED_CORPUS, client, config);
  console.log(JSON.stringify(verificationOutput(records), null, 2));
  return records;
}

if (require.main === module) {
  runEmbeddingDemo().catch((error) => {
    console.error(`Embedding failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  PREPARED_CORPUS,
  createEmbeddingClient,
  embedCorpus,
  getEmbeddingConfig,
  runEmbeddingDemo,
  verificationOutput,
};