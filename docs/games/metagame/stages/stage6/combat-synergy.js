// combat-synergy.js — Stage 6: derive card "connections" for the combat hover (what synergizes with
// what). There is no hand-authored synergy field on the 84 cards; instead we derive lightweight TAGS
// from each card's rules text + its archetype type, so the relationships stay correct as cards change.
// Two cards "connect" when they share a synergy tag OR the same archetype type. Pure, no DOM.

import { cardById } from "./cards.js";

// The synergy keywords we scan for, with a one-line glossary shown in the hover tooltip.
export const KEYWORDS = {
  ACK: "An ACK Guard was played this turn — several Signals pay off after an ACK.",
  SYN: "SYN pressure — aggressive Signal tempo that scales with cards played.",
  Corruption: "Stacking damage-over-time on the enemy; Daemon cards build and detonate it.",
  Exhaust: "Removed from the deck for the rest of combat once played.",
  "X-cost": "Spends ALL remaining energy; its effect scales with the amount spent.",
  Chain: "Copy / replay effects — Recursion cards echo the last card played.",
  Block: "Gains defence for the turn; Protocol cards convert and reuse Block.",
  Lead: "Rewards being the FIRST card played this turn."
};

// Base id (strip an upgraded "<ID>+" suffix) so upgraded forms tag identically to their base.
function baseId(id) { return typeof id === "string" && id.endsWith("+") ? id.slice(0, -1) : id; }

// PROVIDER cards create a condition that payoff cards check for, but don't name it in their own text
// (e.g. ACK Guard is the thing SYN's "if ACK was played" pays off on). Tag them so provider↔payoff
// connect on hover. Keyed by base id.
const PROVIDER_TAGS = { ACK: ["ack"] };

// Text/type-derived synergy tags for a card. No per-card annotation — kept in sync with the rules text.
export function tagsFor(id) {
  const b = baseId(id);
  const card = cardById(id) || cardById(b);
  const t = (card?.text || "").toLowerCase();
  const tags = new Set(PROVIDER_TAGS[b] || []);
  if (/\back\b/.test(t)) tags.add("ack");
  if (/first card|lead|preamble|finalize/.test(t)) tags.add("lead");
  if (/corrupt/.test(t)) tags.add("corruption");
  if (/exhaust/.test(t)) tags.add("exhaust");
  if (/chain|recursion|replay|echo|copy/.test(t)) tags.add("chain");
  if (/block/.test(t)) tags.add("block");
  if (card?.type) tags.add(`type:${card.type}`);
  return tags;
}

// Which glossary KEYWORDS are relevant to this card (for the tooltip footer).
export function keywordsFor(id) {
  const card = cardById(id) || cardById(baseId(id));
  const t = (card?.text || "").toLowerCase();
  const out = [];
  if (/\back\b/.test(t)) out.push("ACK");
  if (/\bsyn\b/.test(t)) out.push("SYN");
  if (/corrupt/.test(t)) out.push("Corruption");
  if (/exhaust/.test(t) || card?.exhaust) out.push("Exhaust");
  if (card?.xcost || /all .*energy|x energy|x-cost/.test(t)) out.push("X-cost");
  if (/chain|replay|echo|copy|recursion/.test(t)) out.push("Chain");
  if (/block/.test(t)) out.push("Block");
  if (/first card|lead|preamble|finalize/.test(t)) out.push("Lead");
  return out;
}

// True if this card deals damage (→ highlight the enemy as its target on hover).
export function isAttack(id) {
  const card = cardById(id) || cardById(baseId(id));
  return /deal|damage|\bhit\b/i.test(card?.text || "");
}

// Indices of hand cards that synergize with the hovered card (share a tag or archetype type). The
// caller excludes the hovered DOM index itself; other COPIES of the same card do synergize and stay in.
export function relatedHandIndices(hoverId, hand) {
  const mine = tagsFor(hoverId);
  if (!mine.size) return [];
  const out = [];
  (hand || []).forEach((id, i) => {
    const theirs = tagsFor(id);
    for (const tag of theirs) if (mine.has(tag)) { out.push(i); break; }
  });
  return out;
}
