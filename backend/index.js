require("dotenv").config();

const OpenAI = require("openai");

const messages = [
  { role: "system", content: "You are a concise assistant." },
  { role: "user", content: "Say hello in one sentence." },
];

function getRequiredEnvironment() {
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

async function runFirstCompletion() {
  const { apiKey, baseURL, model } = getRequiredEnvironment();
  const client = new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });

  console.info("REQUEST messages: %j", messages);

  try {
    const response = await client.chat.completions.create({ model, messages });
    const reply = response.choices[0]?.message?.content;

    console.info("RESPONSE: %j", response);
    console.info("USAGE: %j", response.usage ?? null);
    console.log(reply ?? "<no text returned>");

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