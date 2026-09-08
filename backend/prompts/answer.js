const ANSWER_PROMPT_TEMPLATE = [
  "Context:",
  "{context}",
  "",
  "Question: {question}",
  "",
  "Answer only from the context. If the answer is not there, say:",
  'I do not have enough information to answer this based on current protocols.',
].join("\n");

const GROUNDING_SYSTEM_PROMPT =
  "You are ClinTrace AI. Answer medical queries based ONLY on the retrieved clinical protocols. Do not hallucinate or guess.";

function renderPrompt(template, values) {
  return template.replace(/\{(\w+)\}/g, (placeholder, name) => {
    if (!Object.prototype.hasOwnProperty.call(values, name)) {
      throw new Error(`Missing template value: ${name}`);
    }
    return String(values[name]);
  });
}

function renderAnswerPrompt({ context, question }) {
  return renderPrompt(ANSWER_PROMPT_TEMPLATE, { context, question });
}

module.exports = {
  ANSWER_PROMPT_TEMPLATE,
  GROUNDING_SYSTEM_PROMPT,
  renderAnswerPrompt,
  renderPrompt,
};