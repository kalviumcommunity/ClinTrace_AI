const test = require("node:test");
const assert = require("node:assert/strict");
const { prepareMessagesForLLM } = require("./historyManager");
const { renderAnswerPrompt } = require("./prompts/answer");

test("the chat path reuses the shared answer template", () => {
  const context = "The protocol allows a 30-day refund window.";
  const question = "What is the refund window?";
  const messages = prepareMessagesForLLM(question, [], 3000, context);

  assert.equal(messages[0].role, "system");
  assert.equal(
    messages[1].content,
    renderAnswerPrompt({ context, question }),
  );
});