// storms.test.mjs — Stage 8 Cascade Storms: act gating, sector growth, survival, boss gate.
import assert from "node:assert/strict";
import { defaultState } from "../state.js";
import { makeRng } from "../rng.js";
import {
  STORMS, TOTAL_STORMS, stormForAct, stormAvailable, braceStorm, bringSectorOnline, tickStorm, announceStorm
} from "../storms.js";
import { advanceCycle } from "../engine.js";

// ── three storms, one per act, gating sectors ──────────────────────────────────────────────────────
{
  assert.equal(TOTAL_STORMS, 3, "three Cascade Storms");
  const s = defaultState();
  assert.equal(stormForAct(s).id, "alpha", "act 1 faces α");
  s.act = 3;
  assert.equal(stormForAct(s).id, "gamma", "act 3 faces γ");
  s.act = 4;
  assert.equal(stormForAct(s), null, "no storm after all acts");
}

// ── availability is gated by the act body (cycles + cumulative reserves) ────────────────────────────
{
  const s = defaultState();
  assert.equal(stormAvailable(s).ok, false, "fresh field cannot brace");
  s.cycle = 10;
  s.totalStatesEarned = 300;
  const avail = stormAvailable(s);
  assert.equal(avail.ok, true, "act body met → α available");
  assert.equal(avail.storm.id, "alpha");
}

// ── bracing then weathering the full duration with healthy cores survives → sector online, act++ ────
{
  const s = defaultState();
  s.cycle = 10;
  s.totalStatesEarned = 300;
  assert.equal(braceStorm(s).ok, true, "α braced");
  assert.ok(s.activeStorm, "storm active");
  const dur = STORMS[0].duration;
  let resolution = null;
  for (let i = 0; i < dur; i += 1) {
    // keep cores topped up so the anchors survive the storm
    for (const n of s.nodes) if (/^C/.test(n.id)) n.health = 100;
    resolution = tickStorm(s, makeRng(`8:s:${i}`));
  }
  assert.ok(resolution && resolution.survived, "storm survived with cores held");
  assert.ok(s.onlineSectors.includes("alpha"), "sector α brought online");
  assert.ok(s.nodes.some((n) => n.id === "R1"), "α research node appended to the live field");
  assert.equal(s.stormsSurvived, 1, "storm counted");
  assert.equal(s.act, 2, "advanced to act 2");
  assert.ok(s.insight > 0, "insight windfall banked");
}

// ── a storm that fells both cores does NOT advance the act (retryable, no permanent loss) ───────────
{
  const s = defaultState();
  s.cycle = 10;
  s.totalStatesEarned = 300;
  braceStorm(s);
  let resolution = null;
  for (let i = 0; i < STORMS[0].duration; i += 1) {
    for (const n of s.nodes) if (/^C/.test(n.id)) n.health = 0; // let the cores fall
    resolution = tickStorm(s, makeRng(`8:f:${i}`));
  }
  assert.equal(resolution.survived, false, "core loss = storm failed");
  assert.equal(s.stormsSurvived, 0, "not counted");
  assert.equal(s.act, 1, "act not advanced — retryable");
  assert.ok(!s.onlineSectors.includes("alpha"), "sector not unlocked on failure");
}

// ── bringSectorOnline grows the live node array deterministically (idempotent) ──────────────────────
{
  const s = defaultState();
  const before = s.nodes.length;
  bringSectorOnline(s, "alpha");
  assert.equal(s.nodes.length, before + 8, "alpha appended 8 nodes");
  bringSectorOnline(s, "alpha");
  assert.equal(s.nodes.length, before + 8, "idempotent — no duplicates");
}

// ── engine integrates storms: an active storm ticks down through advanceCycle ───────────────────────
{
  const s = defaultState();
  s.cycle = 10;
  s.totalStatesEarned = 300;
  braceStorm(s);
  const left = s.activeStorm.cyclesLeft;
  advanceCycle(s, makeRng("8:1"));
  assert.ok(!s.activeStorm || s.activeStorm.cyclesLeft === left - 1, "storm advanced one cycle through the engine");
}

// ── band/phase announcement fires ONCE per storm, only when the act body is met (deterministic) ──────
{
  const s = defaultState();
  assert.equal(announceStorm(s), null, "no announcement before the act body is met");
  const logBefore = s.log.length;
  s.cycle = 10;
  s.totalStatesEarned = 300;
  const announced = announceStorm(s);
  assert.ok(announced && announced.id === "alpha", "α announced once its body is met");
  assert.ok(s.log.length > logBefore, "a phase line was logged");
  assert.ok(s.log.some((l) => l.includes("NEW PHASE")), "phase line is tagged");
  assert.deepEqual(s.announcedStorms, ["alpha"], "storm marked announced");
  // idempotent — does not re-announce the same storm
  const lenAfter = s.log.length;
  assert.equal(announceStorm(s), null, "no re-announcement of the same storm");
  assert.equal(s.log.length, lenAfter, "no duplicate log line");
}

// ── advanceCycle fires the announcement exactly once across many cycles ──────────────────────────────
{
  const s = defaultState();
  s.cycle = 10;
  s.totalStatesEarned = 300;
  for (let i = 0; i < 6; i += 1) advanceCycle(s, makeRng(`8:ann:${i}`));
  const count = s.log.filter((l) => l.includes("NEW PHASE") && l.includes("α")).length;
  assert.ok(count <= 1, "α phase line never duplicated by the engine loop");
  assert.deepEqual(s.announcedStorms, ["alpha"], "engine recorded the α announcement once");
}

console.log("stage8 storms tests passed");
