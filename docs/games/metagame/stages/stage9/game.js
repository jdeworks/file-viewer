// game.js — Stage 9 Observer State: band configs + the CROSS evaluation (pure, no DOM/timers).
// The arena's gap rotates; pressing CROSS succeeds only when the gap is within tolerance of the top
// (0deg) at press time. The engine evaluates the real angle identically in every band — later bands
// only change speed/tolerance and DISPLAY (dual/hidden/dark zone), never the underlying check. This
// is why the boss (level 18) is impossible online (Math.random reseeds the base angle each OBSERVE)
// but learnable offline (seed 0 → fixed base angle).

import { ringAngle } from "./ring.js";
import { makeRng } from "./rng.js";

export const LEVELS = 18;
export const BOSS_LEVEL = 18;

// Six bands of three levels. Each gets faster + tighter; later bands restrict the DISPLAY only.
const BANDS = {
  1: { baseSpeed: 30, speedVar: 0,  tolerance: 40, display: "open" },
  2: { baseSpeed: 45, speedVar: 10, tolerance: 32, display: "open" },
  3: { baseSpeed: 60, speedVar: 15, tolerance: 26, display: "dual" },
  4: { baseSpeed: 75, speedVar: 20, tolerance: 22, display: "ghosts" },
  5: { baseSpeed: 90, speedVar: 25, tolerance: 18, display: "hidden" },
  6: { baseSpeed: 45, speedVar: 0,  tolerance: 15, display: "dark", darkZone: { start: 300, end: 60 } }
};

export function bandForLevel(level) {
  return Math.max(1, Math.min(6, Math.ceil((Number(level) || 1) / 3)));
}

// Full config for a level: its band tuning + flags. Deterministic.
export function levelConfig(level) {
  const band = bandForLevel(level);
  return { level: Number(level) || 1, band, ...BANDS[band], isBoss: Number(level) === BOSS_LEVEL };
}

// Rotation speed for a (seed, level): band base + a seeded per-attempt variance. Online the seed
// changes each OBSERVE, so the speed (and base angle) shift — you can't build on prior observation.
export function rotSpeedFor(seed, level) {
  const cfg = levelConfig(level);
  return cfg.baseSpeed + makeRng(`${seed}s`).float() * cfg.speedVar;
}

// Evaluate a CROSS press. Returns { hit, angle, distance, tolerance } — hit when the gap is within
// the band tolerance of the top (0deg). The dark/hidden display does not change this evaluation.
export function crossAttempt({ seed, elapsedMs, level }) {
  const cfg = levelConfig(level);
  const speed = rotSpeedFor(seed, level);
  const angle = ringAngle(seed, elapsedMs, speed);
  const distance = angularDist(angle, 0);
  return { hit: distance <= cfg.tolerance / 2, angle, distance, tolerance: cfg.tolerance, level };
}

// The earliest elapsed (ms) at which a (seed, level) gap first reaches the top (0deg) — i.e. the
// perfect CROSS moment. With a FIXED seed this is learnable by watching; with an online (random)
// seed it changes every OBSERVE. Used by the boss un-cheat and by the sublevel test driver.
export function solveElapsed(seed, level) {
  const speed = rotSpeedFor(seed, level);
  const base = ringAngle(seed, 0, speed);
  const need = ((360 - base) % 360 + 360) % 360;
  return Math.round(need / speed * 1000);
}

// Deterministic seed for a non-boss level so its rotation is stable (learnable) within the level,
// online or off — only the BOSS reseeds per OBSERVE. Keeps sublevels fair while the boss stays the
// gated, un-cheat-only fight.
export function sublevelSeed(level) {
  return (Number(level) || 1) * 31 + 7;
}

function angularDist(a, b) {
  return Math.abs(((a - b) % 360 + 540) % 360 - 180);
}
