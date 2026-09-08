require("dotenv").config();

const OpenAI = require("openai");

const systemMessage = [
  "You are a factual assistant for an internal documentation tool.",
  "Answer only from the supplied documentation.",
  "Be concise and do not invent details.",
].join(" ");

const userMessage = [
  "Documentation excerpt: Eligible customers may request a refund within 30 days of purchase.",
  "Refund requests are reviewed against the policy requirements.",
  "What is the refund window, and what happens after a request is submitted?",
].join("\n\n");

const parameterExperiments = [
  { name: "temperature=0", temperature: 0 },
  { name: "temperature=1.2", temperature: 1.2 },
  { name: "max_tokens=12", max_tokens: 12 },
  { name: "max_tokens=80", max_tokens: 80 },
  { name: "stop=blank-line", stop: ["\n\n"] },
];

function getConfiguration(environment = process.env) {
  const missing = ["OPENAI_API_KEY", "CHAT_MODEL"].filter(
    (name) => !environment[name],
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}`,
    );
  }

  return {
    apiKey: environment.OPENAI_API_KEY,
    baseURL: environment.OPENAI_BASE_URL,
    model: environment.CHAT_MODEL,
  };
}

function createClient({ apiKey, baseURL }) {
  return new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });
}

async function runExperiment(client, model, experiment) {
  const request = {
    model,
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage },
    ],
    ...Object.fromEntries(
      Object.entries(experiment).filter(([key]) => key !== "name"),
    ),
  };

  const response = await client.chat.completions.create(request);
  const choice = response.choices[0] ?? {};

  return {
    name: experiment.name,
    parameters: Object.fromEntries(
      Object.entries(request).filter(([key]) =>
        ["temperature", "max_tokens", "stop", "top_p"].includes(key),
      ),
    ),
    output: choice.message?.content ?? "<no text returned>",
    finish_reason: choice.finish_reason ?? null,
    usage: response.usage ?? null,
  };
}

async function runParameterExperiments(
  client,
  model,
  experiments = parameterExperiments,
) {
  const results = [];

  for (const experiment of experiments) {
    results.push(await runExperiment(client, model, experiment));
  }

  return results;
}

async function compareParameters() {
  const configuration = getConfiguration();
  const results = await runParameterExperiments(
    createClient(configuration),
    configuration.model,
  );

  console.log("MODEL PARAMETER COMPARISON");
  for (const result of results) {
    console.log(`\n${result.name}`);
    console.log(`parameters: ${JSON.stringify(result.parameters)}`);
    console.log(`output: ${result.output}`);
    console.log(`finish_reason: ${result.finish_reason}`);
    console.log(`usage: ${JSON.stringify(result.usage)}`);
  }
  console.log(
    "\nRecommendation: use temperature=0 to 0.2, a task-sized max_tokens cap, and stop only when a reliable boundary is known. Tune top_p instead of temperature, not alongside it.",
  );

  return results;
}

if (require.main === module) {
  compareParameters().catch((error) => {
    if (error instanceof OpenAI.AuthenticationError) {
      console.error("Auth failed (401): check OPENAI_API_KEY in your .env");
    } else if (error instanceof OpenAI.RateLimitError) {
      console.error("Rate limited (429): slow down and retry with backoff");
    } else {
      console.error(`Parameter experiment failed: ${error.message}`);
    }
    process.exitCode = 1;
  });
}

module.exports = {
  compareParameters,
  getConfiguration,
  parameterExperiments,
  runExperiment,
  runParameterExperiments,
  systemMessage,
  userMessage,
};