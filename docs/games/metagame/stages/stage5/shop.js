// shop.js — Stage 5 Signal Racer: the multi-rank VEHICLE shop. Seven parts, each with several
// cost-scaled ranks (price = round(cost × costScale^level)); buying a rank folds its effect() into
// the run's tuning, so upgrades matter across EVERY archetype (top speed, hull, overclock potency,
// look-ahead, handling, reward value, static resistance). Data-driven (mirrors shared/shop.js's
// levels + costScale + applyAll idiom) but operates directly on the stage's own packet currency
// (state.packets) and level map (state.shop[id]) so the PURE game-loop reads applyUpgrades(state.shop)
// with no economy/save plumbing — keeping the loop deterministic and Node-testable.

export const BASE_TUNING = {
  noiseDamage: 2,        // ░ static hit damage
  topSpeed: 1,           // base race pace (distance/tick)
  maxIntegrity: 100,     // hull cap
  overclockSpeed: 1.6,   // pace while an overclock buff is live
  overclockBonusMs: 0,   // extra overclock duration
  lookAhead: 8,          // rows of track drawn ahead
  offBeatPenalty: 1,     // integrity lost on an off-beat lane switch
  bumpDamage: 1,         // integrity lost sharing a lane with a rival
  bumpSlow: 0.5,         // speed lost on a bump
  gateValue: 5,          // packets per boost gate
  packetMult: 1,         // overall packet reward multiplier
};

export const UPGRADES = [
  { id: 'engine', label: 'Engine', desc: 'Higher top speed on every track.', cost: 50, costScale: 1.6, maxLevel: 4,
    effect: (t, l) => { t.topSpeed = +(1 + 0.07 * l).toFixed(3); } },
  { id: 'chassis', label: 'Chassis', desc: 'More hull integrity to spend on hits.', cost: 60, costScale: 1.6, maxLevel: 4,
    effect: (t, l) => { t.maxIntegrity = 100 + 12 * l; } },
  { id: 'cooling', label: 'Cooling', desc: 'Stronger, longer overclock bursts.', cost: 70, costScale: 1.7, maxLevel: 3,
    effect: (t, l) => { t.overclockSpeed = +(1.6 + 0.12 * l).toFixed(3); t.overclockBonusMs = 500 * l; } },
  { id: 'navArray', label: 'Nav Array', desc: 'See more rows ahead — read tunnels & forks sooner.', cost: 55, costScale: 1.7, maxLevel: 3,
    effect: (t, l) => { t.lookAhead = 8 + l; } },
  { id: 'traction', label: 'Traction', desc: 'Off-beat switches & rival bumps cost less.', cost: 50, costScale: 1.6, maxLevel: 3,
    effect: (t, l) => { t.offBeatPenalty = +Math.max(0, 1 - 0.3 * l).toFixed(3); t.bumpSlow = +Math.max(0.1, 0.5 - 0.12 * l).toFixed(3); t.bumpDamage = +Math.max(0, 1 - 0.3 * l).toFixed(3); } },
  { id: 'signalAmp', label: 'Signal Amp', desc: 'Boost gates & packet rewards pay more.', cost: 60, costScale: 1.6, maxLevel: 3,
    effect: (t, l) => { t.gateValue = 5 + 2 * l; t.packetMult = +(1 + 0.08 * l).toFixed(3); } },
  { id: 'noiseFilter', label: 'Noise Filter', desc: 'Less damage from ░ static.', cost: 55, costScale: 1.7, maxLevel: 2,
    effect: (t, l) => { t.noiseDamage = +Math.max(0.5, 2 - 0.75 * l).toFixed(3); } },
];

const byId = new Map(UPGRADES.map((u) => [u.id, u]));

export function levelOf(shop, id) {
  return Math.max(0, Math.floor(Number(shop?.[id]) || 0));
}

export function maxLevelOf(id) {
  const def = byId.get(id);
  return def ? Math.max(1, Number(def.maxLevel) || 1) : 0;
}

export function isMaxed(shop, id) {
  return levelOf(shop, id) >= maxLevelOf(id);
}

// Price of the NEXT rank (or Infinity if maxed / unknown).
export function costOf(shop, id) {
  const def = byId.get(id);
  if (!def || isMaxed(shop, id)) return Infinity;
  const scale = Number.isFinite(Number(def.costScale)) ? Number(def.costScale) : 1;
  return Math.round((Number(def.cost) || 0) * Math.pow(scale, levelOf(shop, id)));
}

// Fold every owned rank's effect into a fresh tuning object (pure). game-loop reads this each run.
export function applyUpgrades(shop = {}, base = BASE_TUNING) {
  const t = { ...base };
  for (const def of UPGRADES) {
    const level = levelOf(shop, def.id);
    if (level > 0 && typeof def.effect === 'function') def.effect(t, level);
  }
  return t;
}

// Buy the next rank of a part: debit packets, raise the level. Returns { bought, reason, cost, level }.
export function buyUpgrade(state, id) {
  const def = byId.get(id);
  if (!def) return { bought: false, reason: 'unknown' };
  const shop = state.shop = (state.shop && typeof state.shop === 'object') ? state.shop : {};
  if (isMaxed(shop, id)) return { bought: false, reason: 'maxed' };
  const cost = costOf(shop, id);
  if (Number(state.packets || 0) < cost) return { bought: false, reason: 'insufficient', cost };
  state.packets = Number(state.packets) - cost;
  shop[id] = levelOf(shop, id) + 1;
  return { bought: true, reason: 'ok', cost, level: shop[id] };
}
