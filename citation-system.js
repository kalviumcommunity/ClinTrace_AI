// citation-system.js

function buildCitationMap(chunks) {
    const citationMap = {};

    chunks.forEach((chunk, index) => {
        const metadata = chunk.metadata || {};

        citationMap[`[${index + 1}]`] = {
            source: metadata.source || "Unknown source",
            chunk_id: metadata.chunk_id || chunk.id || null,
            chunk_index: metadata.chunk_index ?? null,
            page: metadata.page ?? null,
            section: metadata.section || null,
            text: chunk.text || ""
        };
    });

    return citationMap;
}


function buildCitedPrompt(question, chunks) {
    if (!chunks || chunks.length === 0) {
        return `
Answer the question only if sufficient source information is available.

If there is not enough information, say:
"I don't have enough information in the provided sources."

Do not invent citations.

Question:
${question}
`;
    }

    const context = chunks.map((chunk, index) => {
        const metadata = chunk.metadata || {};

        return `[${index + 1}]
Source: ${metadata.source || "Unknown source"}
Chunk: ${metadata.chunk_id || chunk.id || "Unknown"}
Section: ${metadata.section || "Unknown"}

${chunk.text || ""}`;
    }).join("\n\n");

    return `
Answer the question using ONLY the sources below.

Rules:
1. Cite factual claims using [1], [2], etc.
2. Use only citation numbers provided in the context.
3. Never invent a citation.
4. If the sources do not contain enough information, say:
   "I don't have enough information in the provided sources."
5. Do not use outside knowledge.

Context:
${context}

Question:
${question}

Answer:
`;
}


function verifyCitation(citation, citationMap) {
    if (!citationMap[citation]) {
        return {
            verified: false,
            message: "Citation not found."
        };
    }

    return {
        verified: true,
        citation: citation,
        source: citationMap[citation].source,
        chunk_id: citationMap[citation].chunk_id,
        chunk_index: citationMap[citation].chunk_index,
        page: citationMap[citation].page,
        section: citationMap[citation].section,
        original_text: citationMap[citation].text
    };
}


function answerWithCitations(question, chunks, generatedAnswer) {
    if (!chunks || chunks.length === 0) {
        return {
            answer: "I don't have enough information in the provided sources.",
            citations: {}
        };
    }

    const citations = buildCitationMap(chunks);

    return {
        answer: generatedAnswer,
        citations: citations
    };
}


// --------------------------------------------------
// SAMPLE DATA
// --------------------------------------------------

const sampleChunks = [
    {
        id: "chunk_001",
        text: "A minimum spanning tree connects all vertices of a connected weighted graph with minimum total weight.",
        metadata: {
            source: "algorithms.txt",
            chunk_id: "chunk_001",
            chunk_index: 0,
            section: "Minimum Spanning Trees"
        }
    },

    {
        id: "chunk_002",
        text: "Prim's algorithm grows a spanning tree by repeatedly choosing the minimum-weight edge crossing the current cut.",
        metadata: {
            source: "algorithms.txt",
            chunk_id: "chunk_002",
            chunk_index: 1,
            section: "Prim's Algorithm"
        }
    }
];


// --------------------------------------------------
// SAMPLE CITED ANSWER
// --------------------------------------------------

const answer =
    "A minimum spanning tree connects all vertices with minimum total weight [1]. " +
    "Prim's algorithm repeatedly selects the minimum-weight edge crossing the current cut [2].";

const result = answerWithCitations(
    "What is Prim's algorithm?",
    sampleChunks,
    answer
);

console.log("ANSWER:");
console.log(result.answer);

console.log("\nCITATIONS:");

Object.entries(result.citations).forEach(([citation, details]) => {
    console.log(
        `${citation} -> ${details.source}, ${details.chunk_id}`
    );
});


// --------------------------------------------------
// VERIFY CITATION
// --------------------------------------------------

console.log("\nVERIFY [2]:");

const verification = verifyCitation(
    "[2]",
    result.citations
);

console.log(verification);


// --------------------------------------------------
// NO-SOURCE FALLBACK
// --------------------------------------------------

console.log("\nNO-SOURCE FALLBACK:");

const fallback = answerWithCitations(
    "What is Dijkstra's algorithm?",
    [],
    ""
);

console.log(fallback.answer);


// --------------------------------------------------
// EXPORT FUNCTIONS
// --------------------------------------------------

module.exports = {
    buildCitationMap,
    buildCitedPrompt,
    verifyCitation,
    answerWithCitations
};