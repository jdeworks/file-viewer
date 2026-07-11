// modes.js — Stage 8 Observer State: the LEVEL-ARCHETYPE registry (pure, no DOM/timers).
//
// Each level has a `mode`. A mode is the load-bearing win condition + motion: it owns
//   evaluate(cfg, seed, elapsedMs, ref=0) -> { hit, distance, ... }  (is the CROSS press a success now?)
//   solveMoment(cfg, seed)                -> ms                     (earliest perfect-CROSS time; learnable)
// All motion is a pure function of (seed, elapsedMs): same inputs ⇒ same angle, so a fixed (offline)
// seed is learnable and the smoke can drive any archetype by passing an explicit elapsedMs. This is
// what makes the previously-cosmetic "bands" into real, distinct games.
//
// 2026-07-11 (ship steering): every evaluate() now takes a `ref` — the angle the player is CURRENTLY
// steered to (a ▲ ship the player moves with ArrowLeft/ArrowRight, see renderer.js) — instead of a
// hardcoded 0 ("the top"). Default `ref = 0` makes this fully backward-compatible: any caller that
// never passes `ref` (every existing test, every solveMoment-driven smoke path, since the debug hook
// never steers) sees byte-identical behavior to before this change. `solveMoment` itself never reads
// `ref` — it always hardcodes 0 internally (see `scanSolve`/`simpleSolve`/`dualParams.tAlign`), which
// is exactly right: the debug/test ship never moves, so the "top" it solves for IS the ship's default
// position. Rendering (ASCII `render()`) was removed in the canvas rewrite — see canvas-ring.js /
// canvas-modes.js, which call each mode's angle accessor (angleAt/anglesAt/gapsAt/gapAngle/eyeAngle)
// directly rather than through a per-mode render() hook.

import { makeRng } from "./rng.js";
import { ringAngle } from "./ring.js";

const TWO_PI = Math.PI * 2;
export function mod360(a) { return ((a % 360) + 360) % 360; }
export function angularDist(a, b) { return Math.abs(((a - b) % 360 + 540) % 360 - 180); }

// Speed for the single-ring modes: a per-level base + a small seeded variance (deterministic per seed).
export function ringSpeed(cfg, seed) {
  return (cfg.speed || 30) + makeRng(`${seed}s`).float() * (cfg.speedVar || 0);
}

// Shared darkzone-blackout helper (2026-07-11 ship-steering design fix). `cfg.darkZone` is set on the
// `darkzone` mode's levels (L15) AND on the boss level (L16, mode "simple") — it's a rendering-time
// occlusion overlay independent of which mode owns the level, so this lives at module scope rather
// than on any one mode object. cfg.darkZone's start/end were always authored symmetrically around 0
// (e.g. 312/48 ⇒ ±48°, 300/60 ⇒ ±60°), so the half-span is recoverable from either edge. Re-centering
// on `ref` (the player's current steered position, default 0) is what stops a player from simply
// steering outside a WORLD-FIXED blackout and crossing with full visibility — the final approach to
// wherever the player currently is stays blind no matter where they steer, preserving the "extrapolate
// blind" skill at both L15 and the boss.
export function effectiveDarkZone(cfg, ref = 0) {
  if (!cfg.darkZone) return null;
  const halfSpan = angularDist(cfg.darkZone.end, 0);
  return { start: mod360(ref - halfSpan), end: mod360(ref + halfSpan) };
}

// Scan for the earliest moment a pure angle-of-time function lands within tolerance of the top (0deg).
function scanSolve(angleAt, tol, { maxMs = 40000, step = 4 } = {}) {
  let bestT = 0; let bestD = Infinity;
  for (let t = 0; t <= maxMs; t += step) {
    const d = angularDist(angleAt(t), 0);
    if (d <= tol / 2) return t;
    if (d < bestD) { bestD = d; bestT = t; }
  }
  return bestT;
}

