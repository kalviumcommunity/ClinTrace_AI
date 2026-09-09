// backend/chunkingComparison.js
const fs = require('fs');

// Dummy clinical protocol text for testing
const clinicalText = `
CLINICAL PROTOCOL: ADMINISTRATION OF DRUG X
\n\n
1. INDICATIONS
Drug X is indicated for the treatment of acute myocardial infarction. 
It must be administered within 3 hours of symptom onset for maximum efficacy.
\n\n
2. CONTRAINDICATIONS
Do not use in patients with active internal bleeding or history of cerebrovascular accident.
Avoid concurrent use with strong CYP3A4 inhibitors.
\n\n
3. DOSAGE AND ADMINISTRATION
Initial dose: 15 mg IV bolus followed by 50 mg IV infusion over 30 minutes.
Maximum total dose should not exceed 100 mg.
\n\n
4. ADVERSE REACTIONS
Common adverse reactions include hypotension, tachycardia, and minor bleeding.
If severe bleeding occurs, discontinue immediately and administer antidote.
`;

// Task 1: Split using defined strategies
function fixedSizeChunking(text, size = 150, overlap = 20) {
    const chunks = [];
    let i = 0;
    while (i < text.length) {
        chunks.push(text.slice(i, i + size));
        i += size - overlap;
    }
    return chunks;
}

function paragraphChunking(text) {
    return text.split("\n\n").map(p => p.trim()).filter(p => p.length > 0);
}

// Task 2: Compare the two strategies
const fixedChunks = fixedSizeChunking(clinicalText);
const paraChunks = paragraphChunking(clinicalText);

// Task 3: Calculate and report chunk stats
const avgFixed = fixedChunks.reduce((acc, val) => acc + val.length, 0) / fixedChunks.length;
const avgPara = paraChunks.reduce((acc, val) => acc + val.length, 0) / paraChunks.length;

// Task 4: Output the justification and samples to a file for reviewers
const reportContent = `
CHUNK STRATEGY COMPARISON REPORT

--- FIXED-SIZE CHUNKING ---
Total Chunks: ${fixedChunks.length}
Average Size: ${Math.round(avgFixed)} characters
Sample Chunk [1]: ${fixedChunks[1]}

--- PARAGRAPH CHUNKING ---
Total Chunks: ${paraChunks.length}
Average Size: ${Math.round(avgPara)} characters
Sample Chunk [2]: ${paraChunks[2]}

--- TASK 4: JUSTIFICATION ---
For ClinTrace AI, paragraph chunking is the superior strategy. Clinical guidelines contain highly structured information where sections (indications, dosages, contraindications) are separated by clear paragraph breaks. Fixed-size chunking arbitrarily cuts midway through crucial medical sentences, which risks separating a drug's dosage amount from its safety warnings. Paragraph chunking ensures each specific medical concept remains intact, preserving the semantic meaning required for accurate retrieval.
`;

fs.writeFileSync('chunking_report.txt', reportContent);
console.log("Comparison complete. Check chunking_report.txt for the stats and justification.");