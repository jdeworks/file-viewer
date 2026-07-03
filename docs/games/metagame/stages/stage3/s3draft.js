// Unified acquisition surface (UX audit M1 / R2 / R3) — ONE in-flow choice replaces the old two menus
// (standalone Defrag shop + separate boon draft). At each draft milestone the player picks 1 of 3
// cards: a mix of FREE run-scoped boons and PURCHASABLE permanent Defrag upgrades (pay registers, or
// retained fragments for the Engram Bank). Same economy underneath — boons via s3boons.pickBoon,
// upgrades via shop.buyUpgrade — but no navigation: the decision happens between snapshots. Picking
// EITHER kind resolves the draft (it's a "pick one" moment).
//
// Deterministic + seeded: the boon side reuses s3boons.draftOffer (seeded from the run seed + draft
// index); which upgrade is featured is seeded from `${seed}:acq:${draftsTaken}`. The composition
// GUARANTEES a mix (≥1 upgrade + ≥1 boon) whenever both pools are non-empty and ≥3 cards exist, so
// the fold is always visible.

import { openModal } from "../../shared/modal.js";
import { makeRng } from "./rng.js";
import { draftOffer as boonOffer, draftPending, ensureRunBoons, milestonesReached, pickBoon, consumeDraft, boonPageHtml, BOONS } from "./s3boons.js";
import { availableUpgrades, buyUpgrade, shopPageHtml, SHOP_UPGRADES } from "./shop.js";

const BOON_IDS = new Set(BOONS.map((b) => b.id));

// The 3-card acquisition offer for the pending draft: a seeded mix of boon + upgrade cards. Empty when
// no draft is pending. Each card is { kind:'boon'|'upgrade', id, boon?, up? }.
export function acquisitionOffer(state) {
  ensureRunBoons(state);
  if (!draftPending(state)) return [];
  const boons = boonOffer(state); // up to 3 seeded boons
  const rng = makeRng(`${state.run.seed}:acq:${state.run.draftsTaken}`);
  const ups = rng.shuffle(availableUpgrades(state));
  const cards = [];
  if (ups.length) cards.push({ kind: "upgrade", id: ups[0].id, up: ups[0] }); // feature one upgrade
  for (const b of boons) { if (cards.length >= 3) break; cards.push({ kind: "boon", id: b.id, boon: b }); }
  for (let i = 1; i < ups.length && cards.length < 3; i += 1) cards.push({ kind: "upgrade", id: ups[i].id, up: ups[i] });
  return cards.slice(0, 3);
}

// Resolve the draft by the card `id` — a boon (free) or an upgrade (pay). Returns true on success.
// Upgrades enforce affordability in buyUpgrade; a successful buy consumes the draft (pick-one).
export function pickDraftCard(state, save, id) {
  ensureRunBoons(state);
  if (!draftPending(state)) return false;
  if (BOON_IDS.has(id)) return pickBoon(state, id); // pickBoon consumes the draft
  if (SHOP_UPGRADES.some((u) => u.id === id)) {
    if (!buyUpgrade(state, save, id)) return false; // unaffordable / maxed
    consumeDraft(state);
    return true;
  }
  return false;
}

// Card HTML: boons via s3boons.boonPageHtml, upgrades via shop.shopPageHtml (both render `.s3-item`).
function cardHtml(state, card) {
  return card.kind === "boon" ? boonPageHtml(card.boon) : shopPageHtml(state, card.up);
}

// The acquisition modal (shared F6 modal). Picking any card resolves the draft and closes.
export function buildDraftPanel({ state, save, onClose }) {
  const offer = acquisitionOffer(state);
  const remaining = Math.max(0, milestonesReached(state) - state.run.draftsTaken);
  const content = document.createElement("div");
  content.className = "s3-draft-content";
  content.innerHTML = `
    <div class="mg-modal-note">acquire — pick ONE: a free run boon, or spend to bank a permanent Defrag upgrade.</div>
    <div class="mg-modal-bank">${Number(state.registers || 0)} reg · ${Number(state.retained || 0)} frag · ${remaining} draft${remaining === 1 ? "" : "s"} pending</div>
    ${offer.length
      ? `<div class="mg-modal-grid">${offer.map((c) => cardHtml(state, c)).join("")}</div>`
      : `<div class="mg-modal-empty">nothing available.</div>`}`;
  const handle = openModal({ title: "ACQUIRE", className: "s3-modal-draft", contentEl: content, onClose });
  const resolve = (id) => { if (pickDraftCard(state, save, id)) { save?.(); handle.close(); } };
  content.querySelectorAll("[data-pick]").forEach((btn) => btn.addEventListener("click", () => resolve(btn.dataset.pick)));
  content.querySelectorAll("[data-buy]").forEach((btn) => btn.addEventListener("click", () => resolve(btn.dataset.buy)));
  return handle;
}
