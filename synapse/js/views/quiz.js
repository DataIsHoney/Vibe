/* Quiz: 5-question MCQ on any topic (Claude structured outputs, or the
   built-in demo bank). Misses can be saved straight into the SRS deck. */

import { $, $$, esc, uid, todayISO, toast, burst } from "../ui.js";
import { me, hasKey, save, addXP, AUDIENCES } from "../state.js";
import { refreshHeader } from "../shell.js";
import { claudeJSON, QUIZ_SCHEMA } from "../api.js";
import { demoQuiz } from "../demo.js";
import { go } from "../router.js";

let QZ = null; // { quiz, i, correct, misses, topic }

export function renderQuiz() {
  const u = me();
  const v = $("#view-quiz");
  if (QZ) { paintQuestion(); return; }
  const topics = [...new Set([...u.interests, ...u.goals])].slice(0, 8);
  v.innerHTML = `
    <h2 style="font-size:19px">🎯 Quiz</h2>
    <p class="muted tiny" style="margin:4px 0 14px">Testing yourself is the single most effective study technique. Pick a topic — I'll build a 5-question quiz${hasKey() ? " tailored to you" : ""}.</p>
    <div class="card stack">
      <div class="row">${topics.map(t => `<span class="chip" data-topic="${esc(t)}">${esc(t)}</span>`).join("") || `<span class="tiny">Add interests in settings for one-tap topics</span>`}</div>
      <div class="row" style="flex-wrap:nowrap">
        <input type="text" id="quiz-topic" placeholder="Any topic — “black holes”, “the French Revolution”…">
        <button class="btn" id="quiz-start" style="white-space:nowrap">Start</button>
      </div>
      ${hasKey() ? "" : `<p class="tiny"><span class="demo-tag">DEMO</span> Without an API key you'll get one of the built-in quizzes (internet, compound interest, learning science).</p>`}
      <div class="tiny">Quizzes completed: <b>${u.stats.quizzes}</b> · Accuracy: <b>${u.stats.quizTotal ? Math.round(u.stats.quizCorrect / u.stats.quizTotal * 100) + "%" : "—"}</b></div>
    </div>
    <div id="quiz-loading"></div>`;
  $$("[data-topic]", v).forEach(c => c.onclick = () => startQuiz(c.dataset.topic));
  $("#quiz-start", v).onclick = () => startQuiz($("#quiz-topic", v).value.trim());
  $("#quiz-topic", v).onkeydown = e => { if (e.key === "Enter") startQuiz(e.target.value.trim()); };
}

export async function startQuiz(topic) {
  if (!topic) { toast("Pick or type a topic first"); return; }
  const u = me();
  const loadEl = $("#quiz-loading");
  if (loadEl) loadEl.innerHTML = `<div class="card row" style="margin-top:14px"><span class="spin"></span> Building your quiz on <b>&nbsp;${esc(topic)}</b>…</div>`;
  try {
    let quiz;
    if (hasKey()) {
      quiz = await claudeJSON({
        system: `You write excellent quiz questions for ${AUDIENCES[u.audience].prompt} Their interests: ${u.interests.join(", ") || "general"}.`,
        prompt: `Create a 5-question multiple-choice quiz on "${topic}". Rules:
- Each question tests real understanding (why/how), not trivia recall, and has exactly 4 options with one correct answer ("answer" = 0-based index of the correct option).
- Vary which position holds the correct answer.
- "explain" gives a first-principles explanation of the right answer in 1-2 sentences.
- Calibrate difficulty to the student level. Only include facts you are confident are accurate.`,
        schema: QUIZ_SCHEMA,
      });
    } else {
      await new Promise(r => setTimeout(r, 600));
      quiz = demoQuiz(topic);
    }
    quiz.questions = (quiz.questions || [])
      .filter(q => Array.isArray(q.options) && q.options.length >= 2 && q.answer >= 0 && q.answer < q.options.length)
      .slice(0, 5);
    if (!quiz.questions.length) throw new Error("Couldn't build a quiz for that topic — try rephrasing it.");
    if (!hasKey() && quiz.matched === false) {
      toast(`<span class="demo-tag">DEMO</span> Only 3 sample quizzes exist without an API key — here's the closest one: <b>${esc(quiz.topic)}</b>`);
    }
    QZ = { quiz, i: 0, correct: 0, misses: [], topic };
    paintQuestion();
  } catch (err) {
    if (loadEl) loadEl.innerHTML = "";
    toast("⚠️ " + esc(err.message));
  }
}

