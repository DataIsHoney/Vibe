/* Settings: API key & model, profile tuning, multi-profile switcher,
   export / import / reset. */

import { $, $$, esc, toast, todayISO } from "../ui.js";
import { S, save, me, hasKey, AUDIENCES, replaceState, resetAll } from "../state.js";
import { refreshHeader, enterApp } from "../shell.js";
import { go } from "../router.js";
import { startOnboarding } from "./onboarding.js";

const MODELS = [
  ["claude-opus-4-8", "Claude Opus 4.8 — smartest (default)"],
  ["claude-sonnet-5", "Claude Sonnet 5 — fast & sharp"],
  ["claude-haiku-4-5", "Claude Haiku 4.5 — cheapest"],
];

export function renderSettings() {
  const u = me();
  const v = $("#view-settings");
  v.innerHTML = `
    <h2 style="font-size:19px">⚙️ Settings</h2>
    <div class="stack" style="margin-top:14px">
      <div class="card stack">
        <h3 style="font-size:15px">Tutor connection</h3>
        <div>
          <label class="lbl">Anthropic API key</label>
          <input type="password" id="set-key" value="${esc(S.settings.apiKey)}" placeholder="sk-ant-…">
          <p class="tiny" style="margin-top:6px">Stored only in this browser's localStorage; sent only to api.anthropic.com. ${hasKey() ? "✅ Connected" : "Demo mode active."}</p>
        </div>
        <div>
          <label class="lbl">Model</label>
          <select id="set-model">
            ${MODELS.map(([id, label]) => `<option value="${id}" ${S.settings.model === id ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        </div>
        <button class="btn small" id="set-save">Save</button>
      </div>

      <div class="card stack">
        <h3 style="font-size:15px">Profile: ${esc(u.name)} ${u.emoji}</h3>
        <div>
          <label class="lbl">Explanation level</label>
          <select id="set-aud">${Object.entries(AUDIENCES).map(([k, a]) => `<option value="${k}" ${u.audience === k ? "selected" : ""}>${a.label}</option>`).join("")}</select>
        </div>
        <div>
          <label class="lbl">Goals</label>
          <div class="row">${u.goals.map(g => `<span class="chip on" data-rmgoal="${esc(g)}">${esc(g)} ✕</span>`).join("") || `<span class="tiny">none yet</span>`}</div>
        </div>
        <div>
          <label class="lbl">Interests</label>
          <div class="row">${u.interests.map(g => `<span class="chip on" data-rmint="${esc(g)}">${esc(g)} ✕</span>`).join("") || `<span class="tiny">none yet</span>`}</div>
          <div class="row" style="flex-wrap:nowrap; margin-top:8px"><input type="text" id="set-int-new" placeholder="Add an interest…"><button class="btn small ghost" id="set-int-add">Add</button></div>
        </div>
      </div>

      <div class="card stack">
        <h3 style="font-size:15px">Profiles</h3>
        <div class="row">
          ${S.users.map(x => `<span class="chip ${x.id === u.id ? "on" : ""}" data-switch="${x.id}">${x.emoji} ${esc(x.name)}</span>`).join("")}
          <span class="chip" id="set-newuser">＋ New learner</span>
        </div>
        <p class="tiny">Family & friends can each have their own profile on this device.</p>
      </div>

      <div class="card stack">
        <h3 style="font-size:15px">Data</h3>
        <div class="row">
          <button class="btn small ghost" id="set-export">⬇ Export JSON</button>
          <button class="btn small ghost" id="set-import">⬆ Import</button>
          <button class="btn small warn" id="set-reset">Reset everything</button>
        </div>
        <input type="file" id="set-import-file" accept=".json" style="display:none">
      </div>
    </div>`;

  $("#set-save", v).onclick = () => {
    S.settings.apiKey = $("#set-key", v).value.trim();
    S.settings.model = $("#set-model", v).value;
    save();
    toast("Saved ✓");
    renderSettings();
  };
  $("#set-aud", v).onchange = e => { u.audience = e.target.value; save(); toast("Explanation level updated"); };
  $$("[data-rmgoal]", v).forEach(c => c.onclick = () => { u.goals = u.goals.filter(g => g !== c.dataset.rmgoal); save(); renderSettings(); });
  $$("[data-rmint]", v).forEach(c => c.onclick = () => { u.interests = u.interests.filter(g => g !== c.dataset.rmint); save(); renderSettings(); });
  $("#set-int-add", v).onclick = () => {
    const val = $("#set-int-new", v).value.trim();
    if (val && !u.interests.includes(val)) { u.interests.push(val); save(); renderSettings(); }
  };
  $$("[data-switch]", v).forEach(c => c.onclick = () => {
    S.activeUserId = c.dataset.switch;
    save();
    refreshHeader();
    go("home");
    toast(`Switched to ${esc(me().name)} ${me().emoji}`);
  });
  $("#set-newuser", v).onclick = startOnboarding;
  $("#set-export", v).onclick = () => {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `synapse-backup-${todayISO()}.json`;
    a.click();
  };
  $("#set-import", v).onclick = () => $("#set-import-file", v).click();
  $("#set-import-file", v).onchange = e => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (!data.users || !Array.isArray(data.users)) throw new Error("bad file");
        replaceState(data);
        enterApp();
        toast("Imported ✓");
      } catch (err) {
        toast("⚠️ Couldn't import that file");
      }
    };
    r.readAsText(f);
  };
  $("#set-reset", v).onclick = () => {
    if (!confirm("Delete ALL profiles, cards, and progress on this device?")) return;
    resetAll();
    location.reload();
  };
}
