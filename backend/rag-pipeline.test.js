const test = require("node:test");
const assert = require("node:assert/strict");
const {
  assembleStage,
  createGenerationRequest,
  embedStage,
  generateStage,
  loadPipelineFixture,
  retrieveStage,
  runRagPipeline,
} = require("./rag-pipeline");

function sampleClient() {
  return {
    embeddings: { create: async () => ({ data: [{ embedding: [0.98, 0.1, 0] }] }) },
    chat: {
      completions: {
        create: async (request) => ({ choices: [{ message: { content: `Grounded answer for ${request.model}. [1]` } }] }),
      },
    },
  };
}

test("keeps embed, retrieve, assemble, and generate stages independently testable", async () => {
  const query = "What is required before indexing a patient record?";
  const client = sampleClient();
  const embedding = await embedStage(query, { client, model: "test-model" });
  const retrieval = retrieveStage(query, embedding, { vectorStore: loadPipelineFixture(), k: 2, candidateK: 3 });
  const assembled = assembleStage(query, retrieval.results, { modelContextTokens: 256, maxAnswerTokens: 48 });
  const generated = await generateStage(assembled, { client, model: "test-model", maxAnswerTokens: 48 });

  assert.equal(embedding.length, 3);
  assert.equal(retrieval.results[0].source, "intake-policy.md");
  assert.match(assembled.context, /\[1\] Source: intake-policy\.md/);
  assert.ok(assembled.tokenBudget.totalReservedTokens <= 256);
  assert.match(generated.answer, /Grounded answer/);
});

test("runs the complete query-to-answer flow and returns sources", async () => {
  const result = await runRagPipeline("What is required before indexing a patient record?", {
    client: sampleClient(),
    model: "test-model",
    vectorStore: loadPipelineFixture(),
    k: 2,
    candidateK: 3,
    modelContextTokens: 256,
    maxAnswerTokens: 48,
  });

  assert.match(result.answer, /Grounded answer/);
  assert.deepEqual(result.sources, [
    { marker: "[1]", source: "intake-policy.md" },
    { marker: "[2]", source: "discharge-guide.md" },
  ]);
  assert.equal(result.stages.embed.vectorLength, 3);
  assert.equal(result.stages.retrieve.results.length, 2);
});

test("builds a generation request with grounded system and user messages", () => {
  const request = createGenerationRequest("Context:\n[1] evidence", "test-model", 48);
  assert.equal(request.model, "test-model");
  assert.equal(request.max_tokens, 48);
  assert.equal(request.temperature, 0);
  assert.equal(request.messages.length, 2);
  assert.match(request.messages[1].content, /\[1\] evidence/);
});