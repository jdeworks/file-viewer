// combat-chain.test.mjs — Phase H Act 6 CHAIN (copy/echo) verb. First the ENGINE primitive (inert,
// driven through temp test cards registered via registerCard), then the real Recursion archetype.
// registerCard only adds to the lookup, not to CARDS/REWARD_POOL, so these temp cards never leak into
// the pool (and need no upgrade SPEC).
import assert from "node:assert/strict";
import { createCombat, playCard, endTurn } from "../combat.js";
import { makeCtx } from "../combat-ctx.js";
import { registerCard } from "../cards.js";
import { instantiateEnemy } from "../enemies.js";
import { relicsFor } from "../relics.js";

function big(hand, { seed = 5, hp = 400 } = {}) {
  const c = createCombat({ deck: hand, player: { hp: 200, maxHp: 200 }, enemy: instantiateEnemy("corrupt-packet", 1), seed });
  c.enemy.hp = hp; c.enemy.maxHp = hp;
  c.hand = [...hand]; c.player.energy = 9;
  return c;
}

// Temp probe cards exercising the replay primitive.
registerCard({ id: "TEST_ECHO", type: "Recursion", cost: 0, rarity: "common", text: "echo", effect: (ctx) => ctx.replayLast() });
registerCard({ id: "TEST_ECHO_HALF", type: "Recursion", cost: 0, rarity: "common", text: "echo½", effect: (ctx) => ctx.replayLast(0.5) });
registerCard({ id: "TEST_RECURSE3", type: "Recursion", cost: 0, rarity: "common", text: "x3", effect: (ctx) => ctx.replayLast(1, 3) });
registerCard({ id: "TEST_LOOP", type: "Recursion", cost: 0, rarity: "common", text: "loop", effect: (ctx) => ctx.replayLast() });

// ── replayLast re-runs the previous card at full value ──────────────────────────────────────────────
{
  const c = big(["SYN", "TEST_ECHO"]);
  const hp0 = c.enemy.hp;
  playCard(c, 0); // SYN deals 8
  playCard(c, 0); // TEST_ECHO replays SYN → +8
  assert.equal(c.enemy.hp, hp0 - 16, "replayLast repeats the previous card (8 + 8)");
  assert.equal(c.chainThisTurn, 1, "one replay counted toward the chain");
}
// ── replayLast(scale) halves value (TAIL_CALL) ──────────────────────────────────────────────────────
{
  const c = big(["SYN", "TEST_ECHO_HALF"]);
  const hp0 = c.enemy.hp;
  playCard(c, 0); // SYN deals 8
  playCard(c, 0); // half-replay → +4
  assert.equal(c.enemy.hp, hp0 - 12, "scaled replay deals half (8 + 4)");
}
// ── replayLast(1, times) repeats N times (RECURSE) + chainCount ──────────────────────────────────────
{
  const c = big(["SYN", "TEST_RECURSE3"]);
  const hp0 = c.enemy.hp;
  playCard(c, 0); // SYN deals 8
  playCard(c, 0); // replay SYN ×3 → +24
  assert.equal(c.enemy.hp, hp0 - 32, "RECURSE replays the previous card 3× (8 + 24)");
  assert.equal(c.chainThisTurn, 3, "chainCount reflects 3 replays");
}
// ── replayLast with no prior card is a no-op ─────────────────────────────────────────────────────────
{
  const c = big(["TEST_ECHO"]);
  const hp0 = c.enemy.hp;
  playCard(c, 0); // nothing to replay
  assert.equal(c.enemy.hp, hp0, "replayLast does nothing with no previous card");
}
// ── chainThisTurn resets each turn ───────────────────────────────────────────────────────────────────
{
  const c = big(["SYN", "TEST_ECHO"]);
  playCard(c, 0); playCard(c, 0);
  assert.equal(c.chainThisTurn, 1, "chain counted this turn");
  endTurn(c);
  assert.equal(c.chainThisTurn, 0, "chain resets at the new turn");
}
// ── echoNextTurn (CALLBACK) replays the previous card on a future turn (fuses with DELAY) ────────────
{
  registerCard({ id: "TEST_CB", type: "Recursion", cost: 0, rarity: "common", text: "cb", effect: (ctx) => { ctx.deal(2); ctx.echoNextTurn(); } });
  const c = big(["SYN", "TEST_CB"]);
  const hp0 = c.enemy.hp;
  playCard(c, 0); // SYN deals 8 (lastCardPlayed = SYN)
  playCard(c, 0); // TEST_CB deals 2 + queues a replay of SYN next turn
  assert.equal(c.enemy.hp, hp0 - 10, "callback deals its own 2 now (8 + 2)");
  endTurn(c); // new player turn → queued SYN replay lands (+8)
  assert.equal(c.enemy.hp, hp0 - 18, "the queued echo replays SYN next turn (+8)");
}
// ── depth guard: a self-referential echo terminates (no infinite loop) ──────────────────────────────
{
  const c = big(["SYN"]);
  c.lastCardPlayed = "TEST_LOOP"; // TEST_LOOP replays the last card, which is itself → would loop
  makeCtx(c, null).replayLast();  // reaching the next line proves it terminated under the depth cap
  assert.ok(true, "nested self-echo terminated under MAX_ECHO_DEPTH");
  assert.ok(c.chainThisTurn <= 8, "bounded number of replays");
}

