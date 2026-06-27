// movements.js — Stage 9 Observer State: the level table (the "score" of the timing game).
//
// Ten levels grouped into MOVEMENTS, each introducing a new verb (mode) and tightening tolerance /
// stepping up speed. The first six are LEARNABLE ONLINE (an inviting on-ramp). The back third
// (levels 7–9) and the boss (10) are `onlineUnstable`: each OBSERVE reseeds the gap while the
// connection is live, so they are only beatable after activating Offline Mode (which fixes the
// cached seed for ALL of them at once). Room to grow — add levels by extending LEVELS.

export const BOSS_LEVEL = 10;
export const LEVELS = 10;

// Movement metadata for the HUD. Each names the verb it teaches.
export const MOVEMENTS = [
  { id: 1, name: "Signal", verb: "watch & time", levels: [1, 2] },
  { id: 2, name: "Drift", verb: "read a changing speed", levels: [3, 4] },
  { id: 3, name: "Interference", verb: "hold two rhythms", levels: [5, 6] },
  { id: 4, name: "Reversal", verb: "track the flips (offline)", levels: [7] },
  { id: 5, name: "Decoys", verb: "pick the real gap (offline)", levels: [8] },
  { id: 6, name: "Collapse", verb: "infer the occluded gap (offline)", levels: [9] },
  { id: 7, name: "Observer", verb: "the full effect (offline)", levels: [10] }
];

// Per-level config. tolerance tightens and speed steps up across the run; onlineUnstable marks the
// back third + boss. darkZone/display are cosmetic overlays layered on the mode's motion.
const LEVEL_TABLE = {
  1: { mode: "simple", speed: 30, speedVar: 0, tolerance: 42, display: "open" },
  2: { mode: "simple", speed: 40, speedVar: 8, tolerance: 36, display: "open" },
  3: { mode: "oscillating", oscBase: 36, oscAmp: 16, oscPeriod: 4200, tolerance: 34, display: "open" },
  4: { mode: "oscillating", oscBase: 46, oscAmp: 24, oscPeriod: 3400, tolerance: 30, display: "open" },
  5: { mode: "dual", speedInner: 44, speedOuter: 30, tolerance: 32, display: "dual" },
  6: { mode: "dual", speedInner: 56, speedOuter: 36, tolerance: 28, display: "dual" },
  7: { mode: "reversing", speed: 62, speedVar: 10, tolerance: 26, display: "open", onlineUnstable: true },
  8: { mode: "multigap", speed: 52, speedVar: 8, gaps: 3, tolerance: 24, display: "open", onlineUnstable: true },
  9: { mode: "multigap", speed: 60, speedVar: 10, gaps: 4, tolerance: 20, display: "dark", darkZone: { start: 300, end: 60 }, onlineUnstable: true },
  10: { mode: "simple", speed: 46, speedVar: 0, tolerance: 16, display: "dark", darkZone: { start: 300, end: 60 }, onlineUnstable: true }
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
