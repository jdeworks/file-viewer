// race-fx.js — Stage 5 Signal Racer: turns per-tick paint deltas into shared micro-feedback (UX audit
// #4 / F5). A hit shakes the road + flashes the integrity chip red; a boost gate / packet cache /
// powerup pop pops a rising glyph over the track. It only READS the paint view + the previous snapshot
// and calls the shared feedback kit (flash/shake/floatNum) — no game state is mutated, so it can't
// affect determinism. Reduced-motion is handled inside the shared kit (games-chrome.css).

import { flash, shake, floatNum } from '../../shared/feedback.js';

export function createRaceFx({ trackCol, arena, integrityChip }) {
  let prev = null;
  return {
    reset() { prev = null; },
    onPaint(view) {
      if (!view) return;
      if (prev) {
        if (view.integrity < prev.integrity - 0.001) {   // took a hit
          shake(arena);
          flash(integrityChip, 'bad');
        }
        if ((view.gates || 0) > (prev.gates || 0)) floatNum(trackCol, '»', 'good');       // boost gate
        if ((view.packets || 0) > (prev.packets || 0)) floatNum(trackCol, '$', 'warn');    // packet cache
        if ((view.powerups || 0) > (prev.powerups || 0)) floatNum(trackCol, '+', 'good');  // buff / repair
      }
      prev = {
        integrity: view.integrity,
        gates: view.gates || 0,
        packets: view.packets || 0,
        powerups: view.powerups || 0,
      };
    },
  };
}
