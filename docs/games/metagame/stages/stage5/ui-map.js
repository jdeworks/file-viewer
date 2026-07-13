// ui-map.js — Stage 5 navigation screens: the hub, the act map, and run end-states.
// Pure views (detached elements); the renderer handles clicks via delegation:
//   [data-action="begin-run"|"continue-run"|"epub"|"bts"|"new-run"|"abandon"]
//   [data-node="<id>"]  move to an available map node.
// NOTE: there is deliberately NO "confront" button — The Refused Connection is reachable ONLY
// as the act-4 boss node of a full run (see renderer route). The run is mandatory.

import { availableNodes, prestigeCost, runScore, isVeteranRun } from "./run.js";
import { activeAscensionMods, MAX_ASCENSION } from "./ascension-mods.js";
import { relicById } from "./relics.js";

const NODE_ICON = {
  combat: "⚔", elite: "☠", rest: "♨", shop: "⛁", event: "❓", boss: "☣"
};

// True-ending key metadata for the in-run info strip (M2) — names + one-line "how you earn it".
const KEY_ORDER = ["untouchable", "ascetic", "sacrifice"];
const KEY_INFO = {
  untouchable: { name: "Untouchable", hint: "clear an elite taking ≤5 damage" },
  ascetic:     { name: "Ascetic",     hint: "skip a card reward" },
  sacrifice:   { name: "Sacrifice",   hint: "spend a rest thinning a card" }
};

// Progressive disclosure (M1): a 0-runs player sees only title + flavor + begin/codex. Most meta
// clusters stay gated on state.meta.disclosed (set at the event that makes them meaningful;
// backfilled for existing saves in normalizeState so nothing regresses). The prestige cluster
// (banked total, Protocol Version, the "reinforce protocol" button) is the ONE exception, gated
// on runsStarted > 0 instead: it's visible from a player's very first run attempt — shown but
// disabled below cost, not hidden — because a first-time player otherwise has no way to discover
// the prestige system exists until after finishing (dying or winning) a run. This was previously a
// silent bug: the button was ALSO gated by a separate 75%-of-cost banked threshold on top of the
// disclosure gate, so un-gating disclosure alone (an earlier fix attempt) would not have surfaced
// the button any sooner.
export function hubView(state, lock, asc = null) {
  const el = document.createElement("div");
  el.className = "s5db-hub";
  const m = state.meta;
  const d = m.disclosed || {};
  const hasRun = Boolean(state.run);
  const canReinforce = (m.runsStarted || 0) > 0;
  el.innerHTML = `
    <h2 class="s5db-hub-title">Protocol Codex</h2>
    <p class="s5db-hub-sub">A refused handshake at the edge of the archive. Build a deck of signals
      and protocols, descend through the archive, and earn the right to be acknowledged.</p>
    <div class="s5db-hub-actions">
      ${hasRun
        ? `<button type="button" data-action="continue-run">continue run ▸ act ${state.run.act}</button>
           <button type="button" data-action="abandon" class="s5db-ghost">abandon run</button>`
        : `<button type="button" data-action="begin-run">begin a run ▸</button>`}
      <button type="button" data-action="epub">open the codex</button>
      ${lock.defeated ? `<button type="button" data-action="bts">open trace.bts</button>` : ""}
    </div>
    ${canReinforce ? `<dl class="s5db-meta-grid">
      <div><dt>Banked handshakes</dt><dd>${m.banked}</dd></div>
      <div><dt>Protocol Version</dt><dd>v${m.protocolVersion}</dd></div>
    </dl>` : ""}
    ${d.stats ? `<dl class="s5db-meta-grid">
      <div><dt>Runs cleared</dt><dd>${m.runsCleared}</dd></div>
      <div><dt>Best score</dt><dd>${m.bestScore || 0}</dd></div>
      <div><dt>The Refused Connection</dt><dd>${lock.defeated ? "answered" : lock.unlocked ? "negotiable" : "refusing"}</dd></div>
    </dl>` : ""}
    ${d.meta ? seedModes(hasRun) : ""}
    ${canReinforce ? `<div class="s5db-prestige">
      <button type="button" data-action="prestige"${m.banked < prestigeCost(m.protocolVersion) ? " disabled" : ""}>
        reinforce protocol → v${m.protocolVersion + 1}</button>
      <span>cost ${prestigeCost(m.protocolVersion)} banked · each version: +5 max HP, +1 starting relic,
        permanently upgrade one starting card &amp; one harder rule</span>
    </div>` : ""}
    ${d.meta ? ascensionPicker(asc, hasRun) : ""}
    ${d.stats ? `<p class="s5db-hint">${esc(lock.unlocked
      ? "Chapter 9 is read. The connection can be negotiated."
      : "The connection refuses everything you send. The codex explains why.")}</p>` : ""}
  `;
  return el;
}

