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
  },
  {
    id: "BACKLOG", type: "Protocol", cost: 1, rarity: "common",
    text: "Gain 8 block.",
    effect: (ctx) => ctx.block(8)
  },
  {
    id: "NAGLE", type: "Protocol", cost: 1, rarity: "uncommon",
    text: "Gain 4 block. Draw 1.",
    effect: (ctx) => { ctx.block(4); ctx.draw(1); }
  },
  {
    id: "FIREWALL", type: "Protocol", cost: 2, rarity: "rare",
    text: "Gain 12 block. Apply 1 Weak to the enemy.",
    effect: (ctx) => { ctx.block(12); ctx.applyEnemy("weak", 1); }
  },
  {
    id: "CONGESTION_CTL", type: "Protocol", cost: 1, rarity: "uncommon",
    text: "Gain 7 block.",
    effect: (ctx) => ctx.block(7)
  },
  {
    id: "SACK", type: "Protocol", cost: 2, rarity: "rare",
    text: "Gain 6 block. Draw 2.",
    effect: (ctx) => { ctx.block(6); ctx.draw(2); }
  },
  // Act 1 LINK · SEQUENCE: a strong opener that wants to lead the turn.
  {
    id: "ROOT_CERTIFICATE", type: "Protocol", cost: 1, rarity: "rare",
    text: "Gain 4 block. If it's the first card you play this turn, gain 1 energy and draw 1.",
    effect: (ctx) => { ctx.block(4); if (ctx.isFirstCard) { ctx.gainEnergy(1); ctx.draw(1); } }
  },
  // Act 2 TRANSPORT · DELAY: block that arrives across two turns.
  {
    id: "DELAYED_ACK", type: "Protocol", cost: 1, rarity: "uncommon",
    text: "Gain 5 block. Gain 7 block at the start of your next turn.",
    effect: (ctx) => { ctx.block(5); ctx.queue(1, { block: 7 }); }
  },
  // Act 3 NETWORK · THROUGHPUT: spend big without the window shrinking next turn.
  {
    id: "BACKOFF", type: "Protocol", cost: 0, rarity: "uncommon",
    text: "Gain 8 block. Your congestion window does not shrink next turn.",
    effect: (ctx) => { ctx.block(8); ctx.noWindowShrink(); }
  },
  {
    id: "DEFRAG", type: "Protocol", cost: 1, rarity: "uncommon",
    text: "Return all jammed cards (Packet Loss) to your hand. Draw 1.",
    effect: (ctx) => { ctx.defrag(); ctx.draw(1); }
  },
  // ── H · additional commons (pool depth — reliable block filler) ─────────────────────────────────────
  { id: "ACKNOWLEDGE", type: "Protocol", cost: 1, rarity: "common", text: "Gain 9 block.", effect: (ctx) => ctx.block(9) },
  { id: "PADDING", type: "Protocol", cost: 0, rarity: "common", text: "Gain 4 block.", effect: (ctx) => ctx.block(4) },
  { id: "PARITY", type: "Protocol", cost: 1, rarity: "common", text: "Gain 5 block. Draw 1.", effect: (ctx) => { ctx.block(5); ctx.draw(1); } },
  { id: "HEARTBEAT", type: "Protocol", cost: 2, rarity: "common", text: "Gain 11 block.", effect: (ctx) => ctx.block(11) },
  { id: "SLOW_START", type: "Protocol", cost: 1, rarity: "common", text: "Gain 6 block. Apply 1 Weak to the enemy.", effect: (ctx) => { ctx.block(6); ctx.applyEnemy("weak", 1); } },
  // ── 2026-07-09 pool expansion ──────────────────────────────────────────────────────────────────────
  { id: "CHECKSUM", type: "Protocol", cost: 1, rarity: "common", text: "Gain 6 block. If ACK was played this turn, draw 1.", effect: (ctx) => { ctx.block(6); if (ctx.playedThisTurn("ACK")) ctx.draw(1); } },
  { id: "MTU_PROBE", type: "Protocol", cost: 2, rarity: "uncommon", text: "Gain 8 block. Apply 1 Weak to the enemy.", effect: (ctx) => { ctx.block(8); ctx.applyEnemy("weak", 1); } }
];
