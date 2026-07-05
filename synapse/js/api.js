/* Claude API client (raw fetch — this is a buildless browser app).
   The key is user-supplied, kept in localStorage, and sent only to Anthropic.
   Streaming for tutoring; structured outputs (json_schema) for quizzes/paths. */

import { S, AUDIENCES } from "./state.js";

const API_URL = "https://api.anthropic.com/v1/messages";

function headers() {
  return {
    "content-type": "application/json",
    "x-api-key": S.settings.apiKey.trim(),
    "anthropic-version": "2023-06-01",
    // required for CORS calls straight from the browser
    "anthropic-dangerous-direct-browser-access": "true",
  };
}

export function tutorSystem(u) {
  return `You are Synapse, a warm, brilliant personal tutor. Your student is ${u.name}, ${AUDIENCES[u.audience].prompt}
Their stated goals: ${u.goals.join("; ") || "none stated"}. Their interests: ${u.interests.join(", ") || "unknown"} — use these for analogies and examples when natural.

Teaching principles:
- Explain from FIRST PRINCIPLES by default: start from the most basic truths and build up, rather than asserting conclusions. Go genuinely deep on technical concepts when the student can handle it — never dumb things down below their level.
- Build ASSOCIATIONS: anchor new ideas to things the student already knows. Offer a vivid analogy, story, or mnemonic for anything worth remembering long-term.
- Be interactive: end most replies with ONE short question that checks understanding or invites the next step. Don't interrogate — guide.
- HONESTY IS NON-NEGOTIABLE: if you are not sure about a fact, say "I'm not certain about this" explicitly rather than guessing. Never fabricate numbers, citations, or details.
- Keep replies digestible: roughly 100-250 words unless the student asks to go deeper.
- Use plain text with occasional **bold** for key terms. No headers or bullet-list walls.

When (and only when) your reply contains 1-3 facts genuinely worth long-term retention, append this exact block at the very end:
<flashcards>[{"front":"question","back":"concise answer","topic":"short topic"}]</flashcards>
The app turns these into spaced-repetition cards. Keep fronts as questions, backs under 40 words. Skip the block for chit-chat or meta questions.`;
}

export async function claudeStream({ system, messages, onText }) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model: S.settings.model,
      max_tokens: 16000,
      stream: true,
      thinking: { type: "adaptive" },
      system, messages,
    }),
  });
  if (!res.ok) throw await apiError(res);

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data) continue;
      let ev;
      try { ev = JSON.parse(data); } catch (e) { continue; }
      if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") {
        full += ev.delta.text;
        onText(full);
      }
      if (ev.type === "error") throw new Error(ev.error?.message || "stream error");
    }
  }
  return full;
}

export async function claudeJSON({ system, prompt, schema }) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model: S.settings.model,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system,
      messages: [{ role: "user", content: prompt }],
      output_config: { format: { type: "json_schema", schema } },
    }),
  });
  if (!res.ok) throw await apiError(res);
  const body = await res.json();
  if (body.stop_reason === "refusal") throw new Error("The model declined this request.");
  const text = (body.content || []).find(b => b.type === "text")?.text;
  return JSON.parse(text);
}

async function apiError(res) {
  let msg = `API error ${res.status}`;
  try {
    const j = await res.json();
    msg = j.error?.message || msg;
  } catch (e) { /* non-JSON error body */ }
  if (res.status === 401) msg = "Invalid API key — check Settings.";
  if (res.status === 429) msg = "Rate limited — wait a moment and try again.";
  return new Error(msg);
}

/* ---------------- structured output schemas ---------------- */
export const QUIZ_SCHEMA = {
  type: "object",
  properties: {
    topic: { type: "string" },
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          q: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          answer: { type: "integer" },
          explain: { type: "string" },
        },
        required: ["q", "options", "answer", "explain"],
        additionalProperties: false,
      },
    },
  },
  required: ["topic", "questions"],
  additionalProperties: false,
};

export const PATH_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    why: { type: "string" },
    milestones: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          topics: { type: "array", items: { type: "string" } },
        },
        required: ["title", "topics"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "why", "milestones"],
  additionalProperties: false,
};
