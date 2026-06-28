// Glyph Shop — spend BANKED glyphs on permanent (roguelite) upgrades. Purchases are stored
// in state.meta.shopUpgrades and applied to the run entity when the next run begins
// (rollEntity in data.js), so progress survives deaths. Only banked glyphs are spendable;
// glyphs picked up in the current run bank when you die or retreat.

import { SHOP_UPGRADES, upgradeCost, RUN_MODS, HEAT_PER_MOD, runHeat } from "./data.js";

export function buildShopPanel({ state, save, onClose }) {
  const box = document.createElement("div");
  box.className = "s2-shop";
  let tab = "buy"; // "buy" (glyph upgrades) | "heat" (opt-in difficulty) — split so the panel stays short

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

  // Heat toggle row: opt into a harder run for a bigger banked-glyph multiplier (C3). Each mod
  // carries its own heatBonus (Lights Out is the richest); a mod with an `unlock` only appears once
  // its condition is met (D4: Lights Out surfaces after you've reached the Overflow).
  function modHtml(mod) {
    const on = Boolean((state.meta.runMods || {})[mod.id]);
    return `<div class="s2-shop-row">
      <div class="s2-shop-info">
        <strong>${mod.name}</strong> <span class="s2-shop-lv">+${Math.round((mod.heatBonus || HEAT_PER_MOD) * 100)}% glyphs</span>
        <div class="s2-shop-desc">${mod.desc}</div>
      </div>
      <button type="button" data-mod="${mod.id}" class="${on ? "s2-mod-on" : ""}">${on ? "ON" : "off"}</button>
    </div>`;
  }

  function paint() {
    const banked = Number(state.meta.glyphsBanked || 0);
    const heat = runHeat(state.meta.runMods || {});
    const onBuy = tab === "buy";
    const headExtra = onBuy
      ? `<span class="s2-shop-bank"><span class="s2-c-glyph">${banked}</span> banked</span>`
      : `<span class="s2-shop-bank">×${heat.toFixed(2)} glyphs</span>`;
    const note = onBuy
      ? "applies when your next run begins (after death / retreat). only banked glyphs spend."
      : "tougher runs bank more glyphs. takes effect next run.";
    const mods = RUN_MODS.filter((m) => !m.unlock || m.unlock(state.meta));
    const list = onBuy ? SHOP_UPGRADES.map(rowHtml).join("") : mods.map(modHtml).join("");
    box.innerHTML = `
      <div class="s2-shop-head">GLYPH SHOP
        ${headExtra}
        <button type="button" data-shop="close" class="s2-shop-x" aria-label="close shop">&#10005;</button>
      </div>
      <div class="s2-shop-tabs" role="tablist">
        <button type="button" data-tab="buy" class="s2-shop-tab${onBuy ? " s2-tab-on" : ""}" role="tab" aria-selected="${onBuy}">Buy</button>
        <button type="button" data-tab="heat" class="s2-shop-tab${onBuy ? "" : " s2-tab-on"}" role="tab" aria-selected="${!onBuy}">Heat</button>
      </div>
      <div class="s2-shop-note">${note}</div>
      <div class="s2-shop-list">${list}</div>`;
    box.querySelectorAll("[data-buy]").forEach((b) => b.addEventListener("click", () => buy(b.dataset.buy)));
    box.querySelectorAll("[data-mod]").forEach((b) => b.addEventListener("click", () => toggleMod(b.dataset.mod)));
    box.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { tab = b.dataset.tab; paint(); }));
    box.querySelector('[data-shop="close"]').addEventListener("click", () => onClose());
  }

  function toggleMod(id) {
    const meta = state.meta;
    meta.runMods = meta.runMods || {};
    meta.runMods[id] = !meta.runMods[id];
    if (typeof save === "function") save();
    paint();
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
