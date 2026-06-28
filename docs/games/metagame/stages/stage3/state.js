// Stage 3 save state (v3). The game is an in-modal nonogram roguelite: solve "memory snapshots"
// (seeded nonograms) to earn REGISTERS, bank RETAINED fragments, push deeper as corruption rises.
// Deterministic — seeds derive from runCount, NEVER Date.now() (the old v1 bug). The boss restoration
// key is SEED-DERIVED per run and recoverable only by a THREE-WAY diff of memory_v1/v2/v3.log.

import { makeRng } from "./rng.js";

const STATE_VERSION = 3;

// The boss restoration key is SEED-DERIVED per run (not a static password), so its value lives only
// in the diff of the three memory logs — the player must actually read it. Three short base-36 chunks,
// in KEY ORDER: pieces[0] corrupts between v1→v2, pieces[1] between v2→v3, pieces[2] survives in v3.
export function makePieces(runCount) {
  const rng = makeRng(`s3-pieces:${runCount}`);
  const tok = () => Math.floor(rng.float() * 46655).toString(36).padStart(3, "0"); // 3 chars, 0..zzz
  return [tok(), tok(), tok()];
}

// Seeded permutation mapping the three DISPLAY sectors (02/04/06, fixed order) → which key chunk each
// holds. Decoupling display order from key order is what forces the player to actually diff the three
// logs (reading v1 top-to-bottom gives the WRONG key order). slots[sectorIdx] = chunkIndex.
// The IDENTITY permutation [0,1,2] is rejected (it would put v1 sectors in key order, letting a player
// read the key top-to-bottom without diffing — a partial bypass of the un-cheat); we keep reshuffling
// the seeded stream until it yields a non-identity order, so EVERY run requires a real 3-way diff.
export function makeSlots(runCount) {
  const rng = makeRng(`s3-slots:${runCount}`);
  let slots = rng.shuffle([0, 1, 2]);
  for (let i = 0; i < 8 && slots[0] === 0 && slots[1] === 1 && slots[2] === 2; i += 1) {
    slots = rng.shuffle([0, 1, 2]);
  }
  return slots;
}

function normalizeSlots(slots) {
  if (!Array.isArray(slots) || slots.length !== 3) return null;
  const nums = slots.map((n) => Number(n));
  const set = new Set(nums);
  if (set.size !== 3 || [0, 1, 2].some((i) => !set.has(i))) return null;
  return nums;
}

export function defaultState() {
  return freshFrom({ registers: 0, retained: 0, shopUpgrades: {}, runCount: 0 });
}

// Build a state around persistent meta (registers/retained/shop/runCount), drawing a fresh run.
function freshFrom(meta) {
  const runCount = Number(meta.runCount || 0);
  const pieces = makePieces(runCount);
  const slots = makeSlots(runCount);
  return {
    version: STATE_VERSION,
    registers: Number(meta.registers || 0),
    retained: Number(meta.retained || 0),
    shopUpgrades: meta.shopUpgrades && typeof meta.shopUpgrades === "object" ? meta.shopUpgrades : {},
    runCount,
    run: { seed: `s3-run${runCount}`, index: 0, solvedCount: 0, marks: null, boons: [], draftsTaken: 0, tiers: [], pressure: 0 },
    memoryPair: { runId: `mem-${runCount}`, pieces, slots, key: pieces.join("") },
    boss: { reached: false, attempts: 0, lockHintStep: 0, unlocked: false, defeated: false, corruption8Reached: false },
    log: ["memory grid online.", "solve snapshots to retain fragments."]
  };
}

