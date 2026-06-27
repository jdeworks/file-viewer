import assert from "node:assert/strict";
import { MEMORY_UNCHEAT, uncheatForMemory, tracesOnRecord } from "../crossstage.js";
import { memories } from "../content.js";

// Every memory maps to a prior-stage un-cheat (1..9), in order.
assert.equal(Object.keys(MEMORY_UNCHEAT).length, 9);
for (const memory of memories) {
  const entry = MEMORY_UNCHEAT[memory.id];
  assert.ok(entry, `missing uncheat mapping for ${memory.id}`);
  assert.equal(entry.stage, memory.stage, `stage mismatch for ${memory.id}`);
  assert.match(entry.key, /^\d+\./);
}

// Null-guarded: no save / no actions / unknown memory all → done:false, never throws.
assert.equal(uncheatForMemory(null, "genesis").done, false);
assert.equal(uncheatForMemory(undefined, "genesis").done, false);
assert.equal(uncheatForMemory({}, "genesis").done, false);
assert.equal(uncheatForMemory({ actions: null }, "genesis").done, false);
assert.equal(uncheatForMemory({ actions: {} }, "nope").done, false);

// A recorded flag → done:true, with stage + key surfaced.
const save = { actions: { "1.cheat_disabled": { stage: 1, action: "cheat_disabled" }, "3.diff_key_restored": { stage: 3 } } };
const genesis = uncheatForMemory(save, "genesis");
assert.equal(genesis.done, true);
assert.equal(genesis.stage, 1);
assert.equal(genesis.key, "1.cheat_disabled");
assert.equal(uncheatForMemory(save, "memory").done, true);
assert.equal(uncheatForMemory(save, "syntax").done, false);

assert.equal(tracesOnRecord(save, ["genesis", "memory", "syntax"]), 2);
assert.equal(tracesOnRecord(null, ["genesis", "memory"]), 0);
assert.equal(tracesOnRecord(save, []), 0);

console.log("stage10 crossstage tests passed");
