const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { ChromaClient } = require("chromadb");
const { cleanDocument } = require("./text-cleaning");
const { embedCorpus } = require("./embed-corpus");
const { embedQuery } = require("./vector-store-retrieval");

const SUPPORTED_EXTENSIONS = new Set([".txt", ".md"]);
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

class UploadError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = "UploadError";
    this.statusCode = statusCode;
  }
}

function splitIntoChunks(text, maxCharacters = 1200) {
  const paragraphs = text.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const chunks = [];

  for (const paragraph of paragraphs) {
    for (let offset = 0; offset < paragraph.length; offset += maxCharacters) {
      chunks.push(paragraph.slice(offset, offset + maxCharacters));
    }
  }
  return chunks;
}

function extensionFor(filename) {
  return path.extname(filename || "").toLowerCase();
}

class RuntimeKnowledgeBase {
  constructor({
    embeddingClient,
    embeddingModel = process.env.EMBEDDING_MODEL || "text-embedding-3-small",
    collection,
    chromaClient,
    collectionName = process.env.CHROMA_COLLECTION || "clintrace_runtime_chunks",
    uploadDir = path.join(__dirname, "uploads"),
    maxBytes = DEFAULT_MAX_BYTES,
  } = {}) {
    this.embeddingClient = embeddingClient;
    this.embeddingModel = embeddingModel;
    this.collection = collection;
    this.chromaClient = chromaClient;
    this.collectionName = collectionName;
    this.uploadDir = uploadDir;
    this.maxBytes = maxBytes;
  }

  async getCollection() {
    if (this.collection) return this.collection;
    this.chromaClient ||= new ChromaClient({ path: process.env.CHROMA_URL || "http://localhost:8000" });
    this.collection = await this.chromaClient.getOrCreateCollection({
      name: this.collectionName,
      metadata: { "hnsw:space": "cosine" },
    });
    return this.collection;
  }

  validateUpload(file) {
    if (!file) throw new UploadError(400, "A document file is required in the 'document' field");
    if (!SUPPORTED_EXTENSIONS.has(extensionFor(file.originalname))) {
      throw new UploadError(415, "Unsupported format. Upload a .txt or .md document");
    }
    if (!file.buffer?.length) throw new UploadError(400, "The uploaded document is empty");
    if (file.buffer.length > this.maxBytes) {
      throw new UploadError(413, `The uploaded document exceeds the ${this.maxBytes} byte limit`);
    }
  }

  async ingest(file) {
    this.validateUpload(file);
    await fs.mkdir(this.uploadDir, { recursive: true });

    const extension = extensionFor(file.originalname);
    const storedName = `${crypto.randomUUID()}${extension}`;
    const storedPath = path.join(this.uploadDir, storedName);
    await fs.writeFile(storedPath, file.buffer, { flag: "wx" });

    try {
      const rawText = file.buffer.toString("utf8");
      const cleanedText = cleanDocument(rawText);
      if (!cleanedText) throw new UploadError(400, "The uploaded document contains no readable text");

      const chunks = splitIntoChunks(cleanedText).map((text, chunkIndex) => ({
        text,
        metadata: {
          source_document: file.originalname,
          stored_name: storedName,
          chunk_index: chunkIndex,
          processed_at: new Date().toISOString(),
        },
      }));
      const records = await embedCorpus(chunks, this.embeddingClient, { model: this.embeddingModel });
      const collection = await this.getCollection();
      await collection.upsert({
        ids: records.map((_, index) => `${storedName}-chunk-${index}`),
        embeddings: records.map((record) => record.embedding),
        metadatas: records.map((record) => record.metadata),
        documents: records.map((record) => record.text),
      });

      return {
        filename: file.originalname,
        stored_name: storedName,
        chunks_created: records.length,
        embedding_dimension: records[0].embedding.length,
        indexed: true,
      };
    } catch (error) {
      await fs.rm(storedPath, { force: true });
      if (error instanceof UploadError) throw error;
      throw new UploadError(500, `Document processing failed: ${error.message}`);
    }
  }

  async search(query, k = 5) {
    if (!query || typeof query !== "string" || !query.trim()) {
      throw new UploadError(400, "Query is required");
    }
    if (!Number.isInteger(k) || k < 1 || k > 100) {
      throw new UploadError(400, "k must be an integer between 1 and 100");
    }
    const queryEmbedding = await embedQuery(query.trim(), this.embeddingClient, this.embeddingModel);
    const result = await (await this.getCollection()).query({
      queryEmbeddings: [queryEmbedding],
      nResults: k,
      include: ["documents", "metadatas", "distances"],
    });
    return (result.documents?.[0] || []).map((text, index) => ({
      text,
      metadata: result.metadatas?.[0]?.[index] || {},
      score: result.distances?.[0]?.[index] === undefined ? null : Number((1 - result.distances[0][index]).toFixed(6)),
    }));
  }
}

module.exports = {
  DEFAULT_MAX_BYTES,
  RuntimeKnowledgeBase,
  SUPPORTED_EXTENSIONS,
  UploadError,
  splitIntoChunks,
};