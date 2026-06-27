// s1mechanics.js — Stage 1 post-prestige mechanic orchestrator.
//
// One deterministic hook the stage1 tick loop calls each tick: it bumps the game-tick counter and
// dispatches every UNLOCKED post-prestige mechanic. Also exposes the aggregate income multiplier
// (Cores yield × Flux × Resonance) the tick applies to passive + timed bit income.
//
// Everything here is tick-count driven (no Date.now / Math.random) so the headless smoke can
// fast-forward the whole post-prestige layer via __fvStage1.tick(n).

import { mechanicUnlocked } from './s1prestige.js';
import { coreIncomeMult } from './s1cores.js';
import { tickPipelines } from './s1pipeline.js';
import { tickFlux, fluxMult } from './s1flux.js';
import { tickEntropy } from './s1entropy.js';
import { tickEcho } from './s1echoes.js';

// Aggregate multiplier applied to bit income (passive accrual + timed payouts) in the tick loop.
export function incomeMult(state /*, cfg */) {
  let m = coreIncomeMult(state);
  if (mechanicUnlocked(state, 'flux')) m *= fluxMult(state);
  return m;
}

// Run one tick of every unlocked mechanic. Returns flags so the caller can repaint cheaply.
export function tickMechanics(state, cfg) {
  state.ticks = (state.ticks || 0) + 1;
  let producedUnits = false;
  if (mechanicUnlocked(state, 'pipeline')) producedUnits = tickPipelines(state, cfg) || producedUnits;
  if (mechanicUnlocked(state, 'flux')) tickFlux(state);
  if (mechanicUnlocked(state, 'entropy')) producedUnits = tickEntropy(state, cfg) || producedUnits;
  let echo = null;
  if (mechanicUnlocked(state, 'echoes')) echo = tickEcho(state, cfg);
  return { producedUnits, echo };
}
