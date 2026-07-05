/* DOM + formatting helpers, toasts, celebration bursts. */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const esc = s => String(s ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const uid = () => Math.random().toString(36).slice(2, 10);
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

/* very small markdown: **bold** and `code` only */
export function mdLite(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

export function toast(msg, cls = "") {
  const t = document.createElement("div");
  t.className = "toast " + cls;
  t.innerHTML = msg;
  $("#toasts").appendChild(t);
  setTimeout(() => {
    t.style.opacity = 0;
    t.style.transition = "opacity .4s";
    setTimeout(() => t.remove(), 400);
  }, 2600);
}

export function burst(emoji, n = 6) {
  for (let i = 0; i < n; i++) {
    const b = document.createElement("div");
    b.className = "burst";
    b.textContent = emoji;
    b.style.left = (35 + Math.random() * 30) + "vw";
    b.style.top = (40 + Math.random() * 20) + "vh";
    b.style.animationDelay = (Math.random() * .3) + "s";
    document.body.appendChild(b);
    setTimeout(() => b.remove(), 1400);
  }
}
