/* App shell: header pills, nav badge, entering the app after onboarding. */

import { $ } from "./ui.js";
import { me, touchStreak, save } from "./state.js";
import { dueCards } from "./srs.js";
import { go } from "./router.js";

export function refreshHeader() {
  const u = me();
  if (!u) return;
  $("#pill-streak").innerHTML = `🔥 <b>${u.streak.current}</b>`;
  $("#pill-xp").innerHTML = `⚡ <b>${u.xp}</b> XP`;
  const due = dueCards(u).length;
  const nav = $("#navreview");
  let badge = nav.querySelector(".badge");
  if (due > 0) {
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "badge";
      nav.prepend(badge);
    }
    badge.textContent = due;
  } else if (badge) {
    badge.remove();
  }
}

export function enterApp() {
  $("#hdr").style.display = "flex";
  $("#mainnav").style.display = "flex";
  const u = me();
  touchStreak(u); // opening the app counts toward keeping a streak alive via freezes
  save();
  refreshHeader();
  go("home");
}
