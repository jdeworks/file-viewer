import assert from "node:assert/strict";
import { chooseFinal, resolveMemory, witnessEcho } from "../boss.js";
import {
  answerCompaction,
  answerCore,
  challengedMemoryIds,
  fragStatus,
  rewitnessFragmentation,
  startConfront
} from "../confront.js";
import { coreQuestions } from "../content-confront.js";
import { MEMORY_UNCHEAT } from "../crossstage.js";
import { memories } from "../content.js";
import { defaultState } from "../state.js";

function collector() {
  const unlocked = {};
  return { store: unlocked, achievements: { unlockAchievement: (id) => { unlocked[id] = (unlocked[id] || 0) + 1; } } };
}

function fullBody(now = 1000) {
  const state = defaultState({ now });
  for (const m of memories) {
    resolveMemory({ state, memoryId: m.id, choice: m.choices[1], now });
    witnessEcho({ state, memoryId: m.id });
  }
  return state;
}

// All un-cheat traces on record → fully honest prior run.
const allTracesSave = { actions: {} };
for (const id of Object.keys(MEMORY_UNCHEAT)) allTracesSave.actions[MEMORY_UNCHEAT[id].key] = {};

// ── flawless compaction + all-traces conceded: clean recall + nothing to re-witness ──────────────
{
  const state = fullBody();
  const { store, achievements } = collector();
  startConfront(state);
  for (const id of challengedMemoryIds(state)) answerCompaction({ state, memoryId: id, choice: state.memories[id].choice, save: allTracesSave });
  // all 9 traces conceded → fragmentation auto-clears to core (no rewitness)
  assert.equal(state.confront.phase, "core");
  for (const q of coreQuestions) answerCore({ state, optionId: q.options[0].id, save: allTracesSave, achievements });
  assert.equal(state.confront.completed, true);
  assert.equal(store["stage10.flawless_compaction"], 1, "no compaction → flawless");
  assert.equal(store["stage10.all_traces_conceded"], 1, "all traces on record → conceded");
}

// ── a single mis-recall forfeits flawless; a manual re-witness forfeits all-traces ────────────────
{
  const state = fullBody();
  const { store, achievements } = collector();
  startConfront(state);
  // wrong stance on genesis (then re-affirm) → everCompacted
  const wrong = memories[0].choices.find((c) => c !== state.memories.genesis.choice);
  answerCompaction({ state, memoryId: "genesis", choice: wrong, save: null });
  for (const id of challengedMemoryIds(state)) answerCompaction({ state, memoryId: id, choice: state.memories[id].choice, save: null });
  // no prior un-cheats on record → every trace pending → must re-witness
  for (const id of challengedMemoryIds(state)) if (fragStatus(state, null, id) === "pending") rewitnessFragmentation({ state, memoryId: id, save: null });
  for (const q of coreQuestions) answerCore({ state, optionId: q.options[0].id, save: null, achievements });
  assert.equal(state.confront.completed, true);
  assert.equal(store["stage10.flawless_compaction"], undefined, "mis-recall → no flawless");
  assert.equal(store["stage10.all_traces_conceded"], undefined, "re-witness needed → no all-traces");
}

// ── route achievement on the final choice ─────────────────────────────────────────────────────────
{
  const state = fullBody();
  const { store, achievements } = collector();
  startConfront(state);
  for (const id of challengedMemoryIds(state)) answerCompaction({ state, memoryId: id, choice: state.memories[id].choice, save: allTracesSave });
  for (const q of coreQuestions) answerCore({ state, optionId: q.options[0].id, save: allTracesSave });
  assert.equal(state.confront.completed, true);
  // 5 echoes witnessed (continue needs 0) — choose continue
  const res = chooseFinal({ state, choiceId: "continue", achievements, now: 2000 });
  assert.equal(res.ok, true);
  assert.equal(store["stage10.route_continue"], 1, "route badge for the chosen route");
}

console.log("stage10 achievements tests passed");
