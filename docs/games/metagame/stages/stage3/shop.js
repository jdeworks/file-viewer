// Defrag upgrades (#7) — spend REGISTERS (earned per solved snapshot) on permanent upgrades that make
// the loop deeper. Levels live in state.shopUpgrades and apply to every future snapshot, so progress
// survives the run. Mirrors the Stage 2 glyph shop. UX audit M1: there is no longer a standalone shop
// menu — these upgrades are OFFERED as cards inside the boon draft (the ONE acquisition surface, see
// s3draft.js). This file stays the pure economy: the upgrade table + cost/buy logic + a card renderer.

export const SHOP_UPGRADES = [
  { id: "prefetch", name: "Prefetch Cache", desc: "+1 correct cell pre-filled each snapshot", max: 6 },
  { id: "throughput", name: "Throughput", desc: "+25% registers per solve", max: 5 },
  { id: "oracle", name: "Oracle", desc: "+1 hint (reveal a correct cell) per snapshot", max: 4 },
  { id: "parity", name: "Parity Unit", desc: "+1 integrity check (flag wrong fills) per snapshot", max: 3 },
  { id: "overclock", name: "Overclock", desc: "+1 to the maximum grid size (deeper, richer snapshots)", max: 5 },
  // Paid in RETAINED fragments (not registers) — gives the slow fragment currency a real sink.
  { id: "engram", name: "Engram Bank", desc: "+1 Oracle hint per snapshot — paid in retained fragments", max: 4, currency: "retained" }
];

const BASE = { prefetch: 40, throughput: 80, oracle: 60, parity: 70, overclock: 150 };
const GROWTH = { prefetch: 1.7, throughput: 1.9, oracle: 1.8, parity: 1.8, overclock: 2.0 };
// Retained-fragment upgrades cost a small LINEAR amount (fragments accrue ~1 per 4 solves).
const RETAINED_BASE = { engram: 2 };

const ACTIVE = new Set(["prefetch", "throughput", "overclock", "oracle", "parity", "engram"]);

// Currency an upgrade is bought with: "retained" fragments or (default) "registers".
export function upgradeCurrency(id) {
  return (SHOP_UPGRADES.find((u) => u.id === id) || {}).currency === "retained" ? "retained" : "registers";
}

export function upgradeCost(id, level) {
  if (upgradeCurrency(id) === "retained") return (RETAINED_BASE[id] || 2) + level; // e.g. engram: 2,3,4,5
  return Math.round((BASE[id] || 50) * (GROWTH[id] || 1.8) ** level);
}

export function upgradeLevel(state, id) {
  return Number((state.shopUpgrades || {})[id] || 0);
}

// All purchasable upgrades, in display order.
export function shopUpgradeList() {
  return SHOP_UPGRADES.filter((u) => ACTIVE.has(u.id));
}

// The upgrades still worth offering in a draft (not yet maxed) — the pool the acquisition surface
// draws its "pay registers" cards from.
export function availableUpgrades(state) {
  return shopUpgradeList().filter((u) => upgradeLevel(state, u.id) < u.max);
}

// HTML for ONE upgrade's card (name, level, description, cost, buy button) — rendered in the unified
// acquisition modal (s3draft.js) next to the free boon cards.
export function shopPageHtml(state, up) {
  const lvl = upgradeLevel(state, up.id);
  const maxed = lvl >= up.max;
  const cost = upgradeCost(up.id, lvl);
  const retained = upgradeCurrency(up.id) === "retained";
  const bank = Number((retained ? state.retained : state.registers) || 0);
  const afford = !maxed && bank >= cost;
  const unit = retained ? "frag" : "reg";
  return `<div class="s3-item s3-item-upgrade">
    <div class="s3-item-name"><strong>${up.name}</strong> <span class="s3-shop-lv">Lv ${lvl}/${up.max}</span> <span class="s3-item-tag">upgrade · pay</span></div>
    <div class="s3-item-desc">${up.desc}</div>
    <div class="s3-item-cost">cost: ${maxed ? "—" : cost + " " + unit}</div>
    <button type="button" class="s3-item-action" data-buy="${up.id}" ${maxed || !afford ? "disabled" : ""}>${maxed ? "MAXED" : afford ? `buy · ${cost} ${unit}` : `need ${cost} ${unit}`}</button>
  </div>`;
}

// Spend currency on an upgrade level. Returns true if a purchase happened.
export function buyUpgrade(state, save, id) {
  const up = SHOP_UPGRADES.find((u) => u.id === id);
  if (!up) return false;
  state.shopUpgrades = state.shopUpgrades || {};
  const lvl = Number(state.shopUpgrades[id] || 0);
  if (lvl >= up.max) return false;
  const cost = upgradeCost(id, lvl);
  const retained = upgradeCurrency(id) === "retained";
  const bank = Number((retained ? state.retained : state.registers) || 0);
  if (bank < cost) return false;
  if (retained) state.retained = bank - cost; else state.registers = bank - cost;
  state.shopUpgrades[id] = lvl + 1;
  save?.();
  return true;
}
