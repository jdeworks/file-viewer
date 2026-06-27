// movements.js — Stage 9 Observer State: the level table (the "score" of the timing game).
//
// Ten levels grouped into MOVEMENTS, each introducing a new verb (mode) and tightening tolerance /
// stepping up speed. The first six are LEARNABLE ONLINE (an inviting on-ramp). The back third
// (levels 7–9) and the boss (10) are `onlineUnstable`: each OBSERVE reseeds the gap while the
// connection is live, so they are only beatable after activating Offline Mode (which fixes the
// cached seed for ALL of them at once). Room to grow — add levels by extending LEVELS.

export const BOSS_LEVEL = 16;
export const LEVELS = 16;

// Movement metadata for the HUD. Each names the verb it teaches. Ten movements: the first six are
// learnable ONLINE (an inviting on-ramp through every observe-and-time verb); the back third (movements
// 7–10, levels 12–16) is `onlineUnstable` — the gap reseeds while live, so the offline un-cheat is
// load-bearing for ALL of them at once. The boss is always last.
export const MOVEMENTS = [
  { id: 1, name: "Signal", verb: "watch & time", levels: [1, 2] },
  { id: 2, name: "Drift", verb: "read a changing speed", levels: [3, 4] },
  { id: 3, name: "Echo", verb: "read your own error", levels: [5, 6] },
  { id: 4, name: "Cadence", verb: "hold the beat", levels: [7, 8] },
  { id: 5, name: "Interference", verb: "hold two rhythms", levels: [9, 10] },
  { id: 6, name: "Surveillance", verb: "wait for the blind window", levels: [11] },
  { id: 7, name: "Reversal", verb: "track the flips (offline)", levels: [12] },
  { id: 8, name: "Decoys", verb: "pick the real gap (offline)", levels: [13, 14] },
  { id: 9, name: "Blackout", verb: "extrapolate the occluded gap (offline)", levels: [15] },
  { id: 10, name: "Observer", verb: "the full effect (offline)", levels: [16] }
];

// Per-level config. tolerance tightens and speed steps up across the run; onlineUnstable marks the
// back third + boss. darkZone/display are overlays layered on the mode's motion (Blackout makes it a
// load-bearing win condition: the blackout covers the top, so the gap must be extrapolated, not seen).
const LEVEL_TABLE = {
  1: { mode: "simple", speed: 30, speedVar: 0, tolerance: 42, display: "open" },
  2: { mode: "simple", speed: 40, speedVar: 8, tolerance: 36, display: "open" },
  3: { mode: "oscillating", oscBase: 36, oscAmp: 16, oscPeriod: 4200, tolerance: 34, display: "open" },
  4: { mode: "oscillating", oscBase: 46, oscAmp: 24, oscPeriod: 3400, tolerance: 30, display: "open" },
  5: { mode: "ghostecho", speed: 34, speedVar: 0, tolerance: 28, display: "open" },
  6: { mode: "ghostecho", speed: 42, speedVar: 6, tolerance: 24, display: "open" },
  7: { mode: "rhythm", speed: 34, speedVar: 0, chain: 3, tolerance: 30, display: "open" },
  8: { mode: "rhythm", speed: 44, speedVar: 0, chain: 4, tolerance: 26, display: "open" },
  9: { mode: "dual", speedInner: 44, speedOuter: 30, tolerance: 32, display: "dual" },
  10: { mode: "dual", speedInner: 56, speedOuter: 36, tolerance: 28, display: "dual" },
  11: { mode: "stealth", speed: 40, speedVar: 6, eyeSpeed: 24, blind: 64, tolerance: 26, display: "open" },
  12: { mode: "reversing", speed: 62, speedVar: 10, tolerance: 26, display: "open", onlineUnstable: true },
  13: { mode: "multigap", speed: 52, speedVar: 8, gaps: 3, tolerance: 24, display: "open", onlineUnstable: true },
  14: { mode: "multigap", speed: 60, speedVar: 10, gaps: 4, tolerance: 20, display: "open", onlineUnstable: true },
  15: { mode: "darkzone", speed: 50, speedVar: 8, tolerance: 22, display: "dark", darkZone: { start: 312, end: 48 }, onlineUnstable: true },
  16: { mode: "simple", speed: 46, speedVar: 0, tolerance: 16, display: "dark", darkZone: { start: 300, end: 60 }, onlineUnstable: true }
};

export function movementForLevel(level) {
  const lvl = Number(level) || 1;
  return MOVEMENTS.find((m) => m.levels.includes(lvl)) || MOVEMENTS[0];
}

// Full, deterministic config for a level: its tuning + derived flags.
export function levelConfig(level) {
  const lvl = Math.max(1, Math.min(BOSS_LEVEL, Number(level) || 1));
  const base = LEVEL_TABLE[lvl] || LEVEL_TABLE[1];
  const movement = movementForLevel(lvl);
  return { ...base, level: lvl, movement: movement.id, movementName: movement.name, isBoss: lvl === BOSS_LEVEL };
}
