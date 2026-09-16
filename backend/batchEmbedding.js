// backend/batchEmbedding.js
const fs = require('fs');

// Pricing for OpenAI's text-embedding-3-small ($0.02 per 1M tokens)
const PRICE_PER_1K_TOKENS = 0.00002; 
const BATCH_SIZE = 2;

// Mock Corpus (Simulating extracted text chunks)
const allChunks = [
    { id: "chunk-1", text: "Drug X is indicated for myocardial infarction." },
    { id: "chunk-2", text: "Avoid concurrent use with beta-blockers." },
    { id: "chunk-3", text: "Dosage: 15mg IV bolus." },
    { id: "chunk-4", text: "Adverse reactions include hypotension." },
    { id: "chunk-5", text: "Store at room temperature." }
];

// Mock database of previously embedded chunks (Task 4: Skip already-embedded)
const existingEmbeddingIds = new Set(["chunk-1"]); 

// --- MOCK API CLIENT ---
let attemptCounter = 0;
const mockOpenAI = {
    embeddings: {
        create: async ({ input }) => {
            attemptCounter++;
            // Force a failure on attempt #2 to demonstrate backoff
            if (attemptCounter === 2) {
                throw new Error("429 Too Many Requests: Rate limit exceeded");
            }
            return {
                data: input.map((text, i) => ({ id: `vec-${Date.now()}-${i}`, embedding: [0.1, 0.2] })),
                usage: { total_tokens: input.join(" ").length } // Rough token estimate
            };
        }
    }
};

// Task 1: Batching Function
function getBatches(items, size) {
    const batches = [];
    for (let i = 0; i < items.length; i += size) {
        batches.push(items.slice(i, i + size));
    }
    return batches;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Task 2: Retry with Exponential Backoff
async function embedWithRetry(texts, maxAttempts = 3) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            return await mockOpenAI.embeddings.create({ input: texts });
        } catch (error) {
            if (attempt === maxAttempts - 1) throw error;
            // Backoff: wait 1s, then 2s, etc.
            const waitSeconds = Math.pow(2, attempt);
            console.log(`[Rate Limit Hit] Retrying after error: ${error.message} | wait=${waitSeconds}s`);
            await sleep(waitSeconds * 1000);
        }
    }
}

// --- MAIN PIPELINE ---
async function runPipeline() {
    // Task 4: Filter out chunks that have already been processed
    const pendingChunks = allChunks.filter(chunk => !existingEmbeddingIds.has(chunk.id));
    
    // Task 3: Initialize Summary
    const summary = {
        total_chunks: allChunks.length,
        skipped_existing: allChunks.length - pendingChunks.length,
        embedded: 0,
        failed_batches: 0,
        input_tokens: 0
    };

    console.log(`Starting run. Total: ${summary.total_chunks}, Pending: ${pendingChunks.length}`);

    const batches = getBatches(pendingChunks, BATCH_SIZE);

    for (const batch of batches) {
        const texts = batch.map(c => c.text);
        try {
            const response = await embedWithRetry(texts);
            summary.input_tokens += response.usage.total_tokens;
            summary.embedded += batch.length;
            console.log(`Successfully embedded batch of ${batch.length} chunks.`);
        } catch (error) {
            console.error(`Batch failed permanently: ${error.message}`);
            summary.failed_batches++;
        }
    }

    // Calculate approximate cost based on current model rates
    const estimatedCost = (summary.input_tokens / 1000) * PRICE_PER_1K_TOKENS;

    const reportContent = `
BATCH EMBEDDING & COST MANAGEMENT SUMMARY

Total Chunks Ingested: ${summary.total_chunks}
Skipped (Already Embedded): ${summary.skipped_existing}
Newly Embedded Chunks: ${summary.embedded}
Failed Batches: ${summary.failed_batches}
Estimated Input Tokens: ${summary.input_tokens}
Approximate Cost (USD): $${estimatedCost.toFixed(6)}

Cost Assumption: text-embedding-3-small at $0.02 per 1M tokens.
`;

    fs.writeFileSync('batch_embedding_summary.txt', reportContent);
    console.log("Run complete. Check batch_embedding_summary.txt");
}

runPipeline().catch(console.error);