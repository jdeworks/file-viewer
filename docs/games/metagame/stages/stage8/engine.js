// engine.js — Stage 8 Entropy Field: the cycle-advance core (no DOM). Deterministic — advanceCycle
// takes a seeded rng bundle (rng.js) from the caller; never calls Math.random/Date.now. Operates on
// state.nodes (per-node health/cascadeStress) + the runtime maps below; additive on the A2 state.

import { nodeById, ADJACENCY } from "./nodes.js";
import { createDebris } from "./state.js";
import { resolveEvent, telegraphNext } from "./events.js";
import { computeHeatDelta, thermalDecayBonus, thermalEntropy, clampHeat, THERMAL_THRESHOLD } from "./heat.js";
import { insightIncome, earnInsight } from "./resources.js";
import { tickStorm, announceStorm } from "./storms.js";
import { runAutomation } from "./automation.js";

export const REPAIR_EFFICIENCY = 3;            // % health restored per repair unit
export const BASE_REPAIR_UNITS_PER_CYCLE = 6;  // repair budget granted each cycle
export const REPAIR_PER_SECTOR = 3;            // extra budget per online sector beyond the core

// The per-cycle repair budget: scales with the growing network (more crew per online sector) plus any
// tech bonus (tech.js writes state.repairBudgetBonus). Keeps a 1-sector default-state cycle at BASE.
export function repairBudget(state) {
  const sectors = Math.max(1, (state.onlineSectors || ["core"]).length);
  return BASE_REPAIR_UNITS_PER_CYCLE + REPAIR_PER_SECTOR * (sectors - 1)
    + Math.max(0, Number(state.repairBudgetBonus || 0))   // tech (Repair Drones)
    + Math.max(0, Number(state.structRepairBonus || 0));  // structures (Buffer Capacitor)
}
const DEBRIS_VALUE = { 1: [8, 24], 2: [24, 48], 3: [48, 64], 4: [64, 88] }; // by node tier

export function status(health) {
  if (health <= 0) return "failed";
  return health < 60 ? "degrading" : "active";
}

