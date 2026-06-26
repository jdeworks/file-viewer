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
  TCP_STACK: { cost: 1, text: "Gain 2 Strength. (cost 1)", effect: (ctx) => ctx.applySelf("strength", 2) },
  // C5b additions
  SCAN: { text: "Deal 6. Apply 1 Weak to the enemy.", effect: (ctx) => { ctx.deal(6); ctx.applyEnemy("weak", 1); } },
  JITTER: { text: "Deal 6. (cost 0)", effect: (ctx) => ctx.deal(6) },
  PIPELINE: { text: "Deal 5. If you've played 2+ cards this turn, deal 5 more.", effect: (ctx) => { ctx.deal(5); if (ctx.cardsPlayed >= 2) ctx.deal(5); } },
  SPOOF: { text: "Apply 2 Vulnerable to the enemy. Draw 1.", effect: (ctx) => { ctx.applyEnemy("vulnerable", 2); ctx.draw(1); } },
  DDOS: { text: "Deal 8 for each card played this turn. Exhaust.", effect: (ctx) => ctx.deal(8 * ctx.cardsPlayed) },
  REPLAY: { text: "Deal 13. If ACK was played this turn, deal 6 more.", effect: (ctx) => { ctx.deal(13); if (ctx.playedThisTurn("ACK")) ctx.deal(6); } },
  BACKLOG: { text: "Gain 11 block.", effect: (ctx) => ctx.block(11) },
  NAGLE: { text: "Gain 6 block. Draw 1.", effect: (ctx) => { ctx.block(6); ctx.draw(1); } },
  FIREWALL: { text: "Gain 15 block. Apply 1 Weak to the enemy.", effect: (ctx) => { ctx.block(15); ctx.applyEnemy("weak", 1); } },
  CONGESTION_CTL: { text: "Gain 10 block.", effect: (ctx) => ctx.block(10) },
  SACK: { text: "Gain 8 block. Draw 2.", effect: (ctx) => { ctx.block(8); ctx.draw(2); } },
  ENCRYPT: { text: "Gain 6 block and 1 Strength.", effect: (ctx) => { ctx.block(6); ctx.applySelf("strength", 1); } },
  HANDSHAKE_LAYER: { cost: 0, text: "Gain 1 Strength. (cost 0)", effect: (ctx) => ctx.applySelf("strength", 1) },
  DEEP_PACKET: { text: "Gain 2 Strength. Apply 2 Vulnerable to the enemy.", effect: (ctx) => { ctx.applySelf("strength", 2); ctx.applyEnemy("vulnerable", 2); } },
  SESSION_KEY: { text: "Gain 2 Strength. Draw 1.", effect: (ctx) => { ctx.applySelf("strength", 2); ctx.draw(1); } },
  ONION: { text: "Gain 4 Strength. Exhaust.", effect: (ctx) => ctx.applySelf("strength", 4) },
  // D1 SEQUENCE
  PREAMBLE: { text: "Deal 8. If it's the first card this turn, deal 8 more.", effect: (ctx) => { ctx.deal(8); if (ctx.isFirstCard) ctx.deal(8); } },
  FINALIZE: { text: "Deal 10. If it's NOT the first card this turn, deal 10 more.", effect: (ctx) => { ctx.deal(10); if (!ctx.isFirstCard) ctx.deal(10); } },
  ROOT_CERTIFICATE: { text: "Gain 5 block. If it's the first card this turn, gain 1 energy and draw 2.", effect: (ctx) => { ctx.block(5); if (ctx.isFirstCard) { ctx.gainEnergy(1); ctx.draw(2); } } },
  // D2 DELAY
  WINDOWED_SEND: { text: "Deal 6. Deal 10 at the start of your next turn.", effect: (ctx) => { ctx.deal(6); ctx.queue(1, (c) => c.deal(10)); } },
  RETRANSMIT: { text: "Deal 24 in 2 turns.", effect: (ctx) => ctx.queue(2, (c) => c.deal(24)) },
  DELAYED_ACK: { text: "Gain 6 block. Gain 9 block at the start of your next turn.", effect: (ctx) => { ctx.block(6); ctx.queue(1, (c) => c.block(9)); } },
  // D3 THROUGHPUT
  BANDWIDTH: { text: "Widen your congestion window by 2 (gain 2 energy now).", effect: (ctx) => ctx.widenWindow(2) },
  BACKOFF: { text: "Gain 11 block. Your congestion window does not shrink next turn.", effect: (ctx) => { ctx.block(11); ctx.noWindowShrink(); } },
  DEFRAG: { text: "Return all jammed cards to your hand. Draw 2.", effect: (ctx) => { ctx.defrag(); ctx.draw(2); } }
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
