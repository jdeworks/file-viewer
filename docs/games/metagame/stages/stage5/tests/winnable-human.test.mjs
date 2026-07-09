// winnable-human.test.mjs — Stage 5: every round must be winnable through the REAL player input path.
//
// The existing game-loop tests drive autoSolve(), which uses commitLane() — it teleports to any lane
// each tick and never pays the off-beat switch penalty. A human plays through handleKey → setLane,
// which is limited to ±1 lane per tick AND charges offBeatPenalty on off-beat switches. Those two paths
// did NOT have the same survivability: the old obstacle generator guaranteed a clear lane EXISTED each
// row but not that it was REACHABLE within ±1/tick, so on every round after the first a human bled to 0.
// This test closes that blind spot: it computes the optimal ±1 lane path (min damage) and follows it via
// handleKey, asserting the round actually clears with hull to spare. It fails against the pre-safe-lane
// generator (rounds 5/6/8/9 force >100 damage even with a perfect ±1 solver) and passes after.
import assert from 'node:assert/strict';
import { createGameLoop } from '../game-loop.js';
import { defaultState } from '../state.js';
import { ROUNDS, GLYPH_DAMAGE } from '../rounds.js';
import { isBlock } from '../track.js';

const BOSS_IDX = ROUNDS.length - 1;
const blockDamage = (g) => (isBlock(g) ? (GLYPH_DAMAGE[g] || 2) : 0);

// Min-damage lane path under the ±1-per-tick move limit, starting from the loop's current lane. Uses the
// loop's own effective rows (activeRowAt resolves fork spans on the committed LO channel), so it mirrors
// exactly what step() will read tick-by-tick.
function optimalPath(loop, startLane) {
  const N = loop.maxTicks;
  const rows = [];
  for (let t = 0; t < N; t += 1) rows.push(loop.activeRowAt(t));
  const INF = 1e9;
  const at = (i, l) => (rows[i] ? blockDamage(rows[i].lanes[l]) : 0);
  // Cost of being in lane nl at tick i having come from lane l: the block damage plus the real off-beat
  // switch penalty (setLane charges 1 when you switch on an off-beat tick). Modelling it here makes the
  // DP prefer holding a lane, so following the path incurs the same (minimal) off-beat cost the game does.
  const offBeat = (i) => Boolean(rows[i] && rows[i].beatOpen === false);
  const stepCost = (i, l, nl) => at(i, nl) + (nl !== l && offBeat(i) ? 1 : 0);
  let dp = [0, 1, 2].map((l) => (l === startLane ? at(0, l) : INF)); // start where the player actually is
  const back = [];
  for (let i = 1; i < N; i += 1) {
    const nd = [INF, INF, INF];
    const b = [0, 0, 0];
    for (let l = 0; l < 3; l += 1) {
      if (dp[l] >= INF) continue;
      for (let nl = Math.max(0, l - 1); nl <= Math.min(2, l + 1); nl += 1) {
        const c = dp[l] + stepCost(i, l, nl);
        if (c < nd[nl]) { nd[nl] = c; b[nl] = l; }
      }
    }
    dp = nd; back.push(b);
  }
  let l = dp.indexOf(Math.min(...dp));
  const path = new Array(N);
  path[N - 1] = l;
  for (let i = N - 1; i > 0; i -= 1) { l = back[i - 1][l]; path[i - 1] = l; }
  return path;
}

// Drive the round through handleKey only (the human contract), following the optimal path one lane/tick.
function playRoundAsHuman(roundIdx, calibrated) {
  const state = defaultState();
  const loop = createGameLoop({ state, seed: 's5', roundIdx, calibrated });
  const path = optimalPath(loop, loop.lane);
  let t = 0;
  while (!loop.done) {
    const target = path[t] ?? loop.lane;
    if (loop.lane < target) loop.handleKey('ArrowRight');
    else if (loop.lane > target) loop.handleKey('ArrowLeft');
    loop.step();
    t += 1;
    if (t > loop.maxTicks + 8) break; // guard
  }
  return { outcome: loop.outcome, integrity: state.run.integrity, round: ROUNDS[roundIdx] };
}

// Every body round is winnable by a human following the reachable safe line.
for (let roundIdx = 0; roundIdx < BOSS_IDX; roundIdx += 1) {
  const r = playRoundAsHuman(roundIdx, false);
  assert.equal(r.outcome, 'clear', `round ${roundIdx + 1} (${r.round.archetype}) clears via the ±1 human input path`);
  assert.ok(r.integrity > 0, `round ${roundIdx + 1} survives with hull to spare (ended at ${r.integrity})`);
}

// The boss is winnable once calibrated (suppression off) — via the same human input path.
{
  const r = playRoundAsHuman(BOSS_IDX, true);
  assert.equal(r.outcome, 'clear', 'calibrated boss clears via the human input path');
  assert.ok(r.integrity > 0, `boss survives (ended at ${r.integrity})`);
}

// Sanity: the uncalibrated boss is STILL unwinnable (suppression floor) even with perfect ±1 play — the
// audio-calibration un-cheat must remain load-bearing.
{
  const r = playRoundAsHuman(BOSS_IDX, false);
  assert.equal(r.outcome, 'fail', 'uncalibrated boss still runs out of hull (suppression gate intact)');
}

console.log('stage5 winnable-human tests passed');
