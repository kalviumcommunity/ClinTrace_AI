// backend/index.js
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { prepareMessagesForLLM } = require('./historyManager');
const { RuntimeKnowledgeBase, UploadError, DEFAULT_MAX_BYTES } = require('./runtimeKnowledgeBase');

const app = express();
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
        res.json({ query: req.body.query, results });
    } catch (error) {
        const statusCode = error instanceof UploadError ? error.statusCode : 500;
        res.status(statusCode).json({ error: error.message || 'Query failed' });
    }
});

// Mock LLM API call for testing the payload
app.post('/api/chat', async (req, res) => {
    try {
        const { query, history } = req.body;

        if (!query) {
            return res.status(400).json({ error: "Query is required" });
        }

        // 1. Process the history and query to ensure it fits the token limit
        // We set a small limit (e.g., 50 tokens) here just to test the trimming logic
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

const PORT = process.env.PORT || 5000;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = { app, knowledgeBase };
