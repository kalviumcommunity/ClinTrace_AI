ClinTrace AI -

## LLM API Access & First Completion Call

The backend makes one chat completion request through the OpenAI-compatible API shape. Configuration is loaded from `backend/.env`; no API key is stored in the repository.

1. Copy `backend/.env.example` to `backend/.env`.
2. Set `OPENAI_API_KEY`, `CHAT_MODEL`, and, when needed, `OPENAI_BASE_URL`.
3. Run `npm start --prefix backend`.

The script logs the request messages, complete response payload, and token usage, then prints `choices[0].message.content`. Authentication failures (401) and rate limits or quota failures (429) are reported with human-readable messages.

