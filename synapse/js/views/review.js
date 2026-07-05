/* Review: frictionless spaced-repetition session over due cards.
   Tap/space to flip, grade with buttons or keys 1-4. */

import { $, $$, esc, toast, burst, todayISO } from "../ui.js";
import { me, save, addXP } from "../state.js";
import { refreshHeader } from "../shell.js";
import { gradeCard, dueCards, intervalPreview } from "../srs.js";
import { currentView } from "../router.js";

let RV = null; // { queue, done, total, flipped }

export function renderReview() {
  const u = me();
  const v = $("#view-review");
  const due = dueCards(u);
  if (RV && RV.queue.length) { paintCard(); return; }
  RV = null;
  if (!due.length) {
    const next = u.cards.filter(c => c.due > todayISO()).sort((a, b) => a.due.localeCompare(b.due))[0];
    v.innerHTML = `
      <h2 style="font-size:19px">🃏 Review</h2>
      <div class="card" style="text-align:center; padding:34px 20px; margin-top:14px">
        <div style="font-size:48px">😌</div>
        <h3 style="margin-top:8px">All caught up</h3>
        <p class="muted tiny" style="margin-top:6px">${u.cards.length} card${u.cards.length === 1 ? "" : "s"} in your deck.${next ? ` Next review on ${next.due}.` : ""}</p>
        <p class="tiny" style="margin-top:10px">Cards come from quizzes you miss and tutor conversations — go learn something!</p>
        <div class="row" style="justify-content:center; margin-top:14px">
          <button class="btn ghost" onclick="go('quiz')">🎯 Take a quiz</button>
          <button class="btn ghost" onclick="go('tutor')">💬 Ask the tutor</button>
        </div>
      </div>
      ${u.cards.length ? `<p class="tiny" style="margin-top:14px; text-align:center"><a class="topic-link" id="browse-cards">Browse my ${u.cards.length} cards</a></p>` : ""}`;
    const bc = $("#browse-cards", v);
    if (bc) bc.onclick = showDeckBrowser;
    return;
  }
  RV = { queue: [...due], done: 0, total: due.length, flipped: false };
  paintCard();
}

function paintCard() {
  const v = $("#view-review");
  const card = RV.queue[0];
  v.innerHTML = `
    <div class="spread">
      <h2 style="font-size:17px">🃏 Review</h2>
      <span class="tiny">${RV.done} done · ${RV.queue.length} left</span>
    </div>
    <div class="progressbar" style="margin:12px 0 16px"><div style="width:${(RV.done / RV.total) * 100}%"></div></div>
    <div class="flashcard ${RV.flipped ? "flipped" : ""}" id="fc">
      <div class="fc-inner">
        <div class="fc-face">
          <span class="t">${esc(card.topic)}</span>
          <div class="content">${esc(card.front)}</div>
          <span class="tiny" style="margin-top:8px">tap or press space to flip</span>
        </div>
        <div class="fc-face back">
          <span class="t">answer</span>
          <div class="content" style="font-size:16px">${esc(card.back)}</div>
        </div>
      </div>
    </div>
    ${RV.flipped ? `
    <div class="grade-row">
      <button class="g-again" data-g="0">😵 Again<span>&lt;1 min</span></button>
      <button data-g="1">😅 Hard<span>${intervalPreview(card, 1)}</span></button>
      <button data-g="2">🙂 Good<span>${intervalPreview(card, 2)}</span></button>
      <button data-g="3">😎 Easy<span>${intervalPreview(card, 3)}</span></button>
    </div>
    <p class="tiny" style="text-align:center; margin-top:10px">keyboard: 1 2 3 4</p>` : ""}`;
  $("#fc", v).onclick = () => { RV.flipped = !RV.flipped; paintCard(); };
  $$("[data-g]", v).forEach(b => b.onclick = e => { e.stopPropagation(); doGrade(+b.dataset.g); });
}

function doGrade(grade) {
  const u = me();
  const card = RV.queue.shift();
  const real = u.cards.find(c => c.id === card.id) || card;
  gradeCard(real, grade);
  u.stats.reviews++;
  if (grade === 0) RV.queue.push(real); // "Again" resurfaces within the session
  else RV.done++;
  RV.flipped = false;
  save();
  refreshHeader();
  if (!RV.queue.length) {
    const done = RV.done;
    RV = null;
    addXP(done * 5, "review session");
    burst("🧠", 6);
    $("#view-review").innerHTML = `
      <div class="card" style="text-align:center; padding:34px 20px">
        <div style="font-size:48px">🧠✨</div>
        <h2 style="margin-top:8px">Session complete</h2>
        <p class="muted tiny" style="margin-top:6px">${done} card${done === 1 ? "" : "s"} reviewed. Each one just got pushed further into long-term memory.</p>
        <button class="btn" style="margin-top:16px" onclick="go('home')">Done</button>
      </div>`;
    return;
  }
  paintCard();
}

/* keyboard: space flips, 1-4 grade */
document.addEventListener("keydown", e => {
  if (currentView !== "review" || !RV) return;
  if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;
  if (e.code === "Space") { e.preventDefault(); RV.flipped = !RV.flipped; paintCard(); }
  else if (RV.flipped && ["1", "2", "3", "4"].includes(e.key)) doGrade(+e.key - 1);
});

function showDeckBrowser() {
  const u = me();
  const dlg = $("#modal");
  dlg.innerHTML = `
    <div class="spread"><h3>Your deck (${u.cards.length})</h3><button class="iconbtn" id="deck-close">✕</button></div>
    <div style="max-height:55vh; overflow-y:auto; margin-top:12px" class="stack">
      ${u.cards.map(c => `
        <div style="border:1px solid var(--line); border-radius:12px; padding:10px 12px">
          <div class="spread"><b style="font-size:13.5px">${esc(c.front)}</b><button class="iconbtn" style="width:28px;height:28px;font-size:12px" data-del="${c.id}">🗑</button></div>
          <p class="tiny" style="margin-top:4px">${esc(c.back)}</p>
          <p class="tiny" style="margin-top:4px; opacity:.7">${esc(c.topic)} · due ${c.due} · seen ${c.reps}×</p>
        </div>`).join("")}
    </div>`;
  $("#deck-close", dlg).onclick = () => dlg.close();
  $$("[data-del]", dlg).forEach(b => b.onclick = () => {
    u.cards = u.cards.filter(c => c.id !== b.dataset.del);
    save();
    refreshHeader();
    if (u.cards.length) showDeckBrowser();
    else { dlg.close(); renderReview(); }
  });
  dlg.showModal();
}
