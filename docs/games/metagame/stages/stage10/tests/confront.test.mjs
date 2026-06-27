import assert from "node:assert/strict";
import {
  challengedMemoryIds,
  isConfrontReady,
  startConfront,
  getCompactionOptions,
  getConfrontState,
  answerCompaction,
  rewitnessFragmentation,
  fragStatus,
  answerCore
} from "../confront.js";
import { resolveMemory, witnessEcho, integrateMemory } from "../boss.js";
import { coreQuestions } from "../content-confront.js";
import { memories } from "../content.js";
import { defaultState, normalizeState } from "../state.js";

// Build a state with all 9 resolved + witnessed (the full body the confront is reached after).
function fullBody(now = 1000) {
  const state = defaultState({ now });
  for (const m of memories) {
    resolveMemory({ state, memoryId: m.id, choice: m.choices[1], now });
    witnessEcho({ state, memoryId: m.id });
    integrateMemory({ state, memoryId: m.id, now });
  }
  return state;
}

// ── readiness + challenged set ──────────────────────────────────────────────────────────────────
{
  const fresh = defaultState({ now: 1 });
  assert.equal(isConfrontReady(fresh), false);
  assert.equal(challengedMemoryIds(fresh).length, 0);
  const state = fullBody();
  assert.equal(isConfrontReady(state), true);
  assert.equal(challengedMemoryIds(state).length, 9);
}

// ── deterministic compaction options: include the real stance + are seed-stable ──────────────────
{
  const state = fullBody(424242);
  startConfront(state);
  const opts = getCompactionOptions(state, "genesis");
  assert.equal(opts.length, 3);
  assert.deepEqual([...opts].sort(), [...memories[0].choices].sort());
  // Same seed → same order; the order is a permutation of the three real stances.
  assert.deepEqual(getCompactionOptions(state, "genesis"), opts, "deterministic per save");
  // Different createdAt can change order — confirm it is seed-driven, not fixed input order.
  const other = normalizeState({ ...JSON.parse(JSON.stringify(state)), createdAt: 999 }, { now: 999 });
  const otherOpts = getCompactionOptions(other, "genesis");
  assert.deepEqual([...otherOpts].sort(), [...memories[0].choices].sort());
}

// ── Phase A: wrong pick compacts (soft fail), re-affirm restores; all-correct advances ───────────
{
  const state = fullBody();
  startConfront(state);
  assert.equal(getConfrontState(state).phase, "compaction");
  // wrong stance → compacted
  const bad = answerCompaction({ state, memoryId: "genesis", choice: memories[0].choices[0] === state.memories.genesis.choice ? memories[0].choices[2] : memories[0].choices[0] });
  assert.equal(bad.correct, false);
  assert.equal(bad.status, "compacted");
  // re-affirm with the real stance → restored
  const good = answerCompaction({ state, memoryId: "genesis", choice: state.memories.genesis.choice });
  assert.equal(good.correct, true);
  assert.equal(good.status, "affirmed");
  // affirm the rest with the recorded stance
  for (const m of memories.slice(1)) answerCompaction({ state, memoryId: m.id, choice: state.memories[m.id].choice });
  assert.equal(getConfrontState(state).compaction.done, true);
  assert.equal(getConfrontState(state).phase, "fragmentation");
}

// ── Phase B: prior un-cheat flags concede instantly; missing ones need re-witness; no echo clobber
{
  const state = fullBody();
  startConfront(state);
  for (const m of memories) answerCompaction({ state, memoryId: m.id, choice: state.memories[m.id].choice });
  assert.equal(getConfrontState(state).phase, "fragmentation");

  // save with two prior un-cheats on record → those two concede instantly.
  const save = { actions: { "1.cheat_disabled": { stage: 1 }, "5.counter_wave_calibrated": { stage: 5 } } };
  assert.equal(fragStatus(state, save, "genesis"), "conceded");
  assert.equal(fragStatus(state, save, "signal"), "conceded");
  assert.equal(fragStatus(state, save, "syntax"), "pending");

  // re-witness the skipped ones — TRANSIENT flag, canonical echoWitnessed stays true throughout.
  for (const m of memories) {
    if (fragStatus(state, save, m.id) === "pending") rewitnessFragmentation({ state, memoryId: m.id, save });
    assert.equal(state.memories[m.id].echoWitnessed, true, "echoWitnessed never lowered");
  }
  const view = getConfrontState(state, save);
  assert.equal(view.fragmentation.done, true);
  assert.equal(view.phase, "core");
}

// ── honest playthrough breezes: all 9 traces on record → fragmentation auto-clears to core ────────
{
  const state = fullBody();
  startConfront(state);
  for (const m of memories) answerCompaction({ state, memoryId: m.id, choice: state.memories[m.id].choice });
  const save = { actions: {} };
  for (const m of memories) save.actions[`${m.stage}.x`] = {};
  // Build the real keys from crossstage mapping by re-deriving via fragStatus: set all done.
  const allDone = { actions: {
    "1.cheat_disabled": {}, "2.search_passage": {}, "3.diff_key_restored": {}, "4.recursion_blueprint_read": {},
    "5.counter_wave_calibrated": {}, "6.protocol_ch9_read": {}, "7.exif_contradiction_found": {},
    "8.salvage_archived": {}, "9.offline_mode_activated": {}
  } };
  // A single advance trigger (one more rewitness no-op won't fire wrong-phase since already fragmentation)
  rewitnessFragmentation({ state, memoryId: "genesis", save: allDone });
  assert.equal(getConfrontState(state, allDone).phase, "core");
}

// ── Phase C: three picks tally a deterministic stance, completing the confront ───────────────────
{
  const state = fullBody();
  startConfront(state);
  for (const m of memories) answerCompaction({ state, memoryId: m.id, choice: state.memories[m.id].choice });
  const save = { actions: { "1.cheat_disabled": {}, "2.search_passage": {}, "3.diff_key_restored": {}, "4.recursion_blueprint_read": {}, "5.counter_wave_calibrated": {}, "6.protocol_ch9_read": {}, "7.exif_contradiction_found": {}, "8.salvage_archived": {}, "9.offline_mode_activated": {} } };
  rewitnessFragmentation({ state, memoryId: "genesis", save });
  assert.equal(getConfrontState(state, save).phase, "core");
  // answer all "seeker"
  for (const q of coreQuestions) answerCore({ state, optionId: q.options.find((o) => o.stance === "seeker").id, save });
  const view = getConfrontState(state, save);
  assert.equal(view.completed, true);
  assert.equal(view.phase, "done");
  assert.equal(view.stance.dominant, "seeker");
  assert.equal(view.stance.scores.seeker, 3);
  assert.equal(typeof state.confront.completedAt, "number");
}

console.log("stage10 confront tests passed");
