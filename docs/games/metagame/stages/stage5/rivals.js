// rivals.js — Stage 5 Signal Racer: deterministic seeded AI rivals. Each rival is a PRECOMPUTED ghost:
// at mount we build its full lane[tick] + distance[tick] schedule from makeRng(`${seed}:rival:${id}`),
// so ALL randomness is consumed at build time (zero live RNG during the race, exactly like the obstacle
// table). The race loop only READS these arrays — it never advances a rival with the PRNG.
//
// Skill scalars degrade the shared optimalLane() solver:
//   optimalLaneProb : chance the rival picks the optimal lane (else it dithers).
//   reactionLag     : extra ticks between lane decisions (a laggy driver re-reads the road less often).
//   topSpeed        : base distance/tick (sub-1 = slower than the player's base 1.0).
//   aggression      : how much it exploits boost gates (and, live, how readily it bumps/blocks).

import { makeRng } from './rng.js';
import { optimalLane, isBlock, isGate } from './track.js';

const RIVAL_GLYPHS = ['o', 'x', '%', '#'];

export function rivalGlyph(i) {
  return RIVAL_GLYPHS[i % RIVAL_GLYPHS.length];
}

function clampLane(l) {
  return Math.max(0, Math.min(2, Number(l) || 0));
}

function rollSkill(rng) {
  return {
    optimalLaneProb: 0.55 + rng.float() * 0.4, // 0.55–0.95
    reactionLag: rng.int(0, 2),
    topSpeed: 0.9 + rng.float() * 0.28,         // 0.90–1.18
    aggression: rng.float(),
  };
}

// Build one ghost: walk the (looping) table, choosing a lane each decision window and accumulating
// distance until raceLength. Slows on a block, speeds up through a boost gate (scaled by aggression).
function buildGhost({ rng, skill, table, raceLength, tickCap, speedMult = 1 }) {
  const len = Math.max(1, table.length);
  const lane = [];
  const distance = [];
  let cur = 1;
  let dist = 0;
  let finishTick = Infinity;

  for (let t = 0; t < tickCap; t += 1) {
    const row = table[((t % len) + len) % len];
    if (t % (skill.reactionLag + 1) === 0) {
      if (rng.float() < skill.optimalLaneProb) {
        cur = optimalLane(row, cur);
      } else if (rng.chance(0.5)) {
        cur = clampLane(cur + (rng.chance(0.5) ? 1 : -1)); // dither into a neighbouring lane
      }
    }
    cur = clampLane(cur);
    lane.push(cur);

    let speed = skill.topSpeed * speedMult; // ascension "faster field" scales the whole rival field
    const glyph = row ? row.lanes[cur] : null;
    if (isBlock(glyph)) speed *= 0.5;                       // ate noise — drops off the pace
    if (isGate(glyph)) speed *= 1 + 0.2 * skill.aggression; // hunts the boost line
    dist = Math.min(raceLength, dist + speed);
    distance.push(dist);
    if (dist >= raceLength && finishTick === Infinity) finishTick = t;
  }

  return { lane, distance, finishTick, skill };
}

export function buildRivals({ seed, round, table, raceLength, speedMult = 1 }) {
  const count = Math.max(0, Number(round.rivals) || 0);
  // Worst-case rival speed is topSpeed(min 0.9) × block-slow(0.5) = 0.45/tick; pad generously so a
  // rival that eats a lot of noise is still guaranteed to cross the line before the precompute ends.
  const tickCap = Math.ceil(raceLength / 0.4) + 64;
  const rivals = [];
  for (let i = 0; i < count; i += 1) {
    const rng = makeRng(`${seed}:rival:${round.id}:${i}`);
    const ghost = buildGhost({ rng, skill: rollSkill(rng), table, raceLength, tickCap, speedMult });
    const last = tickCap - 1;
    rivals.push({
      id: i,
      glyph: rivalGlyph(i),
      finishTick: ghost.finishTick,
      skill: ghost.skill,
      laneAt: (t) => ghost.lane[Math.min(Math.max(0, t), last)],
      distAt: (t) => ghost.distance[Math.min(Math.max(0, t), last)],
    });
  }
  return rivals;
}

// Finishing position (1 = first) given the tick the player crossed the line.
export function finishPosition(rivals, playerFinishTick) {
  const ahead = rivals.filter((r) => r.finishTick < playerFinishTick).length;
  return ahead + 1;
}

// Packet multiplier for a finishing position: 1st pays full, each place back pays less (floor 0.6).
export function positionMultiplier(position, fieldSize) {
  const size = Math.max(1, fieldSize);
  if (size <= 1) return 1;
  const frac = (size - position) / (size - 1); // 1 for first, 0 for last
  return Number((0.6 + 0.4 * Math.max(0, Math.min(1, frac))).toFixed(3));
}
