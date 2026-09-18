// backend/indexingScript.js
const { ChromaClient } = require('chromadb');
const fs = require('fs');

// Mock previously generated embeddings (representing your processed corpus)
const embeddedChunks = [
    {
        id: "doc1-chunk0",
        embedding: [0.1, 0.2, 0.3], // Mock 3-dimensional vector for testing
        text: "Drug X is indicated for acute myocardial infarction.",
        metadata: { source: "drug_X_guideline.pdf", chunk_index: 0, section: "Indications" }
    },
    {
        id: "doc1-chunk1",
        embedding: [0.4, 0.5, 0.6],
        text: "Do not use Drug X in patients with active internal bleeding.",
        metadata: { source: "drug_X_guideline.pdf", chunk_index: 1, section: "Contraindications" }
    },
    {
        id: "doc2-chunk0",
        embedding: [0.7, 0.8, 0.9],
        text: "Hospital cafeteria hours are 7 AM to 8 PM daily.",
        metadata: { source: "admin_handbook.pdf", chunk_index: 0, section: "Facilities" }
    }
];

async function runIndexing() {
    // Connect to the local ChromaDB Docker container
    const client = new ChromaClient();
    const COLLECTION_NAME = "clintrace_rag_chunks";

    // getOrCreateCollection ensures we don't throw an error if this script is run twice
    const collection = await client.getOrCreateCollection({
        name: COLLECTION_NAME,
        metadata: { "hnsw:space": "cosine" }
    });

    console.log("Preparing records for indexing...");
    // Task 2: Format vectors, text, and metadata for ChromaDB's parallel array structure
    const ids = embeddedChunks.map(c => c.id);
    const embeddings = embeddedChunks.map(c => c.embedding);
    const metadatas = embeddedChunks.map(c => c.metadata);
    const documents = embeddedChunks.map(c => c.text);

    // Task 1: Insert all corpus embeddings (using Upsert to prevent duplicate errors on re-runs)
    console.log("Upserting records into ChromaDB...");
    await collection.upsert({
        ids: ids,
        embeddings: embeddings,
        metadatas: metadatas,
        documents: documents
    });

    // Task 3: Confirm indexed count
    const expectedCount = embeddedChunks.length;
    const indexedCount = await collection.count();
    const isMatch = indexedCount === expectedCount;

    if (!isMatch) {
        console.error(`FATAL ERROR: Count mismatch! Expected: ${expectedCount}, Found: ${indexedCount}`);
    }

    // Task 4: Spot-check stored integrity
    const sampleId = embeddedChunks[0].id;
    console.log(`Spot-checking record: ${sampleId}`);
    
    // Explicitly request embeddings, metadatas, and documents in the return payload
    const stored = await collection.get({
        ids: [sampleId],
        include: ["embeddings", "metadatas", "documents"]
    });

    const isIntact = (
        stored.documents[0] === embeddedChunks[0].text && 
        stored.embeddings[0].length === embeddedChunks[0].embedding.length &&
        stored.metadatas[0].source === embeddedChunks[0].metadata.source
    );

    const reportContent = `
INDEXING EMBEDDINGS & METADATA STORAGE REPORT

--- TASK 3: COUNT VALIDATION ---
Expected Chunks (From Pipeline): ${expectedCount}
Indexed Records (In Database): ${indexedCount}
Validation Match: ${isMatch}

--- TASK 4: SPOT-CHECK INTEGRITY ---
Checked ID: ${stored.ids[0]}
Stored Text: "${stored.documents[0]}"
Stored Metadata: ${JSON.stringify(stored.metadatas[0])}
Vector Length: ${stored.embeddings[0].length}
Integrity Check Passed: ${isIntact}
`;

    fs.writeFileSync('indexing_summary.txt', reportContent);
    console.log("Indexing complete. Check indexing_summary.txt.");
}

runIndexing().catch(console.error);