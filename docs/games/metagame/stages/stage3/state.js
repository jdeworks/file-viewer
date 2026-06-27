// Stage 3 save state (v2). The game is an in-modal nonogram roguelite: solve "memory snapshots"
// (seeded nonograms) to earn REGISTERS, bank RETAINED fragments, push deeper as corruption rises.
// Deterministic — seeds derive from runCount, NEVER Date.now() (the old v1 bug). The boss keeps its
// memoryPair for now (reworked to a seeded diff key in a later increment).

import { makeRng } from "./rng.js";

// The boss restoration key is SEED-DERIVED per run (not a static password), so its value lives only
// in the diff of the two memory logs — the player must actually read it. Three short base-36 chunks.
export function makePieces(runCount) {
  const rng = makeRng(`s3-pieces:${runCount}`);
  const tok = () => Math.floor(rng.float() * 46655).toString(36).padStart(3, "0"); // 3 chars, 0..zzz
  return [tok(), tok(), tok()];
}

export function defaultState() {
  return freshFrom({ registers: 0, retained: 0, shopUpgrades: {}, runCount: 0 });
}

// Build a state around persistent meta (registers/retained/shop/runCount), drawing a fresh run.
function freshFrom(meta) {
  const runCount = Number(meta.runCount || 0);
  const pieces = makePieces(runCount);
  return {
    version: 2,
    registers: Number(meta.registers || 0),
    retained: Number(meta.retained || 0),
    shopUpgrades: meta.shopUpgrades && typeof meta.shopUpgrades === "object" ? meta.shopUpgrades : {},
    runCount,
    run: { seed: `s3-run${runCount}`, index: 0, solvedCount: 0, marks: null },
    memoryPair: { runId: `mem-${runCount}`, pieces, key: pieces.join("") },
    boss: { reached: false, attempts: 0, lockHintStep: 0, unlocked: false, defeated: false },
    log: ["memory grid online.", "solve snapshots to retain fragments."]
  };
}

export function normalizeState(state) {
  // Anything before v2 (the fake-grid era) is structurally incompatible — start clean but keep any
  // earned currency if present.
  if (!state || typeof state !== "object" || Number(state.version) !== 2) {
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
  state.memoryPair.key = String(state.memoryPair.key || state.memoryPair.pieces.join(""));
  state.boss = { ...fresh.boss, ...(state.boss || {}) };
  state.log = Array.isArray(state.log) ? state.log : [...fresh.log];
  return state;
}
