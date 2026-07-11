// rival-pacing.test.mjs — Stage 5: rivals are always slower than the player's base pace, by a real,
// checked-in margin (playtest fix, 2026-07-11 — "visuals/pacing not usable... enemies winnable by a
// fair margin"). rivals.js's own header comment always documented "topSpeed sub-1 = slower than the
// player's base 1.0" as the intent, but the actual roll range (0.90-1.18) could exceed it by up to
// 18% — a fresh, zero-Engine-upgrade player had no guaranteed pace advantage over the field at all.
import assert from 'node:assert/strict';
import { buildRivals } from '../rivals.js';
import { roundByIdx, ROUNDS } from '../rounds.js';
import { buildObstacleTable } from '../track.js';
import { createRaceState } from '../race-state.js';

const PLAYER_BASE_TOP_SPEED = 1; // shop.js BASE_TUNING.topSpeed — unupgraded player pace

// Sample every body round across many seeds and confirm every rolled rival topSpeed stays below the
// player's BASE (unupgraded) pace, with a real margin — not just "usually", every time.
let worst = 0;
for (let seedNum = 0; seedNum < 100; seedNum += 1) {
  const seed = `pace-check-${seedNum}`;
  for (let roundIdx = 0; roundIdx < ROUNDS.length; roundIdx += 1) {
    const round = roundByIdx(roundIdx);
    const table = buildObstacleTable(seed, round, 0);
    const race = createRaceState(round);
    const rivals = buildRivals({ seed, round, table, raceLength: race.raceLength, speedMult: 1 });
    for (const r of rivals) {
      assert.ok(r.skill.topSpeed < PLAYER_BASE_TOP_SPEED, `rival topSpeed ${r.skill.topSpeed} must stay below the player's base ${PLAYER_BASE_TOP_SPEED} (seed ${seed}, round ${roundIdx})`);
      worst = Math.max(worst, r.skill.topSpeed);
    }
  }
}
assert.ok(worst > 0, 'sanity: at least one rival was actually sampled');
// A real, non-trivial margin — not just "technically below 1.0 by a rounding error".
const marginPct = Math.round((1 - worst / PLAYER_BASE_TOP_SPEED) * 100);
assert.ok(marginPct >= 3, `worst-case rival roll (${worst.toFixed(3)}) should leave a real margin below the player's base pace, got only ${marginPct}%`);

console.log(`stage5 rival-pacing tests passed (worst-case rival topSpeed ${worst.toFixed(3)}, ${marginPct}% margin below player base)`);
