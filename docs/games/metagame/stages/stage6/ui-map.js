// ui-map.js — Stage 6 navigation screens: the hub, the act map, and run end-states.
// Pure views (detached elements); the renderer handles clicks via delegation:
//   [data-action="begin-run"|"continue-run"|"epub"|"bts"|"new-run"|"abandon"]
//   [data-node="<id>"]  move to an available map node.
// NOTE: there is deliberately NO "confront" button — The Refused Connection is reachable ONLY
// as the act-4 boss node of a full run (see renderer route). The run is mandatory.

import { availableNodes, prestigeCost } from "./run.js";

const NODE_ICON = {
  combat: "⚔", elite: "☠", rest: "♨", shop: "⛁", event: "❓", boss: "☣"
};

export function hubView(state, lock) {
  const el = document.createElement("div");
  el.className = "s6db-hub";
  const m = state.meta;
  const hasRun = Boolean(state.run);
  el.innerHTML = `
    <h2 class="s6db-hub-title">Protocol Codex</h2>
    <p class="s6db-hub-sub">A refused handshake at the edge of the archive. Build a deck of signals
      and protocols, descend four acts, and earn the right to be acknowledged.</p>
    <dl class="s6db-meta-grid">
      <div><dt>Banked handshakes</dt><dd>${m.banked}</dd></div>
      <div><dt>Protocol Version</dt><dd>v${m.protocolVersion}</dd></div>
      <div><dt>Runs cleared</dt><dd>${m.runsCleared}</dd></div>
      <div><dt>The Refused Connection</dt><dd>${lock.defeated ? "answered" : lock.unlocked ? "negotiable" : "refusing"}</dd></div>
    </dl>
    <div class="s6db-hub-actions">
      ${hasRun
        ? `<button type="button" data-action="continue-run">continue run ▸ act ${state.run.act}</button>
           <button type="button" data-action="abandon" class="s6db-ghost">abandon run</button>`
        : `<button type="button" data-action="begin-run">begin a run ▸</button>`}
      <button type="button" data-action="epub">open the codex</button>
      ${lock.defeated ? `<button type="button" data-action="bts">open trace.bts</button>` : ""}
    </div>
    <div class="s6db-prestige">
      <button type="button" data-action="prestige"${m.banked < prestigeCost(m.protocolVersion) ? " disabled" : ""}>
        reinforce protocol → v${m.protocolVersion + 1}</button>
      <span>cost ${prestigeCost(m.protocolVersion)} banked · each version: +5 max HP &amp; +1 starting relic</span>
    </div>
    <p class="s6db-hint">${esc(lock.unlocked
      ? "Chapter 9 is read. The connection can be negotiated."
      : "The connection refuses everything you send. The codex explains why.")}</p>
  `;
  return el;
}

export function mapView(run) {
  const el = document.createElement("div");
  el.className = "s6db-map";
  const act = run.map.acts[run.act - 1];
  const available = new Set(availableNodes(run).map((n) => n.id));
  const cleared = new Set(run.clearedIds);
  const total = run.map.acts.length;
  const dots = Array.from({ length: total }, (_, i) =>
    `<span class="s6db-act-dot${i + 1 < run.act ? " is-done" : ""}${i + 1 === run.act ? " is-here" : ""}"></span>`).join("");
  el.innerHTML = `<div class="s6db-map-head">
      <span>Act ${run.act} / ${total} — choose your route</span>
      <span class="s6db-act-track" aria-label="act ${run.act} of ${total}">${dots}</span>
    </div>
    ${run.notice ? `<div class="s6db-notice">${esc(run.notice)}</div>` : ""}`;

  const grid = document.createElement("div");
  grid.className = "s6db-map-grid";
  for (const layer of act.layers) {
    const col = document.createElement("div");
    col.className = "s6db-map-col";
    for (const node of layer) col.appendChild(nodeChip(node, run, available, cleared));
    grid.appendChild(col);
  }
  el.appendChild(grid);

  const footer = document.createElement("div");
  footer.className = "s6db-map-foot";
  footer.innerHTML = `<span>HP ${run.hp}/${run.maxHp}</span><span>handshakes ${run.handshakes}</span>
    <span>deck ${run.deck.length}</span><span>relics ${run.relics.length}</span>
    <button type="button" data-action="to-hub" class="s6db-ghost">to hub</button>
    <button type="button" data-action="abandon" class="s6db-ghost">abandon run</button>`;
  el.appendChild(footer);
  return el;
}

function nodeChip(node, run, available, cleared) {
  const isAvailable = available.has(node.id);
  const isCurrent = node.id === run.currentNodeId;
  const isCleared = cleared.has(node.id);
  const tag = isAvailable ? "button" : "div";
  const chip = document.createElement(tag);
  chip.className = `s6db-node s6db-node--${node.type}`
    + (isAvailable ? " is-available" : "")
    + (isCurrent ? " is-current" : "")
    + (isCleared ? " is-cleared" : "")
    + (!isAvailable && !isCleared && !isCurrent ? " is-locked" : "");
  if (tag === "button") { chip.type = "button"; chip.dataset.node = node.id; }
  chip.innerHTML = `<span class="s6db-node-icon">${NODE_ICON[node.type] || "?"}</span>
    <span class="s6db-node-type">${esc(node.type)}</span>`;
  return chip;
}

export function deathView(state, run) {
  const el = document.createElement("div");
  el.className = "s6db-end s6db-end--dead";
  el.innerHTML = `
    <h2>Connection reset</h2>
    <p>The stack collapsed in act ${run?.act ?? 1}. Your handshakes settle into the bank.</p>
    <dl class="s6db-meta-grid">
      <div><dt>Reached</dt><dd>act ${run?.act ?? 1}</dd></div>
      <div><dt>Banked total</dt><dd>${state.meta.banked}</dd></div>
    </dl>
    <div class="s6db-hub-actions">
      <button type="button" data-action="new-run">try again ▸</button>
      <button type="button" data-action="abandon" class="s6db-ghost">back to hub</button>
    </div>`;
  return el;
}

export function wonView(state) {
  const el = document.createElement("div");
  el.className = "s6db-end s6db-end--won";
  el.innerHTML = `
    <h2>The connection accepted a shared rule</h2>
    <p>Four acts negotiated. The archive lets you pass.</p>
    <div class="s6db-hub-actions">
      <button type="button" data-action="bts">open trace.bts</button>
      <button type="button" data-action="new-run">run again ▸</button>
    </div>`;
  return el;
}

function esc(value) {
  return String(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
}
