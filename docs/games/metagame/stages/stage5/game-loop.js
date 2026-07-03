// game-loop.js — Stage 5 Signal Racer: per-round logic over a pre-built obstacle table. The engine (or
// the test hook) advances step() once per logical tick; handleKey() switches lanes. Collision/scoring
// is pure given the table + key presses, so a seed fully determines an optimally-played outcome.
//
// Boss gate (load-bearing): on the boss round the jammer's suppression chips integrity every tick when
// the counter-wave is NOT calibrated, so an un-calibrated boss run mathematically runs out of integrity.
// The actual defeat is ALSO gated by raceTheJammer/hasCounterWave in the renderer — double-locked.

import { buildObstacleTable, isBlock, isGate } from './track.js';
import { roundByIdx, isBossRound, GLYPH_DAMAGE } from './rounds.js';
import { applyUpgrades } from './shop.js';
import { calcRoundPackets } from './economy.js';
import { createRaceState } from './race-state.js';
import { buildRivals, finishPosition, positionMultiplier } from './rivals.js';
import { makeRng } from './rng.js';
import { placePowerups, isPowerup, powerupType, durationTicks, POWERUPS } from './powerups.js';
import { makeParGhost, ghostFromRecording, createRecorder, medalFor } from './ghost.js';
import { applyForks, resolveRow } from './fork.js';
import { autoSolve, replayResume } from './drive.js';

const BUMP_COOLDOWN = 10;    // ticks before the same rival can bump again
// Look-ahead / speeds / bump costs all come from the vehicle-shop tuning now (applyUpgrades), so a
// kitted-out racer reads further, runs faster, and shrugs off bumps. See shop.js BASE_TUNING.

