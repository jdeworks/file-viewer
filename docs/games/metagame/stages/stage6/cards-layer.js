// cards-layer.js — the Layered Cipher archetype: power-scaling (Strength and persistent buffs that
// compound over a long fight). Layer cards always resolve at the boss. Each card:
// { id, type:"Layer", cost, rarity, text, effect(ctx) }.

export const LAYER_CARDS = [
  {
    id: "CIPHER_LAYER", type: "Layer", cost: 2, rarity: "uncommon",
    text: "Gain 1 Strength and 6 block.",
    effect: (ctx) => { ctx.applySelf("strength", 1); ctx.block(6); }
  },
  {
    id: "TCP_STACK", type: "Layer", cost: 2, rarity: "rare",
    text: "Gain 2 Strength.",
    effect: (ctx) => ctx.applySelf("strength", 2)
  },
  {
    id: "ENCRYPT", type: "Layer", cost: 1, rarity: "uncommon",
    text: "Gain 4 block and 1 Strength.",
    effect: (ctx) => { ctx.block(4); ctx.applySelf("strength", 1); }
  },
  {
    id: "HANDSHAKE_LAYER", type: "Layer", cost: 1, rarity: "rare",
    text: "Gain 1 Strength.",
    effect: (ctx) => ctx.applySelf("strength", 1)
  },
  {
    id: "DEEP_PACKET", type: "Layer", cost: 2, rarity: "rare",
    text: "Gain 2 Strength. Apply 1 Vulnerable to the enemy.",
    effect: (ctx) => { ctx.applySelf("strength", 2); ctx.applyEnemy("vulnerable", 1); }
  },
  {
    id: "SESSION_KEY", type: "Layer", cost: 2, rarity: "uncommon",
    text: "Gain 1 Strength. Draw 1.",
    effect: (ctx) => { ctx.applySelf("strength", 1); ctx.draw(1); }
  },
  {
    id: "ONION", type: "Layer", cost: 3, rarity: "rare", exhaust: true,
    text: "Gain 3 Strength. Exhaust.",
    effect: (ctx) => ctx.applySelf("strength", 3)
  }
];
