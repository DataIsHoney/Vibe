/* Tiny hash-free view router. Views register a render function by name. */

import { $, $$ } from "./ui.js";

const routes = {};
export let currentView = null;

export function register(name, render) { routes[name] = render; }

export function go(view) {
  currentView = view;
  $$("section.view").forEach(v => v.classList.remove("active"));
  const target = $("#view-" + view);
  if (target) target.classList.add("active");
  $$("nav.tabs button").forEach(b => b.classList.toggle("active", b.dataset.v === view));
  if (routes[view]) routes[view]();
  window.scrollTo({ top: 0 });
}

/* templates use inline onclick="go(...)" in a few places */
window.go = go;
