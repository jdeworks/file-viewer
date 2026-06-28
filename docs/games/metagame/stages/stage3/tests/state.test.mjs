// State invariants (round 4): the diff-slot permutation never reads in key order (closing the ~1/6
// identity-slot bypass of the un-cheat), and the per-run tier seen-set defaults to empty.
import assert from "node:assert/strict";
import { makeSlots, defaultState, normalizeState } from "../state.js";

// makeSlots is deterministic per runCount AND never the identity [0,1,2] — so reading v1 sectors
// top-to-bottom can never spell the key in order; a real 3-way diff is always required.
for (let rc = 0; rc < 300; rc += 1) {
  const slots = makeSlots(rc);
  assert.equal(slots.length, 3, `slots[${rc}] has three entries`);
  assert.deepEqual([...slots].sort(), [0, 1, 2], `slots[${rc}] is a permutation of 0,1,2`);
  assert(!(slots[0] === 0 && slots[1] === 1 && slots[2] === 2), `slots[${rc}] is NOT the identity order`);
  assert.deepEqual(makeSlots(rc), slots, `slots[${rc}] is deterministic`);
}

// The per-run tier seen-set starts empty (so tier-arrival messages fire fresh each run).
assert.deepEqual(defaultState().run.tiers, [], "a fresh run has no tiers seen");

// An older save with no run.tiers normalises to an empty seen-set (and keeps its slots non-identity).
const legacy = normalizeState({ version: 3, run: { seed: "s3-run0", index: 0, solvedCount: 0 } });
assert.deepEqual(legacy.run.tiers, [], "a legacy run gets an empty tier seen-set");
assert(!(legacy.memoryPair.slots[0] === 0 && legacy.memoryPair.slots[1] === 1 && legacy.memoryPair.slots[2] === 2), "normalised slots are non-identity");

console.log("stage3 state invariants tests passed");
