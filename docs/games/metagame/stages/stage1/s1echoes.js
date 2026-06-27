// s1echoes.js — Stage 1 post-prestige mechanic #4: DEFRAG ECHOES (unlocked at prestige depth 4).
//
// A corrupted glyph periodically spawns; click it within ~90 s or lose 20% of your bits. A light
// attention mechanic that rehearses the boss click-contest. DETERMINISTIC: spawn/expiry are counted
// in game TICKS (state.ticks), never wall-clock; the penalty/reward are pure BigNum ops.

import { mulScalar, fromNumber, add } from './bignum.js';
import { passiveRate } from './s1economy.js';

const ECHO_INTERVAL = 1200;   // 2 minutes between echoes
const ECHO_TTL = 900;         // 90 seconds to click one
const MISS_PENALTY = 0.8;     // miss → keep 80% of bits (lose 20%)
const REWARD_SECONDS = 60;    // click → bank ~60 s of passive income

function echoState(state) {
  if (!state.echo || typeof state.echo !== 'object') state.echo = { active: false, spawnTick: 0, expireTick: 0, lastTick: 0 };
  return state.echo;
}

export function echoActive(state) { return Boolean(echoState(state).active); }

// Ticks left before the active echo expires (0 if none).
export function echoTimeLeft(state) {
  const e = echoState(state);
  return e.active ? Math.max(0, e.expireTick - (state.ticks || 0)) : 0;
}

// Resolve the active echo (player clicked it): clear it and bank a small reward. Returns true if one
// was active.
export function clickEcho(state, cfg) {
  const e = echoState(state);
  if (!e.active) return false;
  e.active = false;
  e.lastTick = state.ticks || 0;
  const reward = fromNumber(passiveRate(state, cfg) * REWARD_SECONDS);
  state.bits = add(state.bits, reward);
  state.totalBits = add(state.totalBits, reward);
  return true;
}

// Advance one tick: spawn an echo on cadence, or expire one (with the 20% penalty). Returns
// { spawned, expired } so the UI can react.
export function tickEcho(state /*, cfg */) {
  const e = echoState(state);
  const now = state.ticks || 0;
  if (e.active) {
    if (now >= e.expireTick) {
      e.active = false;
      e.lastTick = now;
      state.bits = mulScalar(state.bits, MISS_PENALTY);
      return { spawned: false, expired: true };
    }
    return { spawned: false, expired: false };
  }
  if (now - (e.lastTick || 0) >= ECHO_INTERVAL) {
    e.active = true;
    e.spawnTick = now;
    e.expireTick = now + ECHO_TTL;
    return { spawned: true, expired: false };
  }
  return { spawned: false, expired: false };
}