// Seeded run modes: a DAILY run (seed from today's date — everyone's same-day run is identical) and
// a CUSTOM-seed run (type any string → a reproducible run) for self-competition. Hidden while a run
// is active (starting a seeded run would discard it). Buttons: [data-action="daily-run"|"custom-run"].
function seedModes(hasRun) {
  if (hasRun) return "";
  return `<div class="s5db-seed-modes">
      <button type="button" data-action="daily-run" class="s5db-ghost">daily seed ▸</button>
      <span class="s5db-seed-entry">
        <input type="text" class="s5db-seed-input" maxlength="40" placeholder="custom seed…" aria-label="custom seed" />
        <button type="button" data-action="custom-run" class="s5db-ghost">seeded run ▸</button>
      </span>
    </div>`;
}

// The ascension difficulty picker: choose the rule-rung (0..maxUnlocked) for the NEXT run, and show
// the rules in force at the EFFECTIVE level = max(selected, prestige floor). Hidden once a run is
// active (you can't re-pick mid-run) and when the ladder isn't wired (no save). Buttons are
// [data-ascension="<n>"]; the renderer's handler calls ascension.setLevel.
function ascensionPicker(asc, hasRun) {
  if (!asc || hasRun) {
    // Mid-run: still surface the rules in force so the player sees why the run is harder.
    return asc ? activeRules(Math.max(asc.level, asc.floor || 0)) : "";
  }
  const maxPick = Math.max(asc.maxUnlocked, asc.floor || 0);
  const cells = [];
  for (let n = 0; n <= asc.maxLevel; n++) {
    const locked = n > maxPick;
    const sel = n === asc.level ? " is-selected" : "";
    const floorPinned = n <= (asc.floor || 0) ? " is-floor" : "";
    cells.push(locked
      ? `<span class="s5db-asc-cell is-locked" aria-disabled="true">${n}</span>`
      : `<button type="button" class="s5db-asc-cell${sel}${floorPinned}" data-ascension="${n}">${n}</button>`);
  }
  const effective = Math.max(asc.level, asc.floor || 0);
  return `<div class="s5db-ascension">
      <div class="s5db-asc-head"><strong>Ascension</strong>
        <span>difficulty ${asc.level} · cleared ${asc.maxCleared}/${MAX_ASCENSION}${asc.floor ? ` · prestige floor ${asc.floor}` : ""}</span></div>
      <div class="s5db-asc-track" aria-label="ascension level picker">${cells.join("")}</div>
      ${activeRules(effective)}
    </div>`;
}

// Show the stacked ascension rules active at the given effective level.
function activeRules(level) {
  const active = activeAscensionMods(level);
  if (!active.length) return "";
  return `<ul class="s5db-modifiers" aria-label="active rules">${active
    .map((mod) => `<li>⚠ <strong>${esc(mod.label)}</strong> — ${esc(mod.desc)}</li>`).join("")}</ul>`;
}

