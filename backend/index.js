// backend/index.js
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { prepareMessagesForLLM } = require('./historyManager');
const { RuntimeKnowledgeBase, UploadError, DEFAULT_MAX_BYTES } = require('./runtimeKnowledgeBase');

const app = express();
app.use(cors());
app.use(express.json());
const knowledgeBase = new RuntimeKnowledgeBase();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: DEFAULT_MAX_BYTES },
});

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

app.post('/api/query', async (req, res) => {
    try {
        const results = await knowledgeBase.search(req.body?.query, req.body?.k || 5);
        const answer = results.length
            ? results.map((result) => result.text).join(' ')
            : 'I could not find a grounded answer in the indexed documents.';
        res.json({ query: req.body.query, answer, results });
    } catch (error) {
        const statusCode = error instanceof UploadError ? error.statusCode : 500;
        res.status(statusCode).json({ error: error.message || 'Query failed' });
    }
});

// --- Load Config from Environment (Task 4) ---
const PORT = process.env.PORT || 5000;
const VECTOR_DB_URL = process.env.VECTOR_DB_URL || "http://localhost:8000";


// ==========================================
// ROUTE 1: Context History Manager (Mod 3.15)
// ==========================================
app.post('/api/chat', async (req, res) => {
    try {
        const { query, history } = req.body;

        if (!query) {
            return res.status(400).json({ error: "Query is required" });
        }

        // 1. Process the history and query to ensure it fits the token limit
        const safePayload = prepareMessagesForLLM(query, history || [], 3000);

        // 2. Log the payload to verify the system prompt is intact and old history is trimmed
        console.log("Final Payload to LLM:", JSON.stringify(safePayload, null, 2));

        // 3. (Future Step) Send safePayload to OpenAI/Anthropic API here
        
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
// ROUTE 2: RAG Pipeline API (Mod 3.44)
// ==========================================

// Mock RAG Pipeline (Integrates concepts from 3.37 - 3.43)
async function runRagPipeline(question) {
    // Simulate pipeline latency
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
    
    // Simulate failing guardrails if the question is unrelated
    return {
        answer: "I do not have enough verified protocol information to answer this.",
        sources: [],
        status: "refused"
    };
}

// Task 1: Create query endpoint
app.post('/api/query', async (req, res) => {
    try {
        const { question } = req.body;

        // Task 3: Validate Input
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

        // Execute Pipeline
        const result = await runRagPipeline(question);

        // Task 2: Return Structured JSON
        const responsePayload = {
            answer: result.answer,
            sources: result.sources.map(s => ({
                source: s.source,
                chunk_id: s.chunk_id || null,
                score: s.score || null
            })),
            status: result.status
        };

        return res.status(200).json(responsePayload);

    } catch (error) {
        // Task 3: Handle Server Errors
        console.error("RAG Service Error:", error);
        return res.status(500).json({ 
            error: "Internal Server Error", 
            detail: "The RAG service failed to process the request." 
        });
    }
});


// ==========================================
// SERVER INITIALIZATION
// ==========================================
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Connected to Vector DB at ${VECTOR_DB_URL}`);
});