function paintQuestion() {
  const v = $("#view-quiz");
  const { quiz, i } = QZ;
  const q = quiz.questions[i];
  v.innerHTML = `
    <div class="spread">
      <h2 style="font-size:17px">🎯 ${esc(quiz.topic)}</h2>
      <button class="btn small ghost" id="quiz-quit">✕ quit</button>
    </div>
    <div class="progressbar" style="margin:12px 0 16px"><div style="width:${(i / quiz.questions.length) * 100}%"></div></div>
    <div class="card">
      <p class="tiny" style="margin-bottom:6px">Question ${i + 1} of ${quiz.questions.length}</p>
      <h3 style="font-size:17px; line-height:1.4">${esc(q.q)}</h3>
      <div id="q-opts">${q.options.map((o, j) => `<button class="q-option" data-j="${j}">${esc(o)}</button>`).join("")}</div>
      <div id="q-explain"></div>
      <div id="q-next" style="margin-top:14px"></div>
    </div>`;
  $("#quiz-quit", v).onclick = () => { QZ = null; renderQuiz(); };
  $$(".q-option", v).forEach(b => b.onclick = () => answer(+b.dataset.j));
}

function answer(j) {
  const u = me();
  const { quiz, i } = QZ;
  const q = quiz.questions[i];
  const right = j === q.answer;
  $$(".q-option").forEach((b, k) => {
    b.disabled = true;
    if (k === q.answer) b.classList.add("correct");
    else if (k === j) b.classList.add("wrong");
  });
  u.stats.quizTotal++;
  if (right) { u.stats.quizCorrect++; QZ.correct++; burst("✅", 2); }
  else QZ.misses.push(q);
  $("#q-explain").innerHTML = `<div class="explain">${right ? "✅ " : "💡 "}${esc(q.explain)}</div>`;
  const last = i === quiz.questions.length - 1;
  $("#q-next").innerHTML = `<button class="btn block" id="q-continue">${last ? "See results →" : "Next question →"}</button>`;
  $("#q-continue").onclick = () => { last ? finish() : (QZ.i++, paintQuestion()); };
  save();
}

function finish() {
  const u = me();
  const { quiz, correct, misses, topic } = QZ;
  const n = quiz.questions.length;
  const pct = Math.round(correct / n * 100);
  u.stats.quizzes++;
  u.stats.topicsQuizzed[topic.toLowerCase()] = todayISO();
  const xp = 10 + correct * 10;
  const v = $("#view-quiz");
  v.innerHTML = `
    <div class="card" style="text-align:center; padding:30px 22px">
      <div style="font-size:52px">${pct >= 80 ? "🏆" : pct >= 60 ? "💪" : "🌱"}</div>
      <h2 style="font-size:26px; margin-top:8px">${correct}/${n} correct</h2>
      <p class="muted" style="margin-top:4px">${pct >= 80 ? "Excellent — you really know this." : pct >= 60 ? "Solid! The misses below are your growth edge." : "Every miss is a future memory — let's capture them."}</p>
      <div class="progressbar" style="margin:18px 0"><div style="width:${pct}%"></div></div>
      ${misses.length ? `
        <div style="text-align:left" class="stack">
          <p class="tiny"><b>${misses.length} miss${misses.length > 1 ? "es" : ""}</b> — turn them into flashcards so you'll never miss them again:</p>
          <button class="btn block" id="save-misses">🃏 Add ${misses.length} card${misses.length > 1 ? "s" : ""} to my deck</button>
        </div>` : `<p class="tiny">Perfect score — nothing to add to your deck!</p>`}
      <div class="row" style="margin-top:14px; justify-content:center">
        <button class="btn ghost" id="quiz-again">Another quiz</button>
        <button class="btn ghost" onclick="go('home')">Home</button>
      </div>
    </div>`;
  if (pct >= 80) burst("🎉", 8);
  addXP(xp, `quiz: ${topic}`);
  const sm = $("#save-misses");
  if (sm) sm.onclick = () => {
    for (const q of misses) {
      u.cards.push({
        id: uid(), front: q.q, back: `${q.options[q.answer]} — ${q.explain}`, topic: quiz.topic,
        ease: 2.5, interval: 0, reps: 0, due: todayISO(), lapses: 0,
      });
    }
    save(); refreshHeader();
    sm.textContent = "✓ Added to deck";
    sm.disabled = true;
    toast(`🃏 ${misses.length} card${misses.length > 1 ? "s" : ""} added`);
  };
  $("#quiz-again").onclick = () => { QZ = null; renderQuiz(); };
  QZ = null;
}
