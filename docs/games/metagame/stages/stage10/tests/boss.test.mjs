import assert from "node:assert/strict";
import {
  chooseFinal,
  getFinalChoiceState,
  getRouteSummary,
  getThresholdState,
  integrateMemory,
  markMemoryRead,
  resolveMemory
} from "../boss.js";
import { memories } from "../content.js";
import { defaultState } from "../state.js";

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
  assert.equal(actions[0][0], 10);
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
  assert.equal(getFinalChoiceState(state).locked, false);
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
  assert.equal(summary.memoryLines.length, 9);
  assert.equal(summary.remainingText, "No prior memory remains unresolved.");

  for (const memory of memories) {
    integrateMemory({
      state,
      memoryId: memory.id,
      achievements: { unlockAchievement: (...args) => achievements.push(args) },
      now: 300
    });
  }
  threshold = getThresholdState(state);
  assert.equal(threshold.integrated, 9);
  assert.equal(threshold.fullCapstoneComplete, true);
  assert.equal(achievements.length, 1);
  assert.equal(achievements[0][0], "stage10.full_capstone");

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

console.log("stage10 boss tests passed");
