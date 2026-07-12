// race-fx.js — Stage 5 Signal Racer: turns per-tick paint deltas into subtle score-popup feedback. A
// boost gate / packet cache / powerup pickup pops a rising glyph over the track (floatNum). It only
// READS the paint view + the previous snapshot — no game state is mutated, so it can't affect
// determinism. Reduced-motion is handled inside the shared kit (games-chrome.css).
//
// 2026-07-12 (canvas rebuild): the on-track FLASH/SHAKE hit feedback was removed — a taking-damage
// shake fought the new pseudo-3D road (the whole scene juddering) and the flash duplicated the canvas
// suppression vignette. The floatNum pickup pops are kept: they're informative, off to the side, and
// read fine over the moving road.

import { floatNum } from '../../shared/feedback.js';

export function createRaceFx({ trackCol }) {
  let prev = null;
  return {
    reset() { prev = null; },
    onPaint(view) {
      if (!view) return;
      if (prev) {
        if ((view.gates || 0) > (prev.gates || 0)) floatNum(trackCol, '»', 'good');       // boost gate
        if ((view.packets || 0) > (prev.packets || 0)) floatNum(trackCol, '$', 'warn');    // packet cache
        if ((view.powerups || 0) > (prev.powerups || 0)) floatNum(trackCol, '+', 'good');  // buff / repair
      }
      prev = {
        gates: view.gates || 0,
        packets: view.packets || 0,
        powerups: view.powerups || 0,
      };
    },
  };
}
