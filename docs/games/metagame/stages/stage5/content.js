export function raceHudModel({ state, calibrated }) {
  return {
    position: `P${state.race.position}`,
    lap: `${state.race.lap}/${state.race.totalLaps}`,
    time: formatRaceTime(state.race.timeMs),
    integrity: `${state.race.integrity}%`,
    boost: '|'.repeat(state.race.boostSegments),
    packets: state.packets,
    jammerWave: waveSamples(state.race.timeMs, 0),
    counterWave: calibrated ? waveSamples(state.race.timeMs, Math.PI) : [],
  };
}

export function waveSamples(timeMs, phase = 0, count = 16) {
  return Array.from({ length: count }, (_, index) => {
    const t = (timeMs / 1000) + index * 0.25;
    return Number(Math.sin(t * Math.PI * 2 / 3.5 + phase).toFixed(3));
  });
}

export function formatRaceTime(ms) {
  const total = Math.max(0, Math.trunc(Number(ms) || 0));
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const tenths = Math.floor((total % 1000) / 100);
  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`;
}
