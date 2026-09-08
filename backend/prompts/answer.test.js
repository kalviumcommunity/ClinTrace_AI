const test = require("node:test");
const assert = require("node:assert/strict");
const {
  ANSWER_PROMPT_TEMPLATE,
  renderAnswerPrompt,
  renderPrompt,
} = require("./answer");

test("renders named context and question placeholders", () => {
  assert.equal(
    renderAnswerPrompt({
      context: "Refunds are available within 30 days.",
      question: "How long is the refund window?",
    }),
    "Context:\nRefunds are available within 30 days.\n\nQuestion: How long is the refund window?\n\nAnswer only from the context. If the answer is not there, say:\nI do not have enough information to answer this based on current protocols.",
  );
});

test("fails clearly when a named placeholder has no value", () => {
  assert.throws(
    () => renderPrompt(ANSWER_PROMPT_TEMPLATE, { context: "Only context" }),
    /Missing template value: question/,
  );
});