// backend/index.js
require('dotenv').config();
const express = require('express');
const { prepareMessagesForLLM } = require('./historyManager');

const app = express();
app.use(express.json());

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
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
