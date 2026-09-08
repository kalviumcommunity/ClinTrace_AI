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

## Embedding a prepared corpus

Copy `.env.example` to `.env` and set `OPENAI_API_KEY`, `EMBEDDING_MODEL`, and optionally `OPENAI_BASE_URL` or `EMBEDDING_DIMENSIONS`. Run `npm run embed:corpus` to send the prepared chunks to the OpenAI-compatible embeddings API. The script stores each complete vector with its source text and retrieval metadata, validates that all vectors have one dimension, and prints the chunk count, vector length, and trimmed vector previews.

The checked-in [embedding-sample-output.json](embedding-sample-output.json) records the same two source chunks and metadata with a 1536-dimensional compatible API response. The preview is trimmed for readability; production records retain the complete vector returned by the API.

## Embedding sanity checks

Run `npm run embedding:sanity` to rank the known fixture chunks with cosine similarity and write [embedding-sanity-report.json](embedding-sanity-report.json). The report contains four known query-source tests, ranked sources, scores, pass/failure counts, and a deliberately mixed-topic borderline case. That failure is useful: it shows that a small corpus can produce an ambiguous vector, so retrieval should be improved with richer chunks or query decomposition before trusting it broadly.

## Model parameters & output control

Run `npm run params:compare` to compare the same grounded prompt at `temperature=0` and `temperature=1.2`, with short and large `max_tokens` caps, and with a `stop` sequence. Every result includes the parameters sent, output text, `finish_reason`, and token usage. The checked-in [model-parameters-sample.txt](model-parameters-sample.txt) contains comparison evidence and the recommendation for grounded answers: use temperature `0` to `0.2`, a task-sized `max_tokens` cap, and `stop` only when a reliable boundary is known. Tune `top_p` instead of temperature rather than tuning both together.

## Prompt templates & reusable prompt design

The reusable prompt is defined in [prompts/answer.js](prompts/answer.js), outside business logic. `renderAnswerPrompt` injects runtime `context` and `question` values into one shared template. `historyManager.js` uses it for the chat path, while `prompt-comparison.js` uses the same renderer for batch comparisons. See [prompt-template-sample.txt](prompt-template-sample.txt) for example renders.