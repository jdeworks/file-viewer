// panel.js — Stage 8 Entropy Field: the TECH | STRUCTURES panel (UX-audit #5). Replaces the two
// collapsed <details> accordions with one proper tabbed panel opened on demand from the RESOURCES
// cluster, built on the shared metagame modal (F6). The browsable grids come from techpanel.js
// (owned/affordable/locked states, branch columns kept). The modal lives on <body> — OUTSIDE the stage
// root — so its buy buttons can't ride the renderer's root delegation; this module wires the clicks to
// the `onBuyTech` / `onBuildStruct` callbacks the renderer supplies (same engine handlers as before).

import { openModal } from "../../shared/modal.js";
import { paintTech, paintStructures } from "./techpanel.js";

// Open the panel. `disc` gates the STRUCTURES tab (structures disclose after their topology tech).
// `onBuyTech(id)` / `onBuildStruct(id)` apply the purchase + persist; they return so we can re-render.
export function openTechPanel({ state, disc, onBuyTech, onBuildStruct }) {
  const hasStruct = Boolean(disc?.structures);
  let tab = "tech";

  const content = document.createElement("div");
  content.className = "s8-panel";
  const tabs = document.createElement("div");
  tabs.className = "s8-panel-tabs";
  tabs.setAttribute("role", "tablist");
  tabs.innerHTML =
    `<button type="button" class="s8-tab is-active" data-tab="tech" role="tab">TECH</button>` +
    (hasStruct ? `<button type="button" class="s8-tab" data-tab="struct" role="tab">STRUCTURES</button>` : "");
  const body = document.createElement("div");
  body.className = "s8-tech";
  body.setAttribute("role", "tabpanel");
  content.append(tabs, body);

  function render() {
    if (tab === "struct" && hasStruct) paintStructures(body, state);
    else paintTech(body, state);
    for (const b of tabs.querySelectorAll(".s8-tab")) b.classList.toggle("is-active", b.dataset.tab === tab);
  }

  tabs.addEventListener("click", (event) => {
    const t = event.target.closest(".s8-tab");
    if (!t) return;
    tab = t.dataset.tab;
    render();
  });

  body.addEventListener("click", (event) => {
    const tech = event.target.closest("button[data-tech]");
    if (tech) { onBuyTech?.(tech.dataset.tech); render(); return; }
    const struct = event.target.closest("button[data-struct]");
    if (struct) { onBuildStruct?.(struct.dataset.struct); render(); }
  });

  render();
  return openModal({ title: "Salvage bay — tech & structures", contentEl: content, className: "s8-panel-modal" });
}
