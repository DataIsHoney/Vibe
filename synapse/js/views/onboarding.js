/* Onboarding wizard: name/avatar → level → goals → interests → API key.
   Every step (after the first) offers Back. Goals use suggestion chips +
   a custom-add field; interests are a free-text prompt (most real interests
   don't fit a 10-item pick-list) with suggestion chips as tap-to-insert
   inspiration rather than the primary interaction. */

import { $, $$, esc, toast, burst } from "../ui.js";
import { S, save, newUser, AUDIENCES } from "../state.js";
import { enterApp } from "../shell.js";
import { go } from "../router.js";

const OB = { step: 0, name: "", emoji: "🦊", audience: "adult", goals: [], interests: [], key: "", goalDraft: "", interestsText: "" };
const OB_EMOJIS = ["🦊", "🐙", "🦉", "🐯", "🦄", "🐸", "🚀", "🌟"];
const GOAL_SUGGESTIONS = ["Get better at math", "Understand AI & how LLMs work", "Learn to code", "Personal finance & investing", "Physics from first principles", "History that sticks", "Learn Spanish", "Biology & how life works"];
const INTEREST_SUGGESTIONS = ["Space", "Music", "Sports", "Cooking", "Video games", "Nature", "Movies", "Building things", "Animals", "Art"];

export function startOnboarding() {
  Object.assign(OB, { step: 0, name: "", emoji: "🦊", audience: "adult", goals: [], interests: [], key: S.settings.apiKey, goalDraft: "", interestsText: "" });
  go("onboarding");
}

/* Comma- or newline-separated free text -> a deduped array of interests. */
function parseInterests(text) {
  const seen = new Set();
  const out = [];
  for (const raw of text.split(/[,\n]/)) {
    const t = raw.trim();
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
  }
  return out;
}

/* Back + primary action row. Back is omitted on the first step (nowhere to go). */
function footer(nextId, nextLabel) {
  return `
    <div class="row" style="margin-top:14px; flex-wrap:nowrap">
      ${OB.step > 0 ? `<button class="btn ghost" id="ob-back">← Back</button>` : ""}
      <button class="btn" id="${nextId}" style="flex:1">${nextLabel}</button>
    </div>`;
}

