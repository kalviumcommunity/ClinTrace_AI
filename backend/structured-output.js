const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["answer", "source"],
  properties: {
    answer: { type: "string" },
    source: { type: "string" },
  },
};

function buildRagRequest(question, context) {
  return {
    messages: [
      {
        role: "system",
        content:
          "Answer using the supplied context. Return only valid JSON matching the response schema. Do not wrap it in Markdown fences.",
      },
      {
        role: "user",
        content: `Question: ${question}\n\nContext:\n${context}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "rag_answer",
        strict: true,
        schema: RESPONSE_SCHEMA,
      },
    },
  };
}

function extractContent(response) {
  if (typeof response === "string") return response;

  const content = response?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((part) => typeof part?.text === "string")
      .map((part) => part.text)
      .join("");
  }

  throw new Error("Model response did not contain message content");
}

function recoverJsonText(text) {
  const withoutFence = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch {
    const objectStart = withoutFence.indexOf("{");
    const objectEnd = withoutFence.lastIndexOf("}");
    if (objectStart >= 0 && objectEnd > objectStart) {
      try {
        return JSON.parse(withoutFence.slice(objectStart, objectEnd + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function parseRagResponse(response) {
  let content;
  try {
    content = extractContent(response);
  } catch (error) {
    return {
      ok: false,
      error: `Invalid model response: ${error.message}`,
      recovered: false,
    };
  }

  const value = recoverJsonText(content);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      ok: false,
      error: "Malformed JSON: expected an object with answer and source fields",
      recovered: false,
    };
  }

  const missingFields = ["answer", "source"].filter(
    (field) => typeof value[field] !== "string" || value[field].trim() === "",
  );
  if (missingFields.length > 0) {
    return {
      ok: false,
      error: `Validation failed: missing required field(s): ${missingFields.join(", ")}`,
      recovered: false,
    };
  }

  return {
    ok: true,
    data: { answer: value.answer.trim(), source: value.source.trim() },
    recovered: content.trim() !== JSON.stringify(value),
  };
}

module.exports = {
  RESPONSE_SCHEMA,
  buildRagRequest,
  parseRagResponse,
};