// backend/historyManager.js
const { getEncoding } = require('js-tiktoken');

const tokenizer = getEncoding("cl100k_base");

const SYSTEM_PROMPT = {
    role: "system",
    content: "You are ClinTrace AI. Answer medical queries based ONLY on the retrieved clinical protocols. If you do not have enough information, explicitly state: 'I do not have enough information to answer this based on current protocols.' Do not hallucinate or guess."
};

function calculateTokenCount(messages) {
    let totalTokens = 0;
    for (const msg of messages) {
        totalTokens += 4; 
        totalTokens += tokenizer.encode(msg.role).length;
        totalTokens += tokenizer.encode(msg.content).length;
    }
    totalTokens += 3; 
    return totalTokens;
}

function trimMessageHistory(messages, maxTokens = 3000) {
    let currentTokens = calculateTokenCount(messages);

    while (currentTokens > maxTokens && messages.length > 2) {
        if (messages[1].role === 'user' && messages[2] && messages[2].role === 'assistant') {
            messages.splice(1, 2); 
        } else {
            messages.splice(1, 1); 
        }
        currentTokens = calculateTokenCount(messages);
    }
    return messages;
}

function prepareMessagesForLLM(userQuery, previousHistory = [], maxContextTokens = 3000) {
    const messages = [
        SYSTEM_PROMPT,
        ...previousHistory,
        { role: "user", content: userQuery }
    ];
    return trimMessageHistory(messages, maxContextTokens);
}

module.exports = { prepareMessagesForLLM };