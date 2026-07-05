/* Tutor chat: streaming Claude replies, quick teaching actions,
   flashcard suggestions extracted from replies. */

import { $, $$, esc, uid, todayISO, toast, mdLite } from "../ui.js";
import { me, hasKey, save, addXP, checkBadges } from "../state.js";
import { refreshHeader } from "../shell.js";
import { claudeStream, tutorSystem } from "../api.js";
import { demoReply } from "../demo.js";

const QUICK_ACTIONS = [
  { label: "🔍 Explain…", needsTopic: true, prompt: t => `Explain ${t} from first principles.` },
  { label: "📖 Tell it as a story", prompt: () => "Take the last concept we discussed and teach it again as a short, memorable story or vivid analogy." },
  { label: "🪝 Give me a mnemonic", prompt: () => "Create a memorable mnemonic or vivid mental image for the key facts we just covered." },
  { label: "🧒 Simpler", prompt: () => "Explain that again more simply, one level down." },
  { label: "🔬 Go deeper", prompt: () => "Go one level deeper on that — full technical detail is welcome." },
  { label: "✅ Check my understanding", prompt: () => "Ask me 2 short questions to check I actually understood what we just covered. Wait for my answers." },
];

let chatBusy = false;

export function renderTutor() {
  const u = me();
  const v = $("#view-tutor");
  v.innerHTML = `
    <div class="spread" style="margin-bottom:4px">
      <h2 style="font-size:19px">💬 Tutor</h2>
      ${hasKey() ? `<span class="tiny">first-principles mode</span>` : `<span class="demo-tag">DEMO MODE</span>`}
    </div>
    <div class="quick-row">
      ${QUICK_ACTIONS.map((a, i) => `<span class="chip" data-qa="${i}">${a.label}</span>`).join("")}
      <span class="chip" id="chat-clear" title="Clear conversation">🧹 Clear</span>
    </div>
    <div class="chatlog" id="chatlog"></div>
    <div class="composer">
      <textarea id="chat-in" placeholder="Ask anything — “why is the sky blue?”, “explain transformers”…"></textarea>
      <button class="btn" id="chat-send" style="height:52px">➤</button>
    </div>`;

  const input = $("#chat-in", v);
  $("#chat-send", v).onclick = () => sendChat(input.value);
  input.onkeydown = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(input.value); } };
  $$("[data-qa]", v).forEach(c => c.onclick = () => {
    const a = QUICK_ACTIONS[+c.dataset.qa];
    if (a.needsTopic) {
      const t = prompt("What topic should I explain from first principles?");
      if (t) sendChat(a.prompt(t));
    } else {
      sendChat(a.prompt());
    }
  });
  $("#chat-clear", v).onclick = () => { u.chat = []; save(); seedGreeting(u); paintChat(); };

  if (u.chat.length === 0) seedGreeting(u);
  paintChat();
}

function seedGreeting(u) {
  u.chat.push({
    id: uid(), role: "assistant",
    content: `Hey ${u.name}! I'm your tutor. I explain things from first principles, adapt to how deep you want to go, and I'll be honest when I'm not sure about something.\n\nAsk me anything${u.interests[0] ? ` — or want to start with something about ${u.interests[0].toLowerCase()}?` : "."}`,
  });
  save();
}

function paintChat(streamingText = null) {
  const u = me();
  const log = $("#chatlog");
  if (!log) return;
  let html = u.chat.map(m => `<div class="msg ${m.role === "user" ? "user" : "bot"}">${mdLite(m.content)}${m.cards?.length ? `
    <div class="savecards" style="margin-top:10px">💾 ${m.cards.length} flashcard${m.cards.length > 1 ? "s" : ""} suggested
      ${m.cardsSaved ? `<b style="color:var(--good)">✓ saved</b>` : `<button class="btn small" data-savecards="${esc(m.id)}">Add to deck</button>`}
    </div>` : ""}</div>`).join("");
  if (streamingText !== null) html += `<div class="msg bot">${mdLite(streamingText)}<span class="cursor"></span></div>`;
  log.innerHTML = html;

  $$("[data-savecards]", log).forEach(b => b.onclick = () => {
    const m = u.chat.find(x => x.id === b.dataset.savecards);
    if (!m || m.cardsSaved) return;
    for (const c of m.cards) {
      u.cards.push({ id: uid(), front: c.front, back: c.back, topic: c.topic || "General", ease: 2.5, interval: 0, reps: 0, due: todayISO(), lapses: 0 });
    }
    m.cardsSaved = true;
    save(); paintChat(); refreshHeader();
    toast(`🃏 ${m.cards.length} card${m.cards.length > 1 ? "s" : ""} added to your deck`);
  });
  window.scrollTo({ top: document.body.scrollHeight });
}

/* the model appends <flashcards>[...]</flashcards> when a reply contains
   retention-worthy facts — pull that out into savable cards */
function extractFlashcards(text) {
  const m = text.match(/<flashcards>([\s\S]*?)<\/flashcards>/);
  if (!m) return { clean: text.trim(), cards: [] };
  let cards = [];
  try {
    cards = JSON.parse(m[1]);
    if (!Array.isArray(cards)) cards = [];
  } catch (e) { /* malformed block — just strip it */ }
  cards = cards.filter(c => c && c.front && c.back).slice(0, 3);
  return { clean: text.replace(m[0], "").trim(), cards };
}

export async function sendChat(text) {
  text = (text || "").trim();
  if (!text || chatBusy) return;
  const u = me();
  const input = $("#chat-in");
  if (input) input.value = "";
  u.chat.push({ id: uid(), role: "user", content: text });
  u.stats.messages++;
  save();
  paintChat();
  chatBusy = true;

  try {
    let reply;
    if (hasKey()) {
      const history = u.chat.slice(-16).map(m => ({ role: m.role, content: m.content }));
      paintChat("");
      reply = await claudeStream({
        system: tutorSystem(u),
        messages: history,
        // hide a partially-streamed flashcards block from the user
        onText: t => paintChat(t.replace(/<flashcards>[\s\S]*$/, "").trim()),
      });
    } else {
      await new Promise(r => setTimeout(r, 500));
      reply = demoReply(text, u);
    }
    const { clean, cards } = extractFlashcards(reply);
    u.chat.push({ id: uid(), role: "assistant", content: clean, cards, cardsSaved: false });
    if (u.chat.length > 60) u.chat = u.chat.slice(-60);
    save();
    paintChat();
    addXP(5, "learning with the tutor");
    checkBadges(u);
  } catch (err) {
    u.chat.push({ id: uid(), role: "assistant", content: `⚠️ ${err.message}` });
    save();
    paintChat();
  } finally {
    chatBusy = false;
  }
}
