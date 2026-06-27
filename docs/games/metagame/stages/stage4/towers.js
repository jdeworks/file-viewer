// towers.js — Stage 4 Fractal Bastion: tower type definitions + upgrade costs (data only, no DOM).
// engine.js reads TOWER_TYPES for range/fire/damage; renderer reads cost/glyph for the shop.

export const TOWER_TYPES = {
  // ── original six ──────────────────────────────────────────────────────────────────────────────
  pulse_node:      { glyph: "[P]", cost: 80,  range: 3, fireRate: 1.0, damage: 20, damageType: "kinetic", role: "baseline single-target — cheap kinetic DPS, weak vs armor", ability: "emp_burst" },
  scatter_array:   { glyph: "[S]", cost: 150, range: 2, fireRate: 0.8, damage: 12, damageType: "kinetic", aoe: 2, role: "kinetic splash — clears swarms, falls off vs armor/shields", ability: "overcharge" },
  null_spike:      { glyph: "[N]", cost: 200, range: 4, fireRate: 0.5, damage: 40, damageType: "null", ignoresArmor: true, role: "null cannon — ignores armor AND shields, slow cadence", ability: "null_wave" },
  attractor_field: { glyph: "[A]", cost: 120, range: 3, fireRate: 0,   damage: 0,  slow: 0.5, role: "support — slows everything in range (the original slow field)" },
  resonance_hub:   { glyph: "[H]", cost: 250, range: 5, fireRate: 0,   damage: 0,  adjacencyBonus: 0.3, role: "support — +30% damage to each adjacent tower" },
  cycle_extractor: { glyph: "[E]", cost: 250, range: 0, fireRate: 0,   damage: 0,  incomePerWave: 25, role: "economy — pays Cycles every wave clear" },
  // ── expanded roster (depth pass): each has a clear role + synergy ──────────────────────────────
  // Crowd-control: stacks chill that ramps to a FULL FREEZE; arc chip damage also bleeds shields.
  frost_lattice:   { glyph: "[F]", cost: 140, range: 3, fireRate: 1.2, damage: 8,  damageType: "arc", onHit: [{ kind: "chill", stacks: 22, ms: 1600 }], role: "control — chill→freeze; pairs with high-burst single-target", ability: "emp_burst" },
  // Sustained thermal DoT: low hit, big burn — answers armor (thermal bypasses it) + fat HP pools.
  thermal_loop:    { glyph: "[T]", cost: 160, range: 3, fireRate: 1.0, damage: 6,  damageType: "thermal", onHit: [{ kind: "burn", dps: 14, ms: 2500 }], role: "anti-armor DoT — burn melts armored/tanky lines", ability: "overcharge" },
  // Arc chain: hits the 3 nearest enemies to its focus — the shield/swarm answer.
  chain_resonator: { glyph: "[C]", cost: 190, range: 4, fireRate: 0.9, damage: 16, damageType: "arc", chain: 3, role: "arc chain (3 targets) — shreds shields + clustered swarms", ability: "emp_burst" },
  // Anti-elite sniper: one huge null hit on the strongest target, long range, very slow cadence.
  long_recursor:   { glyph: "[L]", cost: 260, range: 7, fireRate: 0.35, damage: 130, damageType: "null", defaultTarget: "strongest", role: "anti-elite sniper — one big null hit, ignores armor/shield", ability: "overcharge" },
  // Mortar: targets ANYWHERE on the board (range-independent) and splashes around its focus.
  glyph_mortar:    { glyph: "[M]", cost: 220, range: 99, fireRate: 0.5, damage: 26, damageType: "thermal", aoe: 3, global: true, role: "global mortar — splash anywhere; reaches leaks the front missed", ability: "overcharge" },
  // Shred support: tiny damage, but strips armor so kinetic towers cut deep (MATCH enabler).
  shatter_drill:   { glyph: "[D]", cost: 150, range: 3, fireRate: 1.5, damage: 4,  damageType: "kinetic", onHit: [{ kind: "shred", armor: 0.25, ms: 2200 }], role: "support — shred armor so kinetic towers land full damage", ability: "null_wave" },
  // Gravity field: slows hard AND pulls enemies back along the path → clusters them for AoE/chain.
  gravity_well:    { glyph: "[G]", cost: 200, range: 3, fireRate: 0,   damage: 0,  slow: 0.4, pull: 0.6, role: "support — slow + pull-back; clusters for scatter/mortar/chain" },
  // Economy v2: scaling per-wave income that grows as the campaign deepens (data-set later).
  bank_node:       { glyph: "[B]", cost: 300, range: 0, fireRate: 0,   damage: 0,  incomePerWave: 40, role: "economy v2 — bigger per-wave payout than the extractor" }
};

// Per-tower targeting priority. The engine's selectTarget() reads tower.targetMode; players cycle it
// from the roster. 'first' (furthest-along) is the default and matches the legacy single-target rule.
export const TARGET_MODES = ['first', 'last', 'closest', 'strongest', 'weakest'];

// Level-3 active abilities (unlocked at max level). Engine/abilities.js consume these.
export const TOWER_ABILITIES = {
  emp_burst:  { label: "EMP Burst",  radius: 5, stunMs: 2000, cooldownMs: 30000 },
  null_wave:  { label: "Null Wave",  stripMs: 5000, cooldownMs: 60000 },
  overcharge: { label: "Overcharge", multiplier: 3, durationMs: 3000, cooldownMs: 45000 }
};

// Upgrade cost from `fromLevel` → next. L1→L2 = cost×2, L2→L3 = cost×4. Beyond L3 = Infinity (maxed).
export function towerUpgradeCost(type, fromLevel) {
  const def = TOWER_TYPES[type];
  if (!def) return Infinity;
  if (fromLevel === 1) return def.cost * 2;
  if (fromLevel === 2) return def.cost * 4;
  return Infinity;
}
