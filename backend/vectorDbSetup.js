// backend/vectorDbSetup.js
const { ChromaClient } = require('chromadb');
const fs = require('fs');

async function runVectorDbDemo() {
    // Task 1: Connect to the vector database
    // Defaults to http://localhost:8000 (your running Docker container)
    const client = new ChromaClient();
    
    // The dimension must match your embedding model (e.g., 384 for all-MiniLM-L6-v2)
    const VECTOR_DIMENSION = 384; 
    const COLLECTION_NAME = "clintrace_rag_chunks";

    console.log("Setting up collection...");
    // Clean up from previous runs
    try {
        await client.deleteCollection({ name: COLLECTION_NAME });
    } catch (e) {
        // Ignore if it doesn't exist yet
    }

    // Task 2: Create a collection
    // Note: Chroma infers dimension from the first inserted vector, but we configure the metric here.
    const collection = await client.createCollection({ 
        name: COLLECTION_NAME,
        metadata: { "hnsw:space": "cosine" } // Metric: cosine similarity for semantic matching
    });

    // Task 3: Design schema and mock a record
    // We create a mock vector of 384 numbers for testing
    const mockEmbedding = Array(VECTOR_DIMENSION).fill(0.1); 

    console.log("Inserting test record...");
    await collection.add({
        ids: ["mock-chunk-1"],
        embeddings: [mockEmbedding],
        metadatas: [{
            source: "drug_interaction_guideline_v2.pdf",
            chunk_index: 0,
            section: "Indications"
        }],
        documents: ["Drug X is indicated for acute myocardial infarction."]
    });

    console.log("Reading test record back...");
    // Task 4: Read the record back successfully
    const storedRecord = await collection.get({
        ids: ["mock-chunk-1"],
        include: ["embeddings", "metadatas", "documents"]
    });

    // Validate the readback
    const readId = storedRecord.ids[0];
    const readVectorLength = storedRecord.embeddings[0].length;
    const readText = storedRecord.documents[0];
    const readMetadata = storedRecord.metadatas[0];

    const reportContent = `
VECTOR DATABASE SETUP & COLLECTION DESIGN REPORT

--- TASK 1 & 2: COLLECTION CREATION ---
Collection Name: ${collection.name}
Configured Metric: Cosine Similarity

--- TASK 4: READBACK TEST RESULTS ---
Readback ID: ${readId}
Vector Length: ${readVectorLength} (Matches Required Dimension: ${readVectorLength === VECTOR_DIMENSION})
Text: "${readText}"
Metadata: ${JSON.stringify(readMetadata, null, 2)}
`;

    fs.writeFileSync('vector_db_report.txt', reportContent);
    console.log("Demonstration complete. Check vector_db_report.txt.");
}

runVectorDbDemo().catch(console.error);