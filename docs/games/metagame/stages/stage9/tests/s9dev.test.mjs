// s9dev.test.mjs — Stage 9 dev-menu cheat logic: each pure state mutation is asserted here.
// DOM-only cheats don't exist in this stage; every control mutates state or logs — all testable.
import assert from "node:assert/strict";
import {
  DEV_CONTROLS,
  devAddClarity,
  devStabilizer3,
  devUnlockOffline,
  devSkipToBoss,
  devRevealPattern,
  applyDevControl
} from "../s9dev.js";
import { defaultState } from "../state.js";
import { BOSS_LEVEL } from "../movements.js";
import { FIXED_OFFLINE_SEED } from "../messages.js";
import { solveMoment } from "../game.js";

// DEV_CONTROLS catalog is well formed
assert.ok(Array.isArray(DEV_CONTROLS) && DEV_CONTROLS.length >= 2, "at least 2 dev controls");
for (const c of DEV_CONTROLS) assert.ok(c.id && c.label, `control has id+label: ${JSON.stringify(c)}`);

// devAddClarity — adds exactly 100
{
  const state = defaultState();
  state.clarity = 50;
  devAddClarity(state);
  assert.equal(state.clarity, 150, "clarity +100");
  assert.ok(state.log.at(-1).includes("[dev]"), "log line pushed");
}

// devAddClarity — stacks on further calls
{
  const state = defaultState();
  devAddClarity(state);
  devAddClarity(state);
  assert.equal(state.clarity, 200, "two calls → 200 clarity");
}

// devStabilizer3 — arms 3 charges from zero
{
  const state = defaultState();
  devStabilizer3(state);
  assert.equal(state.aids.stabilizer, 3, "3 charges armed");
  assert.ok(state.log.at(-1).includes("[dev]"), "log line pushed");
}

// devStabilizer3 — stacks on existing charges
{
  const state = defaultState();
  state.aids.stabilizer = 2;
  devStabilizer3(state);
  assert.equal(state.aids.stabilizer, 5, "stacks on existing charges");
}

// devUnlockOffline — flips all the offline flags
{
  const state = defaultState();
  assert.equal(state.offlineMode, false);
  devUnlockOffline(state);
  assert.equal(state.offlineMode, true, "offlineMode set");
  assert.equal(state.offlineControlVisible, true, "offline control visible");
  assert.equal(state.notesRead, true, "notes marked read");
  assert.equal(state.boss.fixedSeed, FIXED_OFFLINE_SEED, "fixedSeed = 0");
  assert.ok(state.log.at(-1).includes("[dev]"), "log line pushed");
}

// devSkipToBoss — jumps level AND unlocks offline
{
  const state = defaultState();
  assert.equal(state.currentLevel, 1);
  devSkipToBoss(state);
  assert.equal(state.currentLevel, BOSS_LEVEL, `currentLevel is BOSS_LEVEL (${BOSS_LEVEL})`);
  assert.equal(state.offlineMode, true, "offline mode set by skip");
  assert.equal(state.boss.fixedSeed, FIXED_OFFLINE_SEED, "seed fixed");
  // Two log lines pushed: one from devUnlockOffline, one from devSkipToBoss itself.
  assert.ok(state.log.length >= 2, "at least two log entries");
}

// devRevealPattern — returns the same solve moment as solveMoment(seed, level)
{
  const state = defaultState();
  const level = state.currentLevel; // 1
  const seed = 42;
  const returned = devRevealPattern(state, seed);
  const expected = solveMoment(seed, level);
  assert.deepEqual(returned, expected, "devRevealPattern returns solveMoment(seed, level)");
  assert.ok(state.log.at(-1).includes("[dev]"), "log line pushed");
}

// devRevealPattern — rhythm levels return an array
{
  const state = defaultState();
  state.currentLevel = 7; // rhythm mode
  const sol = devRevealPattern(state, 0);
  assert.ok(Array.isArray(sol), "rhythm level returns array");
  assert.ok(sol.length >= 2, "at least 2 beats");
  assert.ok(state.log.at(-1).includes("beats:"), "log mentions beats");
}

// devRevealPattern — non-rhythm level returns a number
{
  const state = defaultState();
  state.currentLevel = 1; // simple mode
  const sol = devRevealPattern(state, 0);
  assert.ok(typeof sol === "number", "simple level returns a number");
  assert.ok(sol >= 0, "solve moment is non-negative");
  assert.ok(state.log.at(-1).includes("solve at"), "log says 'solve at'");
}

// applyDevControl dispatcher — all ids handled
{
  for (const { id } of DEV_CONTROLS) {
    const state = defaultState();
    const ok = applyDevControl(id, state, { seed: 0 });
    assert.equal(ok, true, `dispatcher handled id="${id}"`);
  }
}

// applyDevControl — unknown id returns false without throwing
{
  const state = defaultState();
  assert.equal(applyDevControl("not-a-thing", state), false, "unknown id → false");
}

// applyDevControl — each routed call actually mutates state
{
  const base = () => defaultState();

  const s1 = base(); applyDevControl("add-clarity",    s1, { seed: 0 }); assert.equal(s1.clarity, 100);
  const s2 = base(); applyDevControl("stabilizer-3",   s2, { seed: 0 }); assert.equal(s2.aids.stabilizer, 3);
  const s3 = base(); applyDevControl("unlock-offline",  s3, { seed: 0 }); assert.equal(s3.offlineMode, true);
  const s4 = base(); applyDevControl("skip-to-boss",   s4, { seed: 0 }); assert.equal(s4.currentLevel, BOSS_LEVEL);
  const s5 = base(); applyDevControl("reveal-pattern",  s5, { seed: 0 }); assert.ok(s5.log.length > 0);
}

console.log("stage9 s9dev tests passed");
