// backend/similarityRanking.js
const fs = require('fs');

// Task 1: Compute a similarity metric
function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function runSimilarityDemo() {
    const { pipeline } = await import('@xenova/transformers');
    
    console.log("Loading embedding model...");
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

    // Task 2: Compare a query against chunks
    const query = "What are the contraindications for Drug X?";
    
    const chunkRecords = [
        {
            text: "Drug X is indicated for acute myocardial infarction.",
            metadata: { source: "drug_X_guideline.pdf", chunk_index: 0 }
        },
        {
            text: "Do not use Drug X in patients with active internal bleeding.",
            metadata: { source: "drug_X_guideline.pdf", chunk_index: 1 }
        },
        {
            text: "Hospital cafeteria hours are 7 AM to 8 PM daily.",
            metadata: { source: "admin_handbook.pdf", chunk_index: 5 }
        }
    ];

    console.log("Embedding query and chunks...");
    
    // Embed the query
    const queryOutput = await extractor(query, { pooling: 'mean', normalize: true });
    const queryEmbedding = Array.from(queryOutput.data);

    // Embed the chunks and calculate scores
    const rankedChunks = [];
    for (const record of chunkRecords) {
        const chunkOutput = await extractor(record.text, { pooling: 'mean', normalize: true });
        const chunkEmbedding = Array.from(chunkOutput.data);
        
        // Calculate similarity score
        const score = cosineSimilarity(queryEmbedding, chunkEmbedding);
        rankedChunks.push({ ...record, score });
    }

    // Task 3: Rank and show results
    // Sort descending (highest score first)
    rankedChunks.sort((a, b) => b.score - a.score);

    // Task 4: Justify the metric
    const reportContent = `
EMBEDDING SIMILARITY & DISTANCE METRICS REPORT

--- QUERY ---
"${query}"

--- TASK 3: RANKED RESULTS ---
MOST SIMILAR CHUNK:
Score: ${rankedChunks[0].score.toFixed(4)}
Text: "${rankedChunks[0].text}"
Metadata: ${JSON.stringify(rankedChunks[0].metadata)}

LEAST SIMILAR CHUNK:
Score: ${rankedChunks[rankedChunks.length - 1].score.toFixed(4)}
Text: "${rankedChunks[rankedChunks.length - 1].text}"
Metadata: ${JSON.stringify(rankedChunks[rankedChunks.length - 1].metadata)}

FULL RANKING:
${rankedChunks.map((c, i) => `${i + 1}. [${c.score.toFixed(4)}] ${c.text}`).join('\n')}

--- TASK 4: METRIC JUSTIFICATION ---
Cosine similarity was chosen because it measures the angle between two vectors rather than their magnitude (length). When comparing texts of different lengths (like a short user query against a longer medical paragraph), the magnitude can vary greatly. By normalizing the vectors and measuring the cosine of the angle between them, we accurately capture the semantic alignment (meaning) regardless of word count.
`;

    fs.writeFileSync('similarity_report.txt', reportContent);
    console.log("Ranking complete. Check similarity_report.txt.");
}

runSimilarityDemo().catch(console.error);