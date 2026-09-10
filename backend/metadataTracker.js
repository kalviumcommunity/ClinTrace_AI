// backend/metadataTracker.js
const fs = require('fs');

// Dummy medical document structured with sections
const document = {
    source: "drug_interaction_guidelines_v2.pdf",
    sections: [
        { title: "1. INDICATIONS", text: "Drug Y is indicated for severe hypertension." },
        { title: "2. CONTRAINDICATIONS", text: "Avoid concurrent use with beta-blockers due to risk of severe bradycardia." }
    ]
};

// Tasks 1, 2, & 3: Tag chunks with metadata (source, section, index) in a consistent structure
function tagChunks(doc) {
    const taggedChunks = [];
    let globalIndex = 0;

    doc.sections.forEach((section) => {
        // Simulating paragraph chunking
        const chunks = section.text.split("\n").map(p => p.trim()).filter(p => p.length > 0);
        
        chunks.forEach((chunkText) => {
            taggedChunks.push({
                text: chunkText,
                metadata: {
                    source: doc.source,            // Task 1: Store source identifier
                    section: section.title,        // Task 2: Attach additional metadata
                    chunk_index: globalIndex,      // Task 2: Attach position index
                    timestamp: new Date().toISOString() // Task 3: Consistent structure baseline
                }
            });
            globalIndex++;
        });
    });

    return taggedChunks;
}

const finalChunks = tagChunks(document);

// Task 4: Trace a chunk back to its exact source
// Simulating a retrieval hit from our vector database
const mockRetrievedHit = finalChunks[1]; 
const tracebackString = `[Traceback Verification]
Text: "${mockRetrievedHit.text}"
Retrieved From -> Document: ${mockRetrievedHit.metadata.source} | Section: ${mockRetrievedHit.metadata.section} | Position: ${mockRetrievedHit.metadata.chunk_index}`;

// Task 5: Output the chunks and traceback to a file for reviewers
const reportContent = `
CHUNK METADATA & SOURCE TRACKING REPORT

--- TASK 3: SAMPLE CHUNK WITH CONSISTENT METADATA ---
${JSON.stringify(finalChunks[0], null, 2)}

--- TASK 4: TRACEBACK EXAMPLE ---
${tracebackString}
`;

fs.writeFileSync('metadata_report.txt', reportContent);
console.log("Metadata tagging complete. Check metadata_report.txt for the outputs.");