export function normalizeState(state) {
  // Anything before v2 (the fake-grid era) is structurally incompatible — start clean but keep any
  // earned currency if present.
  if (!state || typeof state !== "object" || Number(state.version) !== STATE_VERSION) {
    return freshFrom({
      registers: Number(state?.registers || 0),
      retained: Number(state?.retained || 0),
      shopUpgrades: state?.shopUpgrades || {},
      runCount: Number(state?.runCount || 0)
    });
  }
  const fresh = freshFrom(state);
  state.registers = Number.isFinite(state.registers) ? state.registers : 0;
  state.retained = Number.isFinite(state.retained) ? state.retained : 0;
  state.shopUpgrades = state.shopUpgrades && typeof state.shopUpgrades === "object" ? state.shopUpgrades : {};
  state.runCount = Number.isFinite(state.runCount) ? state.runCount : 0;
  state.run = { ...fresh.run, ...(state.run && typeof state.run === "object" ? state.run : {}) };
  state.memoryPair = { ...fresh.memoryPair, ...(state.memoryPair || {}) };
  state.memoryPair.pieces = Array.isArray(state.memoryPair.pieces) && state.memoryPair.pieces.length
    ? state.memoryPair.pieces.map(String) : makePieces(state.runCount);
  state.memoryPair.slots = normalizeSlots(state.memoryPair.slots) || makeSlots(state.runCount);
  state.memoryPair.key = String(state.memoryPair.key || state.memoryPair.pieces.join(""));
  state.boss = { ...fresh.boss, ...(state.boss || {}) };
  state.log = Array.isArray(state.log) ? state.log : [...fresh.log];
  return state;
}

// ── Run-pressure clock (round 4): the FORGIVING run-level failure arc ──────────────────────────────
// Distinct from s3decay (which is a PER-SNAPSHOT meter that resets when a snapshot collapses): this is
// a CUMULATIVE wrong-fill counter (run.pressure) spanning EVERY snapshot of a run. When it reaches the
// limit the run COLLAPSES — a SOFT reset (collapseRun) that draws a fresh run while preserving all
// permanent meta. The clock only ever resets on a full run collapse, never on a snapshot reset.
//
// Forgiving + tunable by design: the limit is generous and scales UP with corruption (deeper, harder
// snapshots earn MORE slack), and the Pressure Valve boon widens it further. Tune the two constants.
export const RUN_PRESSURE_BASE = 20;          // wrong fills tolerated at corruption 0 (generous floor)
export const RUN_PRESSURE_PER_CORRUPTION = 2; // +2 tolerance per corruption level (≈20→36 over a run)

// The collapse threshold at the given corruption, widened by the Pressure Valve boon's headroom
// (valveHeadroom is the boon's decayPct effect, e.g. 0.4 → +40%), so the boon coherently eases BOTH
// the per-snapshot decay clock and this run-level clock.
export function runPressureLimit(corruption, valveHeadroom = 0) {
  const base = RUN_PRESSURE_BASE + Math.max(0, Number(corruption || 0)) * RUN_PRESSURE_PER_CORRUPTION;
  return Math.round(base * (1 + Math.max(0, Number(valveHeadroom || 0))));
}

// Accrue ONE wrong fill onto the run-level pressure (cumulative across snapshots). Returns the new total.
export function bumpRunPressure(state) {
  if (!state || !state.run) return 0;
  state.run.pressure = Number(state.run.pressure || 0) + 1;
  return state.run.pressure;
}

// True once accumulated wrong fills reach the (corruption- and valve-scaled) collapse limit.
export function runPressureReached(state, corruption, valveHeadroom = 0) {
  return Number(state?.run?.pressure || 0) >= runPressureLimit(corruption, valveHeadroom);
}

// A run COLLAPSE — the forgiving run-level failure. Redraws a brand-new run IN PLACE (fresh seed via
// the incremented runCount) while PRESERVING every scrap of permanent progress: registers, retained
// fragments, Defrag shop upgrades, and — untouched by Object.assign, which never deletes keys absent
// from the source — the achievements map. This is a SOFT reset ("the memory destabilized, start
// fresh"), never a loss of meta. Only this path zeroes run.pressure; a per-snapshot decay reset leaves
// it accumulating. (boss/run/memoryPair/log are refreshed for the new seed; a collapse happens during
// an active run, before the boss is defeated.)
export function collapseRun(state) {
  const fresh = freshFrom({
    registers: state.registers,
    retained: state.retained,
    shopUpgrades: state.shopUpgrades,
    runCount: Number(state.runCount || 0) + 1,
  });
  Object.assign(state, fresh);
  return state;
}
