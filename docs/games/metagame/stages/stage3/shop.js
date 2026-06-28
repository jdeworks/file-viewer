// Defrag shop (#7) — spend REGISTERS (earned per solved snapshot) on permanent upgrades that make
// the loop deeper. Levels live in state.shopUpgrades and apply to every future snapshot, so progress
// survives the run. Mirrors the Stage 2 glyph shop. Pure-ish: an overlay panel + the upgrade table.

export const SHOP_UPGRADES = [
  { id: "prefetch", name: "Prefetch Cache", desc: "+1 correct cell pre-filled each snapshot", max: 6 },
  { id: "throughput", name: "Throughput", desc: "+25% registers per solve", max: 5 },
  { id: "oracle", name: "Oracle", desc: "+1 hint (reveal a correct cell) per snapshot", max: 4 },
  { id: "parity", name: "Parity Unit", desc: "+1 integrity check (flag wrong fills) per snapshot", max: 3 },
  { id: "overclock", name: "Overclock", desc: "+1 to the maximum grid size (deeper, richer snapshots)", max: 3 },
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

export function buildShopPanel({ state, save, onClose }) {
  const box = document.createElement("div");
  box.className = "s3-shop";

  function rowHtml(up) {
    const lvl = upgradeLevel(state, up.id);
    const maxed = lvl >= up.max;
    const cost = upgradeCost(up.id, lvl);
    const retained = upgradeCurrency(up.id) === "retained";
    const bank = Number((retained ? state.retained : state.registers) || 0);
    const afford = !maxed && bank >= cost;
    const unit = retained ? "frag" : "reg";
    return `<div class="s3-shop-row">
      <div>
        <strong>${up.name}</strong> <span class="s3-shop-lv">Lv ${lvl}/${up.max}</span>
        <div class="s3-shop-desc">${up.desc}</div>
      </div>
      <button type="button" data-buy="${up.id}" ${maxed || !afford ? "disabled" : ""}>${maxed ? "MAX" : cost + " " + unit}</button>
    </div>`;
  }

  function paint() {
    box.innerHTML = `
      <div class="s3-shop-head">DEFRAG SHOP
        <span class="s3-shop-bank">${Number(state.registers || 0)} reg · ${Number(state.retained || 0)} frag</span>
        <button type="button" data-shop="close" class="s3-shop-x" aria-label="close">&#10005;</button>
      </div>
      <div class="s3-shop-note">spend registers on permanent upgrades — they apply to every snapshot.</div>
      ${SHOP_UPGRADES.filter((u) => ACTIVE.has(u.id)).map(rowHtml).join("")}`;
    box.querySelectorAll("[data-buy]").forEach((b) => b.addEventListener("click", () => buy(b.dataset.buy)));
    box.querySelector('[data-shop="close"]').addEventListener("click", () => onClose());
  }

  function buy(id) {
    const up = SHOP_UPGRADES.find((u) => u.id === id);
    if (!up) return;
    state.shopUpgrades = state.shopUpgrades || {};
    const lvl = Number(state.shopUpgrades[id] || 0);
    if (lvl >= up.max) return;
    const cost = upgradeCost(id, lvl);
    const retained = upgradeCurrency(id) === "retained";
    const bank = Number((retained ? state.retained : state.registers) || 0);
    if (bank < cost) return;
    if (retained) state.retained = bank - cost; else state.registers = bank - cost;
    state.shopUpgrades[id] = lvl + 1;
    save?.();
    paint();
  }

  paint();
  return { el: box };
}
