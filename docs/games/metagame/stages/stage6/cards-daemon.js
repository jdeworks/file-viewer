// cards-daemon.js — the Daemon Swarm archetype (Act 5 · PRESENTATION LAYER, verb CORRUPTION).
//
// A damage-over-time engine: most Daemon cards APPLY corruption (a poison-analogue that ticks at the
// enemy's turn start, then decays — see combat-damage.tickCorruption), and a few PAY OFF the stack
// you've built (Core Dump / Garbage Collect). The build wants to stack corruption fast, then either
// let it tick or cash it in before a cleanser (Heisenbug) wipes it. Daemon cards always resolve
// against normal enemies; at the negotiation boss damage is gated by the handshake and the boss is
// corruption-immune, so this archetype is a body-clearer, not a boss-skip. Each card:
// { id, type:"Daemon", cost, rarity, text, effect(ctx) }.

export const DAEMON_CARDS = [
  {
    id: "FORK_BOMB", type: "Daemon", cost: 1, rarity: "common",
    text: "Apply 4 Corruption.",
    effect: (ctx) => ctx.applyCorruption(4)
  },
  {
    id: "DAEMON_SPAWN", type: "Daemon", cost: 0, rarity: "common",
    text: "Apply 2 Corruption.",
    effect: (ctx) => ctx.applyCorruption(2)
  },
  {
    id: "ROT", type: "Daemon", cost: 1, rarity: "common",
    text: "Apply 2 Corruption. Apply 1 Weak to the enemy.",
    effect: (ctx) => { ctx.applyCorruption(2); ctx.applyEnemy("weak", 1); }
  },
  {
    id: "ZOMBIE_PROCESS", type: "Daemon", cost: 1, rarity: "common",
    text: "Apply 3 Corruption. If the enemy is already corrupted, apply 3 more.",
    effect: (ctx) => { const had = ctx.enemyCorruption > 0; ctx.applyCorruption(3); if (had) ctx.applyCorruption(3); }
  },
  {
    id: "MEMORY_LEAK", type: "Daemon", cost: 1, rarity: "uncommon",
    text: "Corruption you apply is increased by 1 for the rest of combat. Apply 2 Corruption.",
    effect: (ctx) => { ctx.boostCorruption(1); ctx.applyCorruption(2); }
  },
  {
    id: "ENTROPY_WAVE", type: "Daemon", cost: 2, rarity: "uncommon",
    text: "Apply 3 Corruption. Draw 1.",
    effect: (ctx) => { ctx.applyCorruption(3); ctx.draw(1); }
  },
  {
    id: "SEGFAULT_SPILL", type: "Daemon", cost: 1, rarity: "uncommon",
    text: "Deal 4. Apply 2 Corruption.",
    effect: (ctx) => { ctx.deal(4); ctx.applyCorruption(2); }
  },
  {
    id: "CORE_DUMP", type: "Daemon", cost: 1, rarity: "uncommon",
    text: "Deal damage equal to the enemy's Corruption, then halve it.",
    effect: (ctx) => { ctx.deal(ctx.enemyCorruption); ctx.halveCorruption(); }
  },
  {
    id: "CASCADE_FAILURE", type: "Daemon", cost: 2, rarity: "rare",
    text: "Apply Corruption equal to the enemy's current Corruption (double it).",
    effect: (ctx) => ctx.applyCorruption(ctx.enemyCorruption)
  },
  {
    id: "GARBAGE_COLLECT", type: "Daemon", cost: 2, rarity: "rare", exhaust: true,
    text: "Consume all Corruption on the enemy and deal that much damage instantly. Exhaust.",
    effect: (ctx) => ctx.deal(ctx.consumeCorruption())
  }
];
