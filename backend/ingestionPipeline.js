// backend/ingestionPipeline.js
const fs = require('fs');
const path = require('path');

// --- SETUP: Create a mock corpus for testing ---
const corpusDir = path.join(__dirname, 'mock_corpus');
if (!fs.existsSync(corpusDir)) fs.mkdirSync(corpusDir);

fs.writeFileSync(path.join(corpusDir, 'policy_A.txt'), 'Header\n\nDrug A is safe.\n\nFooter boilerplate.');
fs.writeFileSync(path.join(corpusDir, 'policy_B.txt'), 'Header\n\nDrug B causes drowsiness.\n\nFooter boilerplate.');
// Simulating a corrupt file that throws an error during processing
fs.writeFileSync(path.join(corpusDir, 'corrupt_policy.txt'), 'CORRUPT_DATA_FLAG'); 

// --- PIPELINE FUNCTIONS ---
function loadText(filePath) {
    const text = fs.readFileSync(filePath, 'utf8');
    if (text === 'CORRUPT_DATA_FLAG') throw new Error("File encoding error: Corrupt data detected.");
    return text;
}

function cleanText(text) {
    // Remove mock headers and footers
    return text.replace('Header', '').replace('Footer boilerplate.', '').trim();
}

function chunkText(text) {
    return text.split("\n\n").map(p => p.trim()).filter(p => p.length > 0);
}

function tagChunks(source, chunks) {
    return chunks.map((chunk, index) => ({
        text: chunk,
        metadata: {
            source: source,
            chunk_index: index,
            processed_at: new Date().toISOString()
        }
    }));
}

// --- MAIN INGESTION LOOP ---
function ingestCorpus(folder) {
    let docsIngested = 0;
    const allChunks = [];
    const failures = [];

    const files = fs.readdirSync(folder).filter(f => f.endsWith('.txt'));

    for (const file of files) {
        const filePath = path.join(folder, file);
        try {
            // Task 1: Run the full pipeline end to end
            const rawText = loadText(filePath);
            const cleaned = cleanText(rawText);
            const chunks = chunkText(cleaned);
            const tagged = tagChunks(file, chunks);

            allChunks.push(...tagged);
            docsIngested++;
        } catch (error) {
            failures.push({ file: file, error: error.message });
        }
    }

    return { totalFiles: files.length, docsIngested, allChunks, failures };
}

// --- EXECUTION & VALIDATION ---
const result = ingestCorpus(corpusDir);

// Task 3: Validate Completeness
const isComplete = (result.docsIngested + result.failures.length) === result.totalFiles;
if (!isComplete) {
    console.error("FATAL ERROR: A document was silently dropped!");
    process.exit(1);
}

// Task 2 & 4: Report summary and inspect sample chunks
const reportContent = `
INGESTION PIPELINE VALIDATION REPORT

--- TASK 2: INGESTION SUMMARY ---
Total Source Documents: ${result.totalFiles}
Successfully Ingested: ${result.docsIngested}
Total Chunks Created: ${result.allChunks.length}
Failures: ${result.failures.length}

--- FAILED FILES ---
${result.failures.map(f => `- ${f.file}: ${f.error}`).join('\n')}

--- TASK 3: VALIDATION CHECK ---
Validation Passed: ${isComplete} (Ingested + Failures == Total Source Documents)

--- TASK 4: SAMPLE CHUNKS ---
${JSON.stringify(result.allChunks.slice(0, 2), null, 2)}
`;

fs.writeFileSync('ingestion_report.txt', reportContent);
console.log("Ingestion complete. Validation passed. Check ingestion_report.txt.");