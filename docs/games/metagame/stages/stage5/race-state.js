// race-state.js — Stage 5 Signal Racer: the race-distance + lap model shared by the player and the
// precomputed AI rivals. Pure/deterministic: distance accumulates by `speed` per tick (no timers, no
// RNG). A race ends when distance reaches raceLength = trackLength (sprint / gauntlet) or
// laps × lapLength (circuit). The obstacle table is exactly one lap long for a circuit and loops, so
// the SAME lap of obstacles repeats every lap; rowIndex() maps a tick → table row with that wrap.

export function raceLengthFor(round) {
  const archetype = round.archetype || 'sprint';
  const lapLength = Math.max(1, Number(round.tickCount) || 100);
  if (archetype === 'circuit') {
    const laps = Math.max(1, Number(round.laps) || 1);
    return lapLength * laps;
  }
  return Math.max(1, Number(round.trackLength) || lapLength);
}

export function createRaceState(round) {
  const archetype = round.archetype || 'sprint';
  const lapLength = Math.max(1, Number(round.tickCount) || 100);
  const laps = archetype === 'circuit' ? Math.max(1, Number(round.laps) || 1) : 1;
  const raceLength = raceLengthFor(round);
  let distance = 0;

  return {
    archetype,
    lapLength,
    laps,
    raceLength,
    get distance() { return distance; },
    advance(speed) {
      distance = Math.min(raceLength, distance + Math.max(0, Number(speed) || 0));
      return distance;
    },
    reset() { distance = 0; },
    // Logical obstacle-table row for a given scroll tick (wraps on circuits where the table = one lap).
    rowIndex(tick, tableLen) {
      const len = Math.max(1, Number(tableLen) || lapLength);
      return ((Number(tick) || 0) % len + len) % len;
    },
    lap() { return Math.min(laps, Math.floor(distance / lapLength) + 1); },
    progress() { return raceLength > 0 ? Math.min(1, distance / raceLength) : 1; },
    finished() { return distance >= raceLength; },
  };
}
