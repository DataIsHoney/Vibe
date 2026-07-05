/* Learning paths: goal → milestone plan (Claude structured outputs or demo),
   with progress tracking and one-tap handoff to the tutor / quiz. */

import { $, $$, esc, uid, todayISO, toast, burst } from "../ui.js";
import { me, hasKey, save, addXP, AUDIENCES } from "../state.js";
import { claudeJSON, PATH_SCHEMA } from "../api.js";
import { demoPath } from "../demo.js";
import { go } from "../router.js";
import { sendChat } from "./tutor.js";
import { startQuiz } from "./quiz.js";

export function renderPaths() {
  const u = me();
  const v = $("#view-paths");
  v.innerHTML = `
    <h2 style="font-size:19px">🗺️ Learning paths</h2>
    <p class="muted tiny" style="margin:4px 0 14px">Turn a goal into a milestone plan. Check off milestones as you master them — the tutor and quizzes are one tap away.</p>
    <div class="card stack">
      <div class="row" style="flex-wrap:nowrap">
        <input type="text" id="path-goal" placeholder="A goal — “understand how LLMs work”…">
        <button class="btn" id="path-make" style="white-space:nowrap">Build path</button>
      </div>
      ${u.goals.length ? `<div class="row">${u.goals.map(g => `<span class="chip" data-pathgoal="${esc(g)}">${esc(g)}</span>`).join("")}</div>` : ""}
    </div>
    <div id="path-loading"></div>
    <div class="stack" style="margin-top:16px" id="path-list">
      ${u.paths.map(p => pathCard(p)).join("") || `<p class="tiny" style="text-align:center; padding:20px">No paths yet — build one from a goal above.</p>`}
    </div>`;
  $("#path-make", v).onclick = () => makePath($("#path-goal", v).value.trim());
  $("#path-goal", v).onkeydown = e => { if (e.key === "Enter") makePath(e.target.value.trim()); };
  $$("[data-pathgoal]", v).forEach(c => c.onclick = () => makePath(c.dataset.pathgoal));
  bindPathEvents();
}

function pathCard(p) {
  const done = p.milestones.filter(m => m.done).length;
  const pct = p.milestones.length ? Math.round(done / p.milestones.length * 100) : 0;
  return `
    <div class="card" data-path="${p.id}">
      <div class="spread">
        <h3 style="font-size:16px">${pct === 100 ? "🏔️ " : ""}${esc(p.title)}</h3>
        <span class="tiny">${done}/${p.milestones.length}</span>
      </div>
      ${p.why ? `<p class="tiny" style="margin-top:4px">${esc(p.why)}</p>` : ""}
      <div class="progressbar" style="margin:10px 0 4px"><div style="width:${pct}%"></div></div>
      ${p.milestones.map((m, i) => `
        <div class="milestone">
          <button class="m-check ${m.done ? "done" : ""}" data-ms="${p.id}:${i}">${m.done ? "✓" : ""}</button>
          <div>
            <b style="font-size:14px; ${m.done ? "opacity:.55; text-decoration:line-through" : ""}">${esc(m.title)}</b>
            <div class="tiny" style="margin-top:3px">${m.topics.map(t => `<span class="topic-link" data-learn="${esc(t)}">${esc(t)}</span>`).join(" · ")}</div>
          </div>
        </div>`).join("")}
      <div class="row" style="margin-top:10px">
        <button class="btn small ghost" data-quizpath="${esc(p.title)}">🎯 Quiz me on this</button>
        <button class="btn small ghost" data-delpath="${p.id}">🗑 Remove</button>
      </div>
    </div>`;
}

function bindPathEvents() {
  const u = me();
  $$("[data-ms]").forEach(b => b.onclick = () => {
    const [pid, i] = b.dataset.ms.split(":");
    const p = u.paths.find(x => x.id === pid);
    const m = p.milestones[+i];
    m.done = !m.done;
    save();
    if (m.done) {
      addXP(50, `milestone: ${m.title}`);
      if (p.milestones.every(x => x.done)) {
        burst("🏔️", 8);
        toast(`Path complete: <b>${esc(p.title)}</b> 🏔️`);
      }
    }
    renderPaths();
  });
  $$("[data-learn]").forEach(t => t.onclick = () => {
    go("tutor");
    sendChat(`Teach me: ${t.dataset.learn}. Start from first principles.`);
  });
  $$("[data-quizpath]").forEach(b => b.onclick = () => {
    go("quiz");
    startQuiz(b.dataset.quizpath.replace(/^Path: /, ""));
  });
  $$("[data-delpath]").forEach(b => b.onclick = () => {
    if (!confirm("Remove this path?")) return;
    u.paths = u.paths.filter(p => p.id !== b.dataset.delpath);
    save();
    renderPaths();
  });
}

async function makePath(goal) {
  if (!goal) { toast("Type a goal first"); return; }
  const u = me();
  const loadEl = $("#path-loading");
  if (loadEl) loadEl.innerHTML = `<div class="card row" style="margin-top:14px"><span class="spin"></span> Designing your path for <b>&nbsp;${esc(goal)}</b>…</div>`;
  try {
    let plan;
    if (hasKey()) {
      plan = await claudeJSON({
        system: `You design learning curricula for ${AUDIENCES[u.audience].prompt}`,
        prompt: `Design a learning path for the goal: "${goal}".
- 4-6 milestones ordered from foundations to mastery, each with 2-4 specific, teachable topics.
- "why" = one motivating sentence about what achieving this unlocks (max 25 words).
- Milestone titles short and concrete. Topics should be phrases a tutor could explain in one session.`,
        schema: PATH_SCHEMA,
      });
    } else {
      await new Promise(r => setTimeout(r, 600));
      plan = demoPath(goal);
    }
    u.paths.unshift({
      id: uid(), title: plan.title, why: plan.why || "",
      milestones: plan.milestones.map(m => ({ ...m, done: false })),
      createdAt: todayISO(),
    });
    if (!u.goals.includes(goal)) u.goals.push(goal);
    save();
    renderPaths();
    toast("🗺️ Path created!");
  } catch (err) {
    if (loadEl) loadEl.innerHTML = "";
    toast("⚠️ " + esc(err.message));
  }
}
