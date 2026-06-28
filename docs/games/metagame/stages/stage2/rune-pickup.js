// Rune-pickup card — a small modal shown when you collect a ♦ rune, naming it + how to use it.
// Pure presentation; shares the overlay placement/dismiss path with the shop & help panels so it
// dims over the dungeon screen and pauses play while open (the renderer's `overlay` guard).

import { CONSUMABLES, CONSUMABLE_KEYS } from "./consumables.js";

export function buildRunePickupPanel({ type, onClose }) {
  const def = CONSUMABLES[type];
  const slot = CONSUMABLE_KEYS.indexOf(type) + 1;
  const box = document.createElement("div");
  box.className = "s2-rune";
  box.innerHTML = `
    <div class="s2-rune-head">RUNE FOUND
      <button type="button" data-rune="close" class="s2-rune-x" aria-label="close rune card">&#10005;</button>
    </div>
    <div class="s2-rune-body">
      <span class="s2-rune-glyph">${def ? def.glyph : "♦"}</span>
      <div class="s2-rune-info">
        <div class="s2-rune-name">${def ? def.name : `${type} rune`}</div>
        <p class="s2-rune-desc">${def ? def.desc : ""}</p>
        <p class="s2-rune-key">banked to your pack${slot > 0 ? ` — press [${slot}] or its button to use` : ""}.</p>
      </div>
    </div>`;
  box.querySelector('[data-rune="close"]').addEventListener("click", () => onClose());
  return { el: box };
}
