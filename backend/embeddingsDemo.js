// backend/embeddingsDemo.js
const fs = require('fs');

async function runEmbeddingsDemo() {
    // Dynamic import for the transformers library
    const { pipeline, cos_sim } = await import('@xenova/transformers');

    console.log("Loading embedding model...");
    // Load a lightweight, general-purpose embedding model
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

    // Task 1: Define short sample texts (similar pair vs. unrelated)
    const texts = [
        "How do I reset my account password?",
        "Steps to recover access to my login",
        "The cafeteria menu has pasta today"
    ];

    console.log("Generating embeddings...");
    // Generate embeddings. The model outputs a tensor. We extract the array of numbers.
    const embeddings = [];
    for (const text of texts) {
        const output = await extractor(text, { pooling: 'mean', normalize: true });
        embeddings.push(Array.from(output.data)); 
    }

    // Task 2: Report vector dimension
    const dimension = embeddings[0].length;
    
    // Task 3: Compare similar and dissimilar texts using cosine similarity
    // cos_sim measures the angle between vectors. 1 is perfectly aligned, 0 is orthogonal.
    const similarScore = cos_sim(embeddings[0], embeddings[1]);
    const dissimilarScore = cos_sim(embeddings[0], embeddings[2]);

    // Generate output report
    const reportContent = `
EMBEDDINGS FUNDAMENTALS & VECTOR REPRESENTATION REPORT

--- TASK 2: VECTOR DIMENSION ---
Model Used: all-MiniLM-L6-v2
Vector Dimension: ${dimension} (Each text is represented by an array of ${dimension} numbers)
Sample Vector Snippet (First 5 values of Text 1): 
${JSON.stringify(embeddings[0].slice(0, 5))}

--- TASK 3: SIMILARITY COMPARISON ---
Text 1: "${texts[0]}"
Text 2: "${texts[1]}"
Text 3: "${texts[2]}"

Cosine Similarity (Text 1 vs Text 2) [Similar]: ${similarScore.toFixed(4)}
Cosine Similarity (Text 1 vs Text 3) [Dissimilar]: ${dissimilarScore.toFixed(4)}

--- TASK 4: WHAT VECTORS REPRESENT ---
Embedding vectors are dense, numerical representations of semantic meaning, not random IDs or keyword counts. By passing text through a neural network, words that appear in similar contexts are mapped to similar coordinates in a high-dimensional space. Because the vectors for "password" and "login" point in roughly the same direction, their cosine similarity score is high, allowing a RAG system to retrieve relevant information even if the exact words differ.
`;

    fs.writeFileSync('embeddings_report.txt', reportContent);
    console.log("Demonstration complete. Check embeddings_report.txt.");
}

runEmbeddingsDemo().catch(console.error);