// ── simple: one ring, constant rotation. The tutorial verb — WATCH AND TIME. ────────────────────────
const simple = {
  angleAt(cfg, seed, ms) { return ringAngle(seed, ms, ringSpeed(cfg, seed)); },
  evaluate(cfg, seed, ms, ref = 0) {
    const angle = this.angleAt(cfg, seed, ms);
    const distance = angularDist(angle, ref);
    return { hit: distance <= cfg.tolerance / 2, angle, distance, tolerance: cfg.tolerance };
  },
  solveMoment(cfg, seed) {
    const speed = ringSpeed(cfg, seed);
    const base = ringAngle(seed, 0, speed);
    return Math.round(((360 - base) % 360 + 360) % 360 / speed * 1000);
  }
};

// ── oscillating: one ring whose angular velocity breathes sinusoidally — READ A CHANGING SPEED. ──────
// ω(t)=oscBase+oscAmp·sin(2π t/Tp+φ); amp<base ⇒ ω>0 ⇒ angle is monotone, so it crosses the top.
function oscParams(cfg, seed) {
  const r = makeRng(`${seed}o`);
  return { base: r.float() * 360, phase: r.float() * TWO_PI, b: cfg.oscBase || 35, amp: Math.min(cfg.oscAmp || 18, (cfg.oscBase || 35) - 5), Tp: (cfg.oscPeriod || 4000) / 1000 };
}
const oscillating = {
  angleAt(cfg, seed, ms) {
    const { base, phase, b, amp, Tp } = oscParams(cfg, seed);
    const t = ms / 1000;
    const integral = b * t - (amp * Tp / TWO_PI) * (Math.cos(TWO_PI * t / Tp + phase) - Math.cos(phase));
    return mod360(base + integral);
  },
  evaluate(cfg, seed, ms, ref = 0) {
    const angle = this.angleAt(cfg, seed, ms);
    const distance = angularDist(angle, ref);
    return { hit: distance <= cfg.tolerance / 2, angle, distance, tolerance: cfg.tolerance };
  },
  solveMoment(cfg, seed) { return scanSolve((t) => this.angleAt(cfg, seed, t), cfg.tolerance); }
};

// ── reversing: one ring whose direction flips on a seeded schedule — TRACK THE FLIPS. ────────────────
// Forward segments are longer than reverse (net drift), and the FIRST forward segment sweeps >360deg,
// so a crossing of the top is guaranteed (solvable) even though direction reverses afterwards.
function revSegments(cfg, seed) {
  const r = makeRng(`${seed}r`);
  const speed = ringSpeed(cfg, seed);
  const segs = []; let dir = 1;
  for (let i = 0; i < 10; i++) {
    const sweepDeg = dir > 0 ? 360 * 1.3 : 150;
    const dur = (sweepDeg / speed) * (0.8 + r.float() * 0.4) * 1000; // ms
    segs.push({ dir, dur, speed });
    dir *= -1;
  }
  return { base: r.float() * 360, segs };
}
const reversing = {
  angleAt(cfg, seed, ms) {
    const { base, segs } = revSegments(cfg, seed);
    let angle = base; let left = ms;
    for (const s of segs) {
      const span = Math.min(left, s.dur);
      angle += s.dir * s.speed * span / 1000;
      left -= span;
      if (left <= 0) break;
    }
    return mod360(angle);
  },
  evaluate(cfg, seed, ms, ref = 0) {
    const angle = this.angleAt(cfg, seed, ms);
    const distance = angularDist(angle, ref);
    return { hit: distance <= cfg.tolerance / 2, angle, distance, tolerance: cfg.tolerance };
  },
  solveMoment(cfg, seed) { return scanSolve((t) => this.angleAt(cfg, seed, t), cfg.tolerance, { maxMs: 60000 }); }
};

