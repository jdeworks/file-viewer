// s1flux.js — Stage 1 post-prestige mechanic #2: FLUX (unlocked at prestige depth 2).
//
// A burst meter charges over time. The decision: ride it to 100% for a big ×3 income window that
// fires automatically, OR cash it early for an immediate but smaller ×1.5 window. DETERMINISTIC:
// the meter charges per game TICK (state.ticks-driven), never wall-clock.

const FLUX_CHARGE_PER_TICK = 0.8;   // ~125 ticks (~12.5 s) to fill from empty
const FLUX_BOOST_TICKS = 100;        // a fired boost lasts ~10 s
const RIDE_MULT = 3;                 // reaching 100% auto-fires ×3
const CASH_MULT = 1.5;               // cashing early grants ×1.5

function fluxState(state) {
  if (!state.flux || typeof state.flux !== 'object') state.flux = { meter: 0, boostMult: 1, boostTicks: 0 };
  return state.flux;
}

// Current income multiplier from an active flux boost (1 when none).
export function fluxMult(state) {
  const f = fluxState(state);
  return f.boostTicks > 0 ? f.boostMult : 1;
}

export function fluxMeter(state) { return fluxState(state).meter; }
export function fluxBoostTicks(state) { return fluxState(state).boostTicks; }
export function fluxCanCash(state) {
  const f = fluxState(state);
  return f.boostTicks <= 0 && f.meter > 0 && f.meter < 100;
}

// Cash the meter early for a guaranteed ×1.5 window. Returns true if it fired.
export function cashFlux(state) {
  const f = fluxState(state);
  if (!fluxCanCash(state)) return false;
  f.boostMult = CASH_MULT;
  f.boostTicks = FLUX_BOOST_TICKS;
  f.meter = 0;
  return true;
}

// Advance one tick: decay an active boost, else charge the meter; auto-fire ×3 at 100%.
export function tickFlux(state) {
  const f = fluxState(state);
  if (f.boostTicks > 0) {
    f.boostTicks -= 1;
    if (f.boostTicks <= 0) f.boostMult = 1;
    return;
  }
  f.meter = Math.min(100, f.meter + FLUX_CHARGE_PER_TICK);
  if (f.meter >= 100) {
    f.boostMult = RIDE_MULT;
    f.boostTicks = FLUX_BOOST_TICKS;
    f.meter = 0;
  }
}
