// popover.js — Stage 8 Entropy Field: the tile-tap ACTION POPOVER (UX-audit #2). Tapping a node tile
// on the spatial map opens one popover with the per-node verbs — repair / High-Load toggle / freeze —
// that were formerly crammed onto every list card. The buttons carry the SAME data-attributes the
// renderer's root click-delegation already handles (data-repair / data-high-load / data-stabilize-node),
// so tapping a popover verb routes through the exact same engine handlers as before. One popover at a
// time; closes on an outside tap, Esc, or after any action. `popoverActionSpecs` is pure + unit-tested.

import { nodeById } from "./nodes.js";
import { status } from "./engine.js";

const REPAIR_STEP = 2;        // matches renderer.js — repair units spent per click
const FREEZE_CYCLE = 6;       // matches paint.js — freeze unlocks in Band 2

// Pure: the ordered action descriptors for a node's popover, given the live state. Each descriptor's
// `dataAttr` is the delegation hook the renderer listens for — so the DOM stays in lock-step with the
// handlers, and a test can assert the routing without a browser.
export function popoverActionSpecs(state, nodeId) {
  const def = nodeById(nodeId) || {};
  const live = (state.nodes || []).find((n) => n.id === nodeId) || { health: 0 };
  const frozen = Number(state.stabilized?.[nodeId] || 0);
  const held = Number(state.stabilizers || 0);
  const budget = Number.isFinite(state.repairUnits) ? state.repairUnits : 0;
  const specs = [{
    kind: "repair", dataAttr: "data-repair",
    label: `repair ▸ ${REPAIR_STEP}u`, disabled: budget < REPAIR_STEP || status(live.health) === "active" && live.health >= 100
  }];
  if (def.supportsHighLoad) {
    const on = Boolean(state.highLoad?.[nodeId]);
    specs.push({ kind: "high-load", dataAttr: "data-high-load", label: `High-Load ${on ? "✓" : "○"}`, disabled: false, on });
  }
  if (Number(state.cycle || 0) >= FREEZE_CYCLE) {
    specs.push({ kind: "freeze", dataAttr: "data-stabilize-node", label: `freeze ❄${held}`, disabled: held < 1 || Boolean(frozen), frozen });
  }
  return specs;
}

let active = null; // { el, onDocClick, onKey }

// Close any open popover and tear down its listeners (idempotent).
export function closePopover() {
  if (!active) return;
  document.removeEventListener("click", active.onDocClick, true);
  document.removeEventListener("keydown", active.onKey, true);
  active.el.remove();
  active = null;
}

// Open the action popover for `nodeId`, anchored under its `tile`, inside `root` (position: relative).
export function openNodePopover({ root, tile, state, nodeId }) {
  closePopover();
  const def = nodeById(nodeId) || {};
  const el = document.createElement("div");
  el.className = "s8-popover";
  el.setAttribute("role", "menu");
  el.setAttribute("aria-label", `${nodeId} actions`);
  const live = (state.nodes || []).find((n) => n.id === nodeId) || { health: 0 };
  const frozen = Number(state.stabilized?.[nodeId] || 0);
  const buttons = popoverActionSpecs(state, nodeId).map((s) =>
    `<button type="button" class="s8-pop-btn${s.on ? " is-on" : ""}" ${s.dataAttr}="${nodeId}"${s.disabled ? " disabled" : ""}>${s.label}</button>`
  ).join("");
  el.innerHTML =
    `<div class="s8-pop-head"><b>${nodeId}</b> ${def.name || ""} · ${Math.round(live.health)}%${frozen ? ` · ❄${frozen}` : ""}</div>` +
    `<div class="s8-pop-actions">${buttons}</div>`;
  root.appendChild(el);
  positionPopover(el, tile, root);

  const onDocClick = (event) => {
    if (el.contains(event.target) || tile.contains(event.target)) return;
    closePopover();
  };
  const onKey = (event) => { if (event.key === "Escape") { event.preventDefault(); closePopover(); } };
  active = { el, onDocClick, onKey };
  // defer the outside-click listener so THIS opening click doesn't immediately close it.
  setTimeout(() => {
    if (active && active.el === el) {
      document.addEventListener("click", onDocClick, true);
      document.addEventListener("keydown", onKey, true);
    }
  }, 0);
  return el;
}

// Anchor the popover just under the tile, clamped to the root's box so it never overflows horizontally.
function positionPopover(el, tile, root) {
  const t = tile.getBoundingClientRect();
  const r = root.getBoundingClientRect();
  el.style.top = `${t.bottom - r.top + 4}px`;
  const w = el.offsetWidth || 160;
  let left = t.left - r.left;
  const max = root.clientWidth - w - 6;
  if (left > max) left = Math.max(4, max);
  el.style.left = `${left}px`;
}
