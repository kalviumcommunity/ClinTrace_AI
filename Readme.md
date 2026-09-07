ClinTrace AI

## First chat completion

The backend can make a first request against any OpenAI-compatible chat API.

1. Copy `backend/.env.example` to `backend/.env`.
2. Set `OPENAI_API_KEY` and `CHAT_MODEL`. Set `OPENAI_BASE_URL` to a provider or local runtime endpoint when needed.
3. Run `npm start --prefix backend`.

The command logs the request, generated text, and token usage. It exits with a clear message for missing configuration, invalid credentials (401), or rate limits/quota (429).