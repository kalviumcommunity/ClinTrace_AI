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