export function mapView(run) {
  const el = document.createElement("div");
  el.className = "s5db-map";
  const act = run.map.acts[run.act - 1];
  const available = new Set(availableNodes(run).map((n) => n.id));
  const cleared = new Set(run.clearedIds);
  const total = run.map.acts.length;
  const dots = Array.from({ length: total }, (_, i) =>
    `<span class="s5db-act-dot${i + 1 < run.act ? " is-done" : ""}${i + 1 === run.act ? " is-here" : ""}"></span>`).join("");
  el.innerHTML = `<div class="s5db-map-head">
      <span>Act ${run.act} / ${total} — choose your route</span>
      <span class="s5db-act-track" aria-label="act ${run.act} of ${total}">${dots}</span>
    </div>
    ${run.notice ? `<div class="s5db-notice">${esc(run.notice)}</div>` : ""}`;

  const grid = document.createElement("div");
  grid.className = "s5db-map-grid";
  for (const layer of act.layers) {
    const col = document.createElement("div");
    col.className = "s5db-map-col";
    for (const node of layer) col.appendChild(nodeChip(node, run, available, cleared));
    grid.appendChild(col);
  }
  el.appendChild(grid);

  // M2 — in-run info diet: relics + keys are a tap/hover strip here (with names + one-liners),
  // not permanent combat chrome. The footer keeps just the vitals + navigation.
  el.insertAdjacentHTML("beforeend", inventoryStrip(run));

  const footer = document.createElement("div");
  footer.className = "s5db-map-foot";
  footer.innerHTML = `<span>HP ${run.hp}/${run.maxHp}</span><span>handshakes ${run.handshakes}</span>
    <button type="button" data-deck class="s5db-ghost s5db-map-deck" title="view your deck">deck ${run.deck.length} ▾</button>
    <button type="button" data-action="to-hub" class="s5db-ghost">to hub</button>
    <button type="button" data-action="abandon" class="s5db-ghost">abandon run</button>`;
  el.appendChild(footer);
  return el;
}

// The owned-relics + true-ending-keys strip (M2). Tap/hover to expand names + one-liners. On a
// veteran run the unearned keys are shown too (they're achievable); on a 4-act first run only earned
// keys appear (all three can't be collected there, so it stays quiet).
function inventoryStrip(run) {
  const relics = (run.relics || []).map(relicById).filter(Boolean);
  const keys = run.keys || [];
  const vet = isVeteranRun(run);
  const rItems = relics.length
    ? relics.map((r) => `<li><strong>⬢ ${esc(r.name)}</strong> — ${esc(r.text)}</li>`).join("")
    : `<li class="s5db-inv-none">No relics yet — clear elites and act bosses to earn them.</li>`;
  const keyRows = KEY_ORDER.filter((id) => vet || keys.includes(id)).map((id) => {
    const got = keys.includes(id);
    return `<li class="${got ? "is-earned" : ""}"><strong>${got ? "⚷" : "○"} ${esc(KEY_INFO[id].name)}</strong> — ${esc(KEY_INFO[id].hint)}</li>`;
  }).join("");
  const keySection = keyRows
    ? `<div class="s5db-inv-keys"><h4>True-ending keys ${keys.length}/3</h4><ul>${keyRows}</ul></div>` : "";
  return `<details class="s5db-inv"><summary>relics ${relics.length} · keys ${keys.length}/3</summary>
    <div class="s5db-inv-body">
      <div class="s5db-inv-relics"><h4>Relics</h4><ul>${rItems}</ul></div>${keySection}
    </div></details>`;
}

// #5 — MAP EDGES: draw the act DAG's adjacency as an SVG overlay UNDER the node chips. Called by the
// renderer AFTER the map is mounted (positions need layout). pointer-events:none, sized to the grid's
// scroll extent so it scrolls with the horizontal map and never intercepts a node click. Recomputed
// on every render. Edges from the CURRENT node are highlighted; edges out of a cleared node are traced.
export function paintMapEdges(mapEl, run) {
  const grid = mapEl?.querySelector?.(".s5db-map-grid");
  if (!grid) return;
  grid.querySelector(":scope > svg.s5db-edges")?.remove();
  const gridRect = grid.getBoundingClientRect();
  if (!gridRect.width) return; // not laid out / styled yet — a later render will paint it
  const act = run.map.acts[run.act - 1];
  const cleared = new Set(run.clearedIds);
  const SVG = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("class", "s5db-edges");
  svg.setAttribute("aria-hidden", "true");
  const w = grid.scrollWidth, h = grid.scrollHeight;
  svg.setAttribute("width", String(w));
  svg.setAttribute("height", String(h));
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  const rectOf = (id) => grid.querySelector(`[data-node-id="${id}"]`)?.getBoundingClientRect() || null;
  const frag = document.createDocumentFragment();
  for (const layer of act.layers) {
    for (const node of layer) {
      const from = rectOf(node.id);
      if (!from) continue;
      for (const nextId of node.next || []) {
        const to = rectOf(nextId);
        if (!to) continue;
        const line = document.createElementNS(SVG, "line");
        line.setAttribute("x1", String(from.right - gridRect.left + grid.scrollLeft));
        line.setAttribute("y1", String(from.top - gridRect.top + grid.scrollTop + from.height / 2));
        line.setAttribute("x2", String(to.left - gridRect.left + grid.scrollLeft));
        line.setAttribute("y2", String(to.top - gridRect.top + grid.scrollTop + to.height / 2));
        let cls = "s5db-edge";
        if (node.id === run.currentNodeId) cls += " is-current";
        else if (cleared.has(node.id)) cls += " is-cleared";
        line.setAttribute("class", cls);
        frag.appendChild(line);
      }
    }
  }
  svg.appendChild(frag);
  grid.insertBefore(svg, grid.firstChild);
}