export function renderOnboarding() {
  $("#hdr").style.display = "none";
  $("#mainnav").style.display = "none";
  const v = $("#view-onboarding");
  const dots = `<div class="steps-dots">${[0, 1, 2, 3, 4].map(i => `<i class="${i <= OB.step ? "on" : ""}"></i>`).join("")}</div>`;

  const steps = [
    () => `
      <div style="text-align:center; margin-bottom: 22px;">
        <div style="font-size:56px">🧠</div>
        <h1 style="font-size:30px; margin-top:6px;">Synapse</h1>
        <p class="muted" style="margin-top:6px;">A personal AI tutor that teaches from first principles,<br>quizzes you, and makes sure you <i>never forget</i> what matters.</p>
      </div>
      <div class="card stack">
        <div>
          <label class="lbl">What should I call you?</label>
          <input type="text" id="ob-name" placeholder="Your name" value="${esc(OB.name)}" maxlength="24" autocomplete="off">
        </div>
        <div>
          <label class="lbl">Pick your avatar</label>
          <div class="ob-emoji-grid">${OB_EMOJIS.map(e => `<button class="ob-emoji ${OB.emoji === e ? "on" : ""}" data-e="${e}">${e}</button>`).join("")}</div>
        </div>
        <button class="btn block" id="ob-next">Let's go →</button>
      </div>`,
    () => `
      <h2>How should I explain things, ${esc(OB.name)}?</h2>
      <p class="muted tiny" style="margin:6px 0 14px">This calibrates depth and vocabulary — you can change it anytime.</p>
      <div class="card stack">
        ${Object.entries(AUDIENCES).map(([k, a]) => `
          <button class="q-option ${OB.audience === k ? "correct" : ""}" data-aud="${k}" style="margin-top:0">
            <b>${a.label}</b><br><span class="tiny">${esc(a.prompt.split(".")[0])}.</span>
          </button>`).join("")}
        ${footer("ob-next", "Next →")}
      </div>`,
    () => `
      <h2>What do you want to learn?</h2>
      <p class="muted tiny" style="margin:6px 0 14px">Pick any that fit, or type your own. I'll use these to recommend paths and topics.</p>
      <div class="card stack">
        <div class="row">${GOAL_SUGGESTIONS.map(g => `<span class="chip ${OB.goals.includes(g) ? "on" : ""}" data-goal="${esc(g)}">${esc(g)}</span>`).join("")}</div>
        <div class="row" style="flex-wrap:nowrap"><input type="text" id="ob-goal-custom" placeholder="Or type your own goal…" value="${esc(OB.goalDraft)}"><button class="btn small ghost" id="ob-goal-add">Add</button></div>
        <div id="ob-goal-own" class="row">${OB.goals.filter(g => !GOAL_SUGGESTIONS.includes(g)).map(g => `<span class="chip on" data-goal="${esc(g)}">${esc(g)} ✕</span>`).join("")}</div>
        ${footer("ob-next", "Next →")}
      </div>`,
    () => `
      <h2>What are you into?</h2>
      <p class="muted tiny" style="margin:6px 0 14px">Tell me anything — hobbies, shows, sports, games, whatever comes to mind. I'll build analogies and examples around them; associations make memories stick.</p>
      <div class="card stack">
        <textarea id="ob-int-text" rows="3" style="resize:vertical; min-height:78px" placeholder="e.g. rock climbing, K-pop, sourdough bread, chess, true crime podcasts…">${esc(OB.interestsText)}</textarea>
        <div>
          <p class="tiny" style="margin-bottom:8px">Need ideas? Tap to add one:</p>
          <div class="row">${INTEREST_SUGGESTIONS.map(g => `<span class="chip ${OB.interests.some(i => i.toLowerCase() === g.toLowerCase()) ? "on" : ""}" data-int-insert="${esc(g)}">${esc(g)}</span>`).join("")}</div>
        </div>
        ${footer("ob-next", "Next →")}
      </div>`,
    () => `
      <h2>Power up the tutor</h2>
      <p class="muted tiny" style="margin:6px 0 14px">Synapse uses Claude for real tutoring. Your key is stored <b>only in this browser</b> and sent only to Anthropic.</p>
      <div class="card stack">
        <div>
          <label class="lbl">Anthropic API key (optional)</label>
          <input type="password" id="ob-key" placeholder="sk-ant-…" value="${esc(OB.key)}">
          <p class="tiny" style="margin-top:8px">Get one at console.anthropic.com → API keys. No key? Demo mode still lets you try quizzes & flashcards.</p>
        </div>
        ${footer("ob-finish", "Start learning 🚀")}
        <button class="btn block ghost" id="ob-skip">Skip — try demo mode</button>
      </div>`,
  ];

  v.innerHTML = `<div class="ob-wrap">${steps[OB.step]()}${dots}</div>`;

  $$(".ob-emoji", v).forEach(b => b.onclick = () => { OB.emoji = b.dataset.e; renderOnboarding(); });
  $$("[data-aud]", v).forEach(b => b.onclick = () => { OB.audience = b.dataset.aud; renderOnboarding(); });
  $$("[data-goal]", v).forEach(b => b.onclick = () => {
    const g = b.dataset.goal;
    OB.goals = OB.goals.includes(g) ? OB.goals.filter(x => x !== g) : [...OB.goals, g];
    renderOnboarding();
  });
  const addGoal = () => {
    const inp = $("#ob-goal-custom", v);
    const g = inp.value.trim();
    if (g && !OB.goals.includes(g)) { OB.goals.push(g); OB.goalDraft = ""; renderOnboarding(); }
  };
  const gAdd = $("#ob-goal-add", v);
  if (gAdd) gAdd.onclick = addGoal;
  const gInp = $("#ob-goal-custom", v);
  if (gInp) {
    gInp.oninput = e => { OB.goalDraft = e.target.value; }; // survive re-renders
    gInp.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); addGoal(); } };
  }

  const intText = $("#ob-int-text", v);
  if (intText) {
    intText.oninput = e => {
      OB.interestsText = e.target.value;
      OB.interests = parseInterests(OB.interestsText); // survive re-renders elsewhere in the wizard
    };
  }
  $$("[data-int-insert]", v).forEach(c => c.onclick = () => {
    const word = c.dataset.intInsert;
    if (OB.interests.some(i => i.toLowerCase() === word.toLowerCase())) return; // already typed
    OB.interestsText = OB.interestsText.trim() ? `${OB.interestsText.trim()}, ${word}` : word;
    OB.interests = parseInterests(OB.interestsText);
    renderOnboarding();
  });

  const back = $("#ob-back", v);
  if (back) back.onclick = () => { OB.step--; renderOnboarding(); };

  const next = $("#ob-next", v);
  if (next) next.onclick = () => {
    if (OB.step === 0) {
      OB.name = $("#ob-name", v).value.trim();
      if (!OB.name) { toast("Tell me your name first 🙂"); return; }
    }
    OB.step++;
    renderOnboarding();
  };
  const nameInp = $("#ob-name", v);
  if (nameInp) {
    nameInp.focus();
    nameInp.oninput = e => { OB.name = e.target.value; }; // survive avatar-click re-renders
    nameInp.onkeydown = e => { if (e.key === "Enter") next.click(); };
  }

  const finish = key => {
    if (key) S.settings.apiKey = key;
    const u = newUser(OB.name, OB.emoji, OB.audience, OB.goals, OB.interests);
    S.users.push(u);
    S.activeUserId = u.id;
    save();
    enterApp();
    burst("🎉", 8);
    toast(`Welcome, ${esc(u.name)}! ${u.emoji}`);
  };
  const f = $("#ob-finish", v);
  if (f) f.onclick = () => finish($("#ob-key", v).value.trim());
  const sk = $("#ob-skip", v);
  if (sk) sk.onclick = () => finish("");
}
