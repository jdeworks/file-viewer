// cards-signal.js — the SYN-Flood archetype: aggro / tempo. Signals carry the damage; at the terminal
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
  },
  {
    id: "SCAN", type: "Signal", cost: 1, rarity: "common",
    text: "Deal 4. Apply 1 Weak to the enemy.",
    effect: (ctx) => { ctx.deal(4); ctx.applyEnemy("weak", 1); }
  },
  {
    id: "JITTER", type: "Signal", cost: 0, rarity: "uncommon",
    text: "Deal 4. If a card was replayed this turn, deal 4 more.",
    effect: (ctx) => { ctx.deal(4); if (ctx.chainCount > 0) ctx.deal(4); }
  },
  {
    id: "PIPELINE", type: "Signal", cost: 1, rarity: "uncommon",
    text: "Deal 4. If you've played 2+ cards this turn, deal 4 more.",
    effect: (ctx) => { ctx.deal(4); if (ctx.cardsPlayed >= 2) ctx.deal(4); }
  },
  {
    id: "SPOOF", type: "Signal", cost: 1, rarity: "rare",
    text: "Apply 1 Vulnerable to the enemy. Draw 1.",
    effect: (ctx) => { ctx.applyEnemy("vulnerable", 1); ctx.draw(1); }
  },
  {
    id: "DDOS", type: "Signal", cost: 3, rarity: "rare", exhaust: true,
    text: "Deal 6 for each card played this turn. Exhaust.",
    effect: (ctx) => ctx.deal(6 * ctx.cardsPlayed)
  },
  {
    id: "REPLAY", type: "Signal", cost: 2, rarity: "uncommon",
    text: "Deal 10. If ACK was played this turn, deal 5 more.",
    effect: (ctx) => { ctx.deal(10); if (ctx.playedThisTurn("ACK")) ctx.deal(5); }
  },
  // ── Act 1 LINK · SEQUENCE: opener (reward leading) + closer (reward following) ─────────────────────
  {
    id: "PREAMBLE", type: "Signal", cost: 1, rarity: "common",
    text: "Deal 6. If it's the first card you play this turn, deal 6 more.",
    effect: (ctx) => { ctx.deal(6); if (ctx.isFirstCard) ctx.deal(6); }
  },
  {
    id: "FINALIZE", type: "Signal", cost: 1, rarity: "uncommon",
    text: "Deal 8. If it's NOT the first card you play this turn, deal 8 more.",
    effect: (ctx) => { ctx.deal(8); if (!ctx.isFirstCard) ctx.deal(8); }
  },
  // ── Act 2 TRANSPORT · DELAY: deferred resolution (deterministic, resolves on a future turn) ─────────
  {
    id: "WINDOWED_SEND", type: "Signal", cost: 1, rarity: "uncommon",
    text: "Deal 4. Deal 8 at the start of your next turn.",
    effect: (ctx) => { ctx.deal(4); ctx.queue(1, { deal: 8 }); }
  },
  {
    id: "RETRANSMIT", type: "Signal", cost: 2, rarity: "rare",
    text: "Deal 18 in 2 turns.",
    effect: (ctx) => ctx.queue(2, { deal: 18 })
  },
  // ── H · additional commons (pool depth — early decks need reliable filler) ──────────────────────────
  { id: "BIT_FLIP", type: "Signal", cost: 0, rarity: "common", text: "Deal 4.", effect: (ctx) => ctx.deal(4) },
  { id: "PING", type: "Signal", cost: 1, rarity: "common", text: "Deal 7.", effect: (ctx) => ctx.deal(7) },
  { id: "ICMP", type: "Signal", cost: 1, rarity: "common", text: "Deal 5. Gain 3 block.", effect: (ctx) => { ctx.deal(5); ctx.block(3); } },
  { id: "TEARDOWN", type: "Signal", cost: 2, rarity: "common", text: "Deal 11.", effect: (ctx) => ctx.deal(11) },
  { id: "DATAGRAM", type: "Signal", cost: 1, rarity: "common", text: "Deal 6.", effect: (ctx) => ctx.deal(6) },
  { id: "BROADCAST", type: "Signal", cost: 2, rarity: "common", text: "Deal 6. Apply 1 Weak to the enemy.", effect: (ctx) => { ctx.deal(6); ctx.applyEnemy("weak", 1); } },
  // ── 2026-07-09 pool expansion ──────────────────────────────────────────────────────────────────────
  { id: "SYN_ACK", type: "Signal", cost: 1, rarity: "uncommon", text: "Deal 7. If ACK was played this turn, apply 2 Vulnerable.", effect: (ctx) => { ctx.deal(7); if (ctx.playedThisTurn("ACK")) ctx.applyEnemy("vulnerable", 2); } },
  { id: "PORT_SCAN", type: "Signal", cost: 1, rarity: "common", text: "Deal 5. If it's the first card you play this turn, draw 1.", effect: (ctx) => { ctx.deal(5); if (ctx.isFirstCard) ctx.draw(1); } }
];
