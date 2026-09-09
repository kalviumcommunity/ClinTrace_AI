ClinTrace AI

## LLM API Access & First Completion Call

The backend makes one chat completion request through the OpenAI-compatible API shape. Configuration is loaded from `backend/.env`; no API key is stored in the repository.

1. Copy `backend/.env.example` to `backend/.env`.
2. Set `OPENAI_API_KEY`, `CHAT_MODEL`, and, when needed, `OPENAI_BASE_URL`.
3. Run `npm start --prefix backend`.

The script logs the request messages, complete response payload, and token usage, then prints `choices[0].message.content`. Authentication failures (401) and rate limits or quota failures (429) are reported with human-readable messages.

## Prompt Construction & System/User Roles

Run `npm run prompt:compare --prefix backend` to compare two prompts for the same refund-policy task. The system message defines the assistant's role, policy scope, concise professional tone, and fallback phrase. Each request keeps that system message separate from its user message, which contains the policy excerpt and the question.

The vague variation asks to explain the policy generally. The chosen constrained variation asks for the refund window in days, limits the answer to one sentence, and states what to say when the documentation has no number. The comparison and example outputs are captured in [backend/prompt-comparison-sample.txt](backend/prompt-comparison-sample.txt).

## Token-aware chunking

Run `py scripts/token_chunker.py` to create token-sized retrieval chunks using the `cl100k_base` tokenizer. The configured chunk size is 512 tokens with 64-token overlap. This is conservative for an 8K-class chat context: five retrieved chunks use at most 2,560 content tokens before the prompt and answer, while the 12.5% overlap preserves boundary context without repeating most of each chunk.

The checked-in [scripts/token-chunking-sample-output.json](scripts/token-chunking-sample-output.json) records chunk counts, token ranges, example chunks, and a boundary comparison with and without overlap. Run `py -m unittest scripts/test_token_chunker.py` to verify token sizing and overlap behavior.

## Model parameters & output control

Run `npm run params:compare --prefix backend` after configuring `backend/.env` to send the same grounded prompt with different `temperature`, `max_tokens`, and `stop` settings. The script prints each request's parameters, output, finish reason, and token usage. The checked-in [backend/model-parameters-sample.txt](backend/model-parameters-sample.txt) records the comparison and the recommended settings for a factual RAG answer: low temperature, a task-sized output cap, and an optional stop sequence only when its boundary is reliable.

## Prompt templates & reusable prompt design

The shared template lives in [backend/prompts/answer.js](backend/prompts/answer.js), separate from application logic. It defines named `{context}` and `{question}` placeholders and a renderer for runtime values. The chat history path and prompt-comparison batch feature both reuse it; [backend/prompt-template-sample.txt](backend/prompt-template-sample.txt) shows the template and two filled renders.

## Document loading & multi-format intake

Run `py scripts/document_loader.py data --output scripts/document-loading-report.json` to recursively load PDF, TXT, Markdown, and HTML files into plain-text records. Each loaded record keeps its filename, path, format, and text; unreadable or unsupported files are recorded in `skipped` so one bad document does not stop the corpus. The command reports character counts and an 80-character sample for intake verification. Install dependencies with `py -m pip install -r requirements-token-counting.txt`. The checked-in [scripts/document-loading-sample-output.json](scripts/document-loading-sample-output.json) shows the expected loaded and skipped report shape.
