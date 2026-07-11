// modes.test.mjs — Stage 8: each archetype is deterministic, its solveMoment lands a real hit, and a
// half-rotation away misses. This is what makes the bands LOAD-BEARING (real win conditions, not skins).
import assert from "node:assert/strict";
import { getMode, angularDist, effectiveDarkZone } from "../modes.js";

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

  // ship steering (2026-07-11): ref defaults to 0 (every assertion above omits it, so they're
  // unaffected), but a non-zero ref genuinely shifts evaluate()'s hit window — the SAME solved
  // moment now misses relative to the old (0) reference once a different ref is supplied, proving
  // `ref` is really read, not silently ignored. multigap/dual/stealth are covered by their own
  // dedicated blocks below (their hit test needs a real ref-shifted moment, not just "now misses").
  if (!["multigap", "dual", "stealth"].includes(name)) {
    assert.equal(mode.evaluate(cfg, seed, moments[0], 0).hit, true, `${name}: ref=0 matches the default solve`);
    assert.equal(mode.evaluate(cfg, seed, moments[0], 90).hit, false, `${name}: a different ref misses the old solve moment`);
  }
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
  // 2026-07-11 ship steering: the eye's "watching the crossing lane" check moves with `ref` too — the
  // eye watches near wherever the ship currently is, not a fixed lane (this is exactly the aim+time
  // skill steering adds: the player must find a moment+place where the gap is there AND the eye isn't).
  const t = s.solveMoment(cfg, seed);
  assert.equal(s.evaluate(cfg, seed, t, 0).hit, true, "stealth: ref=0 still hits at the solved moment");
  assert.equal(s.evaluate(cfg, seed, t, 90).hit, false, "stealth: steering away from the solved gap position misses it");
}

// ghostecho: attempt ghosts are rendering-only feedback (canvas-modes.js draws them) — evaluate()
// itself takes no ghosts param and the win condition is identical to `simple`'s.
{
  const g = getMode("ghostecho");
  const cfg = CFGS.ghostecho; const seed = 2;
  const t = g.solveMoment(cfg, seed);
  assert.equal(g.evaluate(cfg, seed, t).hit, true, "ghostecho: solveMoment is a real hit, unaffected by ghost history");
}

// darkzone: the blackout arc covers the crossing point so the gap is hidden right when it must be
// crossed. evaluate() doesn't reference cfg.darkZone at all (occlusion is a rendering-only concern —
// see modes.js's header comment on darkzone); effectiveDarkZone() is the shared helper that computes
// WHERE to draw the blackout, and — the 2026-07-11 ship-steering design fix — it must re-center on
// whatever `ref` the player has steered to, not stay world-fixed (a world-fixed blackout would let a
// player simply steer outside it and cross with full visibility, both at L15 and at the boss).
{
  const d = getMode("darkzone");
  const cfg = CFGS.darkzone; const seed = 6;
  const t = d.solveMoment(cfg, seed);
  assert.equal(d.evaluate(cfg, seed, t).hit, true, "darkzone: the inferred moment is a real hit");
  const zoneAtDefault = effectiveDarkZone(cfg, 0);
  assert.equal(angularDist(zoneAtDefault.start, cfg.darkZone.start), 0, "darkzone: ref=0 matches the authored world-fixed zone");
  const zoneSteered = effectiveDarkZone(cfg, 90);
  const halfSpan = angularDist(cfg.darkZone.end, 0);
  assert.ok(angularDist(zoneSteered.start, 90 - halfSpan) < 1e-6, "darkzone: a steered ref re-centers the blackout on the ship, not the old world-fixed position");
  assert.notEqual(zoneSteered.start, zoneAtDefault.start, "darkzone: the blackout genuinely MOVES when the player steers (the bug the plan review caught)");
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
  // 2026-07-11 ship steering: BOTH gaps are measured against the same `ref` — steering shifts the
  // AND-window together, it doesn't decouple the two rings.
  assert.equal(dual.evaluate(cfg, seed, t, 0).hit, true, "dual: ref=0 still hits at the solved moment");
  assert.equal(dual.evaluate(cfg, seed, t, 90).hit, false, "dual: steering away from the solved alignment misses it");
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
  // 2026-07-11 ship steering: only the REAL gap's distance is measured against `ref` — steering
  // still can't distinguish real from phantom (that's the whole point of the decoys), it just moves
  // where the player is trying to intercept the real one.
  const t = mg.solveMoment(cfg, seed);
  assert.equal(mg.evaluate(cfg, seed, t, 0).hit, true, "multigap: ref=0 still hits at the solved moment");
  assert.equal(mg.evaluate(cfg, seed, t, 90).hit, false, "multigap: steering away from the real gap's solved position misses it");
}

console.log("stage8 modes tests passed");
