// cards-recursion.js — the Recursion archetype (Act 6 · APPLICATION LAYER, verb CHAIN = copy/echo).
//
// These cards COPY the card you played before them: replay it (TAIL_CALL at half value, FIXED_POINT
// twice, RECURSE once per energy), echo it next turn (CALLBACK — fuses with the DELAY verb), or
// escalate when the previous card was also Recursion (STACK_FRAME / LOOPBACK). The build wants a big
// single payoff card followed by a replay — sequencing (Act 1) and the chain stack on each other.
// Replays run through the engine's depth-capped ctx.replayLast, so they always terminate. Each card:
// { id, type:"Recursion", cost, rarity, text, effect(ctx), exhaust?, xcost? }.

export const RECURSION_CARDS = [
  {
    id: "STACK_FRAME", type: "Recursion", cost: 1, rarity: "common",
    text: "Deal 6. If the previous card was a Recursion card, deal 6 more.",
    effect: (ctx) => { ctx.deal(6); if (ctx.lastPlayedType === "Recursion") ctx.deal(6); }
  },
  {
    id: "LOOPBACK", type: "Recursion", cost: 0, rarity: "common",
    text: "Deal 3. If the previous card was a Recursion card, draw 1.",
    effect: (ctx) => { ctx.deal(3); if (ctx.lastPlayedType === "Recursion") ctx.draw(1); }
  },
  {
    id: "ITERATE", type: "Recursion", cost: 1, rarity: "common",
    text: "Deal 4. Deal 4 more for each card replayed this turn.",
    effect: (ctx) => ctx.deal(4 + 4 * ctx.chainCount)
  },
  {
    id: "YIELD", type: "Recursion", cost: 1, rarity: "common",
    text: "Gain 6 block. If the previous card was a Recursion card, gain 4 more block.",
    effect: (ctx) => { ctx.block(6); if (ctx.lastPlayedType === "Recursion") ctx.block(4); }
  },
  {
    id: "TAIL_CALL", type: "Recursion", cost: 1, rarity: "uncommon",
    text: "Replay the last card you played at half value.",
    effect: (ctx) => ctx.replayLast(0.5)
  },
  {
    id: "TRAMPOLINE", type: "Recursion", cost: 2, rarity: "uncommon",
    text: "Deal 8. Replay the last card you played at half value.",
    effect: (ctx) => { ctx.deal(8); ctx.replayLast(0.5); }
  },
  {
    id: "CALLBACK", type: "Recursion", cost: 1, rarity: "uncommon",
    text: "Deal 5. Replay the last card you played at the start of your next turn.",
    effect: (ctx) => { ctx.deal(5); ctx.echoNextTurn(); }
  },
  {
    id: "FIXED_POINT", type: "Recursion", cost: 2, rarity: "rare",
    text: "Replay the last card you played twice.",
    effect: (ctx) => ctx.replayLast(1, 2)
  },
  {
    id: "RECURSE", type: "Recursion", cost: 0, rarity: "rare", exhaust: true, xcost: true,
    text: "X-cost: spend all energy, then replay the last card you played that many times. Exhaust.",
    effect: (ctx) => ctx.replayLast(1, ctx.xValue)
  }
];