// ── Recursion archetype: STACK_FRAME escalates only after another Recursion card ────────────────────
{
  const c = big(["LOOPBACK", "STACK_FRAME"]); // both Recursion
  const hp0 = c.enemy.hp;
  playCard(c, 0); // LOOPBACK deals 3
  playCard(c, 0); // STACK_FRAME deals 6, +6 because the previous card was Recursion
  assert.equal(c.enemy.hp, hp0 - 3 - 12, "STACK_FRAME escalates after a Recursion card");
}
{
  const c = big(["SYN", "STACK_FRAME"]); // SYN is a Signal
  const hp0 = c.enemy.hp;
  playCard(c, 0); // SYN 8
  playCard(c, 0); // STACK_FRAME 6 only (previous card was not Recursion)
  assert.equal(c.enemy.hp, hp0 - 8 - 6, "STACK_FRAME does not escalate after a non-Recursion card");
}
// ── RECURSE (X-cost) replays the last card once per energy spent; FIXED_POINT replays twice ──────────
{
  const c = big(["SYN", "RECURSE"]);
  c.player.energy = 3;
  const hp0 = c.enemy.hp;
  playCard(c, 0); // SYN deals 8 (energy → 2)
  playCard(c, 0); // RECURSE spends 2 → replays SYN ×2 → 16
  assert.equal(c.enemy.hp, hp0 - 8 - 16, "RECURSE replays the last card once per energy spent");
}
{
  const c = big(["SYN", "FIXED_POINT"]);
  c.player.energy = 5;
  const hp0 = c.enemy.hp;
  playCard(c, 0); // SYN 8
  playCard(c, 0); // FIXED_POINT replays SYN twice → 16
  assert.equal(c.enemy.hp, hp0 - 8 - 16, "FIXED_POINT replays twice");
}
// ── JIT Compiler relic: the first 3-chain turn refunds 1 energy ──────────────────────────────────────
{
  const c = createCombat({ deck: ["SYN", "RECURSE"], player: { hp: 200, maxHp: 200 }, enemy: instantiateEnemy("corrupt-packet", 1), seed: 5, relics: relicsFor(["jit-compiler"]) });
  c.enemy.hp = 400;
  c.hand = ["SYN", "RECURSE"]; c.player.energy = 4;
  playCard(c, 0); // SYN (energy → 3)
  playCard(c, 0); // RECURSE spends 3 → 3 replays → 3-chain → JIT refunds 1
  assert.equal(c.chainThisTurn, 3, "three replays this turn");
  assert.equal(c.player.energy, 1, "JIT Compiler refunded 1 energy on the 3-chain turn");
}
// ── Act 6 enemy: Infinite Loop's attack grows each uninterrupted turn (rampHits) ────────────────────
{
  const c = createCombat({ deck: ["SEGMENT", "SEGMENT", "SEGMENT", "SEGMENT", "SEGMENT"], player: { hp: 500, maxHp: 500 }, enemy: instantiateEnemy("infinite-loop", 1), seed: 5 });
  let p = c.player.hp; endTurn(c); const d1 = p - c.player.hp; // intent 0: 1 hit
  endTurn(c); // intent 1 (block)
  endTurn(c); // intent 2 (attack)
  p = c.player.hp; endTurn(c); const d4 = p - c.player.hp; // intent 0 again: more hits
  assert.ok(d4 > d1, `Infinite Loop's attack grows each uninterrupted turn (${d1} → ${d4})`);
}

console.log("stage5 combat-chain tests passed");
