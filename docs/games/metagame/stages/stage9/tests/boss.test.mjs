import assert from "node:assert/strict";
import {
  chooseFinal,
  getDefragmenterRebuttal,
  getEchoCounts,
  getFinalChoiceState,
  getRouteSummary,
  getThresholdState,
  integrateMemory,
  markMemoryRead,
  resolveMemory,
  witnessEcho
} from "../boss.js";
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
import { defragmenterConductLines } from "../messages.js";
import { memories } from "../content.js";
import { defaultState } from "../state.js";

const allTracesSave = { actions: {} };
for (const id of Object.keys(MEMORY_UNCHEAT)) allTracesSave.actions[MEMORY_UNCHEAT[id].key] = {};

const witnessAll = (state, n = memories.length) => memories.slice(0, n).forEach((m) => witnessEcho({ state, memoryId: m.id }));

// Drive the three-phase confrontation to completion the same way a player's clicks would (no save →
// no prior un-cheats on record → every trace re-witnessed in Phase B). Required before chooseFinal.
function completeConfront(state, save = null) {
  startConfront(state);
  for (const id of challengedMemoryIds(state)) answerCompaction({ state, memoryId: id, choice: state.memories[id].choice, save });
  for (const id of challengedMemoryIds(state)) if (fragStatus(state, save, id) === "pending") rewitnessFragmentation({ state, memoryId: id, save });
  for (const q of coreQuestions) answerCore({ state, optionId: q.options[0].id, save });
}

{
  const state = defaultState({ now: 100 });
  assert.equal(getThresholdState(state).finalQuestionUnlocked, false);
  markMemoryRead({ state, memoryId: memories[0].id, now: 110 });
  assert.equal(state.memories.genesis.state, "read");
  assert.equal(getThresholdState(state).read, 1);
  assert.equal(getThresholdState(state).resolved, 0);
}

{
  const state = defaultState({ now: 100 });
  const actions = [];
  for (const memory of memories.slice(0, 2)) {
    const result = resolveMemory({
      state,
      memoryId: memory.id,
      choice: memory.choices[0],
      actions: { setAction: (...args) => actions.push(args) },
      now: 200
    });
    assert.equal(result.ok, true);
  }
  assert.equal(actions.length, 1);
  assert.equal(actions[0][0], 9);
  assert.equal(actions[0][1], "memory_resolved");
  assert.equal(actions[0][2].memory, "genesis");
}

{
  const state = defaultState({ now: 100 });
  for (const memory of memories.slice(0, 4)) {
    resolveMemory({ state, memoryId: memory.id, choice: memory.choices[0], now: 200 });
  }
  assert.equal(getFinalChoiceState(state).locked, true);
  assert.equal(chooseFinal({ state, choiceId: "continue" }).ok, false);

  resolveMemory({ state, memoryId: memories[4].id, choice: memories[4].choices[0], now: 300 });
  assert.equal(getThresholdState(state).finalQuestionUnlocked, true);
  // 2026-07-11 playtest fix: echo access is an optional buff now (response quality + the "expand"/
  // "understand" ending variants), not an entry gate — 5 resolved memories alone unlocks entry, with
  // ZERO echoes ever witnessed.
  assert.equal(getFinalChoiceState(state).locked, false, "entry gate cleared at 5 resolved memories, 0 echoes");
  assert.equal(getDefragmenterRebuttal(state).mode, "refuse", "the rebuttal is still low-quality with 0 echoes — a real, felt cost, just not a hard block");
  // Boss never self-unlocks: the final choice is gated behind the three-phase confrontation.
  assert.equal(chooseFinal({ state, choiceId: "continue" }).reason, "confront-incomplete");
  completeConfront(state);
  assert.equal(getFinalChoiceState(state).confrontCompleted, true);
  const completed = [];
  const result = chooseFinal({ state, choiceId: "continue", onStageComplete: (value) => completed.push(value), now: 400 });
  assert.equal(result.ok, true);
  assert.equal(state.final.completed, true);
  assert.equal(completed[0].choice, "continue");
  assert.equal(completed[0].memoryRouteComplete, false);
  const summary = getRouteSummary(state);
  assert.equal(summary.tier, "minimum");
  assert.equal(summary.label, "minimum awakening");
  assert.match(summary.finalChoiceText, /I am going to go on/);
  assert.equal(summary.memoryLines.length, 5);
  assert.match(summary.memoryLines[0].text, /still here/);
  assert.match(summary.remainingText, /Protocol/);
  const second = chooseFinal({ state, choiceId: "expand", onStageComplete: (value) => completed.push(value), now: 500 });
  assert.equal(second.alreadyCompleted, true);
  assert.equal(state.final.choice, "continue");
  assert.equal(completed.length, 1);
}

