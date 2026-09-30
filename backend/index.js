// backend/index.js
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const { prepareMessagesForLLM } = require('./historyManager');
const { RuntimeKnowledgeBase, UploadError, DEFAULT_MAX_BYTES } = require('./runtimeKnowledgeBase');

const app = express();
app.use(express.json());

// --- Load Config from Environment ---
const PORT = process.env.PORT || 5000;
const VECTOR_DB_URL = process.env.VECTOR_DB_URL || "http://localhost:8000";
const LOG_FILE = 'usage_log.json';

// --- Observability Constants (Mod 3.48) ---
const MODEL_INPUT_COST_PER_1K = 0.00015;
const MODEL_OUTPUT_COST_PER_1K = 0.00060;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const queryCache = {}; // In-memory cache store

const knowledgeBase = new RuntimeKnowledgeBase();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: DEFAULT_MAX_BYTES },
});

// ==========================================
// HELPER FUNCTIONS: Observability (Mod 3.48)
// ==========================================
function generateCacheKey(question) {
    return crypto.createHash('sha256').update(question.trim().toLowerCase()).digest('hex');
}

function estimateTokens(text) {
    return Math.ceil((text || "").length / 4);
}

function calculateCost(inputTokens, outputTokens) {
    const inputCost = (inputTokens / 1000) * MODEL_INPUT_COST_PER_1K;
    const outputCost = (outputTokens / 1000) * MODEL_OUTPUT_COST_PER_1K;
    return inputCost + outputCost;
}

function logRequest(record) {
    let logs = [];
    if (fs.existsSync(LOG_FILE)) {
        logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
    }
    logs.push(record);
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
}

// ==========================================
// ROUTE SET 1: Knowledge Base Upload & Search
// ==========================================
function receiveUpload(req, res, next) {
    upload.single('document')(req, res, (error) => {
        if (!error) return next();
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: `The uploaded document exceeds the ${DEFAULT_MAX_BYTES} byte limit` });
        }
        return res.status(400).json({ error: error.message || 'Invalid multipart upload' });
    });
}

app.post('/api/upload', receiveUpload, async (req, res) => {
    try {
        const summary = await knowledgeBase.ingest(req.file);
        res.status(201).json({ message: 'Document uploaded, embedded, and indexed', ...summary });
    } catch (error) {
        const statusCode = error instanceof UploadError ? error.statusCode : 500;
        res.status(statusCode).json({ error: error.message || 'Document processing failed' });
    }
});

// Renamed from /api/query to avoid conflict with the RAG Pipeline endpoint below
app.post('/api/kb/search', async (req, res) => {
    try {
        const results = await knowledgeBase.search(req.body?.query, req.body?.k || 5);
        res.json({ query: req.body.query, results });
    } catch (error) {
        const statusCode = error instanceof UploadError ? error.statusCode : 500;
        res.status(statusCode).json({ error: error.message || 'Query failed' });
    }
});

// ==========================================
// ROUTE SET 2: Context History Manager (Mod 3.15)
// ==========================================
app.post('/api/chat', async (req, res) => {
    try {
        const { query, history } = req.body;

        if (!query) {
            return res.status(400).json({ error: "Query is required" });
        }

        const safePayload = prepareMessagesForLLM(query, history || [], 3000);
        console.log("Final Payload to LLM:", JSON.stringify(safePayload, null, 2));
        
        res.json({ 
            message: "Context window managed successfully.",
            payloadSentToModel: safePayload
        });

    } catch (error) {
        console.error("Error processing chat:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ==========================================
// ROUTE SET 3: RAG Pipeline API w/ Observability (Mod 3.44 & 3.48)
// ==========================================
async function runRagPipeline(question) {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (question.toLowerCase().includes("submission")) {
        return {
            answer: "The submission requires a PR link, sample output, and a video explanation.",
            sources: [
                { source: "submission-rubric.md", chunk_id: "submission-rubric.md:2", score: 0.84 }
            ],
            status: "answered"
        };
    }
    
    return {
        answer: "I do not have enough verified protocol information to answer this.",
        sources: [],
        status: "refused"
    };
}

app.post('/api/query', async (req, res) => {
    const startTime = Date.now();
    try {
        const { question } = req.body;

        // Input Validation
        if (!question || typeof question !== 'string') {
            return res.status(400).json({ 
                error: "Bad Request", 
                detail: "'question' field is required and must be a string." 
            });
        }
        if (question.length < 3 || question.length > 1000) {
            return res.status(400).json({ 
                error: "Bad Request", 
                detail: "Question must be between 3 and 1000 characters." 
            });
        }

        // Caching Logic
        const cacheKey = generateCacheKey(question);
        const cachedEntry = queryCache[cacheKey];
        let isCacheHit = false;
        let result;

        if (cachedEntry && (Date.now() - cachedEntry.createdAt < CACHE_TTL_MS)) {
            result = cachedEntry.response;
            isCacheHit = true;
        } else {
            result = await runRagPipeline(question);
            queryCache[cacheKey] = {
                createdAt: Date.now(),
                response: result
            };
        }

        // Telemetry & Cost Tracking
        const latency = Date.now() - startTime;
        const inputTokens = estimateTokens(question);
        const outputTokens = estimateTokens(result.answer);
        const estimatedCost = calculateCost(inputTokens, outputTokens);

        // Structured Logging
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

        // Structured JSON Response
        const responsePayload = {
            answer: result.answer,
            sources: result.sources.map(s => ({
                source: s.source,
                chunk_id: s.chunk_id || null,
                score: s.score || null
            })),
            usage: {
                cache_hit: isCacheHit,
                input_tokens: inputTokens,
                output_tokens: outputTokens,
                estimated_cost_usd: estimatedCost.toFixed(6)
            },
            status: result.status
        };

        return res.status(200).json(responsePayload);

    } catch (error) {
        console.error("RAG Service Error:", error);
        return res.status(500).json({ 
            error: "Internal Server Error", 
            detail: "The RAG service failed to process the request." 
        });
    }
});

// ==========================================
// ROUTE SET 4: Usage Report (Mod 3.48)
// ==========================================
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

// ==========================================
// SERVER INITIALIZATION
// ==========================================
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Connected to Vector DB at ${VECTOR_DB_URL}`);
});