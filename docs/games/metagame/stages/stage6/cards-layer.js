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
  }
];
