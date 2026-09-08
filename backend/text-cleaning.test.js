const test = require("node:test");
const assert = require("node:assert/strict");
const { cleanCorpus, cleanDocument } = require("./text-cleaning");

test("removes page markers and navigation boilerplate", () => {
  const result = cleanDocument(
    "Home | Search\nPage 1 of 2\nClinical  \nnotes\n\n\nBack to top",
  );

  assert.equal(result, "Clinical\nnotes");
});

test("normalizes Unicode, whitespace, blank lines, and wrapped words", () => {
  const result = cleanDocument("Caf\u00e9\u00a0  study\ninter-\nnational   trial\n\n\n\nResults");

  assert.equal(result, "Café study\ninternational trial\n\nResults");
});

test("applies the same repeated-boilerplate rules to every corpus document", () => {
  const result = cleanCorpus([
    {
      id: "doc-a",
      text: "Clinical Research Portal\nPage 1 of 2\n\nPatient safety improved.",
    },
    {
      id: "doc-b",
      text: "Clinical Research Portal\nPage 4 of 6\n\nPatient follow-up is required.",
    },
  ]);

  assert.deepEqual(result, [
    { id: "doc-a", text: "Patient safety improved." },
    { id: "doc-b", text: "Patient follow-up is required." },
  ]);
});

test("rejects invalid corpus input clearly", () => {
  assert.throws(() => cleanCorpus([{ id: "missing-text" }]), /text as a string/);
});