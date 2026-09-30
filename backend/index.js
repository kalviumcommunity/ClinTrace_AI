// backend/index.js
require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 5000;
const LOG_FILE = 'usage_log.json';

// --- Observability Constants ---
// Output tokens often cost 3x to 10x more than input tokens.
const MODEL_INPUT_COST_PER_1K = 0.00015;
const MODEL_OUTPUT_COST_PER_1K = 0.00060;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// In-memory cache store
const queryCache = {};

// --- Helper Functions ---
function generateCacheKey(question) {
    return crypto.createHash('sha256').update(question.trim().toLowerCase()).digest('hex');
}

function estimateTokens(text) {
    // Rough estimation: 1 token ~= 4 characters
    return Math.ceil(text.length / 4);
}

function calculateCost(inputTokens, outputTokens) {
    const inputCost = (inputTokens / 1000) * MODEL_INPUT_COST_PER_1K;
    const outputCost = (outputTokens / 1000) * MODEL_OUTPUT_COST_PER_1K;
    return inputCost + outputCost; //
}

function logRequest(record) {
    let logs = [];
    if (fs.existsSync(LOG_FILE)) {
        logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
    }
    logs.push(record);
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
}

// --- MOCK RAG PIPELINE ---
async function runRagPipeline(question) {
    await new Promise(resolve => setTimeout(resolve, 600)); // Simulate latency
    
    if (question.toLowerCase().includes("submission")) {
        return {
            answer: "The submission requires a PR link, sample output, and a video explanation.",
            sources: [{ source: "submission-rubric.md", score: 0.84 }]
        };
    }
    return {
        answer: "I do not have enough verified protocol information to answer this.",
        sources: []
    };
}

// --- TASK 1, 2 & 3: THE QUERY ENDPOINT ---
app.post('/api/query', async (req, res) => {
    const startTime = Date.now();
    const { question } = req.body;

    if (!question || typeof question !== 'string') {
        return res.status(400).json({ error: "Bad Request", detail: "Invalid question format." });
    }

    const cacheKey = generateCacheKey(question);
    const cachedEntry = queryCache[cacheKey];
    let isCacheHit = false;
    let result;

    // Task 1: Check Cache
    if (cachedEntry && (Date.now() - cachedEntry.createdAt < CACHE_TTL_MS)) {
        result = cachedEntry.response;
        isCacheHit = true;
    } else {
        // Run Pipeline if cache miss
        result = await runRagPipeline(question);
        queryCache[cacheKey] = {
            createdAt: Date.now(),
            response: result
        };
    }

    const latency = Date.now() - startTime;
    const inputTokens = estimateTokens(question);
    const outputTokens = estimateTokens(result.answer);
    const estimatedCost = calculateCost(inputTokens, outputTokens);

    // Task 2 & 3: Structured Logging and Cost Tracking
    const logEntry = {
        timestamp: new Date().toISOString(),
        request_id: crypto.randomUUID(),
        question: question,
        answer_preview: result.answer.substring(0, 100),
        sources: result.sources.map(s => s.source),
        cache_hit: isCacheHit,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        estimated_cost: estimatedCost,
        latency_ms: latency
    };
    
    logRequest(logEntry);

    return res.status(200).json({
        answer: result.answer,
        sources: result.sources,
        usage: {
            cache_hit: isCacheHit,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            estimated_cost_usd: estimatedCost.toFixed(6)
        }
    });
});

// --- TASK 4: USAGE REPORT ENDPOINT ---
app.get('/api/usage-report', (req, res) => {
    if (!fs.existsSync(LOG_FILE)) {
        return res.json({ message: "No usage logs found." });
    }

    const logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
    const totalRequests = logs.length;
    const cacheHits = logs.filter(l => l.cache_hit).length;
    const totalCost = logs.reduce((sum, l) => sum + l.estimated_cost, 0);
    const avgLatency = logs.reduce((sum, l) => sum + l.latency_ms, 0) / totalRequests;

    const summary = {
        total_requests: totalRequests,
        cache_hits: cacheHits,
        cache_hit_rate: (cacheHits / totalRequests).toFixed(2),
        total_estimated_cost_usd: totalCost.toFixed(6),
        average_latency_ms: avgLatency.toFixed(2)
    };

    // Save summary artifact for assignment submission
    fs.writeFileSync('usage_summary.json', JSON.stringify(summary, null, 2));

    return res.json(summary);
});

app.listen(PORT, () => {
    console.log(`ClinTrace Observability API running on port ${PORT}`);
});