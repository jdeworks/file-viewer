// debug-hook.js — Stage 5 Signal Racer: the window.__fvStage5 TEST/DEBUG hook, split out of
// renderer.js to keep it under the soft LOC cap. NOT a player affordance: it drives the racer
// deterministically for the smoke. It does NOT bypass anything — solveRun plays each real round
// optimally, and the boss still needs the calibrated counter-wave (the real un-cheat = playing
// transmission_hum.mp3 for one full loop).

import { runCalibrationTimeline } from './calibration.js';
import { TRANSMISSION_HUM_PATH } from './messages.js';

export function installDebugHook(h) {
  window.__fvStage5 = {
    state: () => h.state,
    startRound: h.startRound,
    solveRound() { const loop = h.getLoop(); if (loop && h.getMode() === 'playing') return loop.autoSolve(); return null; },
    solveRun() {
      // startRound auto-clears any pending result/pit-stop card, so the loop never blocks; we also
      // dismiss the final round's card at the end so it can't sit over the boss flow / audio button.
      for (let i = 0; i < h.bossIdx; i += 1) { h.startRound(i); const loop = h.getLoop(); if (loop && h.getMode() === 'playing') loop.autoSolve(); }
      h.dismissResult?.();
      return Number(h.state.run.clearedRounds || 0);
    },
    calibrate() {
      const samples = Array.from({ length: 16 }, (_, i) => ({ atMs: i * 1000, active: true, seeking: false }));
      runCalibrationTimeline({ state: h.state, actions: h.actions, achievements: h.achievements, bell: h.bell, file: TRANSMISSION_HUM_PATH, samples });
      h.persistAndPaint();
      return h.calibrated();
    },
    solveBoss() { h.startRound(h.bossIdx); const loop = h.getLoop(); if (loop && h.getMode() === 'playing') return loop.autoSolve(); return null; },
    ascension: () => ({ ...h.ascension.state(), mods: h.ascensionMods() }),
    setAscension(n) { h.ascension.setLevel(n); h.persistAndPaint(); return h.ascension.level(); },
    raceCheckpoint: () => h.raceRun.restore(),
  };
}
