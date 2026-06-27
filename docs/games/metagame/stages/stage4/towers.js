// towers.js — Stage 4 Fractal Bastion: tower type definitions + upgrade costs (data only, no DOM).
// engine.js reads TOWER_TYPES for range/fire/damage; renderer reads cost/glyph for the shop.

export const TOWER_TYPES = {
  pulse_node:      { glyph: "[P]", cost: 80,  range: 3, fireRate: 1.0, damage: 20, damageType: "kinetic", role: "baseline single-target — cheap kinetic DPS, weak vs armor", ability: "emp_burst" },
  scatter_array:   { glyph: "[S]", cost: 150, range: 2, fireRate: 0.8, damage: 12, damageType: "kinetic", aoe: 2, role: "kinetic splash — clears swarms, falls off vs armor/shields", ability: "overcharge" },
  null_spike:      { glyph: "[N]", cost: 200, range: 4, fireRate: 0.5, damage: 40, damageType: "null", ignoresArmor: true, role: "null cannon — ignores armor AND shields, slow cadence", ability: "null_wave" },
  attractor_field: { glyph: "[A]", cost: 120, range: 3, fireRate: 0,   damage: 0,  slow: 0.5, role: "support — slows everything in range (the original slow field)" },
  resonance_hub:   { glyph: "[H]", cost: 250, range: 5, fireRate: 0,   damage: 0,  adjacencyBonus: 0.3, role: "support — +30% damage to each adjacent tower" },
  cycle_extractor: { glyph: "[E]", cost: 250, range: 0, fireRate: 0,   damage: 0,  incomePerWave: 25, role: "economy — pays Cycles every wave clear" }
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
