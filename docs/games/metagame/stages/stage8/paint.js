// paint.js — Stage 8 Entropy Field: the pure paint panel (DOM out from state in). No engine, no event
// wiring, no persistence — renderer.js owns those and calls paintStage8 on every repaint. The sticky
// command bar, HUD clusters and boss checklist live in hud.js; this file paints the map, file tree,
// telegraph, storm, burn readout, debris select and the prestige collapse button, and applies the
// disclosure visibility pass. Split so the shell stays small (CLAUDE.md ≤300 LOC).

import { entropyTreeText } from "./content.js";
import { paintCommandBar, paintClusters, paintBossChecklist, applyDisclosure } from "./hud.js";
import { paintMap } from "./map.js";

// Paint the whole field from `state` + the computed `lock` + the `disc`losure map. `els` are the cached
// DOM handles (fields/map/log/root); `onSelectDebris(id)` is called when a debris chip is clicked.
export function paintStage8({ state, lock, storm, disc, els, onSelectDebris }) {
  const { fields, map, log, root } = els;
  const entropy = Math.round(state.entropy || 0);
  // Drive the glitch aesthetic deterministically from the entropy level (CSS reads both).
  root.style.setProperty("--entropy-level", (entropy / 100).toFixed(2));
  root.dataset.entropy = entropy >= 80 ? "critical" : entropy >= 60 ? "high" : entropy >= 35 ? "mid" : "low";

  paintCommandBar(fields, state, storm, disc);
  paintClusters(fields, state, disc);
  applyDisclosure(els, state, disc);
  if (disc.boss) {
    paintBossChecklist(fields.bossGate, lock);
    fields.hint.textContent = lock.hint;
    const bossBtn = fields.bossBtn;
    if (bossBtn) { bossBtn.disabled = !lock.unlocked || Boolean(state.boss.defeated); }
  }

  fields.tree.textContent = entropyTreeText(state);
  paintTelegraph(fields.telegraph, state);
  paintStorm(root, state, storm, disc);
  paintBurn(fields.burn, state.boss.burn);
  paintDebrisSelect(fields.debrisSelect, state);
  paintCollapse(fields, root, state, disc);
  paintMap(map, state);
  if (fields.debrisTray) fields.debrisTray.replaceChildren(...state.debris.map((item) => debrisChip(item, onSelectDebris)));
  log.replaceChildren(...state.log.slice(-5).map((line) => {
    const li = document.createElement("li");
    li.textContent = line;
    return li;
  }));
  root.querySelector('[data-action="bts"]').hidden = !state.boss.defeated;
}

// Microstate prestige: show the collapse button once the field is cleared (Cores + ×mult now live in
// the PRESTIGE HUD cluster — hud.js).
function paintCollapse(fields, root, state, disc) {
  const btn = root.querySelector('[data-action="collapse"]');
  if (!btn) return;
  const cleared = disc.prestige && Boolean(state.meta?.firstClearComplete);
  if (cleared) {
    const preview = Math.floor(Number(state.totalStatesEarned || 0) / 400) + Number(state.stormsSurvived || 0);
    btn.hidden = false;
    btn.disabled = preview < 1;
    btn.textContent = `collapse to Microstate (+${preview} Cores)`;
  } else {
    btn.hidden = true;
  }
}

// Show/hide the brace button is done in hud.js; here we only tint the field via the telegraph row and
// the active-storm marker.
function paintStorm(root, state, storm, disc) {
  root.dataset.storm = state.activeStorm ? "active" : "";
}

function paintTelegraph(el, state) {
  if (!el) return;
  if (state.activeStorm) {
    el.hidden = false;
    el.dataset.tone = "bad";
    el.textContent = `⛆ ${state.activeStorm.label} — ${state.activeStorm.cyclesLeft} cycle(s) left. hold the cores.`;
    return;
  }
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
