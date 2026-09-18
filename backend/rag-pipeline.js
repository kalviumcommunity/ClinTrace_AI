require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const {
  embedQuery,
  InMemoryVectorStore,
  rerankCandidates,
} = require("./vector-store-retrieval");
const { assembleGroundedPrompt } = require("./prompts/context-assembly");
const { GROUNDING_SYSTEM_PROMPT } = require("./prompts/answer");

function embedStage(query, { client, model }) {
  return embedQuery(query, client, model);
}

function retrieveStage(query, queryEmbedding, { vectorStore, k, candidateK = Math.max(k * 3, 10) }) {
  if (!vectorStore || typeof vectorStore.search !== "function") throw new Error("A vector store is required");
  if (!Number.isInteger(k) || k <= 0) throw new Error("k must be a positive integer");
  if (!Number.isInteger(candidateK) || candidateK < k) throw new Error("candidateK must be an integer greater than or equal to k");

  const candidateResults = vectorStore.search(queryEmbedding, candidateK);
  const rerankedResults = rerankCandidates(query, candidateResults).map((result) => ({
    ...result,
    source: result.metadata.source_document,
  }));
  return {
    candidateResults,
    rerankedResults,
    results: rerankedResults.slice(0, k),
  };
}

function assembleStage(question, retrievedChunks, options = {}) {
  return assembleGroundedPrompt({ question, retrievedChunks, ...options });
}

function createGenerationRequest(prompt, model, maxAnswerTokens) {
  return {
    model,
    messages: [
      { role: "system", content: GROUNDING_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    max_tokens: maxAnswerTokens,
    temperature: 0,
  };
}

async function generateStage(assembledPrompt, { client, model, maxAnswerTokens = 256 }) {
  if (!client?.chat?.completions?.create || !model) throw new Error("A chat client and model are required");
  const response = await client.chat.completions.create(
    createGenerationRequest(assembledPrompt.prompt, model, maxAnswerTokens),
  );
  const answer = response?.choices?.[0]?.message?.content;
  if (typeof answer !== "string" || answer.trim() === "") throw new Error("Generation returned an empty answer");
  return { answer: answer.trim(), usage: response.usage ?? null };
}

async function runRagPipeline(query, {
  client,
  model,
  vectorStore,
  k = 2,
  candidateK = Math.max(k * 3, 10),
  modelContextTokens = 8192,
  maxAnswerTokens = 256,
}) {
  const queryEmbedding = await embedStage(query, { client, model });
  const retrieval = retrieveStage(query, queryEmbedding, { vectorStore, k, candidateK });
  const assembled = assembleStage(query, retrieval.results, { modelContextTokens, maxAnswerTokens });
  const generated = await generateStage(assembled, { client, model, maxAnswerTokens });

  return {
    query,
    stages: {
      embed: { vectorLength: queryEmbedding.length },
      retrieve: { candidateCount: retrieval.candidateResults.length, results: retrieval.results },
      assemble: {
        context: assembled.context,
        selectedChunks: assembled.selectedChunks,
        tokenBudget: assembled.tokenBudget,
      },
      generate: generated,
    },
    answer: generated.answer,
    sources: assembled.selectedChunks.map((chunk) => ({ marker: `[${chunk.rank}]`, source: chunk.source })),
  };
}

function loadPipelineFixture() {
  const fixturePath = path.join(__dirname, "embedding-sanity-fixture.json");
  const { chunks } = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  return new InMemoryVectorStore(chunks, "text-embedding-test");
}

function createSampleClient() {
  return {
    embeddings: {
      create: async ({ input }) => {
        const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, "embedding-sanity-fixture.json"), "utf8"));
        const query = fixture.queries.find((candidate) => candidate.text === input);
        return { data: [{ embedding: query?.embedding ?? [0.98, 0.1, 0] }] };
      },
    },
    chat: {
      completions: {
        create: async () => ({
          choices: [{ message: { content: "Consent is required before a patient record can be indexed. [1]" } }],
          usage: { prompt_tokens: 124, completion_tokens: 13, total_tokens: 137 },
        }),
      },
    },
  };
}

async function runSamplePipeline() {
  const result = await runRagPipeline("What is required before indexing a patient record?", {
    client: createSampleClient(),
    model: "text-embedding-test",
    vectorStore: loadPipelineFixture(),
    k: 2,
    candidateK: 3,
    modelContextTokens: 256,
    maxAnswerTokens: 48,
  });
  console.log(JSON.stringify(result, null, 2));
  return result;
}

if (require.main === module) {
  runSamplePipeline().catch((error) => {
    console.error(`RAG pipeline failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  assembleStage,
  createGenerationRequest,
  createSampleClient,
  embedStage,
  generateStage,
  loadPipelineFixture,
  retrieveStage,
  runRagPipeline,
  runSamplePipeline,
};