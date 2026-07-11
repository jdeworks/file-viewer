// shop.js — Stage 5 Signal Racer: the vehicle stats. THREE stats a racer reads at a glance —
// ENGINE (speed / overclock), HULL (integrity / collisions), SIGNAL (packets / read / static) —
// each a multi-rank line (price = round(cost × costScale^level)). Buying a rank folds its effect()
// into the run's tuning so upgrades matter across EVERY archetype. Data-driven (mirrors shared/
// shop.js's levels + costScale idiom) but operates on the stage's own packet currency (state.packets)
// and level map (state.shop[id]) so the PURE game-loop reads applyUpgrades(state.shop) with no
// economy/save plumbing — keeping the loop deterministic and Node-testable.
//
// 2026-07-03 (UX audit M1 + approved OPTION): the previous SEVEN parts (Engine/Chassis/Cooling/Nav/
// Traction/Signal Amp/Noise Filter) collapse into these three. ENGINE = old engine+cooling, HULL =
// old chassis+traction, SIGNAL = old nav+amp+filter. Crucially the three OLD signal sub-effects are
// merged into ONE curve (see the SIGNAL effect comment) rather than kept as hidden sub-effects.
// migrateShop() maps any existing save's purchased ranks onto the three lines (summed, clamped) so no
// purchase is ever lost. The upgrade DECISION now arrives as a between-round PIT STOP (see pitstop.js
// + overlay.js); this module is the shared data + pure buy/level math both the pit stop and the loop
// read.

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
  { id: 'engine', label: 'Engine', desc: 'Speed & overclock — faster top speed and stronger, longer bursts.',
    cost: 45, costScale: 1.45, maxLevel: 7,
    effect: (t, l) => {
      t.topSpeed = +(1 + 0.04 * l).toFixed(3);
      t.overclockSpeed = +(1.6 + 0.06 * l).toFixed(3);
      t.overclockBonusMs = 250 * l;
    } },
  { id: 'hull', label: 'Hull', desc: 'Integrity & collisions — more hull, and hits/off-beat switches cost less.',
    cost: 50, costScale: 1.45, maxLevel: 7,
    effect: (t, l) => {
      t.maxIntegrity = 100 + 8 * l;
      t.offBeatPenalty = +Math.max(0, 1 - 0.13 * l).toFixed(3);
      // Playtest fix (2026-07-11, "not winnable without damage"): rival lane-share BUMPS are a
      // damage source the hazard-glyph winnability proof (winnable-human.test.mjs) never modeled —
      // they're independent of the "safe lane" invariant, so even the omniscient autoSolve bot took
      // damage on 6/8 rounds. The old softening curve (1 - 0.13*l) only reached ~0.09 at maxLevel 7,
      // never truly 0 — a zero-damage clear was mathematically impossible at ANY Hull investment.
      // Linear-to-exactly-0 at max level makes a genuine zero-damage clear achievable (earned via a
      // maxed Hull, not the default outcome of a fresh run) — see tests/zero-damage.test.mjs.
      t.bumpDamage = +Math.max(0, 1 - l / 7).toFixed(3);
      t.bumpSlow = +Math.max(0.1, 0.5 - 0.055 * l).toFixed(3);
    } },
  { id: 'signal', label: 'Signal', desc: 'One clean signal curve — more packets, longer read, tougher against static.',
    cost: 48, costScale: 1.4, maxLevel: 8,
    effect: (t, l) => {
      // MERGED SIGNAL CURVE (user-approved OPTION, 2026-07-03). The old Nav Array (look-ahead),
      // Signal Amp (gate value + packet multiplier) and Noise Filter (static resistance) are no
      // longer three independently-tuned sub-effects: every SIGNAL rank drives ALL of them from the
      // SAME level `l`, so the stat reads as one progression ("a cleaner signal = more packets, a
      // longer read, and less bite from static"). Simpler to explain; the tuning tracks the old
      // ceilings closely (gate 5→21, mult 1→1.4, look-ahead 8→12, static 2→1.04).
      t.gateValue = 5 + 2 * l;
      t.packetMult = +(1 + 0.05 * l).toFixed(3);
      t.lookAhead = 8 + Math.floor(l / 2);
      t.noiseDamage = +Math.max(0.5, 2 - 0.12 * l).toFixed(3);
    } },
];

const byId = new Map(UPGRADES.map((u) => [u.id, u]));

// Legacy (pre-merge) part ids, in the groups they fold into. migrateShop() sums each group.
const LEGACY_GROUPS = {
  engine: ['engine', 'cooling'],
  hull: ['chassis', 'traction'],
  signal: ['navArray', 'signalAmp', 'noiseFilter'],
};
const LEGACY_ONLY = ['cooling', 'chassis', 'traction', 'navArray', 'signalAmp', 'noiseFilter'];

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

// Map any save's shop onto the three stats (summed per group, clamped to each stat's cap). A save
// that still holds the seven legacy parts is rebased so NO purchase is lost; a save already in the
// three-stat shape is left as-is (only sanitised/clamped). Idempotent. Pure. Called by normalizeState
// on load so the loop + pit stop always read the three-stat form.
export function migrateShop(shop) {
  if (!shop || typeof shop !== 'object') return {};
  const lv = (k) => Math.max(0, Math.floor(Number(shop[k]) || 0));
  const hasLegacy = LEGACY_ONLY.some((k) => Object.prototype.hasOwnProperty.call(shop, k));
  const out = {};
  for (const id of ['engine', 'hull', 'signal']) {
    const raw = hasLegacy ? LEGACY_GROUPS[id].reduce((s, k) => s + lv(k), 0) : lv(id);
    const clamped = Math.min(maxLevelOf(id), raw);
    if (clamped > 0) out[id] = clamped;
  }
  return out;
}

// Buy the next rank of a stat: debit packets, raise the level. Returns { bought, reason, cost, level }.
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
