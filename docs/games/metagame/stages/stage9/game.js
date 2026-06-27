// game.js — Stage 9 Observer State: thin facade over the mode registry + level table (no DOM/timers).
// The CROSS evaluation and the learnable "perfect moment" both DISPATCH on the level's mode, so each
// movement is a genuinely different win condition (single ring / oscillating speed / two concentric
// rings that must BOTH align / phantom-decoy gap / reversing direction), not a cosmetic skin.
//
// Online-vs-offline un-cheat: the back-third levels (movements.js `onlineUnstable`) and the boss reseed
// while the connection is live, so they are only beatable after Offline Mode fixes the cached seed.
// Motion is always a pure function of (seed, elapsedMs).

import { getMode, ringSpeed } from "./modes.js";
import { LEVELS, BOSS_LEVEL, levelConfig, movementForLevel, MOVEMENTS } from "./movements.js";

export { LEVELS, BOSS_LEVEL, levelConfig, movementForLevel, MOVEMENTS };

// Evaluate a CROSS press for (seed, level, elapsedMs). Dispatches to the level's mode.
export function crossAttempt({ seed, elapsedMs, level }) {
  const cfg = levelConfig(level);
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
