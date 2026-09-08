const PAGE_MARKER = /^(?:page\s+)?\d+\s*(?:of|\/|-)\s*\d+$/i;
const NAVIGATION_LINE = /^(?:home|menu|search|next|previous|back to top|table of contents)(?:\s*[|>]\s*.*)?$/i;

function normalizeLine(line) {
  return line
    .replace(/[\u00a0\u200b\ufeff]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedLines(text) {
  return text
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .replace(/(\p{L})-\n(\p{L})/gu, "$1$2")
    .replace(/\uFFFD/g, "")
    .split("\n")
    .map(normalizeLine);
}

function lineKey(line) {
  return line.toLocaleLowerCase().replace(/\s+/g, " ").trim();
}

function isBoilerplate(line, repeatedLines) {
  const key = lineKey(line);
  return (
    !key ||
    PAGE_MARKER.test(key) ||
    NAVIGATION_LINE.test(key) ||
    (repeatedLines.has(key) && line.length <= 120)
  );
}

function cleanDocument(text, repeatedLines = new Set()) {
  if (typeof text !== "string") {
    throw new TypeError("Document text must be a string");
  }

  const lines = normalizedLines(text).filter(
    (line) => !isBoilerplate(line, repeatedLines),
  );

  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanCorpus(documents) {
  if (!Array.isArray(documents)) {
    throw new TypeError("Documents must be an array");
  }

  const lineCounts = new Map();
  const normalizedDocuments = documents.map((document) => {
    if (typeof document?.text !== "string") {
      throw new TypeError("Each document must contain text as a string");
    }

    const uniqueLines = new Set(
      normalizedLines(document.text).filter(Boolean).map(lineKey),
    );
    uniqueLines.forEach((line) => lineCounts.set(line, (lineCounts.get(line) || 0) + 1));
    return { ...document };
  });

  const repeatedLines = new Set(
    [...lineCounts].filter(([, count]) => count >= 2).map(([line]) => line),
  );

  return normalizedDocuments.map((document) => ({
    ...document,
    text: cleanDocument(document.text, repeatedLines),
  }));
}

module.exports = { cleanCorpus, cleanDocument };