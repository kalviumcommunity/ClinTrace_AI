const test = require("node:test");
const assert = require("node:assert/strict");
const {
  PREPARED_CORPUS,
  embedCorpus,
  getEmbeddingConfig,
  verificationOutput,
} = require("./embed-corpus");

function mockClient(vectorLength = 4) {
  return {
    embeddings: {
      create: async ({ model, input }) => ({
        data: input.map((_, index) => ({
          index,
          embedding: Array.from({ length: vectorLength }, (_, value) => value / 10),
          model,
        })),
      }),
    },
  };
}

test("reads embedding settings from environment configuration", () => {
  const config = getEmbeddingConfig({
    OPENAI_API_KEY: "test-key",
    OPENAI_BASE_URL: "https://example.test/v1",
    EMBEDDING_MODEL: "text-embedding-test",
    EMBEDDING_DIMENSIONS: "4",
  });

  assert.deepEqual(config, {
    apiKey: "test-key",
    baseURL: "https://example.test/v1",
    model: "text-embedding-test",
    expectedDimension: 4,
  });
});

test("embeds and stores source text, metadata, and vectors", async () => {
  const records = await embedCorpus(PREPARED_CORPUS, mockClient(), {
    model: "text-embedding-test",
    expectedDimension: 4,
  });

  assert.equal(records.length, 2);
  assert.equal(records[0].embedding.length, 4);
  assert.equal(records[0].text, PREPARED_CORPUS[0].text);
  assert.deepEqual(records[0].metadata, PREPARED_CORPUS[0].metadata);
  assert.deepEqual(verificationOutput(records), {
    chunks_embedded: 2,
    vector_length: 4,
    samples: [
      {
        text: PREPARED_CORPUS[0].text,
        metadata: PREPARED_CORPUS[0].metadata,
        vector_length: 4,
        vector_preview: [0, 0.1, 0.2, 0.3],
      },
      {
        text: PREPARED_CORPUS[1].text,
        metadata: PREPARED_CORPUS[1].metadata,
        vector_length: 4,
        vector_preview: [0, 0.1, 0.2, 0.3],
      },
    ],
  });
});

test("rejects an unexpected vector dimension", async () => {
  await assert.rejects(
    embedCorpus(PREPARED_CORPUS, mockClient(3), {
      model: "text-embedding-test",
      expectedDimension: 4,
    }),
    /dimension mismatch/,
  );
});