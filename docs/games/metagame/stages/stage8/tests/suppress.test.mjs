// suppress.test.mjs — Stage 8 entropy-threshold cascades (SUPPRESS verb) + High-Load income bet.
import assert from "node:assert/strict";
import { defaultState } from "../state.js";
import { makeRng } from "../rng.js";
import { advanceCycle, ENTROPY_THRESHOLD_CYCLE } from "../engine.js";

const midNodes = (s) => s.nodes.filter((n) => n.id.startsWith("M"));
function freshAt(cycle, entropy) {
  const s = defaultState();
  s.cycle = cycle; s.entropy = entropy; s.debris = [];
  for (const n of s.nodes) { n.health = 100; n.cascadeStress = 0; }
  return s;
}

// ── below the threshold cycle: no entropy cascades even at extreme entropy ─────────────────────────
{
  const s = freshAt(ENTROPY_THRESHOLD_CYCLE - 5, 95);
  advanceCycle(s, makeRng("8:t1"));
  // mids only take their base decay (3) from full health — never a -15 pattern hit
  assert.ok(midNodes(s).every((n) => n.health >= 95), "no pattern failure before the threshold cycle");
}

// ── cycle >= 23, 60% <= entropy < 80%: Pattern Failure hits exactly two mid relays for -15 ─────────
{
  const s = freshAt(ENTROPY_THRESHOLD_CYCLE, 65);
  const res = advanceCycle(s, makeRng("8:t2"));
  const hit = midNodes(s).filter((n) => n.health <= 85);
  assert.equal(hit.length, 2, "pattern failure damaged exactly two mid nodes");
  assert.equal(res.threshold.kind, "pattern_failure", "result reports the pattern_failure event");
}

// ── entropy >= 80%: Total Cascade drops every degrading node by an extra 30 ────────────────────────
{
  const s = freshAt(25, 85);
  for (const n of s.nodes) n.health = 50; // all degrading
  const res = advanceCycle(s, makeRng("8:t3"));
  assert.equal(res.threshold.kind, "total_cascade", "result reports the total_cascade event");
  assert.ok(s.nodes.some((n) => n.health <= 20), "total cascade applied -30 to degrading nodes");
}

// ── threshold events are deterministic for a given seed ───────────────────────────────────────────
{
  const a = freshAt(ENTROPY_THRESHOLD_CYCLE, 65);
  const b = freshAt(ENTROPY_THRESHOLD_CYCLE, 65);
  advanceCycle(a, makeRng("8:t4"));
  advanceCycle(b, makeRng("8:t4"));
  assert.deepEqual(a.nodes.map((n) => n.health), b.nodes.map((n) => n.health), "threshold cascades are deterministic");
}

// ── High-Load is a real income bet: a High-Load production node yields more States this cycle ──────
{
  const base = defaultState(); base.cycle = 1; base.debris = []; base.states = 0; base.totalStatesEarned = 0;
  const loaded = defaultState(); loaded.cycle = 1; loaded.debris = []; loaded.states = 0; loaded.totalStatesEarned = 0;
  loaded.highLoad = { P1: true };
  const rb = advanceCycle(base, makeRng("8:hl"));
  const rh = advanceCycle(loaded, makeRng("8:hl"));
  assert.ok(rh.income > rb.income, "High-Load node produces more income than the same node at base load");
}

console.log("stage8 suppress + high-load tests passed");
