// card-face.js — shared Stage 6 card-face markup (combat hand + inspect close-up + reward/shop).
//
// One renderer so every surface shows the same face: a coloured type STRIP across the top, the
// display NAME as the title, a cost pip, an upgrade "+" BADGE (never a name suffix — the id stays the
// engine key), and the rules text. Pure strings; callers wrap it in a `.s6db-card .<typeClass>` node.

import { cardById } from "./cards.js";

// The archetype modifier class that drives the type-strip colour + border in CSS.
export function cardTypeClass(card) {
  return `s6db-card--${(card?.type || "").toLowerCase()}`;
}

// Inner HTML for a card face. `id` may be a base or an upgraded "<ID>+" id.
export function cardFaceInner(id) {
  const card = cardById(id);
  const upgraded = Boolean(card?.upgraded) || (typeof id === "string" && id.endsWith("+"));
  const name = card?.name || String(id).replace(/\+$/, "");
  return `
    <span class="s6db-card-strip" aria-hidden="true"></span>
    <span class="s6db-card-cost">${card?.cost ?? "?"}</span>
    ${upgraded ? `<span class="s6db-card-badge" title="upgraded">+</span>` : ""}
    <strong class="s6db-card-name">${esc(name)}</strong>
    <span class="s6db-card-type">${esc(card?.type || "")}</span>
    <small class="s6db-card-text">${esc(card?.text || "")}</small>`;
}

function esc(value) {
  return String(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
}
