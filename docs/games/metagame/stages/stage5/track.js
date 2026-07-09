// track.js — Stage 5 Signal Racer: pure obstacle-table generator. Builds the entire round up front
// from (seed, roundDef) so the render loop never calls the PRNG. Each row is one logical tick:
//   { lanes: [glyph|null, glyph|null, glyph|null], beatOpen, counterPhaseLane }
// Invariants: a REACHABLE safe lane always exists (see below); a '>>' boost gate is only ever placed
// in an otherwise-clear lane (so it never co-occurs with a '▓' block on the same tick/lane).
//
// WINNABILITY (the load-bearing invariant): the player can only move ONE lane per tick, so it is not
// enough for a clear lane to merely EXIST each row — it must be reachable from where the player could
// be. The old generator rolled all three lanes independently and only guaranteed "not all three
// blocked", so the single open lane could jump two lanes between consecutive rows → an unavoidable hit
// every time, and long rounds accumulated forced damage well past the hull (mathematically unwinnable
// even with perfect play). We now carry a SAFE lane that wanders at most ±1 per tick (and only on a
// beat-open tick, so the forced follow is never an off-beat switch) and is NEVER blocked. Reading that
// wandering path, timing switches to the beat, and choosing when to leave it for gates is the skill.

import { makeRng } from './rng.js';

const LANES = 3;

// Per-round obstacle density (chance a NON-safe lane is blocked on a given tick). Escalates by round id.
const DENSITY = { 1: 0.40, 2: 0.42, 3: 0.45, 4: 0.45, 5: 0.45, 6: 0.48, 7: 0.44, 8: 0.40, 9: 0.50 };

export function buildObstacleTable(seed, roundDef, densityBonus = 0) {
  const rng = makeRng(`${seed}:${roundDef.id}`);
  const count = Number(roundDef.tickCount) || 100;
  const obstacleGlyphs = (roundDef.glyphs || ['░']).filter((g) => g !== '>>');
  // densityBonus is the ascension knob (more hazards). Capped so the two non-safe lanes stay dodgeable;
  // the safe-lane invariant below keeps the round winnable regardless of density.
  const density = Math.min(0.7, (DENSITY[roundDef.id] ?? 0.45) + Math.max(0, Number(densityBonus) || 0));
  const burst = Array.isArray(roundDef.burstPattern) ? roundDef.burstPattern : null;
  const shift = Number(roundDef.counterPhaseShift) || 0;

  let safeLane = rng.int(0, LANES - 1); // the guaranteed-clear, ≤1-lane-per-tick reachable path

  const table = [];
  for (let tick = 0; tick < count; tick += 1) {
    const beatOpen = burst ? burst[tick % burst.length] === 0 : true;
    const counterPhaseLane = shift > 0 ? Math.floor(tick / shift) % LANES : null;

    // Drift the safe lane at most ±1, and only on a beat-open tick, so the dodge it demands is
    // always available on-beat (no forced off-beat penalty).
    if (beatOpen && rng.chance(0.4)) {
      safeLane = Math.max(0, Math.min(LANES - 1, safeLane + rng.pick([-1, 1])));
    }

    const lanes = [null, null, null];
    for (let lane = 0; lane < LANES; lane += 1) {
      if (lane === safeLane) continue;               // the safe lane is never blocked
      if (rng.chance(density)) lanes[lane] = rng.pick(obstacleGlyphs);
    }

    // Boost gate: only on a clear, beat-open tick, in a currently-empty lane (may be the safe lane).
    if (roundDef.hasGates && beatOpen && rng.chance(0.4)) {
      const open = [0, 1, 2].filter((lane) => lanes[lane] === null);
      if (open.length) lanes[rng.pick(open)] = '>>';
    }

    table.push({ lanes, beatOpen, counterPhaseLane });
  }
  return table;
}

// True when the given lane on the given row is a damaging block (not a gate, not empty).
export function isBlock(glyph) {
  return glyph === '░' || glyph === '▒' || glyph === '▓';
}

export function isGate(glyph) {
  return glyph === '>>';
}

// Optimal lane for a row: grab a beat-open boost gate if one is reachable, else ride the shield
// (counter-phase) lane, else hold the current clear lane, else any clear lane. Pure — shared by the
// player's autoSolve and the seeded rivals' ghost precompute (which then degrades it by skill).
export function optimalLane(row, currentLane) {
  if (!row) return currentLane;
  const clear = [0, 1, 2].filter((l) => !isBlock(row.lanes[l]));
  const gate = clear.find((l) => isGate(row.lanes[l]));
  if (row.beatOpen && gate !== undefined) return gate;
  if (clear.includes(row.counterPhaseLane)) return row.counterPhaseLane;
  if (clear.includes(currentLane)) return currentLane;
  return clear.length ? clear[0] : currentLane;
}
