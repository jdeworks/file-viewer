// s8dev.js — Stage 8 dev-menu cheat functions (pure state mutators, no DOM, deterministic).
// Each function takes `state` and mutates it in place. Called by renderer.js dev(id) which also
// handles any action-bus side-effects (e.g. actions.setAction for the boss-gate cheat).

import { earnScrap, earnInsight } from "./resources.js";
import { STORMS, bringSectorOnline } from "./storms.js";
import { TOTAL_STORMS } from "./storms.js";
import { createDebris } from "./state.js";
import { SALVAGE_REQUIRED, STATES_REQUIRED, MIN_CYCLE } from "./messages.js";

const pushLog = (state, line) => { state.log = [...(state.log || []), line].slice(-12); };

// 1 — Give the three main currencies in one shot.
export function devGiveResources(state) {
  state.states = Number(state.states || 0) + 500;
  state.totalStatesEarned = Number(state.totalStatesEarned || 0) + 500;
  earnScrap(state, 200);
  earnInsight(state, 100);
  pushLog(state, "DEV: +500 States, +200 Scrap, +100 Insight.");
}

// 2 — Instantly survive the current act's Cascade Storm: bring its sector online and advance act.
//     Idempotent when all three storms are already survived.
export function devSkipStorm(state) {
  const idx = Math.max(0, Number(state.act || 1) - 1);
  const storm = STORMS[idx];
  if (!storm) { pushLog(state, "DEV: all storms already survived."); return; }
  state.activeStorm = null;
  bringSectorOnline(state, storm.sector);
  state.stormsSurvived = Number(state.stormsSurvived || 0) + 1;
  state.act = Number(state.act || 1) + 1;
  if (!Array.isArray(state.announcedStorms)) state.announcedStorms = [];
  if (!state.announcedStorms.includes(storm.id)) state.announcedStorms.push(storm.id);
  earnInsight(state, storm.insightBonus);
  pushLog(state, `DEV: Storm ${storm.id} skipped — sector ${storm.sector} online, +${storm.insightBonus} Insight.`);
}

// 3 — Satisfy every state-side boss-gate condition in one shot. After this returns, callers that
//     also fire actions.setAction(8, "salvage_archived") will see getBossLockState return unlocked.
//     (The action-bus side is not purely state — the renderer's dev() wrapper handles that.)
export function devUnlockBossGate(state) {
  // Storm gate: all three sectors online, stormsSurvived = 3.
  for (const storm of STORMS) {
    bringSectorOnline(state, storm.sector);
    if (!Array.isArray(state.announcedStorms)) state.announcedStorms = [];
    if (!state.announcedStorms.includes(storm.id)) state.announcedStorms.push(storm.id);
  }
  state.stormsSurvived = TOTAL_STORMS;
  state.act = TOTAL_STORMS + 1;
  state.activeStorm = null;

  // Cycle gate.
  if (Number(state.cycle || 0) < MIN_CYCLE) state.cycle = MIN_CYCLE;

  // Cumulative-States gate (lifetime earned, not in-hand balance).
  if (Number(state.totalStatesEarned || 0) < STATES_REQUIRED) {
    const bump = STATES_REQUIRED - Number(state.totalStatesEarned || 0);
    state.totalStatesEarned = STATES_REQUIRED;
    state.states = Number(state.states || 0) + bump;
  }

  // In-hand balance for the burn (~300 needed; give headroom).
  if (Number(state.states || 0) < 400) state.states = 400;

  // Salvage gate: archive a dummy debris item.
  if (Number(state.salvageTotal || 0) < SALVAGE_REQUIRED) {
    const dummy = createDebris({ node: "F1", cycle: Math.max(1, Number(state.cycle || 1)), tier: 4, value: SALVAGE_REQUIRED, decay: 2 });
    if (!Array.isArray(state.archive)) state.archive = [];
    if (!state.archive.some((a) => a.id === dummy.id)) {
      state.archive.push({ ...dummy, archivedAtCycle: state.cycle, path: `/entropy/active_archive/${dummy.id}` });
    }
    state.salvageTotal = Math.max(Number(state.salvageTotal || 0), SALVAGE_REQUIRED);
  }

  // Manual-archive flag (gates Cold Storage automation).
  state.manualArchiveDone = true;

  pushLog(state, "DEV: boss gate satisfied — storms weathered, archives stocked, reserves banked.");
}

// 4 — Cool the field: zero heat + entropy, restore all nodes to full health.
export function devCoolField(state) {
  state.heat = 0;
  state.heatRate = 0;
  state.entropy = 0;
  for (const n of state.nodes || []) { n.health = 100; n.cascadeStress = 0; }
  state.repairUnits = Math.max(Number(state.repairUnits || 0), 6);
  pushLog(state, "DEV: field cooled — heat/entropy zeroed, all nodes restored.");
}

// 5 — Spawn three high-value debris items (idempotent: skips ids already present).
//     Gives the player archive-able wreckage without needing to wait for natural decay.
const DEV_DEBRIS_TEMPLATES = [
  { node: "F1", cycle: 1, tier: 4, value: 30, decay: 2 },
  { node: "F2", cycle: 1, tier: 4, value: 30, decay: 2 },
  { node: "P1", cycle: 1, tier: 3, value: 20, decay: 2 }
];

export function devSpawnDebris(state) {
  if (!Array.isArray(state.debris)) state.debris = [];
  const have = new Set(state.debris.map((d) => d.id));
  let added = 0;
  for (const t of DEV_DEBRIS_TEMPLATES) {
    const item = createDebris(t);
    if (!have.has(item.id)) { state.debris.push(item); added += 1; }
  }
  if (!state.selectedDebrisId && state.debris[0]) state.selectedDebrisId = state.debris[0].id;
  pushLog(state, `DEV: spawned ${added} debris item${added !== 1 ? "s" : ""}.`);
}
