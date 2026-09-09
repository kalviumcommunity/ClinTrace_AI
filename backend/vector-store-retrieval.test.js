const test = require("node:test");
const assert = require("node:assert/strict");
const fixture = require("./embedding-sanity-fixture.json");
const { InMemoryVectorStore, retrieveTopK } = require("./vector-store-retrieval");

function mockClient() {
  return {
    embeddings: {
      create: async ({ input }) => ({
        data: [{
          embedding: input === "What is required before indexing a patient record?"
            ? [0.98, 0.1, 0]
            : [0.1, 0.98, 0],
        }],
      }),
    },
  };
}

test("embeds the query and returns top-k records with scores and metadata", async () => {
  const vectorStore = new InMemoryVectorStore(fixture.chunks, "text-embedding-test");
  const result = await retrieveTopK(
    "What is required before indexing a patient record?",
    { client: mockClient(), model: "text-embedding-test", vectorStore, k: 2 },
  );

  assert.equal(result.query_vector_length, 3);
  assert.equal(result.results.length, 2);
  assert.equal(result.results[0].metadata.source_document, "intake-policy.md");
  assert.equal(result.results[0].text, fixture.chunks[0].text);
  assert.ok(result.results[0].score > result.results[1].score);
});

test("changing k changes the number of retrieved chunks", async () => {
  const vectorStore = new InMemoryVectorStore(fixture.chunks, "text-embedding-test");
  const options = { client: mockClient(), model: "text-embedding-test", vectorStore };
  const query = "What is required before indexing a patient record?";
  const topOne = await retrieveTopK(query, { ...options, k: 1 });
  const topTwo = await retrieveTopK(query, { ...options, k: 2 });

  assert.equal(topOne.results.length, 1);
  assert.equal(topTwo.results.length, 2);
  assert.equal(topOne.results[0].metadata.source_document, topTwo.results[0].metadata.source_document);
});

test("rejects a query model that differs from the document model", async () => {
  const vectorStore = new InMemoryVectorStore(fixture.chunks, "document-model");

  await assert.rejects(
    retrieveTopK("query", { client: mockClient(), model: "different-model", vectorStore, k: 1 }),
    /same model/,
  );
});