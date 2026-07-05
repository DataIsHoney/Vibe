/* Dashboard: streak/XP/deck stat tiles, one recommended next action,
   7-day activity chart, active path progress, badges. */

import { $, esc } from "../ui.js";
import { me, hasKey, totalXpForLevel, BADGES, S } from "../state.js";
import { dueCards } from "../srs.js";

export function renderHome() {
  const u = me();
  const v = $("#view-home");
  const due = dueCards(u).length;
  const nextXp = totalXpForLevel(u.level + 1) - u.xp;
  const activePath = u.paths.find(p => p.milestones.some(m => !m.done));
  const nextMilestone = activePath?.milestones.find(m => !m.done);
  const rec = recommendation(u);

  // last 7 days of XP
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    days.push({ iso, short: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()], xp: u.activity[iso] || 0 });
  }
  const maxXp = Math.max(20, ...days.map(d => d.xp));

  v.innerHTML = `
    <div class="stack">
      <div>
        <h1 style="font-size:24px">${greeting()}, ${esc(u.name)} ${u.emoji}</h1>
        <p class="tiny">${hasKey() ? `Tutor online · ${esc(S.settings.model)}` : `<span class="demo-tag">DEMO MODE</span> — add an API key in ⚙️ to unlock the tutor`}</p>
      </div>

      <div class="stat-grid">
        <div class="stat"><span class="k">Streak</span><span class="v">🔥 ${u.streak.current}</span><span class="s">best ${u.streak.best} · 🧊 ×${u.streak.freezes}</span></div>
        <div class="stat"><span class="k">Level ${u.level}</span><span class="v">⚡ ${u.xp}</span><span class="s">${nextXp} XP to level ${u.level + 1}</span></div>
        <div class="stat"><span class="k">Memory</span><span class="v">🃏 ${u.cards.length}</span><span class="s">${due} due today</span></div>
      </div>

      ${due > 0 ? `
      <div class="hero-cta" onclick="go('review')">
        <span class="big">🃏</span>
        <div style="flex:1">
          <b style="font-family:'Space Grotesk'; font-size:17px">Review ${due} card${due > 1 ? "s" : ""}</b>
          <div class="tiny">2 minutes now = memories that last months</div>
        </div>
        <span style="font-size:20px; color:var(--mint)">→</span>
      </div>` : `
      <div class="hero-cta" onclick="go('${rec.view}')">
        <span class="big">${rec.emoji}</span>
        <div style="flex:1">
          <b style="font-family:'Space Grotesk'; font-size:17px">${esc(rec.title)}</b>
          <div class="tiny">${esc(rec.sub)}</div>
        </div>
        <span style="font-size:20px; color:var(--mint)">→</span>
      </div>`}

      <div class="card">
        <div class="spread"><h3 style="font-size:15px">This week</h3><span class="tiny">XP per day</span></div>
        <div class="chart7" role="img" aria-label="XP earned each of the last 7 days">
          ${days.map((d, i) => `
            <div class="col ${i === 6 ? "today" : ""}">
              <div class="tip">${d.short}: ${d.xp} XP</div>
              <div class="bar" style="height:${Math.max(4, Math.round(d.xp / maxXp * 74))}px"></div>
              <span class="d">${d.short[0]}${i === 6 ? "•" : ""}</span>
            </div>`).join("")}
        </div>
      </div>

      ${activePath && nextMilestone ? `
      <div class="card" style="cursor:pointer" onclick="go('paths')">
        <div class="spread">
          <h3 style="font-size:15px">🗺️ ${esc(activePath.title)}</h3>
          <span class="tiny">${activePath.milestones.filter(m => m.done).length}/${activePath.milestones.length}</span>
        </div>
        <div class="progressbar" style="margin:10px 0 8px"><div style="width:${Math.round(activePath.milestones.filter(m => m.done).length / activePath.milestones.length * 100)}%"></div></div>
        <span class="tiny">Next up: <b style="color:var(--ink)">${esc(nextMilestone.title)}</b></span>
      </div>` : ""}

      <div class="card">
        <div class="spread"><h3 style="font-size:15px">Badges</h3><span class="tiny">${u.badges.length}/${BADGES.length}</span></div>
        <div class="badges-row" style="margin-top:10px">
          ${BADGES.map(b => `<div class="badge-tile ${u.badges.includes(b.id) ? "" : "locked"}"><div class="e">${b.e}</div><div class="n">${b.n}</div></div>`).join("")}
        </div>
      </div>
    </div>`;
}

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Night owl" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/* What should this learner do next? Priority:
   continue an active path > turn a goal into a path > quiz an untouched interest > free chat */
function recommendation(u) {
  const activePath = u.paths.find(p => p.milestones.some(m => !m.done));
  if (activePath) {
    const m = activePath.milestones.find(x => !x.done);
    return { view: "paths", emoji: "🗺️", title: `Continue: ${m.title}`, sub: `Next milestone on “${activePath.title}”` };
  }
  if (u.goals.length && u.paths.length === 0)
    return { view: "paths", emoji: "🗺️", title: "Turn a goal into a plan", sub: `Build a learning path for “${u.goals[0]}”` };
  const unquizzed = u.interests.find(i => !u.stats.topicsQuizzed[i.toLowerCase()]);
  if (unquizzed)
    return { view: "quiz", emoji: "🎯", title: `Quiz yourself on ${unquizzed}`, sub: "Testing beats re-reading — learning science says so" };
  return { view: "tutor", emoji: "💬", title: "Ask the tutor anything", sub: "First-principles explanations, tuned to you" };
}
