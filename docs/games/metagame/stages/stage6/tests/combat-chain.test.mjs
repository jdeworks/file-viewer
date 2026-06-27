// combat-chain.test.mjs — Phase H Act 6 CHAIN (copy/echo) verb. First the ENGINE primitive (inert,
// driven through temp test cards registered via registerCard), then the real Recursion archetype.
// registerCard only adds to the lookup, not to CARDS/REWARD_POOL, so these temp cards never leak into
// the pool (and need no upgrade SPEC).
import assert from "node:assert/strict";
import { createCombat, playCard, endTurn } from "../combat.js";
import { makeCtx } from "../combat-ctx.js";
import { registerCard } from "../cards.js";
import { instantiateEnemy } from "../enemies.js";

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

console.log("stage6 combat-chain tests passed");
