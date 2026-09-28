// hallucination-guardrails.js

// Minimum similarity score required for a chunk
const MIN_TOP_SCORE = 0.72;

// Minimum number of relevant chunks required
const MIN_SUPPORTING_CHUNKS = 1;


// --------------------------------------------------
// TASK 1: CHECK RETRIEVAL STRENGTH
// --------------------------------------------------

function retrievalIsStrong(chunks) {
    // No retrieved chunks
    if (!chunks || chunks.length === 0) {
        return false;
    }

    // Keep only chunks that meet the relevance threshold
    const strongChunks = chunks.filter(
        chunk => typeof chunk.score === "number" &&
                 chunk.score >= MIN_TOP_SCORE
    );

    return strongChunks.length >= MIN_SUPPORTING_CHUNKS;
}


// --------------------------------------------------
// GET STRONG CONTEXT
// --------------------------------------------------

function getStrongChunks(chunks) {
    if (!chunks || chunks.length === 0) {
        return [];
    }

    return chunks.filter(
        chunk => typeof chunk.score === "number" &&
                 chunk.score >= MIN_TOP_SCORE
    );
}


// --------------------------------------------------
// TASK 2 + 3: SAFE REFUSAL
// --------------------------------------------------

function guardedAnswer(question, chunks, generateAnswer) {

    // Check retrieval quality BEFORE generating an answer
    if (!retrievalIsStrong(chunks)) {

        return {
            answer: "I don't have enough reliable context to answer that.",
            sources: [],
            status: "refused_weak_context",
            question: question
        };
    }

    // Only use relevant chunks
    const strongChunks = getStrongChunks(chunks);

    // Generate answer using the strong context
    const answer = generateAnswer(question, strongChunks);

    return {
        answer: answer,
        sources: strongChunks,
        status: "answered",
        question: question
    };
}


// --------------------------------------------------
// SAMPLE GENERATION FUNCTION
// --------------------------------------------------

function generateAnswer(question, chunks) {

    if (!chunks || chunks.length === 0) {
        return "I don't have enough reliable context to answer that.";
    }

    // In the real RAG system, your LLM/API call goes here.
    // This sample demonstrates a grounded answer.

    return `Based on the retrieved sources, the answer to "${question}" is supported by the available context.`;
}


// --------------------------------------------------
// TASK 4: SUCCESSFUL ANSWER CASE
// --------------------------------------------------

const goodChunks = [
    {
        text: "Project submissions require the required project files and documentation.",
        score: 0.91,
        metadata: {
            source: "project-guidelines.pdf",
            chunk_id: "chunk_12"
        }
    },
    {
        text: "Students must submit their work before the stated deadline.",
        score: 0.84,
        metadata: {
            source: "project-guidelines.pdf",
            chunk_id: "chunk_13"
        }
    }
];

const answerCase = guardedAnswer(
    "What evidence is required for project submission?",
    goodChunks,
    generateAnswer
);

console.log("========== ANSWER CASE ==========");
console.log("Status:", answerCase.status);
console.log("Answer:", answerCase.answer);
console.log("Sources:", answerCase.sources);


// --------------------------------------------------
// TASK 2: REFUSAL CASE
// --------------------------------------------------

const weakChunks = [
    {
        text: "This document discusses project submissions.",
        score: 0.31,
        metadata: {
            source: "project-guidelines.pdf",
            chunk_id: "chunk_02"
        }
    }
];

const refusalCase = guardedAnswer(
    "What is the refund policy for a product not in this corpus?",
    weakChunks,
    generateAnswer
);

console.log("\n========== REFUSAL CASE ==========");
console.log("Status:", refusalCase.status);
console.log("Answer:", refusalCase.answer);
console.log("Sources:", refusalCase.sources);


// --------------------------------------------------
// TASK 1: EMPTY RETRIEVAL CASE
// --------------------------------------------------

const emptyCase = guardedAnswer(
    "What is the refund policy?",
    [],
    generateAnswer
);

console.log("\n========== EMPTY RETRIEVAL CASE ==========");
console.log("Status:", emptyCase.status);
console.log("Answer:", emptyCase.answer);


// --------------------------------------------------
// EXPORT FUNCTIONS
// --------------------------------------------------

module.exports = {
    MIN_TOP_SCORE,
    MIN_SUPPORTING_CHUNKS,
    retrievalIsStrong,
    getStrongChunks,
    guardedAnswer,
    generateAnswer
};