// paint.js — Stage 8 Entropy Field: the pure paint panel (DOM out from state in). No engine, no
// event wiring, no persistence — renderer.js owns those and calls paintStage8 on every repaint. Split
// out of renderer.js so the shell stays small as the boss/burn view grows (CLAUDE.md ≤300 LOC).

import { entropyTreeText } from "./content.js";
import { status as nodeStatus } from "./engine.js";
import { nodeById } from "./nodes.js";

// Paint the whole field from `state` + the computed `lock`. `els` are the cached DOM handles
// (fields/map/log/root); `onSelectDebris(id)` is called when a debris chip is clicked.
export function paintStage8({ state, lock, els, onSelectDebris }) {
  const { fields, map, log, root } = els;
  fields.cycle.textContent = String(state.cycle);
  fields.states.textContent = String(state.states);
  fields.entropy.textContent = String(state.entropy || 0);
  fields.repairUnits.textContent = String(Number.isFinite(state.repairUnits) ? state.repairUnits : 6);
  fields.stabilizers.textContent = String(state.stabilizers || 0);
  fields.salvage.textContent = String(state.salvageTotal);
  fields.tree.textContent = entropyTreeText(state);
  fields.boss.textContent = state.boss.defeated
    ? "defeated. BTS trace available."
    : `${lock.unlocked ? "UNLOCKED" : "LOCKED"} · action ${tick(lock.actionReady)} · salvage ${tick(lock.enoughSalvage)} · cycles ${tick(lock.enoughCycles)} · reserves ${tick(lock.enoughStates)}`;
  fields.hint.textContent = lock.hint;
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
