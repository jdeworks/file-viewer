// panels.js — Stage 5 Signal Racer: pure DOM builders for the side-panel widgets (vehicle shop +
// ascension ladder). They take plain inputs and return arrays of <button>/<div> elements; the
// renderer owns the click wiring (via data- attributes) and repaint cadence. Kept out of renderer.js
// to hold both files under the soft LOC cap.

import { UPGRADES, levelOf, maxLevelOf, costOf, isMaxed } from './shop.js';

// Vehicle-shop rows: one button per part showing rank/max and the next-rank price (or ✓ when maxed).
export function shopButtonEls({ shop = {}, packets = 0, playing = false }) {
  return UPGRADES.map((u) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.buy = u.id;
    const level = levelOf(shop, u.id);
    const max = maxLevelOf(u.id);
    const maxed = isMaxed(shop, u.id);
    const cost = costOf(shop, u.id);
    btn.disabled = maxed || playing || Number(packets) < cost;
    btn.title = u.desc;
    btn.textContent = maxed ? `${u.label} ${level}/${max} ✓` : `${u.label} ${level}/${max} (${cost}p)`;
    return btn;
  });
}

// Muted per-round packet-reward estimate span for a round-selector button (renderer appends it).
export function roundEstEl(low, high) {
  const span = document.createElement('span');
  span.className = 's5-round-est';
  span.textContent = ` ~${low}–${high}p`;
  return span;
}

// Ascension rungs (0 = base .. maxUnlocked). Empty until the stage's been beaten once (replay depth).
export function ascensionPanelEls({ ascension, defeated = false, playing = false, mods = [] }) {
  const unlocked = ascension.maxUnlocked();
  if (!defeated || unlocked <= 0 || ascension.maxLevel <= 0) return [];
  const head = document.createElement('div');
  head.className = 's5-asc-head';
  head.textContent = `ASCENSION (cleared A${ascension.maxCleared()})`;
  const sel = ascension.level();
  const buttons = [];
  for (let lvl = 0; lvl <= unlocked; lvl += 1) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.ascend = String(lvl);
    btn.disabled = playing;
    btn.textContent = `A${lvl}${sel === lvl ? ' ✓' : ''}`;
    const mod = mods.find((m) => m.level === lvl);
    if (mod) btn.title = `${mod.label} — ${mod.desc}`;
    if (sel === lvl) btn.classList.add('s5-asc-active');
    buttons.push(btn);
  }
  return [head, ...buttons];
}
