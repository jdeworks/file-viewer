// s1economy.js — Stage 1 economy math (pure ES module, no DOM, no localStorage)
//
// All functions take (state, cfg) where cfg is the Stage 1 config from stageByNumber(1).
// Bit-producing quantities (costs, payouts) return BigNum; scalar multipliers
// (clickPower, passiveRate, netRate, pull, achievMult) return plain JS numbers —
// callers apply them with mulScalar on a BigNum base.
//
// Spec: docs/games/metagame/design/04-game-plan.md §1.3, §1.4, §2.1, §4, §5, §6, §7, §8.

import { gte, lt, add, sub, mul, mulScalar, fromNumber, toNumber, norm, ZERO } from './bignum.js';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Cost functions (§4.1, §4.2)
// ─────────────────────────────────────────────────────────────────────────────

// Cost of buying the nth unit of tier t (0-indexed: 0th purchase = first unit).
// base × mult^n. t.base is BigNum, t.mult is a plain number. Returns BigNum.
export function costOf(t, n) {
  return mulScalar(t.base, Math.pow(t.mult, n));
}

// Total cost of buying n units starting at owned=k (§4.1 geometric series):
//   B × r^k × (r^n − 1) / (r − 1)
// Uses log space when r^k > 1e290 to avoid double overflow. Returns BigNum.
export function totalCost(t, owned, n) {
  if (n <= 0) return ZERO;
  const B = t.base;     // BigNum
  const r = t.mult;     // plain number
  if (r === 1) {
    // Degenerate flat-cost case (e.g. s1-cursor: mult:1, base:{m:0,e:0} → ZERO).
    return mulScalar(B, n);
  }
  const rk = Math.pow(r, owned);
  const rn = Math.pow(r, n);
  let factor;
  if (rk > 1e290) {
    // log space: exp(k·ln r + ln(r^n − 1) − ln(r − 1))
    const logFactor = owned * Math.log(r) + Math.log(rn - 1) - Math.log(r - 1);
    factor = Math.exp(logFactor);
  } else {
    factor = rk * (rn - 1) / (r - 1);
  }
  return mulScalar(B, factor);
}

