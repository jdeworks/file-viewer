// modes.test.mjs — Stage 9: each archetype is deterministic, its solveMoment lands a real hit, and a
// half-rotation away misses. This is what makes the bands LOAD-BEARING (real win conditions, not skins).
import assert from "node:assert/strict";
import { getMode, angularDist } from "../modes.js";

const CFGS = {
  simple: { mode: "simple", speed: 30, speedVar: 0, tolerance: 30 },
  oscillating: { mode: "oscillating", oscBase: 40, oscAmp: 18, oscPeriod: 4000, tolerance: 28 },
  reversing: { mode: "reversing", speed: 60, speedVar: 0, tolerance: 24 },
  dual: { mode: "dual", speedInner: 45, speedOuter: 30, tolerance: 30 },
  multigap: { mode: "multigap", speed: 50, speedVar: 0, gaps: 3, tolerance: 22 }
};

for (const [name, cfg] of Object.entries(CFGS)) {
  const mode = getMode(name);
  const seed = 7;

  // determinism
  const a = mode.evaluate(cfg, seed, 1234);
  const b = mode.evaluate(cfg, seed, 1234);
  assert.deepEqual(a, b, `${name}: evaluate deterministic`);

  // solveMoment lands a hit
  const t = mode.solveMoment(cfg, seed);
  assert.ok(t >= 0, `${name}: solveMoment non-negative`);
  assert.equal(mode.evaluate(cfg, seed, t).hit, true, `${name}: solveMoment is a real hit`);

  // render is a non-empty deterministic ASCII block
  const r1 = mode.render(cfg, seed, t);
  assert.equal(r1, mode.render(cfg, seed, t), `${name}: render deterministic`);
  assert.ok(r1.length > 8, `${name}: render draws something`);
}

// dual is genuinely an AND of two rings: at the solve moment BOTH gaps are at the top.
{
  const dual = getMode("dual");
  const cfg = CFGS.dual; const seed = 3;
  const t = dual.solveMoment(cfg, seed);
  const { inner, outer } = dual.anglesAt(cfg, seed, t);
  assert.ok(angularDist(inner, 0) <= cfg.tolerance / 2, "dual: inner gap at top");
  assert.ok(angularDist(outer, 0) <= cfg.tolerance / 2, "dual: outer gap at top");
  // a single ring being aligned is NOT enough — find a t where only outer aligns, expect a miss.
  let foundOnlyOuter = false;
  for (let ms = 0; ms < 30000; ms += 2) {
    const g = dual.anglesAt(cfg, seed, ms);
    if (angularDist(g.outer, 0) <= cfg.tolerance / 2 && angularDist(g.inner, 0) > cfg.tolerance / 2) {
      assert.equal(dual.evaluate(cfg, seed, ms).hit, false, "dual: one ring aligned is a miss");
      foundOnlyOuter = true; break;
    }
  }
  assert.ok(foundOnlyOuter, "dual: there exist moments where only one ring is aligned");
}

// multigap: pressing when a PHANTOM gap (not the real one) is at the top is a miss.
{
  const mg = getMode("multigap");
  const cfg = CFGS.multigap; const seed = 9;
  let foundPhantom = false;
  for (let ms = 0; ms < 12000; ms += 5) {
    const gaps = mg.gapsAt(cfg, seed, ms);
    const real = mg.realAngle(cfg, seed, ms);
    const phantomAtTop = gaps.some((g) => angularDist(g, 0) <= cfg.tolerance / 2 && angularDist(g, real) > 1);
    if (phantomAtTop && angularDist(real, 0) > cfg.tolerance) {
      assert.equal(mg.evaluate(cfg, seed, ms).hit, false, "multigap: phantom at top is a miss");
      foundPhantom = true; break;
    }
  }
  assert.ok(foundPhantom, "multigap: phantom gaps reach the top");
}

console.log("stage9 modes tests passed");
