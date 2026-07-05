/* Onboarding wizard: name/avatar → level → goals → interests → API key. */

import { $, $$, esc, toast, burst } from "../ui.js";
import { S, save, newUser, AUDIENCES } from "../state.js";
import { enterApp } from "../shell.js";
import { go } from "../router.js";

const OB = { step: 0, name: "", emoji: "🦊", audience: "adult", goals: [], interests: [], key: "", goalDraft: "" };
const OB_EMOJIS = ["🦊", "🐙", "🦉", "🐯", "🦄", "🐸", "🚀", "🌟"];
const GOAL_SUGGESTIONS = ["Get better at math", "Understand AI & how LLMs work", "Learn to code", "Personal finance & investing", "Physics from first principles", "History that sticks", "Learn Spanish", "Biology & how life works"];
const INTEREST_SUGGESTIONS = ["Space", "Music", "Sports", "Cooking", "Video games", "Nature", "Movies", "Building things", "Animals", "Art"];

export function startOnboarding() {
  Object.assign(OB, { step: 0, name: "", emoji: "🦊", audience: "adult", goals: [], interests: [], key: S.settings.apiKey, goalDraft: "" });
  go("onboarding");
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
        <button class="btn block" id="ob-next">Next →</button>
      </div>`,
    () => `
      <h2>What do you want to learn?</h2>
      <p class="muted tiny" style="margin:6px 0 14px">Pick any that fit, or type your own. I'll use these to recommend paths and topics.</p>
      <div class="card stack">
        <div class="row">${GOAL_SUGGESTIONS.map(g => `<span class="chip ${OB.goals.includes(g) ? "on" : ""}" data-goal="${esc(g)}">${esc(g)}</span>`).join("")}</div>
        <div class="row" style="flex-wrap:nowrap"><input type="text" id="ob-goal-custom" placeholder="Or type your own goal…" value="${esc(OB.goalDraft)}"><button class="btn small ghost" id="ob-goal-add">Add</button></div>
        <div id="ob-goal-own" class="row">${OB.goals.filter(g => !GOAL_SUGGESTIONS.includes(g)).map(g => `<span class="chip on" data-goal="${esc(g)}">${esc(g)} ✕</span>`).join("")}</div>
        <button class="btn block" id="ob-next">Next →</button>
      </div>`,
    () => `
      <h2>What are you into?</h2>
      <p class="muted tiny" style="margin:6px 0 14px">I'll build analogies and examples around these — associations make memories stick.</p>
      <div class="card stack">
        <div class="row">${INTEREST_SUGGESTIONS.map(g => `<span class="chip ${OB.interests.includes(g) ? "on" : ""}" data-int="${esc(g)}">${esc(g)}</span>`).join("")}</div>
        <button class="btn block" id="ob-next">Next →</button>
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
        <button class="btn block" id="ob-finish">Start learning 🚀</button>
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
  $$("[data-int]", v).forEach(b => b.onclick = () => {
    const g = b.dataset.int;
    OB.interests = OB.interests.includes(g) ? OB.interests.filter(x => x !== g) : [...OB.interests, g];
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
    gInp.onkeydown = e => { if (e.key === "Enter") addGoal(); };
  }

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