// ── dual: two concentric rings at different speeds — HOLD TWO RHYTHMS (win only when BOTH gaps align).
// Bases are constructed so both gaps reach the top at one seeded instant tAlign — the AND-window.
function dualParams(cfg, seed) {
  const r = makeRng(`${seed}d`);
  const si = cfg.speedInner || 45; const so = cfg.speedOuter || 30;
  const tAlign = 1500 + Math.floor(r.float() * 4000); // ms
  return { si, so, tAlign, bi: mod360(-si * tAlign / 1000), bo: mod360(-so * tAlign / 1000) };
}
const dual = {
  anglesAt(cfg, seed, ms) {
    const { si, so, bi, bo } = dualParams(cfg, seed);
    return { inner: mod360(bi + si * ms / 1000), outer: mod360(bo + so * ms / 1000) };
  },
  evaluate(cfg, seed, ms, ref = 0) {
    const { inner, outer } = this.anglesAt(cfg, seed, ms);
    const di = angularDist(inner, ref); const dou = angularDist(outer, ref);
    const distance = Math.max(di, dou);
    return { hit: di <= cfg.tolerance / 2 && dou <= cfg.tolerance / 2, distance, inner, outer, tolerance: cfg.tolerance };
  },
  solveMoment(cfg, seed) { return dualParams(cfg, seed).tAlign; }
};

// ── multigap: one ring with several gaps, one real + phantom decoys — PICK THE REAL GAP. ─────────────
// All gaps look identical; only the seeded real gap is a safe crossing. Learned run-to-run from failures.
function multiParams(cfg, seed) {
  const r = makeRng(`${seed}m`);
  const count = Math.max(2, cfg.gaps || 3);
  const speed = ringSpeed(cfg, seed);
  const base = r.float() * 360;
  const realIdx = r.int(0, count - 1);
  const step = 360 / count;
  return { count, speed, base, realIdx, step };
}
const multigap = {
  gapsAt(cfg, seed, ms) {
    const { count, speed, base, step } = multiParams(cfg, seed);
    return Array.from({ length: count }, (_, i) => mod360(base + i * step + speed * ms / 1000));
  },
  realAngle(cfg, seed, ms) {
    const { speed, base, realIdx, step } = multiParams(cfg, seed);
    return mod360(base + realIdx * step + speed * ms / 1000);
  },
  evaluate(cfg, seed, ms, ref = 0) {
    const angle = this.realAngle(cfg, seed, ms);
    const distance = angularDist(angle, ref);
    return { hit: distance <= cfg.tolerance / 2, distance, angle, tolerance: cfg.tolerance };
  },
  solveMoment(cfg, seed) {
    const { speed, base, realIdx, step } = multiParams(cfg, seed);
    const start = mod360(base + realIdx * step);
    return Math.round(((360 - start) % 360 + 360) % 360 / speed * 1000);
  }
};

// The earliest perfect-CROSS moment for a constant-rotation gap (shared by simple/ghostecho/darkzone).
function simpleSolve(cfg, seed) {
  const speed = ringSpeed(cfg, seed);
  const base = ringAngle(seed, 0, speed);
  return Math.round(((360 - base) % 360 + 360) % 360 / speed * 1000);
}

// ── ghostecho: a tight constant ring whose ONLY aid is calibration feedback — the last two attempts ──
// render as faint ghost marks so the player reads "I pressed X° early/late" and corrects. Win = simple;
// the ghosts come from attempt history passed in ctx.ghosts:[{angle,result}] (pure, no stored state).
const ghostecho = {
  angleAt(cfg, seed, ms) { return ringAngle(seed, ms, ringSpeed(cfg, seed)); },
  evaluate(cfg, seed, ms, ref = 0) {
    const angle = this.angleAt(cfg, seed, ms);
    const distance = angularDist(angle, ref);
    return { hit: distance <= cfg.tolerance / 2, angle, distance, tolerance: cfg.tolerance };
  },
  solveMoment(cfg, seed) { return simpleSolve(cfg, seed); }
};

