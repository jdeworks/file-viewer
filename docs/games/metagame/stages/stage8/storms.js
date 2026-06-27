// storms.js — Stage 8 Entropy Field: the three CASCADE STORMS that gate act transitions.
//
// The network grows across three acts. Each act ends with a scripted, multi-cycle Cascade Storm
// (a mid-boss): the player BRACES it once the act body is met (enough cycles survived + reserves
// banked), then weathers `duration` cycles of escalating scripted damage layered on top of normal
// decay. SURVIVAL = both core anchors still alive at the storm's end. Surviving:
//   • brings the next SECTOR online (the network grows: core→alpha→beta→gamma),
//   • banks an Insight windfall (research dividend of weathering the storm),
//   • advances the act and increments stormsSurvived.
// Failing a storm just ends it (no permanent loss) so the player can recover and brace again. The
// Heat Death boss is reachable ONLY after all three storms are survived (boss.js gate). All damage is
// driven by the cycle's seeded rng (deterministic — replays identically). engine.advanceCycle calls
// tickStorm; the renderer/solver call stormAvailable + braceStorm.

import { nodeById, freshSectorNodes } from "./nodes.js";
import { earnInsight } from "./resources.js";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const zoneOf = (id) => (nodeById(id) || {}).zone;
const isCore = (id) => zoneOf(id) === "core" && /^C/.test(id);

// Per-zone scripted storm damage (escalates by act). Cores take only light chip damage so a focused
// spine-repair can always keep the anchors alive — survival is a management test, not a coin flip.
const STORM_DAMAGE = {
  alpha: { frontier: 7, production: 4, mid: 3, research: 4, coolant: 3, core: 2, spikes: 1, spike: 10 },
  beta: { frontier: 9, production: 5, mid: 4, research: 5, coolant: 4, core: 2, spikes: 2, spike: 12 },
  gamma: { frontier: 11, production: 6, mid: 5, research: 6, coolant: 5, core: 3, spikes: 3, spike: 14 }
};

export const STORMS = [
  {
    id: "alpha", label: "Cascade Storm α", sector: "alpha", duration: 3, insightBonus: 15,
    requires: { minCycle: 8, minStates: 220 },
    telegraph: "Cascade Storm α is forming. Brace: 3 cycles of frontier failure. Survive to bring Sector α online."
  },
  {
    id: "beta", label: "Cascade Storm β", sector: "beta", duration: 4, insightBonus: 25,
    requires: { minCycle: 16, minStates: 520 },
    telegraph: "Cascade Storm β is forming. Brace: 4 cycles, the relays buckle. Survive to bring Sector β online."
  },
  {
    id: "gamma", label: "Cascade Storm γ", sector: "gamma", duration: 5, insightBonus: 40,
    requires: { minCycle: 24, minStates: 900 },
    telegraph: "Cascade Storm γ is forming. Brace: 5 cycles, field-wide. Survive to bring Sector γ online — then the Heat Death."
  }
];

export const STORM_BY_ID = new Map(STORMS.map((s) => [s.id, s]));
export const TOTAL_STORMS = STORMS.length;

// The storm the player faces in the current act (act 1→α, 2→β, 3→γ; none after all are survived).
export function stormForAct(state) {
  const idx = Math.max(0, Number(state.act || 1) - 1);
  return STORMS[idx] || null;
}

// Whether the current act's storm can be braced right now: a storm remains, its sector isn't online,
// none is active, and the act body (cycles + cumulative reserves) is met.
export function stormAvailable(state) {
  const storm = stormForAct(state);
  if (!storm) return { ok: false, reason: "all-survived" };
  if ((state.onlineSectors || []).includes(storm.sector)) return { ok: false, reason: "already-online" };
  if (state.activeStorm) return { ok: false, reason: "in-storm" };
  const cycleOk = Number(state.cycle || 0) >= storm.requires.minCycle;
  const statesOk = Number(state.totalStatesEarned || 0) >= storm.requires.minStates;
  if (!cycleOk || !statesOk) {
    return { ok: false, reason: "body", storm, cycleOk, statesOk };
  }
  return { ok: true, storm };
}

// Begin weathering the current act's storm (validated). The storm then runs over the next `duration`
// advanceCycle calls via tickStorm.
export function braceStorm(state) {
  const avail = stormAvailable(state);
  if (!avail.ok) return { ok: false, reason: avail.reason };
  const storm = avail.storm;
  state.activeStorm = { id: storm.id, sector: storm.sector, label: storm.label, cyclesLeft: storm.duration, duration: storm.duration };
  state.pendingStorm = null;
  pushLog(state, `${storm.label} — bracing. ${storm.duration} cycles.`);
  return { ok: true, storm };
}

// Append a sector's nodes to the live field (idempotent) and mark it online.
export function bringSectorOnline(state, sector) {
  if (!(state.onlineSectors || []).includes(sector)) state.onlineSectors.push(sector);
  const have = new Set(state.nodes.map((n) => n.id));
  for (const n of freshSectorNodes(sector)) if (!have.has(n.id)) state.nodes.push(n);
}

// Apply one storm cycle's scripted damage (called by engine BEFORE normal decay). Deterministic via
// the cycle rng. Returns null when no storm is active, else a resolution/progress detail.
export function tickStorm(state, rng) {
  const active = state.activeStorm;
  if (!active) return null;
  const dmg = STORM_DAMAGE[active.id] || STORM_DAMAGE.alpha;
  // zone-wide scripted damage
  for (const n of state.nodes) {
    const z = zoneOf(n.id);
    const d = dmg[z] || 0;
    if (d) n.health = clamp(n.health - d, 0, 100);
  }
  // a few random spikes on top (the unpredictable edge of the storm)
  for (let i = 0; i < (dmg.spikes || 0); i += 1) {
    const target = rng && typeof rng.pick === "function" ? rng.pick(state.nodes) : state.nodes[0];
    if (target) target.health = clamp(target.health - (dmg.spike || 8), 0, 100);
  }
  active.cyclesLeft -= 1;
  pushLog(state, `${active.label}: storm cycle, ${active.cyclesLeft} left.`);
  if (active.cyclesLeft > 0) return { id: active.id, resolved: false, cyclesLeft: active.cyclesLeft };
  return resolveStorm(state);
}

// Evaluate a finished storm: survive (both cores alive) → grow the network, bank Insight, advance act.
function resolveStorm(state) {
  const active = state.activeStorm;
  state.activeStorm = null;
  const coresAlive = state.nodes.filter((n) => isCore(n.id)).every((n) => n.health > 0);
  const storm = STORM_BY_ID.get(active.id);
  if (!coresAlive) {
    pushLog(state, `${active.label} broke through — a core fell. Recover and brace again.`);
    return { id: active.id, resolved: true, survived: false };
  }
  bringSectorOnline(state, active.sector);
  state.stormsSurvived = Number(state.stormsSurvived || 0) + 1;
  state.act = Number(state.act || 1) + 1;
  const bonus = storm ? storm.insightBonus : 0;
  if (bonus) earnInsight(state, bonus);
  pushLog(state, `${active.label} ENDURED. Sector ${active.sector} online. +${bonus} Insight.`);
  return { id: active.id, resolved: true, survived: true, sector: active.sector, insightBonus: bonus };
}

function pushLog(state, line) {
  state.log = [...(state.log || []), line].slice(-12);
}