// Max units affordable given bits on hand (BigNum), currently owned=k (§4.2).
// Closed-form fast path with binary-search precision correction. Returns number.
export function maxAffordable(bits, t, owned) {
  const B_num = toNumber(t.base);
  const bits_num = toNumber(bits);
  const r = t.mult;

  if (B_num === 0) return 0;   // free tier (s1-cursor) — avoid div-by-zero
  if (bits_num <= 0 || bits_num < B_num * Math.pow(r, owned)) return 0;

  if (r === 1) {
    // Flat cost: maxN = floor(bits / base).
    return Math.max(0, Math.floor(bits_num / B_num));
  }

  // Closed form.
  const arg = 1 + bits_num * (r - 1) / (B_num * Math.pow(r, owned));
  if (arg <= 0) return 0;
  let maxN = Math.floor(Math.log(arg) / Math.log(r));
  if (!isFinite(maxN) || maxN < 0) maxN = 0;

  // Binary-search correction for floating-point precision.
  while (maxN > 0 && !gte(bits, totalCost(t, owned, maxN))) maxN--;
  while (gte(bits, totalCost(t, owned, maxN + 1))) maxN++;

  return Math.max(0, maxN);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Multiplier stack (§1.4, §7, §8)
// ─────────────────────────────────────────────────────────────────────────────

// Π(state.pullFactors), or 1 if empty.
export function globalPull(state) {
  if (!state.pullFactors || !state.pullFactors.length) return 1;
  return state.pullFactors.reduce((acc, f) => acc * f, 1);
}

// 1.02 ^ achievements.length.
export function achievMult(state) {
  const n = (state.achievements || []).length;
  return Math.pow(1.02, n);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Click power (§1.4, §2.1) — returns plain number (scalar bits/tap)
// ─────────────────────────────────────────────────────────────────────────────

// clickPower = (1 + Σ click/mult upgrades) × (1 + owned[s1-quantum]) × globalPull × achievMult
// The constant 1 is the base 1 bit/tap (s1-cursor). s1-mult adds +amount per level
// (additive); s1-quantum multiplies ×(1 + level).
export function clickPower(state, cfg) {
  const owned = state.owned || {};
  // Additive click power from s1-mult (type:'click_mult', amount:1 per level).
  const additive = 1 + (owned['s1-mult'] || 0) * 1;
  // Quantum Tap: multiplicative ×(1 + owned[s1-quantum]).
  const quantum = 1 + (owned['s1-quantum'] || 0);
  const pull = globalPull(state);
  const ach = achievMult(state);
  return additive * quantum * pull * ach;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Passive rate (§1.4, §2.1) — returns plain number (bits/sec)
// ─────────────────────────────────────────────────────────────────────────────

// Σ(owned[id] × tier.rate) × globalPull × achievMult, over passive tiers.
export function passiveRate(state, cfg) {
  const owned = state.owned || {};
  const pull = globalPull(state);
  const ach = achievMult(state);
  let total = 0;
  for (const t of cfg.tiers) {
    if (t.type !== 'passive') continue;
    total += (owned[t.id] || 0) * t.rate;
  }
  return total * pull * ach;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Timed payout (§5.3, §2.1) — one completion payout, returns BigNum
// ─────────────────────────────────────────────────────────────────────────────

// timedPayout = baseAmount × owned × neuralMult × boostMult × globalPull × achievMult
//   neuralMult = 1 + 0.25 × owned[s1-neural]  (all timed payouts)
//   boostMult  = 1 + Σ (boost.perLevelPct × owned[boostTier]) for tiers boosting this one
export function timedPayout(state, cfg, tierId) {
  const owned = state.owned || {};
  const t = cfg.tiers.find(x => x.id === tierId);
  if (!t || t.type !== 'timed') return ZERO;

  const ownedCount = owned[tierId] || 0;
  if (ownedCount === 0) return ZERO;

  const pull = globalPull(state);
  const ach = achievMult(state);

  // Neural Net multiplier (applies to ALL timed payouts).
  const neuralMult = 1 + 0.25 * (owned['s1-neural'] || 0);

  // Cross-boost: any OTHER tier whose boost targets this tier (Signal Booster → Bit Box).
  let boostMult = 1;
  for (const bt of cfg.tiers) {
    if (bt.boost && bt.boost.targetId === tierId) {
      boostMult += bt.boost.perLevelPct * (owned[bt.id] || 0);
    }
  }

  const baseOutput = t.baseAmount * ownedCount;
  return mulScalar(fromNumber(baseOutput), neuralMult * boostMult * pull * ach);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Manager formulas (§6.2)
// ─────────────────────────────────────────────────────────────────────────────

// Hire cost for a manager at the given current level (0 = not hired). Buying L→L+1
// costs hireCost(mgr, L) = 10 × baseCost_of_managedTier × 1.15^level. Returns BigNum.
export function managerHireCost(mgr, level, cfg) {
  const managedTier = cfg.tiers.find(t => t.id === mgr.manages);
  if (!managedTier) return ZERO;
  const base10 = mulScalar(managedTier.base, 10);   // 10 × base cost of managed tier
  return mulScalar(base10, Math.pow(1.15, level));
}

// Running cost per second for one manager (plain number, bits/sec).
//   runningCost = 0.5 × hirePriceAtCurrentLevel × managerLevel^0.8
// where hirePriceAtCurrentLevel = price paid for the current level = hireCost(mgr, level−1).
// A level-0 (un-hired) manager costs 0.
export function managerRunCost(managerId, state, cfg) {
  const mgrState = (state.managers || {})[managerId];
  if (!mgrState || mgrState.level <= 0) return 0;
  const mgr = (cfg.managers || []).find(m => m.id === managerId);
  if (!mgr) return 0;
  const hirePriceAtLevel = toNumber(managerHireCost(mgr, mgrState.level - 1, cfg));
  return 0.5 * hirePriceAtLevel * Math.pow(mgrState.level, 0.8);
}

// Total manager cost per second over all hired, non-paused managers (plain number).
export function managerCostPerSec(state, cfg) {
  if (!cfg.managers) return 0;
  let total = 0;
  for (const mgr of cfg.managers) {
    const mgrState = (state.managers || {})[mgr.id];
    if (!mgrState || mgrState.level <= 0 || mgrState.paused) continue;
    total += managerRunCost(mgr.id, state, cfg);
  }
  return total;
}

// Auto-fire interval (ms) for a managed timed button at the given manager level (§5.6, §6.2).
//   autoInterval_ms = baseDuration / (1 + 0.3 × level)
export function autoInterval(baseDuration, level) {
  return baseDuration / (1 + 0.3 * level);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Net rate (§6.2) — plain number bits/sec, may be negative
// ─────────────────────────────────────────────────────────────────────────────

// netRate = autoTimedRate + passiveRate − managerCostPerSec
//   autoTimedRate = Σ over timed tiers with an active manager of
//                     timedPayout(tier) / (autoInterval_ms/1000)
export function netRate(state, cfg) {
  // Auto-timed rate: sum over timed tiers with an active (hired, non-paused) manager.
  let autoTimed = 0;
  if (cfg.managers) {
    for (const mgr of cfg.managers) {
      const mgrState = (state.managers || {})[mgr.id];
      if (!mgrState || mgrState.level <= 0 || mgrState.paused) continue;
      const t = cfg.tiers.find(x => x.id === mgr.manages);
      if (!t || t.type !== 'timed') continue;
      const payout = toNumber(timedPayout(state, cfg, t.id));
      const intervalSec = autoInterval(t.duration_ms, mgrState.level) / 1000;
      if (intervalSec > 0) autoTimed += payout / intervalSec;
    }
  }

  const passive = passiveRate(state, cfg);
  const mgrCost = managerCostPerSec(state, cfg);

  return autoTimed + passive - mgrCost;
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Buy tier (§1.3)
// ─────────────────────────────────────────────────────────────────────────────

// Buy n units of tier tierId. requestedN is a number or 'max'. Mutates state
// (subtracts bits, bumps owned[tierId] and totalBought). Optionally calls save(state).
// Returns the number of units actually bought (0 if it can't afford even one).
export function buyTier(state, cfg, tierId, requestedN, save) {
  const t = cfg.tiers.find(x => x.id === tierId);
  if (!t) return 0;

  const owned = state.owned || {};
  const k = owned[tierId] || 0;

  // Determine how many to buy.
  let n;
  if (requestedN === 'max') {
    n = maxAffordable(state.bits, t, k);
  } else {
    n = requestedN;
  }
  if (n <= 0) return 0;

  let cost = totalCost(t, k, n);
  if (!gte(state.bits, cost)) {
    // Can't afford the full requested count — fall back to the max affordable.
    n = maxAffordable(state.bits, t, k);
    if (n <= 0) return 0;
    cost = totalCost(t, k, n);
    if (!gte(state.bits, cost)) return 0;
  }

  state.bits = sub(state.bits, cost);
  state.owned = owned;
  state.owned[tierId] = k + n;
  state.totalBought = (state.totalBought || 0) + n;
  if (save) save(state);
  return n;
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Pull gain (§8.3)
// ─────────────────────────────────────────────────────────────────────────────

// Pull gained from a prestige. Input: totalBits as BigNum at time of reset.
//   pullGain = 1 + floor(log10(max(n, 1e6)) / 3 − 2) × 0.5
//   clamped to [0.1, PULL_GAIN_CAP] (PULL_GAIN_CAP = 50).
export function pullGain(totalBitsAtReset) {
  const n = toNumber(totalBitsAtReset);
  const logVal = Math.log10(Math.max(n, 1e6));
  const gain = 1 + Math.max(0, Math.floor(logVal / 3 - 2)) * 0.5;
  const PULL_GAIN_CAP = 50;
  return Math.max(0.1, Math.min(gain, PULL_GAIN_CAP));
}
