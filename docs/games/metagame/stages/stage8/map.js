// map.js — Stage 8 Entropy Field: the SPATIAL NODE MAP (UX-audit #2 — the headline). Replaces the flat
// 34-card list with compact node TILES laid out BY SECTOR (CORE centre, ALPHA/BETA/GAMMA around it) with
// the adjacency cascade drawn as an SVG edge overlay. Pure paint (DOM out from state in): map interaction
// (tile tap → popover, per-node verbs) is wired by renderer.js delegation. Tiles keep `.s8-node` +
// `.s8-node-bar` so the survival-map contract and smoke selector are preserved.

import { status } from "./engine.js";
import { nodeById } from "./nodes.js";
import { sectorGroups, mapEdges } from "./layout.js";

const SECTOR_LABEL = { core: "CORE", alpha: "SECTOR α", beta: "SECTOR β", gamma: "SECTOR γ" };

// Paint the whole network into `mapEl`. `activeSector` (the storm's sector, if any) tints its block.
export function paintMap(mapEl, state) {
  const activeSector = state.activeStorm?.sector || null;
  const net = document.createElement("div");
  net.className = "s8-net";
  for (const group of sectorGroups(state)) net.appendChild(sectorBlock(group, state, activeSector));
  mapEl.replaceChildren(net);
  // Edges need layout to have run (tile rects) — paint after the block is in the DOM.
  paintEdges(net, state);
}

function sectorBlock({ sector, nodes }, state, activeSector) {
  const block = document.createElement("div");
  block.className = `s8-sector s8-sector--${sector}${sector === activeSector ? " is-storming" : ""}`;
  block.dataset.sector = sector;
  const head = document.createElement("div");
  head.className = "s8-sector-head";
  head.innerHTML = `<span>${SECTOR_LABEL[sector] || sector}</span><small>${nodes.length}</small>`;
  const grid = document.createElement("div");
  grid.className = "s8-sector-grid";
  for (const n of nodes) grid.appendChild(tile(n, state));
  block.append(head, grid);
  return block;
}

function tile(n, state) {
  const def = nodeById(n.id) || {};
  const s = status(n.health);
  const hl = Boolean(state.highLoad?.[n.id]) && def.supportsHighLoad;
  const frozen = Number(state.stabilized?.[n.id] || 0);
  const stress = Number(n.cascadeStress) || 0;
  const el = document.createElement("button");
  el.type = "button";
  const classes = ["s8-node", `s8-node--${def.zone || "core"}`, `is-${s}`];
  if (hl) classes.push("is-high-load");
  if (frozen) classes.push("is-stabilized");
  if (stress > 0) classes.push("is-stressed");
  el.className = classes.join(" ");
  el.dataset.nodeTile = n.id;   // tap target → popover (renderer delegation)
  el.dataset.nodeId = n.id;     // stable anchor for the edge overlay
  el.title = `${n.id} ${def.name || ""} — ${Math.round(n.health)}%${stress ? ` · cascade +${stress}/cyc` : ""}${frozen ? ` · frozen ${frozen}` : ""}`;
  const pips = (stress > 0 ? `<span class="s8-node-pip is-stress">⚠${stress}</span>` : "")
    + (frozen ? `<span class="s8-node-pip is-frozen">❄</span>` : "");
  el.innerHTML =
    `<span class="s8-node-id">${n.id}</span>` +
    `<span class="s8-node-bar"><span style="width:${Math.round(n.health)}%"></span></span>` +
    `<span class="s8-node-pips">${pips}</span>`;
  return el;
}

// #2 — CASCADE EDGES: draw adjacency as an SVG overlay UNDER the tiles (pointer-events:none, sized to
// the net's box, recomputed every paint — mirrors stage6 ui-map.js). Edges out of a FAILED node are
// tinted (cascade stress flowing downstream). Skipped silently until the net has been laid out.
export function paintEdges(net, state) {
  net.querySelector(":scope > svg.s8-edges")?.remove();
  const box = net.getBoundingClientRect();
  if (!box.width) return; // not laid out yet — a later repaint will draw it
  const SVG = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("class", "s8-edges");
  svg.setAttribute("aria-hidden", "true");
  const w = net.scrollWidth, h = net.scrollHeight;
  svg.setAttribute("width", String(w));
  svg.setAttribute("height", String(h));
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  const centreOf = (id) => {
    const t = net.querySelector(`[data-node-id="${id}"]`);
    if (!t) return null;
    const r = t.getBoundingClientRect();
    return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 };
  };
  const frag = document.createDocumentFragment();
  for (const e of mapEdges(state)) {
    const a = centreOf(e.from), b = centreOf(e.to);
    if (!a || !b) continue;
    const line = document.createElementNS(SVG, "line");
    line.setAttribute("x1", String(a.x)); line.setAttribute("y1", String(a.y));
    line.setAttribute("x2", String(b.x)); line.setAttribute("y2", String(b.y));
    line.setAttribute("class", `s8-edge${e.stressed ? " is-stressed" : ""}`);
    frag.appendChild(line);
  }
  svg.appendChild(frag);
  net.insertBefore(svg, net.firstChild);
}
