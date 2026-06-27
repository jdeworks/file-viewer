// s1cores.js — Stage 1 Cores meta-currency: permanent, cross-run upgrades bought with Cores
// (earned on prestige). These PERSIST across prestige resets, so a prestige is real progress, not
// just "the same loop faster". Pure / deterministic.

export const CORE_UPGRADES = [
  { id: 'core-yield',     icon: '📈', name: 'Overclock',    max: 10, cost: (l) => 1 + l,
    desc: '+10% to ALL bit income per level',
    effect: (l) => ({ incomeMult: 1 + 0.10 * l }) },
  { id: 'core-startmult', icon: '✖', name: 'Warm Cache',   max: 25, cost: (l) => 1 + l,
    desc: 'Start each run with +N Multiplier levels',
    effect: (l) => ({ start: { 's1-mult': l } }) },
  { id: 'core-startbox',  icon: '🧰', name: 'Cached Boxes', max: 10, cost: (l) => 2 + 2 * l,
    desc: 'Start each run with +N Bit Boxes',
    effect: (l) => ({ start: { 's1-box': l } }) },
  { id: 'core-automult',  icon: '🤖', name: 'Auto-Tapper',  max: 1,  cost: () => 3,
    desc: 'Auto-buys the Multiplier whenever you can afford it',
    effect: () => ({ autoMult: true }) },
];

export function coreLevel(state, id) { return ((state.coreUpgrades || {})[id]) || 0; }

export function coreCostOf(up, level) { return up.cost(level); }

export function canBuyCore(state, id) {
  const up = CORE_UPGRADES.find((u) => u.id === id);
  if (!up) return false;
  const lvl = coreLevel(state, id);
  return lvl < up.max && (state.cores || 0) >= coreCostOf(up, lvl);
}

export function buyCore(state, id) {
  if (!canBuyCore(state, id)) return false;
  const up = CORE_UPGRADES.find((u) => u.id === id);
  const lvl = coreLevel(state, id);
  state.cores = (state.cores || 0) - coreCostOf(up, lvl);
  state.coreUpgrades = state.coreUpgrades || {};
  state.coreUpgrades[id] = lvl + 1;
  return true;
}

// Aggregate effects across all owned core upgrades.
export function coreEffects(state) {
  const eff = { incomeMult: 1, start: {}, autoMult: false };
  for (const up of CORE_UPGRADES) {
    const lvl = coreLevel(state, up.id);
    if (lvl <= 0) continue;
    const e = up.effect(lvl);
    if (e.incomeMult) eff.incomeMult *= e.incomeMult;
    if (e.autoMult) eff.autoMult = true;
    if (e.start) for (const k in e.start) eff.start[k] = (eff.start[k] || 0) + e.start[k];
  }
  return eff;
}

export function coreIncomeMult(state) { return coreEffects(state).incomeMult; }

export function coreAutoMult(state) { return coreEffects(state).autoMult; }

// Seed a fresh post-prestige run with the starting tiers the player has bought (called by doPrestige).
export function applyCoreStartState(state) {
  const start = coreEffects(state).start;
  state.owned = state.owned || {};
  for (const k in start) if (start[k] > 0) state.owned[k] = (state.owned[k] || 0) + start[k];
}