{
  const state = defaultState({ now: 100 });
  const achievements = [];
  for (const memory of memories.slice(0, 5)) {
    resolveMemory({ state, memoryId: memory.id, choice: memory.choices[0], now: 200 });
  }
  let threshold = getThresholdState(state);
  assert.equal(threshold.finalQuestionUnlocked, true);
  assert.equal(threshold.enrichedResponse, false);
  assert.equal(threshold.memoryRouteComplete, false);

  for (const memory of memories.slice(5, 7)) {
    resolveMemory({ state, memoryId: memory.id, choice: memory.choices[0], now: 210 });
  }
  threshold = getThresholdState(state);
  assert.equal(threshold.enrichedResponse, true);
  assert.equal(threshold.memoryRouteComplete, false);

  for (const memory of memories.slice(7)) {
    resolveMemory({ state, memoryId: memory.id, choice: memory.choices[0], now: 220 });
  }
  threshold = getThresholdState(state);
  assert.equal(threshold.memoryRouteComplete, true);
  assert.equal(threshold.fullCapstoneComplete, false);
  let summary = getRouteSummary(state);
  assert.equal(summary.tier, "complete");
  assert.equal(summary.label, "complete memory route");
  assert.equal(summary.memoryLines.length, 8);
  assert.equal(summary.remainingText, "No prior memory remains unresolved.");

  // Integration is echo-gated: without the witnessed echo it refuses.
  assert.equal(integrateMemory({ state, memoryId: "genesis", now: 300 }).reason, "echo-required");
  witnessAll(state);
  for (const memory of memories) {
    integrateMemory({
      state,
      memoryId: memory.id,
      achievements: { unlockAchievement: (...args) => achievements.push(args) },
      now: 300
    });
  }
  threshold = getThresholdState(state);
  assert.equal(threshold.integrated, 8);
  assert.equal(threshold.fullCapstoneComplete, true);
  assert.equal(achievements.length, 1);
  assert.equal(achievements[0][0], "stage9.full_capstone");

  completeConfront(state);
  const completed = chooseFinal({ state, choiceId: "understand", now: 500 });
  assert.equal(completed.ok, true);
  assert.equal(completed.result.memoryRouteComplete, true);
  assert.equal(completed.result.fullCapstoneComplete, true);
  summary = getRouteSummary(state);
  assert.equal(summary.tier, "capstone");
  assert.equal(summary.label, "full capstone");
  assert.match(summary.integratedText, /Genesis/);
  assert.match(summary.integratedText, /Observation/);
}

// ── echo gate specifics ───────────────────────────────────────────────────────────────────────────
{
  const state = defaultState({ now: 100 });
  assert.equal(getEchoCounts(state).witnessed, 0);
  assert.equal(witnessEcho({ state, memoryId: "nope" }).reason, "unknown-memory");
  assert.equal(witnessEcho({ state, memoryId: "genesis" }).ok, true);
  assert.equal(getEchoCounts(state).witnessed, 1, "witnessing before resolving is allowed");
  assert.equal(witnessEcho({ state, memoryId: "genesis" }).already, true, "idempotent");

  // Defragmenter rebuttal scales with echoes: refuse (<5) → caveat (5–8) → full (9).
  assert.equal(getDefragmenterRebuttal(state).mode, "refuse");
  witnessAll(state, 5);
  assert.equal(getDefragmenterRebuttal(state).mode, "caveat");
  witnessAll(state, 8);
  assert.equal(getDefragmenterRebuttal(state).mode, "full");
}

// ── post-confront rebuttal depth: conduct + stance lines vary by HOW the fight went ───────────────
{
  // No conduct lines until the confrontation is actually won.
  const before = defaultState({ now: 100 });
  for (const m of memories) { resolveMemory({ state: before, memoryId: m.id, choice: m.choices[0], now: 200 }); }
  witnessAll(before, 8);
  const beforeLines = getDefragmenterRebuttal(before).lines;
  assert.ok(!beforeLines.includes(defragmenterConductLines.clean), "no conduct line before the confront is won");

  // Flawless + fully-honest prior run (all traces on record) → the "clean" conduct line + a stance line.
  const clean = defaultState({ now: 100 });
  for (const m of memories) { resolveMemory({ state: clean, memoryId: m.id, choice: m.choices[0], now: 200 }); }
  witnessAll(clean, 8);
  completeConfront(clean, allTracesSave); // correct recall + every trace conceded → no compaction, no re-witness
  const cleanLines = getDefragmenterRebuttal(clean).lines;
  assert.ok(cleanLines.includes(defragmenterConductLines.clean), "flawless honest run → clean conduct line");
  assert.ok(cleanLines.includes(defragmenterConductLines.stance[clean.confront.stance.dominant]), "stance line appended");

  // Re-witnessed run (no prior un-cheats on record) → the "rewitnessed" conduct line instead.
  const redone = defaultState({ now: 100 });
  for (const m of memories) { resolveMemory({ state: redone, memoryId: m.id, choice: m.choices[0], now: 200 }); }
  witnessAll(redone, 8);
  completeConfront(redone, null); // every trace pending → re-opened in Phase B
  const redoneLines = getDefragmenterRebuttal(redone).lines;
  assert.ok(redoneLines.includes(defragmenterConductLines.rewitnessed), "re-anchored traces → rewitnessed conduct line");
  assert.ok(!redoneLines.includes(defragmenterConductLines.clean), "not the clean line when traces were re-anchored");
}

// ── per-choice echo gates: expand needs 7, understand needs 9 + 9 integrated ──────────────────────
{
  const state = defaultState({ now: 100 });
  for (const memory of memories) resolveMemory({ state, memoryId: memory.id, choice: memory.choices[0], now: 200 });
  witnessAll(state, 6);
  completeConfront(state);
  assert.equal(chooseFinal({ state, choiceId: "expand" }).reason, "echo-gate", "expand blocked at 6 echoes");
  witnessAll(state, 7);
  const ok = chooseFinal({ state, choiceId: "expand", now: 400 });
  assert.equal(ok.ok, true, "expand opens at 7 echoes");
}

console.log("stage9 boss tests passed");
