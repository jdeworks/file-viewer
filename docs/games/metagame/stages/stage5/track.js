// track.js — Stage 5 Signal Racer: pure obstacle-table generator. Builds the entire round up front
// from (seed, roundDef) so the render loop never calls the PRNG. Each row is one logical tick:
//   { lanes: [glyph|null, glyph|null, glyph|null], beatOpen, counterPhaseLane }
// Invariants: never all 3 lanes blocked (always an escape); a '>>' boost gate is only ever placed in
// an otherwise-clear lane (so it never co-occurs with a '▓' block on the same tick/lane).

import { makeRng } from './rng.js';

const LANES = 3;

// Per-round obstacle density (chance a given lane is blocked on a given tick). Escalates by round id.
const DENSITY = { 1: 0.40, 2: 0.42, 3: 0.45, 4: 0.45, 5: 0.45, 6: 0.48, 7: 0.50 };

export function buildObstacleTable(seed, roundDef) {
  const rng = makeRng(`${seed}:${roundDef.id}`);
  const count = Number(roundDef.tickCount) || 100;
  const obstacleGlyphs = (roundDef.glyphs || ['░']).filter((g) => g !== '>>');
  const density = DENSITY[roundDef.id] ?? 0.45;
  const burst = Array.isArray(roundDef.burstPattern) ? roundDef.burstPattern : null;
  const shift = Number(roundDef.counterPhaseShift) || 0;

  const table = [];
  for (let tick = 0; tick < count; tick += 1) {
    const beatOpen = burst ? burst[tick % burst.length] === 0 : true;
    const counterPhaseLane = shift > 0 ? Math.floor(tick / shift) % LANES : null;

    const lanes = [null, null, null];
    let blocked = 0;
    for (let lane = 0; lane < LANES; lane += 1) {
      if (rng.chance(density)) {
        lanes[lane] = rng.pick(obstacleGlyphs);
        blocked += 1;
      }
    }
    // Guarantee an escape: if every lane is blocked, clear one at random.
    if (blocked >= LANES) lanes[rng.int(0, LANES - 1)] = null;

    // Boost gate: only on a clear, beat-open tick, in a currently-empty lane.
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
