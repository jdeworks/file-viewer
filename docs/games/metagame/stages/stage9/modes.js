// modes.js — Stage 9 Observer State: the LEVEL-ARCHETYPE registry (pure, no DOM/timers).
//
// Each level has a `mode`. A mode is the load-bearing win condition + motion: it owns
//   evaluate(cfg, seed, elapsedMs) -> { hit, distance, ... }   (is the CROSS press a success now?)
//   solveMoment(cfg, seed)         -> ms                         (earliest perfect-CROSS time; learnable)
//   render(cfg, seed, elapsedMs)   -> ASCII string               (what the arena draws)
// All motion is a pure function of (seed, elapsedMs): same inputs ⇒ same angle, so a fixed (offline)
// seed is learnable and the smoke can drive any archetype by passing an explicit elapsedMs. This is
// what makes the previously-cosmetic "bands" into real, distinct games.

import { makeRng } from "./rng.js";
import { renderRing, ringAngle } from "./ring.js";
import { renderConcentric, renderMultiGap } from "./rings.js";

const TWO_PI = Math.PI * 2;
export function mod360(a) { return ((a % 360) + 360) % 360; }
export function angularDist(a, b) { return Math.abs(((a - b) % 360 + 540) % 360 - 180); }

// Speed for the single-ring modes: a per-level base + a small seeded variance (deterministic per seed).
export function ringSpeed(cfg, seed) {
  return (cfg.speed || 30) + makeRng(`${seed}s`).float() * (cfg.speedVar || 0);
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
  evaluate(cfg, seed, ms) {
    const angle = this.angleAt(cfg, seed, ms);
    const distance = angularDist(angle, 0);
    return { hit: distance <= cfg.tolerance / 2, angle, distance, tolerance: cfg.tolerance };
  },
  solveMoment(cfg, seed) {
    const speed = ringSpeed(cfg, seed);
    const base = ringAngle(seed, 0, speed);
    return Math.round(((360 - base) % 360 + 360) % 360 / speed * 1000);
  },
  render(cfg, seed, ms) {
    return renderRing(this.angleAt(cfg, seed, ms), {
      gapWidth: cfg.tolerance, hidden: cfg.display === "hidden", darkZone: cfg.darkZone || null
    });
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
  evaluate(cfg, seed, ms) {
    const angle = this.angleAt(cfg, seed, ms);
    const distance = angularDist(angle, 0);
    return { hit: distance <= cfg.tolerance / 2, angle, distance, tolerance: cfg.tolerance };
  },
  solveMoment(cfg, seed) { return scanSolve((t) => this.angleAt(cfg, seed, t), cfg.tolerance); },
  render(cfg, seed, ms) {
    return renderRing(this.angleAt(cfg, seed, ms), { gapWidth: cfg.tolerance, darkZone: cfg.darkZone || null });
  }
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
  evaluate(cfg, seed, ms) {
    const angle = this.angleAt(cfg, seed, ms);
    const distance = angularDist(angle, 0);
    return { hit: distance <= cfg.tolerance / 2, angle, distance, tolerance: cfg.tolerance };
  },
  solveMoment(cfg, seed) { return scanSolve((t) => this.angleAt(cfg, seed, t), cfg.tolerance, { maxMs: 60000 }); },
  render(cfg, seed, ms) {
    return renderRing(this.angleAt(cfg, seed, ms), { gapWidth: cfg.tolerance, darkZone: cfg.darkZone || null });
  }
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
  evaluate(cfg, seed, ms) {
    const { inner, outer } = this.anglesAt(cfg, seed, ms);
    const di = angularDist(inner, 0); const dou = angularDist(outer, 0);
    const distance = Math.max(di, dou);
    return { hit: di <= cfg.tolerance / 2 && dou <= cfg.tolerance / 2, distance, inner, outer, tolerance: cfg.tolerance };
  },
  solveMoment(cfg, seed) { return dualParams(cfg, seed).tAlign; },
  render(cfg, seed, ms) {
    const { inner, outer } = this.anglesAt(cfg, seed, ms);
    return renderConcentric(inner, outer, { gapWidth: cfg.tolerance, darkZone: cfg.darkZone || null });
  }
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
  evaluate(cfg, seed, ms) {
    const angle = this.realAngle(cfg, seed, ms);
    const distance = angularDist(angle, 0);
    return { hit: distance <= cfg.tolerance / 2, distance, angle, tolerance: cfg.tolerance };
  },
  solveMoment(cfg, seed) {
    const { speed, base, realIdx, step } = multiParams(cfg, seed);
    const start = mod360(base + realIdx * step);
    return Math.round(((360 - start) % 360 + 360) % 360 / speed * 1000);
  },
  render(cfg, seed, ms) {
    return renderMultiGap(this.gapsAt(cfg, seed, ms), { gapWidth: cfg.tolerance, darkZone: cfg.darkZone || null });
  }
};

export const MODES = { simple, oscillating, reversing, dual, multigap };
export function getMode(name) { return MODES[name] || simple; }
