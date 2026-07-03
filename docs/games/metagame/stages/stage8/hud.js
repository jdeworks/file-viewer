// hud.js — Stage 8 Entropy Field: the sticky COMMAND BAR, the labelled HUD CLUSTERS, and the boss-gate
// CHECKLIST (UX-audit 2026-07 changes #1/#3/#4 + M2). Pure paint (DOM out from state in); renderer.js
// owns the markup, wiring and disclosure diffing. Split out of paint.js so both stay under the LOC cap.

import { SALVAGE_REQUIRED, STABILIZER_COST } from "./messages.js";

// Format a per-cycle rate for a HUD chip (signed; blank at zero).
function rate(v) {
  const n = Math.round((Number(v) || 0) * 10) / 10;
  if (!n) return "";
  return n > 0 ? `+${n}` : `${n}`;
}

// The sticky command bar: the 4 decisive numbers + the last-log ticker. `advance`/`brace` live here in
// the markup; this only paints their live numbers + visibility.
export function paintCommandBar(fields, state, storm, disc) {
  fields.cycle.textContent = String(state.cycle);
  const entropy = Math.round(state.entropy || 0);
  fields.entropy.textContent = String(entropy);
  // heat rate rides the bar only once THERMAL is disclosed.
  if (fields.heatRateWrap) fields.heatRateWrap.hidden = !disc.heat;
  if (disc.heat && fields.cmdHeatRate) fields.cmdHeatRate.textContent = rate(state.heatRate) || "0";
  // storm countdown rides the bar only while a storm is being weathered.
  const active = state.activeStorm;
  if (fields.stormWrap) fields.stormWrap.hidden = !active;
  if (active && fields.stormCountdown) fields.stormCountdown.textContent = String(active.cyclesLeft);
  // brace button: shown when the current act's storm is available (and storms are disclosed).
  const braceBtn = fields.braceBtn;
  if (braceBtn) {
    const show = disc.storm && !active && storm && storm.ok;
    braceBtn.hidden = !show;
    if (show) braceBtn.textContent = `brace ${storm.storm.label} ▸`;
  }
  // ticker: the last log line rides in the bar (full log stays below).
  if (fields.ticker) fields.ticker.textContent = state.log?.[state.log.length - 1] || "";
}

// The labelled HUD clusters. NETWORK is always present (repair charges is a fresh-save affordance);
// States joins it on first income. THERMAL/RESOURCES/PRESTIGE render only once disclosed.
export function paintClusters(fields, state, disc) {
  fields.repairUnits.textContent = String(Number.isFinite(state.repairUnits) ? state.repairUnits : 6);
  if (fields.statesWrap) fields.statesWrap.hidden = !disc.states;
  if (disc.states) fields.states.textContent = String(state.states);

  if (fields.thermalCluster) fields.thermalCluster.hidden = !disc.heat;
  if (disc.heat && fields.heat) fields.heat.textContent = `${Math.round(state.heat || 0)}/100`;

  if (fields.resourcesCluster) fields.resourcesCluster.hidden = !disc.parts;
  if (disc.parts) {
    fields.parts.textContent = String(Math.floor(state.parts || 0));
    if (fields.partsRate) fields.partsRate.textContent = rate(state.partsRate);
  }

  const cores = Number(state.meta?.cores || 0);
  const mult = Number(state.prestigeMult || 1);
  const showPrestige = disc.prestige && Boolean(state.meta?.firstClearComplete);
  if (fields.prestigeCluster) fields.prestigeCluster.hidden = !showPrestige;
  if (showPrestige) {
    fields.cores.textContent = String(cores);
    if (fields.prestigeMult) fields.prestigeMult.textContent = mult > 1 ? `×${mult.toFixed(2)}` : "";
  }
}

// The five labelled boss-gate rows, derived purely from the computed lock state (pure — unit-tested).
// Each row is [label, live-value string, met?]. Order = the gate ladder the hint follows.
export function bossGateRows(lock) {
  return [
    ["survive Cascade Storms", `${lock.stormsSurvived}/${lock.stormsRequired}`, Boolean(lock.enoughStorms)],
    ["archive .sav by hand", lock.actionReady ? "done" : "not yet", Boolean(lock.actionReady)],
    ["salvage banked", `${lock.salvageTotal}/${lock.salvageRequired}`, Boolean(lock.enoughSalvage)],
    ["reach cycle", `${lock.cycle}/${lock.minCycle}`, Boolean(lock.enoughCycles)],
    ["lifetime States", `${lock.totalEarned}/${lock.statesRequired}`, Boolean(lock.enoughStates)]
  ];
}

// The boss-gate: BEFORE 3 gates are met, a single locked chip naming ONLY the next unmet gate; once
// ≥3 gates are met, the full 5-row labelled checklist. Renders inside the (already-disclosed) panel.
export function paintBossChecklist(el, lock) {
  if (!el) return;
  if (lock.defeated) {
    el.innerHTML = `<div class="s8-gate-chip is-done">✓ Heat Death defeated — BTS trace available.</div>`;
    return;
  }
  const rows = bossGateRows(lock);
  const met = rows.filter((r) => r[2]).length;
  if (met < 3) {
    const next = rows.find((r) => !r[2]) || rows[0];
    el.innerHTML = `<div class="s8-gate-chip">🔒 next gate — ${next[0]} (${next[1]})</div>`;
    return;
  }
  el.replaceChildren(...rows.map(([label, value, ok]) => {
    const row = document.createElement("div");
    row.className = `s8-gate-row${ok ? " is-met" : ""}`;
    row.innerHTML = `<span class="s8-gate-tick">${ok ? "✓" : "✗"}</span>` +
      `<span class="s8-gate-label">${label}</span><span class="s8-gate-val">${value}</span>`;
    return row;
  }));
}

// Toggle the visibility of every disclosure-gated container + the stabilizer/external controls, and
// collapse the map to full-width while the archive panel is hidden.
export function applyDisclosure(els, state, disc) {
  const { fields, root } = els;
  root.querySelector(".s8-layout")?.classList.toggle("is-solo", !disc.debris);
  const set = (el, show) => { if (el) el.hidden = !show; };
  set(fields.archivePanel, disc.debris);
  set(fields.externalBtn, disc.debris);
  set(fields.bossPanel, disc.boss);
  // tech/structures now open from the RESOURCES cluster button (disc.parts gates the cluster itself).
  // build-stabilizer: relevant once storms/defense are in play; show the held count on the button.
  if (fields.stabilizerBtn) {
    fields.stabilizerBtn.hidden = !disc.storm;
    fields.stabilizerBtn.textContent = `build stabilizer (${STABILIZER_COST} States) · ${state.stabilizers || 0} held`;
  }
  // salvage boss-progress bar on the archive panel (M2 — salvage left the HUD).
  if (disc.debris && fields.salvageFill) {
    const pct = Math.min(100, (Number(state.salvageTotal || 0) / SALVAGE_REQUIRED) * 100);
    fields.salvageFill.style.width = `${pct}%`;
    if (fields.salvageNum) fields.salvageNum.textContent = String(state.salvageTotal || 0);
  }
}
