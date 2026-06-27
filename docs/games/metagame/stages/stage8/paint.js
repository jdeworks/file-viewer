// paint.js — Stage 8 Entropy Field: the pure paint panel (DOM out from state in). No engine, no
// event wiring, no persistence — renderer.js owns those and calls paintStage8 on every repaint. Split
// out of renderer.js so the shell stays small as the boss/burn view grows (CLAUDE.md ≤300 LOC).

import { entropyTreeText } from "./content.js";
import { status as nodeStatus } from "./engine.js";
import { nodeById } from "./nodes.js";

// Paint the whole field from `state` + the computed `lock`. `els` are the cached DOM handles
// (fields/map/log/root); `onSelectDebris(id)` is called when a debris chip is clicked.
export function paintStage8({ state, lock, storm, els, onSelectDebris }) {
  const { fields, map, log, root } = els;
  if (fields.act) fields.act.textContent = String(state.act || 1);
  if (fields.storms) fields.storms.textContent = String(state.stormsSurvived || 0);
  fields.cycle.textContent = String(state.cycle);
  fields.states.textContent = String(state.states);
  fields.entropy.textContent = String(Math.round(state.entropy || 0));
  if (fields.heat) fields.heat.textContent = `${Math.round(state.heat || 0)}/100`;
  if (fields.heatRate) fields.heatRate.textContent = rate(state.heatRate);
  fields.repairUnits.textContent = String(Number.isFinite(state.repairUnits) ? state.repairUnits : 6);
  fields.stabilizers.textContent = String(state.stabilizers || 0);
  if (fields.scrap) fields.scrap.textContent = String(Math.floor(state.scrap || 0));
  if (fields.insight) fields.insight.textContent = String(Math.floor(state.insight || 0));
  if (fields.insightRate) fields.insightRate.textContent = rate(state.insightRate);
  fields.salvage.textContent = String(state.salvageTotal);
  paintPrestige(fields, root, state);
  fields.tree.textContent = entropyTreeText(state);
  fields.boss.textContent = state.boss.defeated
    ? "defeated. BTS trace available."
    : `${lock.unlocked ? "UNLOCKED" : "LOCKED"} · storms ${tick(lock.enoughStorms)} · action ${tick(lock.actionReady)} · salvage ${tick(lock.enoughSalvage)} · cycles ${tick(lock.enoughCycles)} · reserves ${tick(lock.enoughStates)}`;
  fields.hint.textContent = lock.hint;
  paintTelegraph(fields.telegraph, state);
  paintStorm(root, state, storm);
  paintBurn(fields.burn, state.boss.burn);
  paintDebrisSelect(fields.debrisSelect, state);
  map.replaceChildren(...state.nodes.map(nodeCard), ...state.debris.map((item) => debrisChip(item, onSelectDebris)));
  log.replaceChildren(...state.log.slice(-5).map((line) => {
    const li = document.createElement("li");
    li.textContent = line;
    return li;
  }));
  root.querySelector('[data-action="bts"]').hidden = !state.boss.defeated;
}

function tick(ok) {
  return ok ? "✓" : "✗";
}

// Format a per-cycle rate for the HUD (signed; blank at zero).
function rate(v) {
  const n = Math.round((Number(v) || 0) * 10) / 10;
  if (!n) return "";
  return n > 0 ? `(+${n})` : `(${n})`;
}

// Microstate prestige: show Cores + multiplier and the collapse button once the field is cleared.
function paintPrestige(fields, root, state) {
  const cores = Number(state.meta?.cores || 0);
  const mult = Number(state.prestigeMult || 1);
  const cleared = Boolean(state.meta?.firstClearComplete);
  if (fields.coresWrap) fields.coresWrap.hidden = !cleared;
  if (cleared && fields.cores) fields.cores.textContent = String(cores);
  if (cleared && fields.prestigeMult) fields.prestigeMult.textContent = mult > 1 ? `(×${mult.toFixed(2)})` : "";
  const btn = root.querySelector('[data-action="collapse"]');
  if (!btn) return;
  if (cleared) {
    const preview = Math.floor(Number(state.totalStatesEarned || 0) / 400) + Number(state.stormsSurvived || 0);
    btn.hidden = false;
    btn.disabled = preview < 1;
    btn.textContent = `collapse to Microstate (+${preview} Cores)`;
  } else {
    btn.hidden = true;
  }
}

// Show/hide the brace button and announce the active or available Cascade Storm in the telegraph row.
function paintStorm(root, state, storm) {
  const btn = root.querySelector('[data-action="storm"]');
  if (!btn) return;
  const active = state.activeStorm;
  if (active) {
    btn.hidden = true;
  } else if (storm && storm.ok) {
    btn.hidden = false;
    btn.textContent = `brace for ${storm.storm.label} ▸`;
  } else {
    btn.hidden = true;
  }
}

function paintTelegraph(el, state) {
  if (!el) return;
  if (state.activeStorm) {
    el.hidden = false;
    el.dataset.tone = "bad";
    el.textContent = `⛆ ${state.activeStorm.label} — ${state.activeStorm.cyclesLeft} cycle(s) left. hold the cores.`;
    return;
  }
  if (!el) return;
  const pending = state.pendingEvent;
  if (pending) {
    el.hidden = false;
    el.dataset.tone = pending.bad ? "bad" : "good";
    el.textContent = `⚠ incoming — ${pending.telegraph}`;
  } else {
    el.hidden = true;
  }
}

function paintBurn(el, burn) {
  if (!el) return;
  if (burn && Array.isArray(burn.trace) && burn.trace.length) {
    el.hidden = false;
    el.textContent = [
      burn.survived
        ? `HEAT DEATH ENDURED · ${burn.remainingStates} States remain`
        : `HEAT DEATH OVERRAN at burn cycle ${burn.failedAt}`,
      ...burn.trace.map((t) => `  burn ${t.cycle}: -${t.drain}${t.paused ? " (stabilizer)" : ""} → ${t.remaining}`)
    ].join("\n");
  } else {
    el.hidden = true;
  }
}

function paintDebrisSelect(select, state) {
  select.replaceChildren(...state.debris.map((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${item.id} (${item.value})`;
    option.selected = item.id === state.selectedDebrisId;
    return option;
  }));
}

function nodeCard(n) {
  const def = nodeById(n.id) || {};
  const s = nodeStatus(n.health);
  const item = document.createElement("div");
  item.className = `s8-node is-${s}`;
  const bar = `<span class="s8-node-bar"><span style="width:${Math.round(n.health)}%"></span></span>`;
  item.innerHTML = `<span class="s8-node-id">${n.id}</span> <span class="s8-node-name">${def.name || ""}</span>
    ${bar} <span class="s8-node-hp">${Math.round(n.health)}%</span>
    <button type="button" data-repair="${n.id}">repair</button>`;
  return item;
}

function debrisChip(item, onSelectDebris) {
  const debris = document.createElement("button");
  debris.type = "button";
  debris.className = "s8-debris";
  debris.draggable = true;
  debris.dataset.debrisId = item.id;
  debris.textContent = item.id;
  debris.addEventListener("click", () => onSelectDebris(item.id));
  return debris;
}
