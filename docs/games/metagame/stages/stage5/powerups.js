// powerups.js — Stage 5 Signal Racer: deterministic pickups sprinkled into clear, beat-open lanes (the
// same placement discipline as the >> boost gates). Placement consumes a SEPARATE seeded rng stream
// (`${seed}:pu:${roundId}`) AFTER the obstacle table is built, so it never disturbs the obstacle rng —
// rounds without powerups are byte-identical to before. Two kinds:
//   • buff   : grants a timed effect whose expiry tick is precomputed from the engine's getTickMs, so
//              a 2.2 s overclock lasts the same wall-time on a 130 ms or a 180 ms round.
//   • instant: fires once on pickup (repair integrity, cache packets, EMP a rival).

export const POWERUPS = {
  shield:    { glyph: 'U', label: 'shield',       kind: 'buff',    durationMs: 2600 },
  overclock: { glyph: 'O', label: 'overclock',    kind: 'buff',    durationMs: 2200 },
  emp:       { glyph: 'E', label: 'EMP',          kind: 'instant', drag: 9, finishTicks: 12 },
  repair:    { glyph: '+', label: 'repair',       kind: 'instant', amount: 12 },
  cache:     { glyph: '$', label: 'packet-cache', kind: 'instant', amount: 15 },
};

const GLYPH_TO_TYPE = Object.fromEntries(Object.entries(POWERUPS).map(([t, d]) => [d.glyph, t]));
export const POWERUP_GLYPHS = Object.values(POWERUPS).map((p) => p.glyph);
const DEFAULT_POOL = ['shield', 'overclock', 'repair', 'cache', 'emp'];

export function isPowerup(glyph) {
  return Boolean(GLYPH_TO_TYPE[glyph]);
}

export function powerupType(glyph) {
  return GLYPH_TO_TYPE[glyph] || null;
}

function poolFor(round) {
  const pool = round && Array.isArray(round.powerupPool) ? round.powerupPool.filter((t) => POWERUPS[t]) : null;
  return pool && pool.length ? pool : DEFAULT_POOL;
}

// Mutate the obstacle table in place: drop a powerup glyph into an empty lane on periodic beat-open
// ticks. Never touches a lane already holding a block or a gate (we only fill `null` lanes), so the
// "always an escape" invariant is preserved.
export function placePowerups(table, rng, round = {}) {
  const pool = poolFor(round);
  const spacing = Math.max(4, Number(round.powerupSpacing) || 14);
  const chance = Number.isFinite(Number(round.powerupChance)) ? Number(round.powerupChance) : 0.7;
  for (let t = 0; t < table.length; t += 1) {
    if (t % spacing !== 0) continue;
    const row = table[t];
    if (!row || row.beatOpen === false || row.fork) continue; // fork spans own their own sub-channel rows
    const open = [0, 1, 2].filter((l) => row.lanes[l] === null);
    if (!open.length || !rng.chance(chance)) continue;
    const lane = rng.pick(open);
    row.lanes[lane] = POWERUPS[rng.pick(pool)].glyph;
  }
  return table;
}

// Buff duration in ticks, derived from the live engine cadence so wall-time is cadence-independent.
// bonusMs (e.g. the vehicle shop's Cooling rank) extends the effect's wall-time before conversion.
export function durationTicks(type, getTickMs, bonusMs = 0) {
  const def = POWERUPS[type];
  if (!def || !def.durationMs) return 0;
  const ms = Math.max(1, Number(getTickMs && getTickMs()) || 130);
  return Math.max(1, Math.ceil((def.durationMs + Math.max(0, Number(bonusMs) || 0)) / ms));
}
