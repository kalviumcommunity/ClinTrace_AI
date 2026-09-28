// backend/hybridSearch.js
const { ChromaClient } = require('chromadb');
const fs = require('fs');

async function runHybridSearchDemo() {
    const client = new ChromaClient();
    const COLLECTION_NAME = "clintrace_rag_chunks";
    
    // We assume the collection exists and is populated from Module 3.31
    const collection = await client.getCollection({ name: COLLECTION_NAME });

    // We will use a mock query embedding for demonstration (normally generated via API)
    const mockQueryEmbedding = Array(384).fill(0.15); 
    const queryText = "What are the indications and rules for Drug X?";
    
    console.log("Running Unfiltered Search...");
    // Task 2: Unfiltered Vector Search
    const unfiltered = await collection.query({
        queryEmbeddings: [mockQueryEmbedding],
        nResults: 3,
        include: ["documents", "metadatas", "distances"]
    });

    console.log("Running Filtered Search...");
    // Task 1: Metadata Filtered Vector Search
    // Scoping retrieval strictly to the 'Indications' section
    const filtered = await collection.query({
        queryEmbeddings: [mockQueryEmbedding],
        nResults: 3,
        where: { "section": "Indications" }, 
        include: ["documents", "metadatas", "distances"]
    });

    // Task 3: Hybrid Search (Vector + Keyword)
    // We take the filtered results and apply a lexical boost if the exact drug name appears
    function keywordScore(text, keywords) {
        const lowered = text.toLowerCase();
        return keywords.reduce((count, word) => {
            return count + (lowered.includes(word.toLowerCase()) ? 1 : 0);
        }, 0);
    }

    function hybridRank(vectorResults, keywords, vectorWeight = 0.8, keywordWeight = 0.2) {
        const ranked = [];
        // Chroma returns parallel arrays for queries; we unpack the first query's results
        const docs = vectorResults.documents[0] || [];
        const metas = vectorResults.metadatas[0] || [];
        // Note: Chroma returns distance (lower is better), so we invert it for a 'score'
        const distances = vectorResults.distances[0] || [];

        for (let i = 0; i < docs.length; i++) {
            const text = docs[i];
            const simScore = 1 / (1 + distances[i]); // Invert distance to score
            const lexScore = keywordScore(text, keywords);
            const combined = (vectorWeight * simScore) + (keywordWeight * lexScore);
            
            ranked.push({
                text: text,
                metadata: metas[i],
                vector_score: simScore,
                keyword_score: lexScore,
                hybrid_score: combined
            });
        }
        // Sort descending by highest hybrid score
        return ranked.sort((a, b) => b.hybrid_score - a.hybrid_score);
    }

    const hybridResults = hybridRank(filtered, ["Drug X", "myocardial"]);

    // Format output for the assignment report
    const formatResults = (resultsObj) => {
        if (!resultsObj.documents || resultsObj.documents[0].length === 0) return "No results found.";
        let out = "";
        for (let i = 0; i < resultsObj.documents[0].length; i++) {
            out += `Result ${i + 1}:\n`;
            out += `Distance: ${resultsObj.distances[0][i].toFixed(4)}\n`;
            out += `Source: ${resultsObj.metadatas[0][i].source} | Section: ${resultsObj.metadatas[0][i].section}\n`;
            out += `Text: "${resultsObj.documents[0][i]}"\n\n`;
        }
        return out;
    };

    const reportContent = `
METADATA FILTERING & HYBRID SEARCH REPORT

--- QUERY ---
"${queryText}"

--- TASK 2: UNFILTERED RESULTS ---
(Searches the entire database)
${formatResults(unfiltered)}

--- TASK 4: FILTERED RESULTS ---
(Restricted to metadata where section == "Indications")
${formatResults(filtered)}

--- TASK 3: HYBRID RANKING ---
(Filtered results re-ranked based on exact keyword matches for 'Drug X' and 'myocardial')
${hybridResults.map((r, i) => `Rank ${i + 1}:
Hybrid Score: ${r.hybrid_score.toFixed(4)} (Vector: ${r.vector_score.toFixed(4)}, Keyword:${r.keyword_score})
Metadata: ${JSON.stringify(r.metadata)}
Text: "${r.text}"\n`).join('\n')}
`;

    fs.writeFileSync('hybrid_search_report.txt', reportContent);
    console.log("Demonstration complete. Check hybrid_search_report.txt.");
}

runHybridSearchDemo().catch(console.error);