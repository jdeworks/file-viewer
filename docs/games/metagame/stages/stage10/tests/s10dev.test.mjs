import assert from "node:assert/strict";
import { devGrantEchoes, devResolveAll, devIntegrateAll, devWinConfront, devCheat } from "../s10dev.js";
import { getEchoCounts, getThresholdState } from "../boss.js";
import { isConfrontReady, getConfrontState } from "../confront.js";
import { defaultState } from "../state.js";
import { memories } from "../content.js";

// ── devGrantEchoes: all 9 echoes witnessed, gate opens ─────────────────────────────────────────
{
  const state = defaultState({ now: 1 });
  assert.equal(getEchoCounts(state).witnessed, 0);
  devGrantEchoes(state);
  assert.equal(getEchoCounts(state).witnessed, 9, "all 9 echoes witnessed");
  const gate = getThresholdState(state);
  assert.equal(gate.defragmenterAccess, true, "defragmenter-access gate (≥5) passes");
  // every slot has echoWitnessed set — the integration load-bearing check
  for (const m of memories) {
    assert.equal(state.memories[m.id].echoWitnessed, true, `${m.id} echoWitnessed`);
  }
}

// ── devGrantEchoes: idempotent ──────────────────────────────────────────────────────────────────
{
  const state = defaultState({ now: 1 });
  devGrantEchoes(state);
  devGrantEchoes(state);
  assert.equal(getEchoCounts(state).witnessed, 9, "double grant does not over-count");
}

// ── devResolveAll: all 9 resolved, thresholds satisfied ────────────────────────────────────────
{
  const state = defaultState({ now: 1 });
  assert.equal(getThresholdState(state).resolved, 0);
  devResolveAll(state);
  const after = getThresholdState(state);
  assert.equal(after.resolved, 9, "all 9 resolved");
  assert.equal(after.finalQuestionUnlocked, true, "finalQuestionUnlocked (≥5)");
  assert.equal(after.memoryRouteComplete, true, "memoryRouteComplete (≥9)");
  // first choice recorded where no prior choice existed
  for (const m of memories) {
    assert.equal(state.memories[m.id].choice, m.choices[0], `${m.id} first choice`);
    assert.equal(state.memories[m.id].resolvedAt, 1, "DEV_NOW sentinel timestamp");
  }
}

// ── devResolveAll: does not downgrade integrated memories or clobber prior choices ─────────────
{
  const state = defaultState({ now: 1 });
  state.memories.genesis.state = "integrated";
  state.memories.genesis.choice = memories[0].choices[2];
  state.memories.genesis.integratedAt = 42;
  devResolveAll(state);
  assert.equal(state.memories.genesis.state, "integrated", "integrated left unchanged");
  assert.equal(state.memories.genesis.choice, memories[0].choices[2], "prior choice kept");
  assert.equal(state.memories.genesis.integratedAt, 42, "integratedAt not touched");
}

// ── devIntegrateAll: all integrated, fullCapstoneComplete, echoes also granted ─────────────────
{
  const state = defaultState({ now: 1 });
  devIntegrateAll(state);
  const after = getThresholdState(state);
  assert.equal(after.integrated, 9, "all 9 integrated");
  assert.equal(after.fullCapstoneComplete, true, "fullCapstoneComplete (≥9 integrated)");
  assert.equal(getEchoCounts(state).witnessed, 9, "echoes also granted by devIntegrateAll");
  for (const m of memories) {
    assert.equal(state.memories[m.id].state, "integrated", `${m.id} state`);
    assert.equal(state.memories[m.id].integratedAt, 1, "integratedAt is DEV_NOW sentinel");
  }
}

// ── devWinConfront: completes all three phases, confront.completed = true ──────────────────────
{
  const state = defaultState({ now: 1 });
  assert.equal(state.confront.completed, false);
  devWinConfront(state);
  assert.equal(state.confront.completed, true, "confront completed after devWinConfront");
  assert.equal(state.confront.phase, "done", "phase = done");
  assert.ok(state.confront.stance, "stance assigned by Phase C");
  // echo + memory gates were also satisfied as a side-effect
  assert.equal(isConfrontReady(state), true, "isConfrontReady after devWinConfront");
  const cs = getConfrontState(state, null);
  assert.equal(cs.completed, true);
  assert.equal(cs.compaction.done, true, "Phase A complete");
  assert.equal(cs.fragmentation.done, true, "Phase B complete (via re-witness)");
  assert.equal(cs.core.done, true, "Phase C complete");
}

// ── devWinConfront: idempotent when already completed ──────────────────────────────────────────
{
  const state = defaultState({ now: 1 });
  devWinConfront(state);
  const stamp = state.confront.completedAt;
  const stance = state.confront.stance;
  devWinConfront(state); // second call: must not touch completedAt or stance
  assert.equal(state.confront.completedAt, stamp, "completedAt preserved");
  assert.deepEqual(state.confront.stance, stance, "stance preserved");
  assert.equal(state.confront.phase, "done");
}

// ── devWinConfront: Phase C stance is "seeker" (deterministic) ─────────────────────────────────
{
  const state = defaultState({ now: 1 });
  devWinConfront(state);
  assert.equal(state.confront.stance.dominant, "seeker", "seeker stance from all-seeker Phase C picks");
}

// ── devCheat dispatch: known ids route to the right cheat ──────────────────────────────────────
{
  const state = defaultState({ now: 1 });
  devCheat(state, "grant-echoes");
  assert.equal(getEchoCounts(state).witnessed, 9, "grant-echoes routed correctly");
}

// ── devCheat dispatch: unknown id is a silent no-op ───────────────────────────────────────────
{
  const state = defaultState({ now: 1 });
  assert.doesNotThrow(() => devCheat(state, "unknown-id"));
  assert.doesNotThrow(() => devCheat(state, ""));
  assert.doesNotThrow(() => devCheat(state, undefined));
  assert.equal(getEchoCounts(state).witnessed, 0, "state unchanged by unknown id");
}

// NOTE: dev(id) in renderer.js calls saveAndPaint(ctx, repaint) after devCheat — this is DOM-only
// and cannot be unit-tested here. The dispatch + state mutation is fully covered above.

console.log("stage10 s10dev tests passed");
