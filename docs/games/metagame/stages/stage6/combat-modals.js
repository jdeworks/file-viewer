// combat-modals.js — Stage 6 combat on-demand overlays (UX audit stage6 #1/#6): the draw/discard/
// exhaust pile card-lists and the full combat log, each opened from a dock/arena chip through the
// shared modal (docs/games/metagame/shared/modal.js, F6). Transient (portaled to <body>) — a combat
// re-render underneath does not disturb them, so opening one neither saves nor mutates engine state.

import { cardById } from "./cards.js";
import { cardFaceInner, cardTypeClass } from "./card-face.js";
import { openModal } from "../../shared/modal.js";

// Open the card-list for a pile ("draw"|"discard"|"exhaust") as a grid of card faces.
export function openPileModal(combat, kind) {
  if (!combat) return;
  const ids = kind === "draw" ? combat.draw : kind === "discard" ? combat.discard : combat.exhaust;
  const grid = document.createElement("div");
  grid.className = "mg-modal-grid";
  if (ids.length) {
    grid.replaceChildren(...ids.map((id) => {
      const d = document.createElement("div");
      d.className = `s6db-card ${cardTypeClass(cardById(id))}`;
      d.innerHTML = cardFaceInner(id);
      return d;
    }));
  } else {
    const p = document.createElement("p");
    p.className = "mg-modal-empty";
    p.textContent = "empty";
    grid.appendChild(p);
  }
  openModal({ title: `${kind} pile (${ids.length})`, contentEl: grid, className: "s6db-modal" });
}

// Open the FULL combat log (the arena strip shows only the last two lines — stage6 #6).
export function openLogModal(combat) {
  if (!combat) return;
  const box = document.createElement("div");
  box.className = "s6db-logfull";
  box.replaceChildren(...(combat.log || []).map((line) => {
    const p = document.createElement("p");
    p.textContent = line;
    return p;
  }));
  openModal({ title: "combat log", contentEl: box, className: "s6db-modal" });
}
