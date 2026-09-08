const test = require("node:test");
const assert = require("node:assert/strict");
const { buildRagRequest, parseRagResponse } = require("./structured-output");

test("builds a request with a strict JSON response schema", () => {
  const request = buildRagRequest("What is RAG?", "RAG retrieves relevant context.");

  assert.equal(request.response_format.type, "json_schema");
  assert.deepEqual(request.response_format.json_schema.schema.required, ["answer", "source"]);
  assert.match(request.messages[0].content, /only valid JSON/i);
});

test("parses a valid model response into a usable object", () => {
  const result = parseRagResponse({
    choices: [{ message: { content: '{"answer":"RAG retrieves context.","source":"docs/rag.md"}' } }],
  });

  assert.deepEqual(result, {
    ok: true,
    data: { answer: "RAG retrieves context.", source: "docs/rag.md" },
    recovered: false,
  });
});

test("recovers JSON surrounded by model prose and reports recovery", () => {
  const result = parseRagResponse(
    'Here is the result:\n```json\n{"answer":"Use retrieved context.","source":"guide.md"}\n```',
  );

  assert.equal(result.ok, true);
  assert.equal(result.recovered, true);
  assert.deepEqual(result.data, {
    answer: "Use retrieved context.",
    source: "guide.md",
  });
});

test("handles malformed JSON without throwing", () => {
  const result = parseRagResponse("{answer: not valid JSON}");

  assert.equal(result.ok, false);
  assert.match(result.error, /Malformed JSON/);
});

test("rejects responses missing required fields", () => {
  const result = parseRagResponse('{"answer":"An answer without a citation"}');

  assert.equal(result.ok, false);
  assert.match(result.error, /source/);
});