export function createGameLoop({ state, seed, roundIdx, calibrated, onPaint, onEnd, getTickMs, roundOverride, prevGhost, mods = {}, resume = null }) {
  const round = roundOverride || roundByIdx(roundIdx);
  const tickMs = getTickMs || (() => round.tickMs);
  // Ascension knobs (default = neutral): more hazards, faster rivals, tighter hull, sharper static.
  const m = mods && typeof mods === 'object' ? mods : {};
  const table = buildObstacleTable(seed, round, m.densityBonus || 0);
  if (round.hasFork) applyForks(table, makeRng(`${seed}:fork:${round.id}`), round);
  if (round.hasPowerups) placePowerups(table, makeRng(`${seed}:pu:${round.id}`), round);
  const tuning = applyUpgrades(state.shop || {});
  tuning.maxIntegrity = Math.max(20, Math.round(tuning.maxIntegrity * (Number(m.integrityMult) || 1)));
  tuning.noiseDamage += Math.max(0, Number(m.noiseDamageBonus) || 0);
  const boss = roundOverride ? Boolean(round.boss) : isBossRound(roundIdx);
  const suppressionActive = boss && !calibrated;
  const race = createRaceState(round);
  const maxTicks = race.raceLength + 16;
  const rivals = buildRivals({ seed, round, table, raceLength: race.raceLength, speedMult: Number(m.rivalSpeedMult) || 1 });

  // Time-trial: a beat-the-clock PAR ghost (the gate) + an optional translucent REPLAY ghost of the
  // player's prior-best run. Both are deterministic transcripts/pacers — no live RNG. The player
  // records THIS run tick-by-tick so a clean finish can be banked as the next replay ghost.
  const isTimeTrial = race.archetype === 'time-trial';
  const parGhost = isTimeTrial ? makeParGhost(race.raceLength, round.parPace) : null;
  const replayGhost = isTimeTrial ? ghostFromRecording(prevGhost, 'G') : null;
  const recorder = isTimeTrial ? createRecorder() : null;
  const bumpReady = rivals.map(() => 0);     // tick when each rival may bump again
  const rivalDrag = rivals.map(() => 0);     // EMP distance setback (live standing/render)
  const rivalLate = rivals.map(() => 0);     // EMP finish-tick penalty (final standing)
  const buffs = { shieldUntil: -1, overclockUntil: -1 };
  const effDist = (i) => Math.max(0, rivals[i].distAt(tick) - rivalDrag[i]);

  const run = state.run;
  run.lane = clampLane(run.lane);
  run.roundIdx = roundIdx;
  run.roundComplete = false;
  run.integrity = tuning.maxIntegrity;
  run.maxIntegrity = tuning.maxIntegrity;
  run.onBeatCount = 0;
  run.totalSwitches = 0;
  run.gatesThisRound = 0;
  run.lap = 1;
  run.distance = 0;
  run.position = rivals.length + 1;
  run.channel = 'lo';
  run.forkRoutes = 0;

  let tick = 0;
  let done = false;
  let outcome = null;
  let channel = 'lo';  // committed sub-channel for fork spans: 'hi' (gates, risk) | 'lo' (safe)
  let replaying = false; // true while fast-forwarding a resumed run (suppress paint)
  const pathLanes = []; // per-tick lane transcript (for deterministic resume)
  const pathChan = [];  // per-tick channel transcript ('h' | 'l')

  function rowAt(t) { return table[race.rowIndex(t, table.length)]; }
  // The row a reader should actually use this tick — the committed sub-channel inside a fork span.
  function activeRow(t) { return resolveRow(rowAt(t), channel); }
  function inForkSpan(t) { const r = rowAt(t); return Boolean(r && r.fork); }
  // Route is LOCKED once you're past the split's entry row — you commit at the fork, ride to the merge.
  function routeLocked(t) { const r = rowAt(t); return Boolean(r && r.fork && !r.forkEntry); }

  // Commit the route for the next split (preset before it, or lock it in on the entry row). Ignored
  // mid-span — the "commit at the fork, then ride it to the merge" decision the routing layer is about.
  function setChannel(next) {
    if (done || routeLocked(tick)) return;
    const target = next === 'hi' ? 'hi' : 'lo';
    if (target === channel) return;
    channel = target;
    run.channel = channel;
    paint();
  }

  // Live rival positions for the renderer: glyph + lane + how many rows ahead of the player they are.
  // Time-trial ghosts (par + prior-best) are overlaid the same way, so the renderer needs no new path.
  function rivalView() {
    const view = rivals.map((r, i) => ({
      glyph: r.glyph,
      lane: r.laneAt(tick),
      ahead: Math.round(effDist(i) - race.distance),
    }));
    for (const g of [parGhost, replayGhost]) {
      if (!g) continue;
      view.push({ glyph: g.glyph, lane: g.laneAt(tick), ahead: Math.round(g.distAt(tick) - race.distance), ghost: true });
    }
    return view;
  }

  // Share-lane bumps: a rival on the player's row + lane (cooldown-gated) costs integrity + speed.
  function resolveBumps() {
    let slow = 0;
    rivals.forEach((r, i) => {
      if (tick < bumpReady[i]) return;
      if (Math.round(effDist(i) - race.distance) !== 0) return;
      if (r.laneAt(tick) !== run.lane) return;
      run.integrity -= tuning.bumpDamage;
      bumpReady[i] = tick + BUMP_COOLDOWN;
      slow = tuning.bumpSlow;
    });
    return slow;
  }

  // EMP the nearest rival still ahead: a one-off distance setback + a finish-tick penalty.
  function empNearestRival() {
    let best = -1;
    let bestGap = Infinity;
    rivals.forEach((r, i) => {
      const gap = effDist(i) - race.distance;
      if (gap > 0 && gap < bestGap) { bestGap = gap; best = i; }
    });
    if (best >= 0) {
      rivalDrag[best] += POWERUPS.emp.drag;
      rivalLate[best] += POWERUPS.emp.finishTicks;
    }
  }

  function collectPowerup(type) {
    run.powerupsCollected = Number(run.powerupsCollected || 0) + 1;
    if (type === 'shield') buffs.shieldUntil = tick + durationTicks('shield', tickMs);
    else if (type === 'overclock') buffs.overclockUntil = tick + durationTicks('overclock', tickMs, tuning.overclockBonusMs);
    else if (type === 'repair') run.integrity = Math.min(tuning.maxIntegrity, run.integrity + POWERUPS.repair.amount);
    else if (type === 'cache') {
      const p = POWERUPS.cache.amount;
      state.packets = Number(state.packets || 0) + p;
      run.cachePackets = Number(run.cachePackets || 0) + p;
    } else if (type === 'emp') empNearestRival();
  }

  function paint() {
    if (replaying) return; // a resumed run is fast-forwarded silently to the checkpoint tick
    onPaint?.({
      table, tick, lane: run.lane, round, integrity: run.integrity, gates: run.gatesThisRound,
      suppressionActive, lookAhead: tuning.lookAhead, race, lap: race.lap(), laps: race.laps,
      progress: race.progress(), archetype: race.archetype, rivals: rivalView(),
      position: run.position, fieldSize: rivals.length + 1,
      channel, inFork: inForkSpan(tick), hasFork: Boolean(round.hasFork),
      beatOpen: Boolean(activeRow(tick)?.beatOpen), // drives the beat-pulse glow (matches the '*' marker)
      packets: Number(state.packets || 0),          // for race-fx: a $ cache pickup pops a float
      powerups: Number(run.powerupsCollected || 0), // for race-fx: a buff/repair pickup pops a float
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
    if (row && row.beatOpen === false) run.integrity -= tuning.offBeatPenalty; // off-beat switch penalty
    else run.onBeatCount += 1;
    run.lane = target;
    paint();
  }

  function handleKey(key) {
    if (key === 'ArrowLeft') setLane(run.lane - 1);
    else if (key === 'ArrowRight') setLane(run.lane + 1);
    else if (key === 'ArrowUp') setChannel('hi');
    else if (key === 'ArrowDown') setChannel('lo');
  }

  function step() {
    if (done) return outcome;
    const row = activeRow(tick);
    if (rowAt(tick)?.forkEntry) run.forkRoutes += 1; // tally each split committed to
    if (row) {
      const glyph = row.lanes[run.lane];
      const shielded = row.counterPhaseLane === run.lane || tick < buffs.shieldUntil;
      if (isBlock(glyph) && !shielded) run.integrity -= damageFor(glyph);
      else if (isGate(glyph)) run.gatesThisRound += 1;
      else if (isPowerup(glyph)) collectPowerup(powerupType(glyph));
    }
    if (suppressionActive) run.integrity -= 1; // jammer suppression — only ever an un-calibrated boss
    const slow = resolveBumps();
    if (run.integrity <= 0) { run.integrity = 0; finish('fail'); return outcome; }
    race.advance(Math.max(0, speedFor() - slow));
    pathLanes.push(run.lane);                 // input transcript (index = this tick) for resume
    pathChan.push(channel === 'hi' ? 'h' : 'l');
    recorder?.sample(run.lane, race.distance); // transcript for the next replay ghost (index = this tick)
    run.distance = race.distance;
    run.lap = race.lap();
    run.position = 1 + rivals.filter((_, i) => effDist(i) > race.distance).length; // live standing
    tick += 1;
    if (race.finished() || tick >= maxTicks) { finish('clear'); return outcome; }
    paint();
    return null;
  }

  // Player race speed this tick — vehicle top speed, lifted while an overclock buff is live.
  function speedFor() {
    return tick < buffs.overclockUntil ? tuning.overclockSpeed : tuning.topSpeed;
  }

  function finish(result) {
    if (done) return;
    done = true;
    // Time-trial gate: a "clear" only counts if you crossed the line BEFORE the par ghost (beat the
    // clock). Missing par demotes the run to a fail — the beat-the-clock teeth, fully deterministic.
    let res = result;
    let medal = null;
    let ghostRecording = null;
    if (isTimeTrial) {
      if (res === 'clear' && (!race.finished() || tick > parGhost.finishTick)) res = 'fail';
      if (res === 'clear') {
        medal = medalFor(tick, parGhost.finishTick);
        ghostRecording = recorder.finalize(tick);
        run.medal = medal;
      }
    }
    outcome = res;
    run.roundComplete = res === 'clear';
    let packets = 0;
    let position = run.position;
    if (res === 'clear') {
      // Effective finish ticks fold in any EMP penalties applied during the race.
      const effRivals = rivals.map((r, i) => ({ finishTick: r.finishTick + rivalLate[i] }));
      position = effRivals.length ? finishPosition(effRivals, tick) : 1;
      run.position = position;
      const onBeatPct = run.totalSwitches > 0 ? run.onBeatCount / run.totalSwitches : 1;
      const multiplier = positionMultiplier(position, rivals.length + 1) * tuning.packetMult;
      packets = calcRoundPackets({
        roundId: round.id, onBeatPct, integrityRemaining: run.integrity,
        gatesCollected: run.gatesThisRound, gateValue: tuning.gateValue, multiplier,
      });
      state.packets = Number(state.packets || 0) + packets;
    }
    onEnd?.({
      result: res, round, roundIdx, integrity: run.integrity, packets,
      gates: run.gatesThisRound, position, fieldSize: rivals.length + 1,
      finishTick: tick, parTick: parGhost ? parGhost.finishTick : null, medal, ghostRecording,
    });
  }

  // A storable snapshot of the run so far: the round + the per-tick input transcript. Replaying it
  // deterministically rebuilds the EXACT state at `tick` — the resume contract, no per-field drift.
  function path() {
    return { roundIdx, tick, lanes: pathLanes.join(''), channels: pathChan.join('') };
  }

  // The driver surface drive.js (autoSolve / replayResume) operates on. Internal accessors live here;
  // the player only ever touches handleKey.
  const api = {
    round, table, isBoss: boss, suppressionActive, race, rivals, maxTicks,
    get tick() { return tick; },
    get done() { return done; },
    get outcome() { return outcome; },
    get position() { return run.position; },
    get channel() { return channel; },
    get lane() { return run.lane; },
    rawRowAt: rowAt,
    activeRowAt: activeRow,
    commitLane(l) { run.lane = clampLane(l); },
    setReplaying(b) { replaying = Boolean(b); },
    handleKey, setChannel, step, paint, rivalView, path,
    autoSolve: (limit) => autoSolve(api, limit),
  };

  if (resume) replayResume(api, resume); // fast-forward a resumed run to its checkpoint, then live

  return api;
}

function clampLane(lane) {
  return Math.max(0, Math.min(2, Number(lane) || 0));
}
