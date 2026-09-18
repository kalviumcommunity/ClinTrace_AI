const test = require("node:test");
const assert = require("node:assert/strict");
const {
  loadEvaluationInputs,
  metricAtK,
  runRetrievalEvaluation,
} = require("./retrieval-evaluation");

test("calculates recall and precision at k from expected chunk IDs", () => {
  const ranking = [
    { chunk_id: "wrong#0" },
    { chunk_id: "expected#0" },
  ];
  assert.deepEqual(metricAtK(ranking, ["expected#0"], 1), {
    k: 1, relevant_retrieved: 0, recall: 0, precision: 0,
  });
  assert.deepEqual(metricAtK(ranking, ["expected#0"], 2), {
    k: 2, relevant_retrieved: 1, recall: 1, precision: 0.5,
  });
});

test("shows reranking recovering the mixed-topic query", () => {
  const report = runRetrievalEvaluation(loadEvaluationInputs());
  const mixed = report.results.find((result) => result.id === "mixed-consent-billing-query");

  assert.equal(report.metrics.vector_only.recall_at_1, 0.75);
  assert.equal(report.metrics.reranked.recall_at_1, 1);
  assert.equal(mixed.vector_only.metrics[0].recall, 0);
  assert.equal(mixed.reranked.metrics[0].recall, 1);
  assert.equal(report.failure_analysis.length, 1);
  assert.match(report.failure_analysis[0].observed, /reranking recovered/);
});