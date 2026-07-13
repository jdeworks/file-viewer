// combat-modals.js — Stage 5 combat on-demand overlays (UX audit stage5 #1/#6): the draw/discard/
// exhaust pile card-lists and the full combat log, each opened from a dock/arena chip through the
// shared modal (docs/games/metagame/shared/modal.js, F6). Transient (portaled to <body>) — a combat
// re-render underneath does not disturb them, so opening one neither saves nor mutates engine state.

import { cardById, STARTING_DECK } from "./cards.js";
import { cardFaceInner, cardTypeClass } from "./card-face.js";
import { upgradeIdFor } from "./card-upgrades.js";
import { cardOption } from "./ui-rewards.js";
import { openModal } from "../../shared/modal.js";

// A grid of card faces for a list of ids (shared by the pile + deck modals).
function cardGrid(ids) {
  const grid = document.createElement("div");
  grid.className = "mg-modal-grid";
  if (ids.length) {
    grid.replaceChildren(...ids.map((id) => {
      const d = document.createElement("div");
      d.className = `s5db-card ${cardTypeClass(cardById(id))}`;
      d.innerHTML = cardFaceInner(id);
      return d;
    }));
  } else {
    const p = document.createElement("p");
    p.className = "mg-modal-empty";
    p.textContent = "empty";
    grid.appendChild(p);
  }
  return grid;
}

// Open the card-list for a pile ("draw"|"discard"|"exhaust") as a grid of card faces.
export function openPileModal(combat, kind) {
  if (!combat) return;
  const ids = kind === "draw" ? combat.draw : kind === "discard" ? combat.discard : combat.exhaust;
  openModal({ title: `${kind} pile (${ids.length})`, contentEl: cardGrid(ids), className: "s5db-modal" });
}

// Open the player's FULL run deck (run.deck) — viewable in combat AND on the map. Read-only; sorts by
// type then id so copies group together (the draw/discard/exhaust piles show live order instead).
export function openDeckModal(deck) {
  const ids = [...(deck || [])].sort((a, b) =>
    (cardById(a)?.type || "").localeCompare(cardById(b)?.type || "") || String(a).localeCompare(String(b)));
  openModal({ title: `your deck (${ids.length})`, contentEl: cardGrid(ids), className: "s5db-modal" });
}

// Open the prestige card-upgrade picker (hub-only, fired from "reinforce protocol" — never mid-run,
// so unlike the other modals here this one is interactive: each card is a real button with its own
// click listener, since the modal is portaled to <body> and sits outside root's delegated handler).
// `eligibleIndices` are STARTING_DECK indices (see run.js eligiblePrestigeUpgrades) — deliberately
// NOT the run's live deck (see run.js for why). Shows each card's UPGRADED face, matching the
// rest-site/shop upgrade pickers' convention of previewing what you get.
export function openPrestigeModal({ eligibleIndices, onPick, onSkip }) {
  const wrap = document.createElement("div");
  const grid = document.createElement("div");
  grid.className = "mg-modal-grid";
  if (eligibleIndices.length) {
    grid.replaceChildren(...eligibleIndices.map((i) => {
      // NOTE: the attr must be camelCase ("prestigeUpgrade"), not hyphenated — cardOption does
      // `button.dataset[attr] = value`, and DOMStringMap throws on a literal hyphen-then-lowercase
      // property name (it can't be unambiguously reverse-mapped from the camelCase form). The
      // resulting HTML attribute is still `data-prestige-upgrade`, matching the CSS selector below.
      const button = cardOption(upgradeIdFor(STARTING_DECK[i]), "prestigeUpgrade", String(i));
      button.addEventListener("click", () => { handle.close(); onPick(i); });
      return button;
    }));
  } else {
    const p = document.createElement("p");
    p.className = "mg-modal-empty";
    p.textContent = "every starting card is already permanently upgraded.";
    grid.appendChild(p);
  }
  wrap.appendChild(grid);
  const skip = document.createElement("button");
  skip.type = "button";
  skip.className = "s5db-ghost";
  skip.textContent = "skip — keep the version anyway ▸";
  skip.addEventListener("click", () => { handle.close(); onSkip(); });
  wrap.appendChild(skip);
  const handle = openModal({
    title: "reinforce protocol — permanently upgrade a starting card",
    contentEl: wrap,
    className: "s5db-modal"
  });
  return handle;
}

// Open the FULL combat log (the arena strip shows only the last two lines — stage5 #6).
export function openLogModal(combat) {
  if (!combat) return;
  const box = document.createElement("div");
  box.className = "s5db-logfull";
  box.replaceChildren(...(combat.log || []).map((line) => {
    const p = document.createElement("p");
    p.textContent = line;
    return p;
  }));
  openModal({ title: "combat log", contentEl: box, className: "s5db-modal" });
}
