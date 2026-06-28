// steer.test.mjs — Stage 5 touch steering: an on-screen d-pad tap must invoke the SAME action as the
// equivalent arrow key. Pure (no DOM): steerAction()/STEER_DPAD are the wiring renderer.js uses, so we
// prove a tap routes the identical key string to loop.handleKey and produces the identical race state.
import assert from "node:assert/strict";
import { steerAction, STEER_DPAD } from "../steer.js";
import { createGameLoop } from "../game-loop.js";
import { defaultState } from "../state.js";

// ── the d-pad maps to the exact arrow keys renderer.js's keydown handler forwards ─────────────────
{
  assert.equal(STEER_DPAD.left.id, "ArrowLeft", "◀ = ArrowLeft (lane left)");
  assert.equal(STEER_DPAD.right.id, "ArrowRight", "▶ = ArrowRight (lane right)");
  assert.equal(STEER_DPAD.up.id, "ArrowUp", "HI = ArrowUp (fork high)");
  assert.equal(STEER_DPAD.down.id, "ArrowDown", "LO = ArrowDown (fork low)");
}

// ── a tap === the keypress: same resulting lane on a real game loop ───────────────────────────────
function laneAfter(apply) {
  const state = defaultState();
  const loop = createGameLoop({ state, seed: "s5", roundIdx: 0, calibrated: false });
  const before = state.run.lane;
  apply(loop);
  return { before, after: state.run.lane };
}
{
  const viaKey = laneAfter((loop) => loop.handleKey("ArrowRight"));
  const viaTap = laneAfter((loop) => steerAction({ getMode: () => "playing", getLoop: () => loop }, STEER_DPAD.right.id));
  assert.notEqual(viaKey.after, viaKey.before, "ArrowRight actually moves the lane (sanity)");
  assert.equal(viaTap.after, viaKey.after, "tapping ▶ lands the same lane as pressing ArrowRight");
}

// ── steering is inert outside a live race (mirrors renderer onKey's mode!=='playing' guard) ───────
{
  const calls = [];
  const fakeLoop = { handleKey: (k) => calls.push(k) };
  steerAction({ getMode: () => "result", getLoop: () => fakeLoop }, STEER_DPAD.left.id);
  steerAction({ getMode: () => "select", getLoop: () => fakeLoop }, STEER_DPAD.up.id);
  assert.equal(calls.length, 0, "no key is dispatched when not playing");
  steerAction({ getMode: () => "playing", getLoop: () => fakeLoop }, STEER_DPAD.up.id);
  assert.deepEqual(calls, ["ArrowUp"], "playing → the selected key reaches loop.handleKey");
}
