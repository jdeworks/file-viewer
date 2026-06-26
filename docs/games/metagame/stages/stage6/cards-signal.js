// cards-signal.js — the SYN-Flood archetype: aggro / tempo. Signals carry the damage; at the act-4
// boss they only land when the handshake is satisfied (lead SYN / play ACK), so this is the kill
// engine you must thread through the negotiation. Each card: { id, type:"Signal", cost, rarity, text,
// effect(ctx), exhaust? }. Keep ≤300 LOC; effects are declarative ctx mutations only.

export const SIGNAL_CARDS = [
  {
    id: "SYN", type: "Signal", cost: 1, rarity: "starter",
    text: "Deal 8. If ACK was played this turn, draw 2.",
    effect: (ctx) => { ctx.deal(8); if (ctx.playedThisTurn("ACK")) ctx.draw(2); }
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
  }
];
