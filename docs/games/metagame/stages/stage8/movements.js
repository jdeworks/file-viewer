// movements.js — Stage 8 Observer State: the level table (the "score" of the timing game).
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

// Per-level config. ONE-NEW-THING-PER-LEVEL (UX audit M2): each level changes exactly ONE tuning
// dimension vs its predecessor, and every archetype's FIRST level runs at its gentlest parameters —
// the mode change IS the new thing at an archetype boundary, so the intro level resets to generous
// tolerance / low speed and the archetype's second level then escalates a single dimension. Incidental
// per-level speedVar was removed so speed is the sole varied dimension where it varies. onlineUnstable
// marks the back third + boss. darkZone/display are overlays layered on the mode's motion (Blackout
// makes it a load-bearing win condition: the blackout covers the top, so the gap must be extrapolated).
const LEVEL_TABLE = {
  // Signal (simple) — gentlest intro, then L2 escalates SPEED only.
  1: { mode: "simple", speed: 30, speedVar: 0, tolerance: 42, display: "open" },
  2: { mode: "simple", speed: 42, speedVar: 0, tolerance: 42, display: "open" },
  // Drift (oscillating) — gentle intro (slow base, small swing, wide window), then L4 escalates oscAmp only.
  3: { mode: "oscillating", oscBase: 32, oscAmp: 12, oscPeriod: 4600, tolerance: 40, display: "open" },
  4: { mode: "oscillating", oscBase: 32, oscAmp: 22, oscPeriod: 4600, tolerance: 40, display: "open" },
  // Echo (ghostecho) — gentle intro, then L6 tightens TOLERANCE only (the ghosts help you close it).
  5: { mode: "ghostecho", speed: 32, speedVar: 0, tolerance: 38, display: "open" },
  6: { mode: "ghostecho", speed: 32, speedVar: 0, tolerance: 28, display: "open" },
  // Cadence (rhythm) — gentle intro (chain 3), then L8 lengthens CHAIN only.
  7: { mode: "rhythm", speed: 30, speedVar: 0, chain: 3, tolerance: 36, display: "open" },
  8: { mode: "rhythm", speed: 30, speedVar: 0, chain: 4, tolerance: 36, display: "open" },
  // Interference (dual) — gentle intro, then L10 speeds the INNER ring only.
  9: { mode: "dual", speedInner: 40, speedOuter: 28, tolerance: 36, display: "dual" },
  10: { mode: "dual", speedInner: 52, speedOuter: 28, tolerance: 36, display: "dual" },
  // Surveillance (stealth) — single gentle level (last learnable-online).
  11: { mode: "stealth", speed: 34, speedVar: 0, eyeSpeed: 22, blind: 60, tolerance: 34, display: "open" },
  // Back third (onlineUnstable): each is a single gentle archetype intro; the difficulty here is the
  // un-cheat, not the tuning. Reversal.
  12: { mode: "reversing", speed: 48, speedVar: 0, tolerance: 32, display: "open", onlineUnstable: true },
  // Decoys (multigap) — gentle intro (3 gaps), then L14 adds one GAP only.
  13: { mode: "multigap", speed: 44, speedVar: 0, gaps: 3, tolerance: 30, display: "open", onlineUnstable: true },
  14: { mode: "multigap", speed: 44, speedVar: 0, gaps: 4, tolerance: 30, display: "open", onlineUnstable: true },
  // Blackout (darkzone) — single gentle level.
  15: { mode: "darkzone", speed: 42, speedVar: 0, tolerance: 28, display: "dark", darkZone: { start: 312, end: 48 }, onlineUnstable: true },
  // Observer (boss) — the final movement, tightest window.
  16: { mode: "simple", speed: 46, speedVar: 0, tolerance: 16, display: "dark", darkZone: { start: 300, end: 60 }, onlineUnstable: true }
};

export function movementForLevel(level) {
  const lvl = Number(level) || 1;
  return MOVEMENTS.find((m) => m.levels.includes(lvl)) || MOVEMENTS[0];
}

// One-line, per-archetype briefing of the actual win condition (pure). Shown in the hint field so a
// new verb (e.g. the Cadence chain at level 7 or the Surveillance eye at level 11) is announced before
// the player guesses wrong — addresses the unmarked difficulty spikes. Chain/gap counts are inlined.
const MODE_HINTS = {
  simple: "watch the gap; CROSS when it faces the top (12 o'clock).",
  oscillating: "the rotation speed breathes in and out — CROSS as the gap reaches the top.",
  ghostecho: "faint ghosts mark your last two presses — read how early/late you were and correct.",
  dual: "two rings now — CROSS only when BOTH gaps face the top at the same instant.",
  stealth: "an eye sweeps the ring — CROSS only when the gap is up AND the eye is looking away.",
  reversing: "the ring keeps flipping direction — track the flips and CROSS at the top.",
  darkzone: "a blackout hides the top — extrapolate from the speed when the gap arrives there."
};
export function modeHint(cfg) {
  if (!cfg) return MODE_HINTS.simple;
  if (cfg.mode === "rhythm") return `hold the beat — land ${Math.max(2, cfg.chain || 3)} crosses in a row; one miss resets the chain.`;
  if (cfg.mode === "multigap") return `${Math.max(2, cfg.gaps || 3)} gaps look identical — only one is real. find it run by run.`;
  return MODE_HINTS[cfg.mode] || MODE_HINTS.simple;
}

// Full, deterministic config for a level: its tuning + derived flags.
export function levelConfig(level) {
  const lvl = Math.max(1, Math.min(BOSS_LEVEL, Number(level) || 1));
  const base = LEVEL_TABLE[lvl] || LEVEL_TABLE[1];
  const movement = movementForLevel(lvl);
  return { ...base, level: lvl, movement: movement.id, movementName: movement.name, isBoss: lvl === BOSS_LEVEL };
}
