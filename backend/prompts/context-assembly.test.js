const test = require("node:test");
const assert = require("node:assert/strict");
const {
  assembleGroundedPrompt,
  countChatTokens,
  formatRetrievedChunks,
} = require("./context-assembly");

const chunks = [
  {
    text: "Consent must be recorded before account processing begins.",
    metadata: { source_document: "intake-policy.md" },
  },
  {
    text: "The billing policy describes a separate review process.",
    metadata: { source_document: "billing-policy.md" },
  },
];

test("formats retrieved chunks with stable source markers", () => {
  assert.equal(
    formatRetrievedChunks(chunks),
    "[1] Source: intake-policy.md\nConsent must be recorded before account processing begins.\n\n[2] Source: billing-policy.md\nThe billing policy describes a separate review process.",
  );
});

test("assembles a grounded prompt and reserves answer tokens", () => {
  const result = assembleGroundedPrompt({
    question: "What must happen before account processing?",
    retrievedChunks: chunks,
    modelContextTokens: 256,
    maxAnswerTokens: 48,
  });

  assert.match(result.prompt, /\[1\] Source: intake-policy\.md/);
  assert.match(result.prompt, /Answer only from the context/);
  assert.equal(result.selectedChunks.length, 2);
  assert.equal(result.tokenBudget.totalReservedTokens, result.tokenBudget.promptTokens + 48);
  assert.ok(result.tokenBudget.totalReservedTokens <= 256);
});

test("truncates lower-ranked context when the budget is tight", () => {
  const result = assembleGroundedPrompt({
    question: "What is the policy?",
    retrievedChunks: chunks.map((chunk) => ({ ...chunk, text: `${chunk.text} `.repeat(30) })),
    modelContextTokens: 150,
    maxAnswerTokens: 32,
  });

  assert.ok(result.selectedChunks.length >= 1);
  assert.ok(result.selectedChunks[0].truncated);
  assert.ok(result.omittedChunks.length >= 1);
  assert.ok(countChatTokens(result.prompt) + 32 <= 150);
});