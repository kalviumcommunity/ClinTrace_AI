const test = require("node:test");
const assert = require("node:assert/strict");
const {
  INSUFFICIENT_CONTEXT_ANSWER,
  compareRetrievalImpact,
  generateGroundedAnswer,
  verifyGrounding,
} = require("./grounded-answer");
const { createSampleClient, loadPipelineFixture, retrieveStage, embedStage } = require("./rag-pipeline");

const question = "What is required before indexing a patient record?";

async function retrievedChunks() {
  const client = createSampleClient();
  const embedding = await embedStage(question, { client, model: "text-embedding-test" });
  return retrieveStage(question, embedding, {
    vectorStore: loadPipelineFixture(),
    k: 2,
    candidateK: 3,
  }).results;
}

test("accepts a cited answer whose significant terms occur in retrieved chunks", () => {
  const chunks = [{
    text: "Consent is required before a patient record can be indexed.",
    metadata: { source_document: "intake-policy.md" },
  }];
  const result = verifyGrounding("Consent is required before a patient record can be indexed. [1]", chunks);

  assert.equal(result.grounded, true);
  assert.deepEqual(result.citedSources, ["intake-policy.md"]);
  assert.deepEqual(result.unsupportedTerms, []);
});

test("rejects unsupported claims and invalid source markers", () => {
  const chunks = [{
    text: "Consent is required before a patient record can be indexed.",
    metadata: { source_document: "intake-policy.md" },
  }];
  const result = verifyGrounding("Consent is optional and processing is immediate. [2]", chunks);

  assert.equal(result.grounded, false);
  assert.deepEqual(result.citedSources, []);
  assert.ok(result.unsupportedTerms.includes("optional"));
});

test("returns the missing-context fallback without calling generation", async () => {
  const result = await generateGroundedAnswer(question, {
    retrievedChunks: [],
    client: { chat: { completions: { create: async () => { throw new Error("must not generate"); } } } },
    model: "test-model",
  });

  assert.equal(result.answer, INSUFFICIENT_CONTEXT_ANSWER);
  assert.equal(result.fallback, true);
  assert.deepEqual(result.sources, []);
});

test("compares the same question with and without retrieved context", async () => {
  const result = await compareRetrievalImpact(question, {
    retrievedChunks: await retrievedChunks(),
    client: createSampleClient(),
    model: "text-embedding-test",
    modelContextTokens: 256,
    maxAnswerTokens: 48,
  });

  assert.match(result.withRetrieval.answer, /Consent is required/);
  assert.equal(result.withRetrieval.grounding.grounded, true);
  assert.equal(result.withoutRetrieval.answer, INSUFFICIENT_CONTEXT_ANSWER);
  assert.equal(result.withoutRetrieval.fallback, true);
});