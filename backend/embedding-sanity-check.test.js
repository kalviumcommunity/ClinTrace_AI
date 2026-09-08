const test = require("node:test");
const assert = require("node:assert/strict");
const fixture = require("./embedding-sanity-fixture.json");
const { cosineSimilarity, rankChunks, runSanityChecks } = require("./embedding-sanity-check");

test("ranks related chunks above unrelated chunks", () => {
  const ranking = rankChunks(fixture.queries[0].embedding, fixture.chunks);

  assert.equal(ranking[0].source, "intake-policy.md");
  assert.equal(ranking[0].rank, 1);
  assert.ok(ranking[0].score > ranking[1].score);
});

test("rejects vectors with different dimensions", () => {
  assert.throws(() => cosineSimilarity([1, 0], [1, 0, 0]), /same dimension/);
});

test("reports passes and the known borderline failure", () => {
  const report = runSanityChecks(fixture);

  assert.equal(report.test_count, 4);
  assert.equal(report.pass_count, 3);
  assert.equal(report.failure_count, 1);
  assert.equal(report.results[3].top_ranked_source, "billing-policy.md");
  assert.match(report.results[3].note, /mixed-topic/);
});