// upgrades.js — Stage 4 Fractal Bastion: tower economy (sell / upgrade / extractor income). Pure
// state mutations, no DOM. The renderer (B4) wires these to buttons; engine calls extractor income.

import { TOWER_TYPES, towerUpgradeCost } from "./towers.js";
import { towerStat } from "./forks.js";

// Sell a tower for a 70% refund of its total invested cost (base × 2^(level-1)).
export function sellTower(state, towerId) {
  const idx = (state.towers || []).findIndex((t) => t.id === towerId);
  if (idx < 0) return { ok: false, reason: "not-found" };
  const tower = state.towers[idx];
  const base = TOWER_TYPES[tower.type]?.cost || 0;
  const invested = base * Math.pow(2, (tower.level || 1) - 1);
  const refund = Math.floor(invested * 0.7);
  state.cycles = (state.cycles || 0) + refund;
  state.towers.splice(idx, 1);
  return { ok: true, refund };
}

// Upgrade a tower one level (rejects at L3 or when too poor).
export function upgradeTower(state, towerId) {
  const tower = (state.towers || []).find((t) => t.id === towerId);
  if (!tower) return { ok: false, reason: "not-found" };
  const level = tower.level || 1;
  if (level >= 3) return { ok: false, reason: "max-level" };
  const cost = towerUpgradeCost(tower.type, level);
  if ((state.cycles || 0) < cost) return { ok: false, reason: "poor", cost };
  state.cycles -= cost;
  tower.level = level + 1;
  return { ok: true, level: tower.level, cost };
}

// Cycle income from all cycle-extractor towers (called by engine.waveComplete). Returns the income.
export function applyExtractorIncome(state) {
  let income = 0;
  for (const tower of state.towers || []) {
    const def = TOWER_TYPES[tower.type];
    if (def?.incomePerWave) income += towerStat(tower, 'incomePerWave'); // tier-3 fork scales income
  }
  state.cycles = (state.cycles || 0) + income;
  return income;
}
