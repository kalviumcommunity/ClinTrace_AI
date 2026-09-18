const { assembleStage, generateStage } = require("./rag-pipeline");
const {
  createSampleClient,
  embedStage,
  loadPipelineFixture,
  retrieveStage,
} = require("./rag-pipeline");

const INSUFFICIENT_CONTEXT_ANSWER =
  "I do not have enough information to answer this based on current protocols.";

const COMMON_WORDS = new Set([
  "a", "an", "and", "are", "as", "be", "before", "can", "do", "for", "from",
  "how", "i", "in", "is", "it", "of", "on", "or", "that", "the", "this", "to",
  "was", "what", "when", "with",
]);

function answerTerms(text) {
  return new Set(
    String(text).toLowerCase().match(/[a-z0-9]+/g)?.filter((term) => !COMMON_WORDS.has(term)) ?? [],
  );
}

function removeCitationMarkers(text) {
  return String(text).replace(/\[\d+\]/g, "");
}

function verifyGrounding(answer, supportingChunks) {
  const contextText = supportingChunks.map((chunk) => chunk.text).join(" ");
  const contextTerms = answerTerms(contextText);
  const unsupportedTerms = [...answerTerms(removeCitationMarkers(answer))]
    .filter((term) => !contextTerms.has(term));
  const citations = [...String(answer).matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1]));
  const validCitations = citations.every((marker) => marker >= 1 && marker <= supportingChunks.length);

  return {
    grounded: supportingChunks.length > 0
      && citations.length > 0
      && validCitations
      && unsupportedTerms.length === 0,
    citedMarkers: citations,
    citedSources: citations
      .filter((marker) => marker >= 1 && marker <= supportingChunks.length)
      .map((marker) => supportingChunks[marker - 1].metadata.source_document),
    unsupportedTerms,
    answerTermsSupported: unsupportedTerms.length === 0,
  };
}

async function generateGroundedAnswer(question, {
  retrievedChunks = [],
  client,
  model,
  modelContextTokens = 8192,
  maxAnswerTokens = 256,
}) {
  if (!Array.isArray(retrievedChunks) || retrievedChunks.length === 0) {
    return {
      answer: INSUFFICIENT_CONTEXT_ANSWER,
      fallback: true,
      grounding: {
        grounded: false,
        reason: "No supporting retrieved context was available.",
      },
      sources: [],
    };
  }

  const assembled = assembleStage(question, retrievedChunks, {
    modelContextTokens,
    maxAnswerTokens,
  });
  const generated = await generateStage(assembled, {
    client,
    model,
    maxAnswerTokens,
  });
  const grounding = verifyGrounding(generated.answer, retrievedChunks);

  return {
    answer: generated.answer,
    fallback: false,
    grounding,
    sources: assembled.selectedChunks.map((chunk) => ({
      marker: `[${chunk.rank}]`,
      source: chunk.source,
    })),
    tokenBudget: assembled.tokenBudget,
    usage: generated.usage,
  };
}

async function compareRetrievalImpact(question, {
  retrievedChunks,
  client,
  model,
  modelContextTokens,
  maxAnswerTokens,
}) {
  const withRetrieval = await generateGroundedAnswer(question, {
    retrievedChunks,
    client,
    model,
    modelContextTokens,
    maxAnswerTokens,
  });
  const withoutRetrieval = await generateGroundedAnswer(question, {
    retrievedChunks: [],
    client,
    model,
    modelContextTokens,
    maxAnswerTokens,
  });

  return {
    question,
    withRetrieval,
    withoutRetrieval,
    difference: "Retrieval supplies evidence and citations; without it, generation falls back instead of guessing.",
  };
}

async function runGroundedSample() {
  const question = "What is required before indexing a patient record?";
  const client = createSampleClient();
  const embedding = await embedStage(question, { client, model: "text-embedding-test" });
  const retrievedChunks = retrieveStage(question, embedding, {
    vectorStore: loadPipelineFixture(),
    k: 2,
    candidateK: 3,
  }).results;
  const comparison = await compareRetrievalImpact(question, {
    retrievedChunks,
    client,
    model: "text-embedding-test",
    modelContextTokens: 256,
    maxAnswerTokens: 48,
  });
  console.log(JSON.stringify(comparison, null, 2));
  return comparison;
}

if (require.main === module) {
  runGroundedSample().catch((error) => {
    console.error(`Grounded answer sample failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  INSUFFICIENT_CONTEXT_ANSWER,
  compareRetrievalImpact,
  generateGroundedAnswer,
  runGroundedSample,
  verifyGrounding,
};