require("dotenv").config();

const OpenAI = require("openai");
const {
  GROUNDING_SYSTEM_PROMPT,
  renderAnswerPrompt,
} = require("./prompts/answer");

const systemMessage = GROUNDING_SYSTEM_PROMPT;

const policyContext =
  "Documentation excerpt: Eligible customers may request a refund within 30 days of purchase. Refund requests are reviewed against the policy requirements.";

const promptVariations = [
  {
    name: "Vague prompt",
    content: renderAnswerPrompt({
      context: policyContext,
      question: "Explain our refund policy.",
    }),
  },
  {
    name: "Clear constrained prompt",
    content: renderAnswerPrompt({
      context: policyContext,
      question:
        "In one sentence, state the refund window in days. If the documentation does not give a number, say that you don't know.",
    }),
  },
];

function getConfiguration() {
  const missing = ["OPENAI_API_KEY", "CHAT_MODEL"].filter(
    (name) => !process.env[name],
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}`,
    );
  }

  return {
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
    model: process.env.CHAT_MODEL,
  };
}

function createClient({ apiKey, baseURL }) {
  return new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });
}

async function requestVariation(client, model, variation) {
  const messages = [
    { role: "system", content: systemMessage },
    { role: "user", content: variation.content },
  ];

  console.info("REQUEST [%s]: %j", variation.name, messages);

  try {
    const response = await client.chat.completions.create({ model, messages });
    const output = response.choices[0]?.message?.content ?? "<no text returned>";

    console.info("RESPONSE [%s]: %j", variation.name, response);
    console.info("USAGE [%s]: %j", variation.name, response.usage ?? null);

    return { ...variation, messages, output, response };
  } catch (error) {
    if (error instanceof OpenAI.AuthenticationError) {
      throw new Error("Auth failed (401): check OPENAI_API_KEY in your .env");
    }
    if (error instanceof OpenAI.RateLimitError) {
      throw new Error("Rate limited (429): slow down and retry with backoff");
    }

    throw new Error(`Prompt comparison failed: ${error.message}`);
  }
}

async function comparePrompts() {
  const configuration = getConfiguration();
  const client = createClient(configuration);
  const results = [];

  for (const variation of promptVariations) {
    results.push(await requestVariation(client, configuration.model, variation));
  }

  console.log("\nPROMPT COMPARISON");
  for (const result of results) {
    console.log(`${result.name}: ${result.output}`);
  }
  console.log(
    "Chosen prompt: Clear constrained prompt. It names the task, requires a one-sentence answer in days, and defines the fallback when the documentation is insufficient.",
  );

  return results;
}

if (require.main === module) {
  comparePrompts().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  comparePrompts,
  createClient,
  policyContext,
  promptVariations,
  systemMessage,
};