const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { RuntimeKnowledgeBase, UploadError } = require("./runtimeKnowledgeBase");

function fakeEmbeddings() {
  return {
    embeddings: {
      create: async ({ input }) => {
        const values = Array.isArray(input) ? input : [input];
        return {
          data: values.map((value) => ({
            embedding: value.toLowerCase().includes("retention") ? [1, 0, 0] : [0, 1, 0],
          })),
        };
      },
    },
  };
}

function fakeCollection() {
  const records = new Map();
  return {
    async upsert({ ids, embeddings, metadatas, documents }) {
      ids.forEach((id, index) => records.set(id, {
        embedding: embeddings[index], metadata: metadatas[index], text: documents[index],
      }));
    },
    async query({ queryEmbeddings, nResults }) {
      const query = queryEmbeddings[0];
      const ranked = [...records.values()]
        .map((record) => ({ ...record, distance: 1 - query.reduce((sum, value, index) => sum + value * record.embedding[index], 0) }))
        .sort((left, right) => left.distance - right.distance)
        .slice(0, nResults);
      return {
        documents: [ranked.map((record) => record.text)],
        metadatas: [ranked.map((record) => record.metadata)],
        distances: [ranked.map((record) => record.distance)],
      };
    },
  };
}

test("uploaded content is embedded, indexed, and searchable without rebuilding the service", async () => {
  const uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), "runtime-kb-"));
  const knowledgeBase = new RuntimeKnowledgeBase({
    embeddingClient: fakeEmbeddings(),
    embeddingModel: "test-model",
    collection: fakeCollection(),
    uploadDir,
  });

  const summary = await knowledgeBase.ingest({
    originalname: "retention-policy.md",
    buffer: Buffer.from("Retention policy\n\nRecords are retained for seven years."),
  });
  const results = await knowledgeBase.search("How long is the retention period?", 1);

  assert.equal(summary.indexed, true);
  assert.equal(summary.chunks_created, 1);
  assert.match(results[0].text, /seven years/);
  assert.equal(results[0].metadata.source_document, "retention-policy.md");
  await fs.rm(uploadDir, { recursive: true, force: true });
});

test("rejects unsupported and empty uploads with clear client errors", async () => {
  const knowledgeBase = new RuntimeKnowledgeBase({ collection: fakeCollection() });

  await assert.rejects(
    knowledgeBase.ingest({ originalname: "policy.pdf", buffer: Buffer.from("content") }),
    (error) => error instanceof UploadError && error.statusCode === 415 && /Unsupported format/.test(error.message),
  );
  await assert.rejects(
    knowledgeBase.ingest({ originalname: "empty.txt", buffer: Buffer.alloc(0) }),
    (error) => error instanceof UploadError && error.statusCode === 400 && /empty/.test(error.message),
  );
});

test("rejects oversized uploads before writing them", async () => {
  const uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), "runtime-kb-limit-"));
  const knowledgeBase = new RuntimeKnowledgeBase({ collection: fakeCollection(), uploadDir, maxBytes: 4 });

  await assert.rejects(
    knowledgeBase.ingest({ originalname: "large.txt", buffer: Buffer.from("12345") }),
    (error) => error instanceof UploadError && error.statusCode === 413 && /exceeds/.test(error.message),
  );
  assert.deepEqual(await fs.readdir(uploadDir), []);
  await fs.rm(uploadDir, { recursive: true, force: true });
});