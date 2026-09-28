// backend/ragEvaluation.js
const fs = require('fs');

// Task 1: Prepare a test set with expected answers and sources
const testSet = [
    {
        question: "What evidence is required for project submission?",
        expected_points: ["PR link", "sample output", "video explanation"],
        expected_sources: ["submission-rubric.md"]
    },
    {
        question: "What should the system do when context is missing?",
        expected_points: ["refuse", "say not enough information"],
        expected_sources: ["guardrails.md"]
    }
];

// Mock RAG Pipeline (Simulating Retrieval and LLM Generation)
function mockRagPipeline(question) {
    if (question.includes("submission")) {
        // Simulating a successful retrieval and grounded generation
        return {
            answer: "For project submission, you must provide a PR link, a video explanation, and sample output.",
            citations: ["submission-rubric.md"]
        };
    } else if (question.includes("context is missing")) {
        // Simulating a system failure: hallucination and incorrect citation
        return {
            answer: "When context is missing, the system should guess the answer based on its training data.",
            citations: ["general-tips.md"] 
        };
    }
    return { answer: "I don't know.", citations: [] };
}

// Task 2: Score correctness and grounding
function judgeCorrectness(answer, expected_points) {
    const lowered = answer.toLowerCase();
    const matches = expected_points.filter(pt => lowered.includes(pt.toLowerCase()));
    return matches.length / expected_points.length; // Returns a score from 0.0 to 1.0
}

function judgeGrounding(answer, citations) {
    // An ungrounded answer includes fabricated details not pulled from the retrieved content.
    // If the model generates a phrase explicitly violating the rules, grounding is 0.
    if (answer.includes("guess the answer")) return 0.0;
    return citations.length > 0 ? 1.0 : 0.0;
}

// Task 3: Check citation accuracy
function checkCitations(citations, expected_sources) {
    // Verifies whether the cited source matches the expected authoritative source.
    const valid = citations.filter(c => expected_sources.includes(c));
    return citations.length === 0 ? 0.0 : valid.length / citations.length;
}

function scoreAnswer(example) {
    const result = mockRagPipeline(example.question);

    const correctness = judgeCorrectness(result.answer, example.expected_points);
    const grounding = judgeGrounding(result.answer, result.citations);
    const citation_accuracy = checkCitations(result.citations, example.expected_sources);

    return {
        question: example.question,
        generated_answer: result.answer,
        correctness,
        grounding,
        citation_accuracy,
        actual_citations: result.citations
    };
}

function runEvaluation() {
    console.log("Running RAG Evaluation...");
    const rows = testSet.map(scoreAnswer);

    // Task 4: Summarize quality and notable failures
    const summary = {
        total_questions: rows.length,
        avg_correctness: rows.reduce((acc, r) => acc + r.correctness, 0) / rows.length,
        avg_grounding: rows.reduce((acc, r) => acc + r.grounding, 0) / rows.length,
        avg_citation_accuracy: rows.reduce((acc, r) => acc + r.citation_accuracy, 0) / rows.length,
        failures: rows.filter(r => Math.min(r.correctness, r.grounding, r.citation_accuracy) < 1)
    };

    const reportContent = `
RAG EVALUATION & ANSWER QUALITY REPORT

--- OVERALL SUMMARY ---
Total Questions Evaluated: ${summary.total_questions}
Average Correctness: ${(summary.avg_correctness * 100).toFixed(0)}%
Average Groundedness: ${(summary.avg_grounding * 100).toFixed(0)}%
Average Citation Accuracy: ${(summary.avg_citation_accuracy * 100).toFixed(0)}%

--- TASK 4: NOTABLE FAILURES & LIKELY CAUSES ---
${summary.failures.map(f => `
Question: "${f.question}"
Generated Answer: "${f.generated_answer}"
Scores -> Correctness: ${f.correctness}, Grounding: ${f.grounding}, Citation Accuracy:${f.citation_accuracy}
Likely Cause: The system failed to trigger its refusal guardrails and generated an ungrounded hallucination. It surfaced a weak, unrelated source ("general-tips.md") rather than the expected strict protocol document. 
`).join('')}

--- DETAILED RESULTS ---
${JSON.stringify(rows, null, 2)}
`;

    fs.writeFileSync('rag_evaluation_report.txt', reportContent);
    console.log("Evaluation complete. Results saved to rag_evaluation_report.txt.");
}

runEvaluation();