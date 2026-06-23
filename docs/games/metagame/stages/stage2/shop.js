// Glyph Shop — spend BANKED glyphs on permanent (roguelite) upgrades. Purchases are stored
// in state.meta.shopUpgrades and applied to the run entity when the next run begins
// (rollEntity in data.js), so progress survives deaths. Only banked glyphs are spendable;
// glyphs picked up in the current run bank when you die or retreat.

import { SHOP_UPGRADES, upgradeCost } from "./data.js";

export function buildShopPanel({ state, save, onClose }) {
  const box = document.createElement("div");
  box.className = "s2-shop";

  function rowHtml(up) {
    const lvl = Number((state.meta.shopUpgrades || {})[up.id] || 0);
    const maxed = lvl >= up.max;
    const cost = upgradeCost(up.id, lvl);
    const banked = Number(state.meta.glyphsBanked || 0);
    const afford = !maxed && banked >= cost;
    const label = maxed ? "MAX" : `${cost} glyphs`;
    return `<div class="s2-shop-row">
      <div class="s2-shop-info">
        <strong>${up.name}</strong> <span class="s2-shop-lv">Lv ${lvl}/${up.max}</span>
        <div class="s2-shop-desc">${up.desc}</div>
      </div>
      <button type="button" data-buy="${up.id}" ${maxed || !afford ? "disabled" : ""}>${label}</button>
    </div>`;
  }

  function paint() {
    const banked = Number(state.meta.glyphsBanked || 0);
    box.innerHTML = `
      <div class="s2-shop-head">GLYPH SHOP
        <span class="s2-shop-bank"><span class="s2-c-glyph">${banked}</span> banked</span>
        <button type="button" data-shop="close" class="s2-shop-x" aria-label="close shop">&#10005;</button>
      </div>
      <div class="s2-shop-note">applies when your next run begins (after death / retreat). only banked glyphs spend.</div>
      <div class="s2-shop-list">${SHOP_UPGRADES.map(rowHtml).join("")}</div>`;
    box.querySelectorAll("[data-buy]").forEach((b) => b.addEventListener("click", () => buy(b.dataset.buy)));
    box.querySelector('[data-shop="close"]').addEventListener("click", () => onClose());
  }

  function buy(id) {
    const up = SHOP_UPGRADES.find((u) => u.id === id);
    if (!up) return;
    const meta = state.meta;
    meta.shopUpgrades = meta.shopUpgrades || {};
    const lvl = Number(meta.shopUpgrades[id] || 0);
    if (lvl >= up.max) return;
    const cost = upgradeCost(id, lvl);
    if (Number(meta.glyphsBanked || 0) < cost) return;
    meta.glyphsBanked = Number(meta.glyphsBanked || 0) - cost;
    meta.shopUpgrades[id] = lvl + 1;
    if (typeof save === "function") save();
    paint();
  }

  paint();
  return { el: box, paint };
}
