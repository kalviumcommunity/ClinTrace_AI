const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getConfiguration,
  runParameterExperiments,
} = require("./model-parameters");

test("reads chat settings from environment configuration", () => {
  assert.deepEqual(
    getConfiguration({
      OPENAI_API_KEY: "test-key",
      OPENAI_BASE_URL: "https://example.test/v1",
      CHAT_MODEL: "chat-test",
    }),
    {
      apiKey: "test-key",
      baseURL: "https://example.test/v1",
      model: "chat-test",
    },
  );
});

test("passes each parameter experiment to the chat completion request", async () => {
  const requests = [];
  const client = {
    chat: {
      completions: {
        create: async (request) => {
          requests.push(request);
          return {
            choices: [
              {
                message: { content: `response ${requests.length}` },
                finish_reason: "stop",
              },
            ],
            usage: { completion_tokens: requests.length },
          };
        },
      },
    },
  };

  const results = await runParameterExperiments(client, "chat-test", [
    { name: "low temperature", temperature: 0.1 },
    { name: "short cap", max_tokens: 12 },
    { name: "stop sequence", stop: ["END"] },
  ]);

  assert.deepEqual(
    requests.map(({ temperature, max_tokens, stop }) => ({
      temperature,
      max_tokens,
      stop,
    })),
    [
      { temperature: 0.1, max_tokens: undefined, stop: undefined },
      { temperature: undefined, max_tokens: 12, stop: undefined },
      { temperature: undefined, max_tokens: undefined, stop: ["END"] },
    ],
  );
  assert.equal(results[0].output, "response 1");
  assert.equal(results[2].finish_reason, "stop");
  assert.deepEqual(results[1].usage, { completion_tokens: 2 });
});