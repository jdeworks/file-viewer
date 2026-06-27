// rounds.js — Stage 5 Signal Racer: the single source of truth for per-round config. Each round adds
// one new verb (avoid → time it → read ahead → counter-phase → boost gates → split channel → beat your
// own ghost → commit at the fork → boss).
// burstPattern: per-tick-in-cycle flags where 1 = burst (lane-switch is off-beat) and 0 = beat-open.
// glyphs: which obstacle glyphs that round draws. counterPhaseShift: ticks between shield-lane shifts.
//
// RACE ARCHETYPE FIELDS (read by race-state.js / rivals.js — do NOT rename this module's export, the
// general-lane scripts/metagame-playtime.mjs imports ROUNDS):
//   archetype : 'sprint' (point-to-point) | 'circuit' (N laps of one looping track) | 'gauntlet'
//               (long survival track) | 'time-trial' (race the par + your prior-best ghost) |
//               'fork' (commit HI/LO at a split, merge after a span) | 'boss'.
//   tickCount : obstacle-table length. For a circuit this is ONE LAP; for sprint/gauntlet it is the
//               whole track. raceLength = circuit ? tickCount × laps : (trackLength || tickCount).
//   laps      : circuit lap count (ignored otherwise).
//   trackLength : explicit race distance for sprint/gauntlet (defaults to tickCount).
//   rivals    : how many seeded AI ghosts share the corridor.
//   hasPowerups : whether deterministic powerup pickups are sprinkled into clear lanes.
//   parPace   : time-trial only — the constant pace of the par ghost (the beat-the-clock gate).

export const GLYPH_DAMAGE = { '░': 2, '▒': 2, '▓': 5 };

export const ROUNDS = [
  // ── Act I — SPRINTS (point-to-point single tracks; learn to move, then to time it) ───────────────
  { id: 1, label: 'AVOID',              tickMs: 170, beatWindowTicks: null,
    glyphs: ['░'],              burstPattern: null,
    counterPhaseShift: null, hasFork: false, hasGates: false,
    archetype: 'sprint',   tickCount: 900,  trackLength: 900,
    rivals: 2, hasPowerups: true, powerupPool: ['repair', 'cache'] },
  { id: 2, label: 'TIME IT',            tickMs: 160, beatWindowTicks: 2,
    glyphs: ['▒'],              burstPattern: [1, 1, 1, 0, 0],
    counterPhaseShift: null, hasFork: false, hasGates: false,
    archetype: 'sprint',   tickCount: 1000, trackLength: 1000,
    rivals: 2, hasPowerups: true, powerupPool: ['repair', 'cache', 'overclock'] },
  // ── Act II — CIRCUITS (one looping lap raced N times; read the pattern, hold the shield lane) ────
  { id: 3, label: 'READ AHEAD',         tickMs: 150, beatWindowTicks: 1,
    glyphs: ['░', '▓'],         burstPattern: [1, 0, 1, 1],
    counterPhaseShift: null, hasFork: false, hasGates: false,
    archetype: 'circuit',  tickCount: 220,  laps: 5,
    rivals: 3, hasPowerups: true, powerupPool: ['repair', 'shield', 'overclock'] },
  { id: 4, label: 'COUNTER-PHASE LANE', tickMs: 150, beatWindowTicks: 1,
    glyphs: ['░', '▒'],         burstPattern: [1, 1, 0, 0],
    counterPhaseShift: 8,    hasFork: false, hasGates: false,
    archetype: 'circuit',  tickCount: 240,  laps: 5,
    rivals: 3, hasPowerups: true, powerupPool: ['repair', 'shield', 'emp'] },
  // ── Act III — GAUNTLETS (long survival tracks; harvest gates, commit at the fork) ───────────────
  { id: 5, label: 'BOOST GATES',        tickMs: 140, beatWindowTicks: 1,
    glyphs: ['░', '>>'],        burstPattern: [1, 0, 1, 0],
    counterPhaseShift: 8,    hasFork: false, hasGates: true,
    archetype: 'gauntlet', tickCount: 1300, trackLength: 1300,
    rivals: 3, hasPowerups: true, powerupPool: ['shield', 'overclock', 'cache', 'emp'] },
  { id: 6, label: 'SPLIT CHANNEL',      tickMs: 135, beatWindowTicks: 1,
    glyphs: ['░', '▓', '>>'],   burstPattern: [1, 0, 1, 0],
    counterPhaseShift: 8,    hasFork: true,  hasGates: true,
    archetype: 'gauntlet', tickCount: 1500, trackLength: 1500,
    rivals: 3, hasPowerups: true, powerupPool: ['shield', 'overclock', 'repair', 'cache', 'emp'] },
  // ── Act IV — TIME TRIAL (race the par clock + a translucent ghost of your own prior-best run) ─────
  { id: 7, label: 'TIME TRIAL',         tickMs: 140, beatWindowTicks: 1,
    glyphs: ['░', '▒'],         burstPattern: [1, 0, 1, 0],
    counterPhaseShift: null, hasFork: false, hasGates: true,
    archetype: 'time-trial', tickCount: 900,  trackLength: 900,
    parPace: 0.9, rivals: 2, hasPowerups: true,
    powerupPool: ['overclock', 'overclock', 'repair', 'cache'] },
  // ── BOSS — Jammer Pursuit (all verbs at once; NO powerups — the calibration un-cheat is the gate) ─
  { id: 8, label: 'BOSS',               tickMs: 120, beatWindowTicks: 1,
    glyphs: ['░', '▒', '▓', '>>'], burstPattern: [1, 1, 0, 1, 0],
    counterPhaseShift: 4,    hasFork: true,  hasGates: true,
    archetype: 'boss',     tickCount: 1100, trackLength: 1100,
    rivals: 2, hasPowerups: false },
];

export const FINAL_ROUND_ID = 8;
export const ROUND_COUNT = ROUNDS.length;

export function roundByIdx(idx) {
  return ROUNDS[Math.max(0, Math.min(ROUNDS.length - 1, Number(idx) || 0))];
}

export function isBossRound(roundIdx) {
  return roundByIdx(roundIdx).id === FINAL_ROUND_ID;
}
