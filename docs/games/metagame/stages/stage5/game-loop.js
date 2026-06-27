// game-loop.js — Stage 5 Signal Racer: per-round logic over a pre-built obstacle table. The engine (or
// the test hook) advances step() once per logical tick; handleKey() switches lanes. Collision/scoring
// is pure given the table + key presses, so a seed fully determines an optimally-played outcome.
//
// Boss gate (load-bearing): on the boss round the jammer's suppression chips integrity every tick when
// the counter-wave is NOT calibrated, so an un-calibrated boss run mathematically runs out of integrity.
// The actual defeat is ALSO gated by raceTheJammer/hasCounterWave in the renderer — double-locked.

import { buildObstacleTable, isBlock, isGate, optimalLane } from './track.js';
import { roundByIdx, isBossRound, GLYPH_DAMAGE } from './rounds.js';
import { applyUpgrades } from './shop.js';
import { calcRoundPackets } from './economy.js';
import { createRaceState } from './race-state.js';
import { buildRivals, finishPosition, positionMultiplier } from './rivals.js';

const LOOK_AHEAD = 8;
const BASE_SPEED = 1;
const BUMP_DAMAGE = 1;       // sharing a lane with a rival chips a little integrity…
const BUMP_SLOW = 0.5;       // …and bleeds race speed for that tick.
const BUMP_COOLDOWN = 10;    // ticks before the same rival can bump again

export function createGameLoop({ state, seed, roundIdx, calibrated, onPaint, onEnd }) {
  const round = roundByIdx(roundIdx);
  const table = buildObstacleTable(seed, round);
  const tuning = applyUpgrades(state.shop || {});
  const boss = isBossRound(roundIdx);
  const suppressionActive = boss && !calibrated;
  const race = createRaceState(round);
  const maxTicks = race.raceLength + 16;
  const rivals = buildRivals({ seed, round, table, raceLength: race.raceLength });
  const bumpReady = rivals.map(() => 0); // tick when each rival may bump again

  const run = state.run;
  run.lane = clampLane(run.lane);
  run.roundIdx = roundIdx;
  run.roundComplete = false;
  run.integrity = 100;
  run.onBeatCount = 0;
  run.totalSwitches = 0;
  run.gatesThisRound = 0;
  run.lap = 1;
  run.distance = 0;
  run.position = rivals.length + 1;

  let tick = 0;
  let done = false;
  let outcome = null;

  function rowAt(t) { return table[race.rowIndex(t, table.length)]; }

  // Live rival positions for the renderer: glyph + lane + how many rows ahead of the player they are.
  function rivalView() {
    return rivals.map((r) => ({
      glyph: r.glyph,
      lane: r.laneAt(tick),
      ahead: Math.round(r.distAt(tick) - race.distance),
    }));
  }

  // Share-lane bumps: a rival on the player's row + lane (cooldown-gated) costs integrity + speed.
  function resolveBumps() {
    let slow = 0;
    rivals.forEach((r, i) => {
      if (tick < bumpReady[i]) return;
      if (Math.round(r.distAt(tick) - race.distance) !== 0) return;
      if (r.laneAt(tick) !== run.lane) return;
      run.integrity -= BUMP_DAMAGE;
      bumpReady[i] = tick + BUMP_COOLDOWN;
      slow = BUMP_SLOW;
    });
    return slow;
  }

  function paint() {
    onPaint?.({
      table, tick, lane: run.lane, round, integrity: run.integrity, gates: run.gatesThisRound,
      suppressionActive, lookAhead: LOOK_AHEAD, race, lap: race.lap(), laps: race.laps,
      progress: race.progress(), archetype: race.archetype, rivals: rivalView(),
      position: run.position, fieldSize: rivals.length + 1,
    });
  }

  function damageFor(glyph) {
    const base = glyph === '▓' ? GLYPH_DAMAGE['▓'] : tuning.noiseDamage;
    return suppressionActive && glyph === '▓' ? base * 2 : base;
  }

  function setLane(next) {
    const target = clampLane(next);
    if (done || target === run.lane) return;
    run.totalSwitches += 1;
    const row = rowAt(tick);
    if (row && row.beatOpen === false) run.integrity -= 1; // off-beat switch penalty
    else run.onBeatCount += 1;
    run.lane = target;
    paint();
  }

  function handleKey(key) {
    if (key === 'ArrowLeft') setLane(run.lane - 1);
    else if (key === 'ArrowRight') setLane(run.lane + 1);
  }

  function step() {
    if (done) return outcome;
    const row = rowAt(tick);
    if (row) {
      const glyph = row.lanes[run.lane];
      const shielded = row.counterPhaseLane === run.lane;
      if (isBlock(glyph) && !shielded) run.integrity -= damageFor(glyph);
      if (isGate(glyph)) run.gatesThisRound += 1;
    }
    if (suppressionActive) run.integrity -= 1; // jammer suppression — only ever an un-calibrated boss
    const slow = resolveBumps();
    if (run.integrity <= 0) { run.integrity = 0; finish('fail'); return outcome; }
    race.advance(speedFor() - slow);
    run.distance = race.distance;
    run.lap = race.lap();
    run.position = 1 + rivals.filter((r) => r.distAt(tick) > race.distance).length; // live standing
    tick += 1;
    if (race.finished() || tick >= maxTicks) { finish('clear'); return outcome; }
    paint();
    return null;
  }

  // Player race speed this tick. Powerups extend this in a later increment; base is constant.
  function speedFor() {
    return BASE_SPEED;
  }

  function finish(result) {
    if (done) return;
    done = true;
    outcome = result;
    run.roundComplete = result === 'clear';
    let packets = 0;
    let position = run.position;
    if (result === 'clear') {
      position = rivals.length ? finishPosition(rivals, tick) : 1;
      run.position = position;
      const onBeatPct = run.totalSwitches > 0 ? run.onBeatCount / run.totalSwitches : 1;
      const multiplier = positionMultiplier(position, rivals.length + 1);
      packets = calcRoundPackets({
        roundId: round.id, onBeatPct, integrityRemaining: run.integrity,
        gatesCollected: run.gatesThisRound, upgrades: state.shop || {}, multiplier,
      });
      state.packets = Number(state.packets || 0) + packets;
    }
    onEnd?.({ result, round, roundIdx, integrity: run.integrity, packets, gates: run.gatesThisRound, position, fieldSize: rivals.length + 1 });
  }

  // Optimal lane for the current tick. Used by autoSolve (the test hook) — never an in-game affordance.
  function bestLane(atTick) {
    return optimalLane(rowAt(atTick), run.lane);
  }

  function autoSolve(limit = maxTicks + 32) {
    let guard = 0;
    while (!done && guard < limit) {
      run.lane = bestLane(tick);
      step();
      guard += 1;
    }
    return outcome;
  }

  return {
    round, table, isBoss: boss, suppressionActive, race, rivals,
    get tick() { return tick; },
    get done() { return done; },
    get outcome() { return outcome; },
    get position() { return run.position; },
    handleKey, step, autoSolve, paint, rivalView,
  };
}

function clampLane(lane) {
  return Math.max(0, Math.min(2, Number(lane) || 0));
}
