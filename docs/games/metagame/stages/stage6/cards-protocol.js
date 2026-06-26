// cards-protocol.js — the Stateful Stack archetype: block-control + ACK synergy + ASYMMETRIC (block-
// scaling) payoffs. Protocol cards ALWAYS resolve at the boss (they satisfy the handshake), so they
// are how a deck "gets heard". Each card: { id, type:"Protocol", cost, rarity, text, effect(ctx) }.

export const PROTOCOL_CARDS = [
  {
    id: "ACK", type: "Protocol", cost: 1, rarity: "starter",
    text: "Gain 10 block.",
    effect: (ctx) => ctx.block(10)
  },
  {
    id: "WINDOW", type: "Protocol", cost: 1, rarity: "common",
    text: "Draw 2 cards.",
    effect: (ctx) => ctx.draw(2)
  },
  {
    id: "BUFFER", type: "Protocol", cost: 2, rarity: "uncommon",
    text: "Gain 4 block for each card in hand.",
    effect: (ctx) => ctx.block(4 * ctx.handSize)
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
  }
];
