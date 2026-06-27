import { LOOP_DURATION_MS } from './messages.js';

export function defaultState(context = {}) {
  // Deterministic seed: explicit context.seed (tests/replays) or a fixed default — never the wall
  // clock (the old context.now/Date.now fallback made the calibration label non-reproducible).
  const seed = String(context.seed || 'signal-racer').replace(/\W/g, '').slice(-8) || 'stage5';
  return {
    version: 1,
    packets: 125,
    race: {
      circuit: 'championship',
      lap: 3,
      totalLaps: 5,
      timeMs: 42300,
      integrity: 87,
      boostSegments: 3,
      position: 2,
      jammerOffsetMs: -900,
    },
    calibration: {
      seed: `signal-${seed}`,
      loopMs: LOOP_DURATION_MS,
      continuousMs: 0,
      calibrated: false,
      lastFile: null,
    },
    boss: {
      reached: false,
      attempts: 0,
      lockHintStep: 0,
      defeated: false,
    },
    run: {
      lane: 1,             // 0=A, 1=B, 2=C
      roundIdx: 0,         // 0–6 for rounds 1–7
      roundComplete: false,
      integrity: 100,
      onBeatCount: 0,
      totalSwitches: 0,
      gatesThisRound: 0,
      clearedRounds: 0,    // how many non-boss rounds finished (boss gated behind this)
    },
    shop: {
      noiseFilter: false,
      spectrumAnalyzer: false,
      signalAmplifier: false,
    },
    log: ['signal racer mounted.', 'the jammer is already in the racing line.'],
  };
}

export function normalizeState(state, context = {}) {
  const fresh = defaultState(context);
  const target = state && typeof state === 'object' ? state : {};
  target.version = 1;
  target.packets = Number.isFinite(target.packets) ? target.packets : fresh.packets;
  target.race = mergePlain(fresh.race, target.race);
  target.calibration = mergePlain(fresh.calibration, target.calibration);
  target.calibration.loopMs = Number(target.calibration.loopMs) || fresh.calibration.loopMs;
  target.calibration.continuousMs = Math.max(0, Number(target.calibration.continuousMs) || 0);
  target.calibration.calibrated = Boolean(target.calibration.calibrated);
  target.boss = mergePlain(fresh.boss, target.boss);
  target.run = mergePlain(fresh.run, target.run);
  target.run.integrity = Number.isFinite(Number(target.run.integrity)) ? Number(target.run.integrity) : fresh.run.integrity;
  target.shop = mergePlain(fresh.shop, target.shop);
  target.log = Array.isArray(target.log) ? target.log : [...fresh.log];
  return target;
}

function mergePlain(base, override) {
  return { ...base, ...(override && typeof override === 'object' ? override : {}) };
}
