// modes.test.mjs — Stage 8: each archetype is deterministic, its solveMoment lands a real hit, and a
// half-rotation away misses. This is what makes the bands LOAD-BEARING (real win conditions, not skins).
import assert from "node:assert/strict";
import { getMode, angularDist } from "../modes.js";

const CFGS = {
  simple: { mode: "simple", speed: 30, speedVar: 0, tolerance: 30 },
  oscillating: { mode: "oscillating", oscBase: 40, oscAmp: 18, oscPeriod: 4000, tolerance: 28 },
  reversing: { mode: "reversing", speed: 60, speedVar: 0, tolerance: 24 },
  dual: { mode: "dual", speedInner: 45, speedOuter: 30, tolerance: 30 },
  multigap: { mode: "multigap", speed: 50, speedVar: 0, gaps: 3, tolerance: 22 },
  ghostecho: { mode: "ghostecho", speed: 34, speedVar: 0, tolerance: 26 },
  rhythm: { mode: "rhythm", speed: 36, speedVar: 0, tolerance: 28, chain: 3 },
  stealth: { mode: "stealth", speed: 38, speedVar: 0, eyeSpeed: 22, blind: 60, tolerance: 26 },
  darkzone: { mode: "darkzone", speed: 40, speedVar: 0, tolerance: 22, darkZone: { start: 320, end: 40 } }
};

for (const [name, cfg] of Object.entries(CFGS)) {
  const mode = getMode(name);
  const seed = 7;

  // determinism
  const a = mode.evaluate(cfg, seed, 1234);
  const b = mode.evaluate(cfg, seed, 1234);
  assert.deepEqual(a, b, `${name}: evaluate deterministic`);

  // solveMoment lands a hit. rhythm returns an ARRAY of beat times (chain) — every beat is a real hit.
  const solve = mode.solveMoment(cfg, seed);
  const moments = Array.isArray(solve) ? solve : [solve];
  for (const t of moments) {
    assert.ok(t >= 0, `${name}: solveMoment non-negative`);
    assert.equal(mode.evaluate(cfg, seed, t).hit, true, `${name}: solveMoment is a real hit`);
  }

  // render is a non-empty deterministic ASCII block
  const r1 = mode.render(cfg, seed, moments[0]);
  assert.equal(r1, mode.render(cfg, seed, moments[0]), `${name}: render deterministic`);
  assert.ok(r1.length > 8, `${name}: render draws something`);
}

// rhythm: solveMoment is N evenly spaced beats (a metronome), each one rotation apart.
{
  const r = getMode("rhythm");
  const cfg = CFGS.rhythm; const beats = r.solveMoment(cfg, 5);
  assert.equal(beats.length, cfg.chain, "rhythm: one beat per chain step");
  const d1 = beats[1] - beats[0]; const d2 = beats[2] - beats[1];
  assert.ok(Math.abs(d1 - d2) <= 1, "rhythm: beats are evenly spaced (constant cadence)");
}

// stealth: the eye really blocks — there exist moments where the gap is at top but the eye is watching.
{
  const s = getMode("stealth");
  const cfg = CFGS.stealth; const seed = 4;
  let blocked = false;
  for (let ms = 0; ms < 60000; ms += 3) {
    const e = s.evaluate(cfg, seed, ms);
    if (angularDist(e.gap, 0) <= cfg.tolerance / 2 && e.watched) {
      assert.equal(e.hit, false, "stealth: gap at top but eye watching = miss");
      blocked = true; break;
    }
  }
  assert.ok(blocked, "stealth: the eye sometimes covers the crossing lane");
}

// ghostecho: attempt ghosts render as feedback marks without changing the win condition.
{
  const g = getMode("ghostecho");
  const cfg = CFGS.ghostecho;
  const withGhost = g.render(cfg, 2, 500, { ghosts: [{ angle: 180, result: "miss" }] });
  assert.ok(withGhost.includes("·"), "ghostecho: a miss ghost renders");
}

// darkzone: the blackout arc covers the top so the gap is hidden right when it must be crossed.
{
  const d = getMode("darkzone");
  const cfg = CFGS.darkzone; const seed = 6;
  const t = d.solveMoment(cfg, seed);
  assert.equal(d.evaluate(cfg, seed, t).hit, true, "darkzone: the inferred moment is a real hit");
  assert.ok(d.render(cfg, seed, t).includes("█"), "darkzone: blackout arc renders over the top");
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

console.log("stage8 modes tests passed");
