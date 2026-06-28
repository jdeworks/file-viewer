// s4dev.js — Stage 4 Fractal Bastion: pure dev-menu cheat mutations (no DOM, no RNG).
//
// Each function takes `state` (the normalised stage state) and mutates it in place. They are
// intentionally pure-ish (no save, no DOM, no clock) so they can be unit-tested without a browser.
// The renderer wires save() + repaint() on top in its dev(id) dispatcher.
//
// IMPORTANT: none of these bypass the boss un-cheat. The blueprint action
// (4.recursion_blueprint_read) must still be fired by the host app's real file-open dispatch.

import { ensureCampaign, recordWaveCleared, seatAtBoss } from './run4.js';

// +500 Glory for the campaign wallet (buys Armory upgrades).
export function devGiveGlory(state, amount = 500) {
  ensureCampaign(state);
  state.campaign.glory = (state.campaign.glory || 0) + amount;
  return { glory: state.campaign.glory };
}

// Instantly end the current wave as if it were won: clear in-flight enemies, advance the wave
// counter, and (if it was the map's final wave) route to the Armory. Safe to call outside combat.
export function devSkipWave(state) {
  state.waveActive = false;
  state.waveFailed = false;
  state.enemies = [];
  state.spawnQueue = [];
  return recordWaveCleared(state);   // awards glory + advances waveNumber or routes to armory
}

// Skip directly to the boss arena by clearing all 5 maps in one step. Does NOT auto-win the boss —
// the blueprint un-cheat (recursion_points.json must be opened in the viewer) still applies.
export function devSkipToBoss(state) {
  return seatAtBoss(state);          // run4 exports this debug helper already
}

// Set core integrity to 99 999 so the engine never reaches 0 under normal enemy drain.
// The engine does `Math.max(0, integrity - drain)` so this is fully effective.
export function devGodCore(state) {
  state.integrity = 99999;
  state.maxIntegrity = 99999;
  return { integrity: state.integrity };
}
