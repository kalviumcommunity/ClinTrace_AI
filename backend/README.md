# Structured RAG output

`structured-output.js` defines the RAG response contract and builds a model request using JSON Schema response mode:

```json
{"answer":"...","source":"..."}
```

`parseRagResponse` accepts an OpenAI-compatible response (or a text string), parses it, validates both required string fields, and returns a result object instead of throwing. It also recovers JSON surrounded by Markdown fences or short model preambles and marks that result with `recovered: true`.

Run the sample verification with:

```bash
npm test
```

The checked-in [sample-parsed-results.json](sample-parsed-results.json) records valid, malformed-then-recovered, and missing-field cases for the assignment walkthrough.

## Corpus text cleaning

`text-cleaning.js` applies one deterministic pipeline to every document through `cleanCorpus`:

1. Normalize Unicode with NFKC and remove common encoding artifacts.
2. Normalize line endings, whitespace, broken hyphenated line wraps, and blank lines.
3. Remove page markers, navigation lines, and short lines repeated across the corpus.

The checked-in [cleaning-sample-output.json](cleaning-sample-output.json) shows before/after evidence for two documents and records that both received the same cleaner. Run `npm test` to verify the pipeline.