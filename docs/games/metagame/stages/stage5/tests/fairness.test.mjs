// fairness.test.mjs — Stage 5: the generator FAIRNESS invariant. Every round the generator can produce
// must be passable under the REAL movement limit (±1 lane per tick): a fully-dodgeable, never-blocked
// lane line must exist end-to-end (the wandering "safe lane" of track.js / fork.js), and from the
// player's fixed start lane the unavoidable hazard damage before merging onto it must be trivial.
//
// This reuses the DP reachability model from winnable-human.test.mjs (min hazard damage over a ±1/tick
// path) but as a PURE table analysis, so it can sweep the whole coverage matrix cheaply: the default
// seed × ascension levels 0–4 × every round, plus a 50-seed property sample. It builds the table
// exactly as the game loop does (obstacles + forks + powerups) and reads the LO (safe) fork channel —
// the channel the loop defaults to — so the analysis mirrors what step() actually traverses.
import assert from 'node:assert/strict';
import { buildObstacleTable, isBlock } from '../track.js';
import { applyForks, resolveRow } from '../fork.js';
import { placePowerups } from '../powerups.js';
import { createRaceState } from '../race-state.js';
import { makeRng } from '../rng.js';
import { ROUNDS, GLYPH_DAMAGE } from '../rounds.js';
import { BASE_TUNING } from '../shop.js';
import { ASCENSION_MODS, BASE_ASCENSION_CONFIG } from '../ascension-mods.js';

const START_LANE = 1;                                 // the player's default start lane (state.js run.lane)
const SURVIVABLE = BASE_TUNING.maxIntegrity * 0.5;    // forced hazard damage must stay well under half the stock hull
const wraps = (round) => round.archetype === 'circuit' || round.hasFork; // loops a lap / re-merges a fork span

const blockDmg = (g) => (isBlock(g) ? (GLYPH_DAMAGE[g] || 2) : 0);

// densityBonus the generator sees at a given ascension level (only the density rung changes the table).
function densityBonusFor(level) {
  const c = { ...BASE_ASCENSION_CONFIG };
  for (const mod of ASCENSION_MODS) if (mod.level <= level) mod.apply(c);
  return c.densityBonus;
}

// The rows step() actually traverses for a round: obstacle table (+ forks + powerups), resolved to the
// LO safe channel, over the race distance (raceLength). A circuit's table is ONE lap and rowIndex wraps
// it, so this correctly includes the lap seams the player really crosses; the +16 tick guard in the
// loop is never reached (the race finishes at raceLength) so it's excluded.
function buildRows(seed, round, densityBonus) {
  const table = buildObstacleTable(seed, round, densityBonus);
  if (round.hasFork) applyForks(table, makeRng(`${seed}:fork:${round.id}`), round);
  if (round.hasPowerups) placePowerups(table, makeRng(`${seed}:pu:${round.id}`), round);
  const race = createRaceState(round);
  const rows = [];
  for (let t = 0; t < race.raceLength; t += 1) rows.push(resolveRow(table[race.rowIndex(t, table.length)], 'lo'));
  return rows;
}

// Minimum total hazard (block) damage over a ±1-lane-per-tick path. startLane === null → free start
// (proves a fully-clean line EXISTS anywhere); a fixed startLane → the cost from where the player is.
function minBlockDamage(rows, startLane) {
  const INF = 1e9;
  const at = (i, l) => (rows[i] ? blockDmg(rows[i].lanes[l]) : 0);
  let dp = [0, 1, 2].map((l) => (startLane == null || l === startLane ? at(0, l) : INF));
  for (let i = 1; i < rows.length; i += 1) {
    const nd = [INF, INF, INF];
    for (let l = 0; l < 3; l += 1) {
      if (dp[l] >= INF) continue;
      for (let nl = Math.max(0, l - 1); nl <= Math.min(2, l + 1); nl += 1) {
        const c = dp[l] + at(i, nl);
        if (c < nd[nl]) nd[nl] = c;
      }
    }
    dp = nd;
  }
  return Math.min(...dp);
}

function assertFair(rows, round, label) {
  // Escape invariant: never all three lanes blocked on any traversed row.
  for (let i = 0; i < rows.length; i += 1) {
    if (!rows[i]) continue;
    assert.ok(rows[i].lanes.filter(isBlock).length < 3, `${label}: a row blocked all 3 lanes`);
  }
  // Point-to-point rounds (no lap/fork seam) carry a fully-clean ±1 line end-to-end: the reachable
  // safe lane of track.js means a perfect run takes ZERO hazard damage.
  if (!wraps(round)) {
    assert.equal(minBlockDamage(rows, null), 0, `${label}: no zero-hazard ±1 line exists (unfair round)`);
  }
  // Every round (including circuit lap seams + fork re-merges) is passable: the best ±1 line from the
  // player's start lane takes only trivial forced hazard damage — never anywhere near the hull. (Rival
  // bumps are a separate, upgrade-softened source proven survivable by winnable-human/zero-damage.)
  const forced = minBlockDamage(rows, START_LANE);
  assert.ok(forced < SURVIVABLE, `${label}: forced ${forced} hazard damage is not comfortably survivable (>= ${SURVIVABLE})`);
}

// ── default seed × ascension 0–4 × every round ────────────────────────────────────────────────────
for (let level = 0; level <= 4; level += 1) {
  const bonus = densityBonusFor(level);
  for (const round of ROUNDS) {
    assertFair(buildRows('s5', round, bonus), round, `default seed · A${level} · round ${round.id}`);
  }
}

// ── 50-seed property sample × every round (ascension 0) ───────────────────────────────────────────
for (let s = 0; s < 50; s += 1) {
  const seed = `fair-prop-${s}`;
  for (const round of ROUNDS) {
    assertFair(buildRows(seed, round, 0), round, `seed ${seed} · round ${round.id}`);
  }
}

console.log('stage5 fairness tests passed');
