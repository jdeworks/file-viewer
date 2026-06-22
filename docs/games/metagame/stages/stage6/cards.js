// cards.js — Stage 6 Protocol Codex card pool.
//
// Each card: { id, type: "Signal"|"Protocol"|"Layer", cost, rarity, exhaust?, text, effect(ctx) }.
// `effect(ctx)` mutates the combat through the ctx API from combat.js (deal/block/draw/applyEnemy…).
// Keep effects pure w.r.t. ctx — no DOM, no randomness beyond what the engine provides.
//
// WP1 ships the starting deck + a small reward pool; WP3 expands toward the 30+ card design pool.

export const CARDS = [
  {
    id: "SYN", type: "Signal", cost: 1, rarity: "starter",
    text: "Deal 8. If ACK was played this turn, draw 2.",
    effect: (ctx) => { ctx.deal(8); if (ctx.playedThisTurn("ACK")) ctx.draw(2); }
  },
  {
    id: "ACK", type: "Protocol", cost: 1, rarity: "starter",
    text: "Gain 10 block.",
    effect: (ctx) => ctx.block(10)
  },
  {
    id: "RST", type: "Signal", cost: 2, rarity: "starter",
    text: "Deal 14. Interrupt the enemy's next action.",
    effect: (ctx) => { ctx.deal(14); ctx.skipEnemyNext(); }
  },
  {
    id: "PUSH", type: "Signal", cost: 1, rarity: "common",
    text: "Deal 5 for each card played this turn.",
    effect: (ctx) => ctx.deal(5 * ctx.cardsPlayed)
  },
  {
    id: "WINDOW", type: "Protocol", cost: 1, rarity: "common",
    text: "Draw 2 cards.",
    effect: (ctx) => ctx.draw(2)
  },
  {
    id: "FRAGMENT", type: "Signal", cost: 0, rarity: "uncommon",
    text: "Deal 3. Draw 1.",
    effect: (ctx) => { ctx.deal(3); ctx.draw(1); }
  },
  {
    id: "HANDSHAKE", type: "Signal", cost: 2, rarity: "uncommon",
    text: "Deal 8 and gain 10 block.",
    effect: (ctx) => { ctx.deal(8); ctx.block(10); }
  },
  {
    id: "FLOOD", type: "Signal", cost: 2, rarity: "uncommon",
    text: "Deal 4, four times.",
    effect: (ctx) => { for (let i = 0; i < 4; i++) ctx.deal(4); }
  },
  {
    id: "BUFFER", type: "Protocol", cost: 2, rarity: "uncommon",
    text: "Gain 4 block for each card in hand.",
    effect: (ctx) => ctx.block(4 * ctx.handSize)
  },
  {
    id: "NULL_ROUTE", type: "Signal", cost: 2, rarity: "rare",
    text: "Apply 2 Vulnerable to the enemy.",
    effect: (ctx) => ctx.applyEnemy("vulnerable", 2)
  },
  {
    id: "PROBE", type: "Signal", cost: 1, rarity: "common",
    text: "Deal 6. Apply 1 Vulnerable.",
    effect: (ctx) => { ctx.deal(6); ctx.applyEnemy("vulnerable", 1); }
  },
  {
    id: "PRIORITY_PACKET", type: "Signal", cost: 2, rarity: "rare",
    text: "Deal 12.",
    effect: (ctx) => ctx.deal(12)
  },
  {
    id: "ASYMMETRIC", type: "Signal", cost: 1, rarity: "rare",
    text: "Deal 6. If your block exceeds your HP, deal 12 more.",
    effect: (ctx) => { ctx.deal(6); if (ctx.blockNow > ctx.hp) ctx.deal(12); }
  },
  {
    id: "BURST_FRAME", type: "Signal", cost: 3, rarity: "uncommon", exhaust: true,
    text: "Deal 30. Apply 1 Weak to yourself. Exhaust.",
    effect: (ctx) => { ctx.deal(30); ctx.applySelf("weak", 1); }
  },
  {
    id: "SEGMENT", type: "Protocol", cost: 0, rarity: "common",
    text: "Gain 5 block.",
    effect: (ctx) => ctx.block(5)
  },
  {
    id: "KEEPALIVE", type: "Protocol", cost: 1, rarity: "uncommon",
    text: "Gain 5 block. If ACK was played this turn, gain 8 more.",
    effect: (ctx) => { ctx.block(5); if (ctx.playedThisTurn("ACK")) ctx.block(8); }
  },
  {
    id: "THROTTLE", type: "Protocol", cost: 2, rarity: "rare",
    text: "Apply 2 Weak to the enemy.",
    effect: (ctx) => ctx.applyEnemy("weak", 2)
  },
  {
    id: "RENEGOTIATE", type: "Protocol", cost: 1, rarity: "rare",
    text: "Remove your debuffs and gain 6 block.",
    effect: (ctx) => { ctx.clearSelfDebuffs(); ctx.block(6); }
  },
  {
    id: "CIPHER_LAYER", type: "Layer", cost: 2, rarity: "uncommon",
    text: "Gain 1 Strength and 6 block.",
    effect: (ctx) => { ctx.applySelf("strength", 1); ctx.block(6); }
  },
  {
    id: "TCP_STACK", type: "Layer", cost: 2, rarity: "rare",
    text: "Gain 2 Strength.",
    effect: (ctx) => ctx.applySelf("strength", 2)
  }
];

const BY_ID = new Map(CARDS.map((card) => [card.id, card]));

export function cardById(id) {
  return BY_ID.get(id) || null;
}

// Cards offered as combat rewards (not the starter-only cards).
export const REWARD_POOL = CARDS.filter((card) => card.rarity !== "starter").map((card) => card.id);

export const STARTING_DECK = ["SYN", "SYN", "SYN", "SYN", "SYN", "ACK", "ACK", "ACK", "ACK", "RST"];
