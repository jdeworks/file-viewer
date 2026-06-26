// card-upgrades.js — an upgraded ("<ID>+") form for every card.
//
// Upgrades SHARPEN a card (more damage, less cost, or a second beat) rather than just inflating it,
// so a rest-site upgrade is a real deck-building decision. Each upgraded card keeps its base id in
// `base` (so the boss handshake still recognises an upgraded SYN/ACK) and is registered into the
// shared card registry so cardById("SYN+") resolves everywhere.

import { cardById, registerCard } from "./cards.js";

export const UPGRADED_SUFFIX = "+";

// base id → overrides for the upgraded form. Anything omitted is inherited from the base card.
const SPECS = {
  SYN: { text: "Deal 11. If ACK was played this turn, draw 2.", effect: (ctx) => { ctx.deal(11); if (ctx.playedThisTurn("ACK")) ctx.draw(2); } },
  ACK: { text: "Gain 13 block.", effect: (ctx) => ctx.block(13) },
  RST: { text: "Deal 18. Interrupt the enemy's next action.", effect: (ctx) => { ctx.deal(18); ctx.skipEnemyNext(); } },
  PUSH: { text: "Deal 7 for each card played this turn.", effect: (ctx) => ctx.deal(7 * ctx.cardsPlayed) },
  WINDOW: { cost: 0, text: "Draw 2 cards. (cost 0)", effect: (ctx) => ctx.draw(2) },
  FRAGMENT: { text: "Deal 5. Draw 1.", effect: (ctx) => { ctx.deal(5); ctx.draw(1); } },
  HANDSHAKE: { text: "Deal 10 and gain 12 block.", effect: (ctx) => { ctx.deal(10); ctx.block(12); } },
  FLOOD: { text: "Deal 5, four times.", effect: (ctx) => { for (let i = 0; i < 4; i++) ctx.deal(5); } },
  BUFFER: { text: "Gain 5 block for each card in hand.", effect: (ctx) => ctx.block(5 * ctx.handSize) },
  NULL_ROUTE: { text: "Apply 3 Vulnerable to the enemy.", effect: (ctx) => ctx.applyEnemy("vulnerable", 3) },
  PROBE: { text: "Deal 8. Apply 1 Vulnerable.", effect: (ctx) => { ctx.deal(8); ctx.applyEnemy("vulnerable", 1); } },
  PRIORITY_PACKET: { text: "Deal 16.", effect: (ctx) => ctx.deal(16) },
  ASYMMETRIC: { text: "Deal 8. If your block exceeds your HP, deal 16 more.", effect: (ctx) => { ctx.deal(8); if (ctx.blockNow > ctx.hp) ctx.deal(16); } },
  BURST_FRAME: { text: "Deal 40. Apply 1 Weak to yourself. Exhaust.", effect: (ctx) => { ctx.deal(40); ctx.applySelf("weak", 1); } },
  SEGMENT: { text: "Gain 8 block.", effect: (ctx) => ctx.block(8) },
  KEEPALIVE: { text: "Gain 7 block. If ACK was played this turn, gain 10 more.", effect: (ctx) => { ctx.block(7); if (ctx.playedThisTurn("ACK")) ctx.block(10); } },
  THROTTLE: { text: "Apply 3 Weak to the enemy.", effect: (ctx) => ctx.applyEnemy("weak", 3) },
  RENEGOTIATE: { text: "Remove your debuffs and gain 9 block.", effect: (ctx) => { ctx.clearSelfDebuffs(); ctx.block(9); } },
  CIPHER_LAYER: { text: "Gain 1 Strength and 9 block.", effect: (ctx) => { ctx.applySelf("strength", 1); ctx.block(9); } },
  TCP_STACK: { cost: 1, text: "Gain 2 Strength. (cost 1)", effect: (ctx) => ctx.applySelf("strength", 2) }
};

export function isUpgradedId(id) {
  return typeof id === "string" && id.endsWith(UPGRADED_SUFFIX);
}

export function baseIdFor(id) {
  return isUpgradedId(id) ? id.slice(0, -UPGRADED_SUFFIX.length) : id;
}

// Can this card be upgraded? (Has a spec and is not already upgraded.)
export function canUpgrade(id) {
  return Boolean(SPECS[id]) && !isUpgradedId(id);
}

// The upgraded id for a base id, or null if there is no upgrade (or it is already upgraded).
export function upgradeIdFor(id) {
  return canUpgrade(id) ? id + UPGRADED_SUFFIX : null;
}

// Build + register the upgraded card defs so cardById("<ID>+") resolves.
export const UPGRADED_CARDS = Object.entries(SPECS).map(([baseId, spec]) => {
  const base = cardById(baseId);
  return { ...base, ...spec, id: baseId + UPGRADED_SUFFIX, base: baseId, upgraded: true };
});

for (const card of UPGRADED_CARDS) registerCard(card);
