const { getEncoding } = require("js-tiktoken");
const {
  GROUNDING_SYSTEM_PROMPT,
  renderAnswerPrompt,
} = require("./answer");

const tokenizer = getEncoding("cl100k_base");
const DEFAULT_MODEL_CONTEXT_TOKENS = 8192;
const DEFAULT_MAX_ANSWER_TOKENS = 256;

function countTokens(text) {
  return tokenizer.encode(String(text)).length;
}

function countChatTokens(userContent) {
  return 4
    + countTokens("system")
    + countTokens(GROUNDING_SYSTEM_PROMPT)
    + 4
    + countTokens("user")
    + countTokens(userContent)
    + 3;
}

function sourceName(chunk, index) {
  return chunk?.metadata?.source_document
    || chunk?.metadata?.source
    || chunk?.metadata?.filename
    || `retrieved-chunk-${index + 1}`;
}

function formatChunk(chunk, index, text = chunk?.text) {
  return `[${index + 1}] Source: ${sourceName(chunk, index)}\n${text}`;
}

function formatRetrievedChunks(chunks) {
  if (!Array.isArray(chunks)) throw new Error("Retrieved chunks must be an array");
  return chunks
    .map((chunk, index) => formatChunk(chunk, index))
    .join("\n\n");
}

function promptFor(question, context) {
  return renderAnswerPrompt({ context, question });
}

function fitsBudget(question, context, modelContextTokens, maxAnswerTokens) {
  const promptTokens = countChatTokens(promptFor(question, context));
  return {
    promptTokens,
    fits: promptTokens + maxAnswerTokens <= modelContextTokens,
  };
}

function longestFittingText(chunk, index, existingContext, question, modelContextTokens, maxAnswerTokens) {
  const text = String(chunk?.text ?? "");
  const encoded = tokenizer.encode(text);
  let low = 0;
  let high = encoded.length;
  let best = null;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const candidateText = tokenizer.decode(encoded.slice(0, middle));
    const candidateContext = existingContext
      ? `${existingContext}\n\n${formatChunk(chunk, index, candidateText)}`
      : formatChunk(chunk, index, candidateText);
    const budget = fitsBudget(
      question,
      candidateContext,
      modelContextTokens,
      maxAnswerTokens,
    );

    if (budget.fits) {
      best = { text: candidateText, context: candidateContext, ...budget };
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return best;
}

function assembleGroundedPrompt({
  question,
  retrievedChunks = [],
  modelContextTokens = DEFAULT_MODEL_CONTEXT_TOKENS,
  maxAnswerTokens = DEFAULT_MAX_ANSWER_TOKENS,
}) {
  if (!question || typeof question !== "string") throw new Error("A question is required");
  if (!Array.isArray(retrievedChunks)) throw new Error("Retrieved chunks must be an array");
  if (!Number.isInteger(modelContextTokens) || modelContextTokens <= 0) {
    throw new Error("modelContextTokens must be a positive integer");
  }
  if (!Number.isInteger(maxAnswerTokens) || maxAnswerTokens <= 0) {
    throw new Error("maxAnswerTokens must be a positive integer");
  }
  if (maxAnswerTokens >= modelContextTokens) {
    throw new Error("maxAnswerTokens must leave room for the prompt");
  }

  let context = "No retrieved context was provided.";
  const selectedChunks = [];
  const omittedChunks = [];

  for (let index = 0; index < retrievedChunks.length; index += 1) {
    const chunk = retrievedChunks[index];
    const candidateContext = context === "No retrieved context was provided."
      ? formatChunk(chunk, index)
      : `${context}\n\n${formatChunk(chunk, index)}`;
    const budget = fitsBudget(
      question,
      candidateContext,
      modelContextTokens,
      maxAnswerTokens,
    );

    if (budget.fits) {
      context = candidateContext;
      selectedChunks.push({ rank: index + 1, source: sourceName(chunk, index), text: chunk.text });
      continue;
    }

    const partial = longestFittingText(
      chunk,
      index,
      context === "No retrieved context was provided." ? "" : context,
      question,
      modelContextTokens,
      maxAnswerTokens,
    );
    if (partial && partial.text.trim()) {
      context = partial.context;
      selectedChunks.push({
        rank: index + 1,
        source: sourceName(chunk, index),
        text: partial.text,
        truncated: partial.text.length < String(chunk.text ?? "").length,
      });
    }
    omittedChunks.push(
      { rank: index + 1, source: sourceName(chunk, index) },
      ...retrievedChunks.slice(index + 1).map((omitted, omittedIndex) => ({
        rank: index + omittedIndex + 2,
        source: sourceName(omitted, index + omittedIndex + 1),
      })),
    );
    break;
  }

  const prompt = promptFor(question, context);
  const promptTokens = countChatTokens(prompt);
  return {
    prompt,
    context,
    selectedChunks,
    omittedChunks,
    tokenBudget: {
      modelContextTokens,
      promptTokens,
      reservedAnswerTokens: maxAnswerTokens,
      totalReservedTokens: promptTokens + maxAnswerTokens,
      remainingTokens: modelContextTokens - promptTokens - maxAnswerTokens,
    },
  };
}

module.exports = {
  DEFAULT_MAX_ANSWER_TOKENS,
  DEFAULT_MODEL_CONTEXT_TOKENS,
  assembleGroundedPrompt,
  countChatTokens,
  countTokens,
  formatRetrievedChunks,
};