function nodeChip(node, run, available, cleared) {
  const isAvailable = available.has(node.id);
  const isCurrent = node.id === run.currentNodeId;
  const isCleared = cleared.has(node.id);
  const tag = isAvailable ? "button" : "div";
  const chip = document.createElement(tag);
  chip.className = `s5db-node s5db-node--${node.type}`
    + (isAvailable ? " is-available" : "")
    + (isCurrent ? " is-current" : "")
    + (isCleared ? " is-cleared" : "")
    + (!isAvailable && !isCleared && !isCurrent ? " is-locked" : "");
  if (tag === "button") { chip.type = "button"; chip.dataset.node = node.id; }
  chip.dataset.nodeId = node.id; // stable anchor for the edge overlay (#5); distinct from data-node (move target)
  chip.innerHTML = `<span class="s5db-node-icon">${NODE_ICON[node.type] || "?"}</span>
    <span class="s5db-node-type">${esc(node.type)}</span>`;
  return chip;
}

export function deathView(state, run) {
  const el = document.createElement("div");
  el.className = "s5db-end s5db-end--dead";
  el.innerHTML = `
    <h2>Connection reset</h2>
    <p>The stack collapsed in act ${run?.act ?? 1}. Your handshakes settle into the bank.</p>
    <dl class="s5db-meta-grid">
      <div><dt>Reached</dt><dd>act ${run?.act ?? 1}</dd></div>
      <div><dt>Score</dt><dd>${run ? runScore(run) : 0}</dd></div>
      <div><dt>Banked total</dt><dd>${state.meta.banked}</dd></div>
    </dl>
    ${scoreLine(state, run)}
    <div class="s5db-hub-actions">
      <button type="button" data-action="new-run">try again ▸</button>
      <button type="button" data-action="abandon" class="s5db-ghost">back to hub</button>
    </div>`;
  return el;
}

export function wonView(state, run) {
  const el = document.createElement("div");
  el.className = "s5db-end s5db-end--won";
  const trueEnding = Boolean(run?.trueEnding);
  el.innerHTML = `
    <h2>${trueEnding ? "The Kernel of Refusal yields" : "The connection accepted a shared rule"}</h2>
    <p>${trueEnding
      ? "Three keys turned in the lock. Past the accepted handshake, the kernel that refused everything finally answers. This is the true ending."
      : "Six acts negotiated. The archive lets you pass."}</p>
    <dl class="s5db-meta-grid">
      <div><dt>Score</dt><dd>${run ? runScore(run) : 0}</dd></div>
      <div><dt>Ascension</dt><dd>${run?.ascension || 0}</dd></div>
      <div><dt>Banked total</dt><dd>${state.meta.banked}</dd></div>
    </dl>
    ${scoreLine(state, run)}
    <div class="s5db-hub-actions">
      <button type="button" data-action="bts">open trace.bts</button>
      <button type="button" data-action="new-run">run again ▸</button>
    </div>`;
  return el;
}

// A small "best / seed" line for the end screens: shows the all-time best and, for a seeded run,
// the seed key + its best score (self-competition).
function scoreLine(state, run) {
  const best = state.meta.bestScore || 0;
  const parts = [`<span>Best: <strong>${best}</strong></span>`];
  if (run?.dailyKey) {
    const seedBest = (state.meta.dailyBest && state.meta.dailyBest[run.dailyKey]) || 0;
    const label = run.mode === "daily" ? "daily" : "seed";
    parts.push(`<span>${esc(label)} <code>${esc(run.dailyKey)}</code> best: <strong>${seedBest}</strong></span>`);
  }
  return `<p class="s5db-score-line">${parts.join(" · ")}</p>`;
}

function esc(value) {
  return String(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
}
