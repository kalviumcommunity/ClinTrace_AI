require("dotenv").config();

const OpenAI = require("openai");

const model = process.env.CHAT_MODEL;
const apiKey = process.env.OPENAI_API_KEY;
const baseURL = process.env.OPENAI_BASE_URL;

function getMissingConfiguration() {
  const missing = [];

  if (!apiKey) {
    missing.push("OPENAI_API_KEY");
  }
  if (!model) {
    missing.push("CHAT_MODEL");
  }

  return missing;
}

async function runFirstCompletion() {
  const missing = getMissingConfiguration();
  if (missing.length > 0) {
    throw new Error(`Missing required environment variable(s): ${missing.join(", ")}`);
  }

  const client = new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });
  const messages = [
    { role: "system", content: "You are a concise assistant." },
    { role: "user", content: "Say hello in one sentence." },
  ];

  console.info("REQUEST: %j", { model, messages });

  try {
    const response = await client.chat.completions.create({ model, messages });
    const content = response.choices[0]?.message?.content;

    console.info("RESPONSE: %s", content ?? "<no text returned>");
    console.info("USAGE: %j", response.usage ?? null);

    return response;
  } catch (error) {
    if (error instanceof OpenAI.AuthenticationError) {
      throw new Error("Auth failed (401): check OPENAI_API_KEY in your .env");
    }
    if (error instanceof OpenAI.RateLimitError) {
      throw new Error("Rate limited (429): slow down and retry with backoff");
    }

    throw new Error(`Chat completion failed: ${error.message}`);
  }
}

if (require.main === module) {
  runFirstCompletion().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { runFirstCompletion };