// Lazily default the runtime fields the engine owns (the renderer rewrite will own them properly).
function ensureRuntime(state) {
  if (!state.stabilized || typeof state.stabilized !== "object") state.stabilized = {};
  if (!state.repairAllocations || typeof state.repairAllocations !== "object") state.repairAllocations = {};
  if (!state.highLoad || typeof state.highLoad !== "object") state.highLoad = {};
  if (!Number.isFinite(state.repairUnits)) state.repairUnits = BASE_REPAIR_UNITS_PER_CYCLE;
  if (!Number.isFinite(state.stabilizers)) state.stabilizers = 0;
  if (!Number.isFinite(state.heat)) state.heat = 0;
  if (!Number.isFinite(state.heatRate)) state.heatRate = 0;
  if (!Number.isFinite(state.cascadeStressMult)) state.cascadeStressMult = 1;
  if (!Number.isFinite(state.prestigeMult)) state.prestigeMult = 1;
  for (const k of ["repairEfficiencyBonus", "decayReduction", "coreRegen", "thermalThresholdBonus", "debrisDecayBonus", "scrapMult"]) {
    if (!Number.isFinite(state[k])) state[k] = k === "scrapMult" ? 1 : 0;
  }
  for (const n of state.nodes) if (!Number.isFinite(n.cascadeStress)) n.cascadeStress = 0;
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const node = (state, id) => state.nodes.find((n) => n.id === id);

// Advance one cycle. Mutates state in place; returns a summary. `rng` is a makeRng bundle.
export function advanceCycle(state, rng) {
  ensureRuntime(state);
  const result = { income: 0, newDebris: [], expiredDebris: [], newlyFailed: [], entropy: 0, event: null };
  // 0. resolve any telegraphed crisis event from last cycle (direct effects, before decay).
  result.event = resolveEvent(state, rng);
  const priorStatus = new Map(state.nodes.map((n) => [n.id, status(n.health)]));
  // 0b. apply this cycle's Cascade Storm damage (if one is being weathered); may resolve the storm,
  // grow the network, and advance the act. Storm-killed nodes are caught by the newly-failed pass.
  result.storm = tickStorm(state, rng);
  // 0c. automation pass (auto-repair drones + Cold Storage auto-archive), pre-decay + deterministic.
  result.automation = runAutomation(state);

  // 1. tick down stabilizers
  for (const id of Object.keys(state.stabilized)) {
    state.stabilized[id] -= 1;
    if (state.stabilized[id] <= 0) delete state.stabilized[id];
  }
  // 2. decay (skip stabilized). Heat carried in from last cycle amplifies decay above the (tech-raised)
  // threshold; Reinforced Relays (decayReduction) lowers each node's base decay.
  const threshold = THERMAL_THRESHOLD + (state.thermalThresholdBonus || 0);
  const thermalBonus = thermalDecayBonus(state.heat, threshold);
  const decayReduction = Math.max(0, Number(state.decayReduction || 0));
  for (const n of state.nodes) {
    if (state.stabilized[n.id]) continue;
    const def = nodeById(n.id) || {};
    const highLoad = Boolean(state.highLoad[n.id]) && def.supportsHighLoad;
    const baseDecay = Math.max(0, (def.baseDecayPct || 0) - decayReduction);
    const loss = (baseDecay + (n.cascadeStress || 0)) * (highLoad ? 1.5 : 1.0) + thermalBonus;
    n.health = clamp(n.health - loss, 0, 100);
  }
  // 3. repair allocations (Efficient Welds raises restored health per unit)
  const efficiency = REPAIR_EFFICIENCY + Math.max(0, Number(state.repairEfficiencyBonus || 0));
  for (const [id, units] of Object.entries(state.repairAllocations)) {
    const n = node(state, id);
    if (n) n.health = clamp(n.health + units * efficiency, 0, 100);
  }
  state.repairAllocations = {};
  // 3b. Redundant Cores: core anchors regenerate each cycle.
  const coreRegen = Math.max(0, Number(state.coreRegen || 0));
  if (coreRegen) for (const n of state.nodes) {
    const def = nodeById(n.id) || {};
    if (def.noCascade && n.health > 0) n.health = clamp(n.health + coreRegen, 0, 100);
  }
  // 3c. Entropy-threshold cascades (the SUPPRESS pressure). Once the field runs deep (cycle ≥ 23),
  // crossing 60% entropy fires a Pattern Failure (two mid relays −15) and 80% a Total Cascade (all
  // degrading nodes −30). Deterministic via the cycle's seeded rng. Keyed off LAST cycle's entropy
  // (already in state.entropy) so the readout warns the player a cycle ahead; placed before the
  // failed-node pass so threshold-killed nodes still shed debris and propagate cascade stress.
  result.threshold = applyEntropyThresholds(state, rng);
  // 4/5. status transition + debris on newly-failed nodes
  for (const n of state.nodes) {
    if (status(n.health) === "failed" && priorStatus.get(n.id) !== "failed") {
      const def = nodeById(n.id) || { tier: 1 };
      const [lo, hi] = DEBRIS_VALUE[def.tier] || DEBRIS_VALUE[1];
      const debris = createDebris({ node: n.id, cycle: state.cycle, tier: def.tier, value: rng.int(lo, hi), decay: 2 + Math.max(0, Number(state.debrisDecayBonus || 0)) });
      state.debris.push(debris);
      result.newDebris.push(debris);
      result.newlyFailed.push(n.id);
      pushLog(state, `${n.id} failed. ${debris.id} created in /entropy/debris/.`);
    }
  }
  // 6. recompute cascade stress for NEXT cycle: a failed node stresses its downstream neighbours
  for (const n of state.nodes) n.cascadeStress = 0;
  const cascadeStep = Number.isFinite(state.cascadeStressMult) ? state.cascadeStressMult : 1; // Load Balancer
  for (const n of state.nodes) {
    if (status(n.health) !== "failed") continue;
    for (const downstream of ADJACENCY.get(n.id) || []) {
      const ddef = nodeById(downstream) || {};
      if (ddef.noCascade) continue; // core anchors never take cascade stress (recovery anchor)
      const d = node(state, downstream);
      if (d) d.cascadeStress += cascadeStep;
    }
  }
  // 7. expire debris
  const kept = [];
  for (const item of state.debris) {
    item.decay -= 1;
    if (item.decay <= 0) { result.expiredDebris.push(item); pushLog(state, `${item.id} decayed. States lost permanently.`); }
    else kept.push(item);
  }
  state.debris = kept;
  // 8. income
  let active = 0; let degraded = 0; let failedCount = 0; let degradingCount = 0;
  for (const n of state.nodes) {
    const def = nodeById(n.id) || {};
    const s = status(n.health);
    // High-Load is a temporal bet: +50% output now (here), paid for by 1.5× decay (step 2 above).
    const hlMult = (state.highLoad[n.id] && def.supportsHighLoad) ? 1.5 : 1;
    if (s === "active") active += (def.baseOutput || 0) * hlMult;
    else if (s === "degrading") { degraded += (def.degradedOutput || 0) * 0.5 * hlMult; degradingCount += 1; }
    else failedCount += 1;
  }
  const entropySink = Math.floor(state.cycle / 3);
  const prestigeMult = Math.max(1, Number(state.prestigeMult || 1)); // Microstate prestige bonus
  result.income = Math.max(0, Math.round((active + degraded - entropySink) * prestigeMult));
  state.states = (state.states || 0) + result.income;
  state.totalStatesEarned = (state.totalStatesEarned || 0) + result.income;
  // 8a. Insight income (research output of online Core/Production nodes), also prestige-scaled.
  const insight = insightIncome(state, status) * prestigeMult;
  earnInsight(state, insight);
  state.insightRate = insight;
  result.insight = insight;
  // 8b. recompute Heat from the post-decay/post-repair node statuses (generation − venting).
  const heat = computeHeatDelta(state, status);
  state.heat = clampHeat(state.heat + heat.delta);
  state.heatRate = heat.delta;
  result.heat = state.heat;
  result.heatRate = heat.delta;
  // 9. entropy % (failed/degrading nodes + the thermal contribution of an over-hot field)
  result.entropy = clamp(failedCount * 10 + degradingCount * 4 + thermalEntropy(state.heat, threshold), 0, 100);
  state.entropy = result.entropy;
  // 10/11. reset budget (scales with the network) + advance the cycle
  state.repairUnits = repairBudget(state);
  state.cycle = (state.cycle || 0) + 1;
  // 12. telegraph next cycle's crisis (shown one cycle ahead).
  result.pendingEvent = telegraphNext(state, rng);
  // 13. one-time band/phase bell: announce the current act's Cascade Storm the first cycle it becomes
  // brace-able, so the player knows a new phase started (deterministic, fires once per storm).
  result.announcedStorm = announceStorm(state);
  return result;
}

// Spend repair units onto a node (banked until the next advanceCycle). Validates the budget.
export function applyRepair(state, nodeId, units) {
  ensureRuntime(state);
  const u = Math.trunc(Number(units) || 0);
  if (u <= 0) return { ok: false, reason: "units" };
  if (!node(state, nodeId)) return { ok: false, reason: "no-node" };
  if (u > state.repairUnits) return { ok: false, reason: "budget" };
  state.repairUnits -= u;
  state.repairAllocations[nodeId] = (state.repairAllocations[nodeId] || 0) + u;
  return { ok: true, remaining: state.repairUnits };
}

// Spend one stabilizer to freeze a node's decay for 2 cycles.
export function applyStabilizer(state, nodeId) {
  ensureRuntime(state);
  if ((state.stabilizers || 0) < 1) return { ok: false, reason: "inventory" };
  if (!node(state, nodeId)) return { ok: false, reason: "no-node" };
  state.stabilizers -= 1;
  state.stabilized[nodeId] = 2;
  return { ok: true };
}

// Spend banked States to build one Stabilizer (a burn-cycle pause for Heat Death). Pure + validated.
export function buildStabilizer(state, cost) {
  ensureRuntime(state);
  const c = Math.trunc(Number(cost) || 0);
  if (c <= 0) return { ok: false, reason: "cost" };
  if ((state.states || 0) < c) return { ok: false, reason: "states" };
  state.states -= c;
  state.stabilizers = (state.stabilizers || 0) + 1;
  return { ok: true, stabilizers: state.stabilizers };
}

// Entropy thresholds (SUPPRESS). The system-level entropy% becomes load-bearing past this cycle:
// the player must sometimes repair a low-value FAILED node purely to pull entropy below 60%/80%.
export const ENTROPY_THRESHOLD_CYCLE = 23;
export const PATTERN_FAILURE_AT = 60;
export const TOTAL_CASCADE_AT = 80;

function applyEntropyThresholds(state, rng) {
  if ((state.cycle || 0) < ENTROPY_THRESHOLD_CYCLE) return null;
  const entropy = Number(state.entropy || 0);
  if (entropy >= TOTAL_CASCADE_AT) return triggerTotalCascade(state);
  if (entropy >= PATTERN_FAILURE_AT) return triggerPatternFailure(state, rng);
  return null;
}

// Pattern Failure: two surviving mid relays simultaneously lose 15 (seeded pick). Deterministic.
function triggerPatternFailure(state, rng) {
  const mids = state.nodes.filter((n) => (nodeById(n.id) || {}).zone === "mid" && status(n.health) !== "failed");
  const picks = rng.shuffle(mids).slice(0, 2);
  for (const n of picks) n.health = clamp(n.health - 15, 0, 100);
  if (picks.length) pushLog(state, `Pattern Failure (entropy ${Math.round(Number(state.entropy || 0))}%): ${picks.map((n) => n.id).join(", ")} −15.`);
  return { kind: "pattern_failure", nodes: picks.map((n) => n.id) };
}

// Total Cascade: every currently-degrading node loses an extra 30 in one cycle.
function triggerTotalCascade(state) {
  const degrading = state.nodes.filter((n) => status(n.health) === "degrading");
  for (const n of degrading) n.health = clamp(n.health - 30, 0, 100);
  if (degrading.length) pushLog(state, `TOTAL CASCADE (entropy ${Math.round(Number(state.entropy || 0))}%): ${degrading.length} degrading node(s) −30.`);
  return { kind: "total_cascade", nodes: degrading.map((n) => n.id) };
}

// Toggle a node into high-load (+50% output in the income pass; the engine applies 1.5× decay).
export function toggleHighLoad(state, nodeId) {
  ensureRuntime(state);
  const def = nodeById(nodeId);
  if (!def || !def.supportsHighLoad) return { ok: false, reason: "unsupported" };
  state.highLoad[nodeId] = !state.highLoad[nodeId];
  return { ok: true, highLoad: Boolean(state.highLoad[nodeId]) };
}

function pushLog(state, line) {
  state.log = [...(state.log || []), line].slice(-12);
}
