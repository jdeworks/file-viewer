// combat-fx.js — Stage 4 Fractal Bastion: the combat feedback observer (UX audit #5 / shell F5).
//
// The board is a repainted <pre>, not per-enemy elements, so "reactions" are driven by DIFFING the
// engine state between frames rather than by per-sprite listeners. `createCombatFx()` remembers the last
// frame and reports what changed: which enemy cells took damage (a brief cell flash, re-applied each
// frame while hit so it flickers), how many Cycles were earned (kills → a rising +N float), and whether
// integrity dropped (a leak → board edge flash + HUD shake). All feedback is drawn with the SHARED kit
// (shared/feedback.js) so it is `prefers-reduced-motion`-aware for free. Pure observation; no engine writes.

import { flash, shake, floatNum, banner } from '../../shared/feedback.js';

export function createCombatFx() {
  let prevHp = new Map(); // enemyId → last-seen hp
  let prevCycles = null;
  let prevIntegrity = null;

  return {
    reset() { prevHp = new Map(); prevCycles = null; prevIntegrity = null; },

    // Diff the live state against the last frame. Returns { hitCells:Set<"x,y">, cyclesGained, integrityLost }.
    observe(state) {
      const hitCells = new Set();
      const nextHp = new Map();
      for (const e of state.enemies || []) {
        nextHp.set(e.id, e.hp);
        const was = prevHp.get(e.id);
        if (was != null && e.hp < was) hitCells.add(`${Math.round(e.x)},${Math.round(e.y)}`);
      }
      const cyclesGained = prevCycles == null ? 0 : Math.max(0, Number(state.cycles || 0) - prevCycles);
      const integrityLost = prevIntegrity != null && Number(state.integrity || 0) < prevIntegrity;
      prevHp = nextHp;
      prevCycles = Number(state.cycles || 0);
      prevIntegrity = Number(state.integrity || 0);
      return { hitCells, cyclesGained, integrityLost };
    },
  };
}

// Fire the visible feedback for a frame's deltas. `refs` = { board, bar, floatHost }. Cheap + throttled
// by the caller's every-frame cadence; the float only spawns on a real kill so it doesn't spam.
export function playFx(deltas, refs) {
  if (!deltas || !refs) return;
  if (deltas.integrityLost) { flash(refs.board, 'bad'); shake(refs.bar); }
  if (deltas.cyclesGained > 0 && refs.floatHost) floatNum(refs.floatHost, `+${deltas.cyclesGained}`, 'good');
}

// A phase banner over the board ("WAVE 12/20", boss telegraph). One at a time (shared kit clears prior).
export function fxBanner(host, text) { return banner(host, text); }