// ── rhythm: land N CONSECUTIVE crosses on a seeded metronome (the gap returns to the top once per ─────
// rotation = the beat). A miss resets the chain. solveMoment returns the press-time ARRAY (all N beats).
// The chain itself is tracked by the facade; each beat is a pure top-pass time so it stays deterministic.
export function rhythmParams(cfg, seed) {
  const speed = ringSpeed(cfg, seed);
  const period = 360000 / speed; // one rotation in ms = one beat of the metronome
  return { speed, period, base: simpleSolve(cfg, seed), chain: Math.max(2, cfg.chain || 3) };
}
const rhythm = {
  angleAt(cfg, seed, ms) { return ringAngle(seed, ms, ringSpeed(cfg, seed)); },
  evaluate(cfg, seed, ms, ref = 0) {
    const angle = this.angleAt(cfg, seed, ms);
    const distance = angularDist(angle, ref);
    return { hit: distance <= cfg.tolerance / 2, angle, distance, tolerance: cfg.tolerance };
  },
  // Press-time array: the gap faces the top on every beat; chain N of them in a row to clear.
  solveMoment(cfg, seed) {
    const { period, base, chain } = rhythmParams(cfg, seed);
    return Array.from({ length: chain }, (_, k) => Math.round(base + k * period));
  }
};

// ── stealth: a constant gap PLUS a deterministic scanning eye (its own seed). CROSS only counts when ──
// the gap is at the top AND the eye beam is NOT covering the top lane (observe vs. act — wait for blind).
export function stealthParams(cfg, seed) {
  return { speed: ringSpeed(cfg, seed), eyeSpeed: cfg.eyeSpeed || 22, blind: cfg.blind || 60 };
}
const stealth = {
  gapAngle(cfg, seed, ms) { return ringAngle(seed, ms, ringSpeed(cfg, seed)); },
  eyeAngle(cfg, seed, ms) { return ringAngle(`${seed}eye`, ms, stealthParams(cfg, seed).eyeSpeed); },
  evaluate(cfg, seed, ms, ref = 0) {
    const gap = this.gapAngle(cfg, seed, ms);
    const eye = this.eyeAngle(cfg, seed, ms);
    const distance = angularDist(gap, ref);
    const watched = angularDist(eye, ref) <= (cfg.blind || 60) / 2; // eye on the crossing lane (now wherever the ship is)
    return { hit: distance <= cfg.tolerance / 2 && !watched, distance, gap, eye, watched, tolerance: cfg.tolerance };
  },
  solveMoment(cfg, seed) {
    for (let t = 0; t <= 60000; t += 4) if (this.evaluate(cfg, seed, t).hit) return t;
    return 0;
  }
};

// ── darkzone: a constant gap, but a blackout arc covers the crossing point so the gap vanishes exactly
// when it matters — the player extrapolates the cross moment from the known fixed speed. Only
// tractable offline (online the seed reseeds → nothing to extrapolate), which is why this lives in
// the back third. evaluate() itself doesn't need to know about the blackout (occlusion only affects
// what the player can SEE, not the ground-truth hit test — identical to `simple`); what makes this
// mode hard is purely the render-time hiding, computed by the shared effectiveDarkZone() above (also
// used by the boss level, L16, which sets cfg.darkZone on the "simple" mode rather than this one).
const darkzone = {
  angleAt(cfg, seed, ms) { return ringAngle(seed, ms, ringSpeed(cfg, seed)); },
  evaluate(cfg, seed, ms, ref = 0) {
    const angle = this.angleAt(cfg, seed, ms);
    const distance = angularDist(angle, ref);
    return { hit: distance <= cfg.tolerance / 2, angle, distance, tolerance: cfg.tolerance };
  },
  solveMoment(cfg, seed) { return simpleSolve(cfg, seed); }
};

export const MODES = { simple, oscillating, reversing, dual, multigap, ghostecho, rhythm, stealth, darkzone };
export function getMode(name) { return MODES[name] || simple; }
