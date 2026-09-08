const test = require("node:test");
const assert = require("node:assert/strict");
const {
  policyContext,
  promptVariations,
} = require("./prompt-comparison");
const { renderAnswerPrompt } = require("./prompts/answer");

test("the batch feature renders its prompts through the shared template", () => {
  assert.equal(
    promptVariations[0].content,
    renderAnswerPrompt({
      context: policyContext,
      question: "Explain our refund policy.",
    }),
  );
  assert.match(promptVariations[1].content, /Question: In one sentence/);
});