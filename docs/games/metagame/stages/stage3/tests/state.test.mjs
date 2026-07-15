import assert from "node:assert/strict";
import { defaultState, normalizeState } from "../state.js";

assert.deepEqual(defaultState().run.tiers, [], "a fresh run has no tiers seen");
assert.equal("memoryPair" in defaultState(), false, "fresh state has no external diff payload");

const legacy = normalizeState({
  version: 3,
  run: { seed: "s3-run0", index: 0, solvedCount: 0 },
  memoryPair: { runId: "legacy" },
  boss: { unlocked: true, lockHintStep: 4, corruption8Reached: false },
});
assert.deepEqual(legacy.run.tiers, [], "a legacy run gets an empty tier seen-set");
assert.equal("memoryPair" in legacy, false, "normalization removes the obsolete diff payload");
assert.deepEqual(legacy.boss, { reached: false, defeated: false, corruption8Reached: false },
  "normalization keeps only the body-driven boss state");

console.log("stage3 state invariants tests passed");
