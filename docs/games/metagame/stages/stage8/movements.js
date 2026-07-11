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
// Difficulty retuned 2026-07-11 (playtest: "way too easy" — generous tolerances + free, unlimited
// retries with no real cost meant a miss barely registered). Speeds raised ~20% and tolerances cut
// ~25-30% across the board (escalation SHAPE unchanged — each archetype's first level is still gentler
// than its second, structure/mode/gaps/chain counts untouched); the boss (16) nudged only slightly
// since it was already the tightest window in the game. Missing now costs more than a flat -1 clarity
// (see MISS_CLARITY_COST in renderer.js) so a retry isn't fully free either.
const LEVEL_TABLE = {
  // Signal (simple) — gentlest intro, then L2 escalates SPEED only.
  1: { mode: "simple", speed: 36, speedVar: 0, tolerance: 30, display: "open" },
  2: { mode: "simple", speed: 50, speedVar: 0, tolerance: 30, display: "open" },
  // Drift (oscillating) — gentle intro (slow base, small swing, wide window), then L4 escalates oscAmp only.
  3: { mode: "oscillating", oscBase: 38, oscAmp: 14, oscPeriod: 4600, tolerance: 28, display: "open" },
  4: { mode: "oscillating", oscBase: 38, oscAmp: 26, oscPeriod: 4600, tolerance: 28, display: "open" },
  // Echo (ghostecho) — gentle intro, then L6 tightens TOLERANCE only (the ghosts help you close it).
  5: { mode: "ghostecho", speed: 38, speedVar: 0, tolerance: 26, display: "open" },
  6: { mode: "ghostecho", speed: 38, speedVar: 0, tolerance: 19, display: "open" },
  // Cadence (rhythm) — gentle intro (chain 3), then L8 lengthens CHAIN only.
  7: { mode: "rhythm", speed: 36, speedVar: 0, chain: 3, tolerance: 25, display: "open" },
  8: { mode: "rhythm", speed: 36, speedVar: 0, chain: 4, tolerance: 25, display: "open" },
  // Interference (dual) — gentle intro, then L10 speeds the INNER ring only.
  9: { mode: "dual", speedInner: 46, speedOuter: 32, tolerance: 25, display: "dual" },
  10: { mode: "dual", speedInner: 60, speedOuter: 32, tolerance: 25, display: "dual" },
  // Surveillance (stealth) — single gentle level (last learnable-online).
  11: { mode: "stealth", speed: 40, speedVar: 0, eyeSpeed: 26, blind: 60, tolerance: 24, display: "open" },
  // Back third (onlineUnstable): each is a single gentle archetype intro; the difficulty here is the
  // un-cheat, not the tuning. Reversal.
  12: { mode: "reversing", speed: 54, speedVar: 0, tolerance: 22, display: "open", onlineUnstable: true },
  // Decoys (multigap) — gentle intro (3 gaps), then L14 adds one GAP only.
  13: { mode: "multigap", speed: 50, speedVar: 0, gaps: 3, tolerance: 22, display: "open", onlineUnstable: true },
  14: { mode: "multigap", speed: 50, speedVar: 0, gaps: 4, tolerance: 22, display: "open", onlineUnstable: true },
  // Blackout (darkzone) — single gentle level.
  15: { mode: "darkzone", speed: 48, speedVar: 0, tolerance: 20, display: "dark", darkZone: { start: 312, end: 48 }, onlineUnstable: true },
  // Observer (boss) — the final movement, tightest window (already tight; nudged, not overhauled).
  16: { mode: "simple", speed: 48, speedVar: 0, tolerance: 14, display: "dark", darkZone: { start: 300, end: 60 }, onlineUnstable: true }
};

export function movementForLevel(level) {
  const lvl = Number(level) || 1;
  return MOVEMENTS.find((m) => m.levels.includes(lvl)) || MOVEMENTS[0];
}

// One-line, per-archetype briefing of the actual win condition (pure). Shown in the hint field so a
// new verb (e.g. the Cadence chain at level 7 or the Surveillance eye at level 11) is announced before
// the player guesses wrong — addresses the unmarked difficulty spikes. Chain/gap counts are inlined.
//
// 2026-07-11 (ship steering): reworded away from "the top (12 o'clock)" — the crossing point is now
// wherever the player has steered their ship (arrow keys), not a fixed position.
const MODE_HINTS = {
  simple: "watch the gap; steer your ship under it and CROSS when it lines up.",
  oscillating: "the rotation speed breathes in and out — steer to meet the gap and CROSS as it arrives.",
  ghostecho: "faint ghosts mark your last two presses — read how early/late you were and correct.",
  dual: "two rings now — steer to where BOTH gaps will align, and CROSS at that instant.",
  stealth: "an eye sweeps the ring — CROSS only where the gap is AND the eye is looking away.",
  reversing: "the ring keeps flipping direction — track the flips and CROSS where it lines up with your ship.",
  darkzone: "a blackout always hides your own crossing point — extrapolate from the speed, not sight."
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
