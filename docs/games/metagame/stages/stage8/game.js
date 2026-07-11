// game.js — Stage 8 Observer State: thin facade over the mode registry + level table (no DOM/timers).
// The CROSS evaluation and the learnable "perfect moment" both DISPATCH on the level's mode, so each
// movement is a genuinely different win condition (single ring / oscillating speed / two concentric
// rings that must BOTH align / phantom-decoy gap / reversing direction), not a cosmetic skin.
//
// Online-vs-offline un-cheat: the back-third levels (movements.js `onlineUnstable`) and the boss reseed
// while the connection is live, so they are only beatable after Offline Mode fixes the cached seed.
// Motion is always a pure function of (seed, elapsedMs).

import { getMode, ringSpeed } from "./modes.js";
import { LEVELS, BOSS_LEVEL, levelConfig, movementForLevel, modeHint, MOVEMENTS } from "./movements.js";

export { LEVELS, BOSS_LEVEL, levelConfig, movementForLevel, modeHint, MOVEMENTS };

// Classify a CROSS result for instant arena feedback (pure — no DOM/clock). A hit inside the inner
// quarter of the tolerance window reads as "perfect"; any other hit is "hit"; everything else "miss".
// Drives the s8-arena--{perfect,hit,miss} flash so the timing result lands at the point of action.
export function crossOutcome(result) {
  if (!result || !result.hit) return "miss";
  const tol = Number(result.tolerance) || 0;
  return tol > 0 && Number(result.distance) <= tol / 4 ? "perfect" : "hit";
}

// Evaluate a CROSS press for (seed, level, elapsedMs). Dispatches to the level's mode. toleranceMult
// (>1) widens the win window for one press — used by the optional Stabilizer Lens aid; it never changes
// the gap MOTION (still pure f(seed,elapsedMs)) and is irrelevant to the offline un-cheat.
export function crossAttempt({ seed, elapsedMs, level, toleranceMult = 1 }) {
  let cfg = levelConfig(level);
  if (toleranceMult !== 1) cfg = { ...cfg, tolerance: cfg.tolerance * toleranceMult };
  return { ...getMode(cfg.mode).evaluate(cfg, seed, Number(elapsedMs) || 0), level: cfg.level };
}

// The earliest elapsed (ms) at which (seed, level) is a perfect CROSS — learnable by watching when the
// seed is fixed (offline). Dispatches per mode. Used by the boss un-cheat and the smoke driver.
export function solveMoment(seed, level) {
  const cfg = levelConfig(level);
  return getMode(cfg.mode).solveMoment(cfg, seed);
}

// Back-compat alias (older call sites / tests used solveElapsed).
export const solveElapsed = solveMoment;

// Verdict readout (UX audit #6): how EARLY or LATE a CROSS press was, in ms — a pure function of the
// already-computed gap angle and the level's effective rotation speed (no engine state touched). The
// gap's signed offset from the top maps to [-180,180]: a gap that has already swept PAST the top reads
// as a LATE press, one still approaching reads EARLY. deltaMs = |offset| / speed. Presentation only —
// it never feeds back into crossAttempt; it just tells the player which way to nudge next time.
export function missDelta({ seed, elapsedMs, level }) {
  const r = crossAttempt({ seed, elapsedMs, level });
  const speed = Math.abs(rotSpeedFor(seed, level)) || 30; // deg/s effective
  const a = Number.isFinite(r.angle) ? r.angle : r.distance; // gap angle from top (0 = perfect)
  const signed = ((a % 360) + 540) % 360 - 180; // (-180,180]: >0 gap swept past top, <0 still approaching
  return { deltaMs: Math.round(Math.abs(signed) / speed * 1000), dir: signed >= 0 ? "late" : "early", offsetDeg: signed };
}

// Render the arena for (seed, level, elapsedMs) — dispatches to the mode's renderer. ctx carries optional
// per-frame extras (e.g. ghostecho's attempt ghosts) that don't affect motion (pure presentation).
export function renderLevel(seed, level, elapsedMs, ctx = {}) {
  const cfg = levelConfig(level);
  return getMode(cfg.mode).render(cfg, seed, Number(elapsedMs) || 0, ctx);
}

// Single-ring rotation speed for a (seed, level) — kept for the HUD / simple-mode display.
export function rotSpeedFor(seed, level) {
  return ringSpeed(levelConfig(level), seed);
}

// Deterministic per-level seed so a learnable (non-onlineUnstable) level is stable online or off.
export function sublevelSeed(level) {
  return (Number(level) || 1) * 31 + 7;
}
