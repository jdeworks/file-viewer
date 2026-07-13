import assert from "node:assert/strict";
import { createCombat, endTurn, playCard, checkEnemyDead } from "../combat.js";
import { STARTING_DECK } from "../cards.js";
import { instantiateEnemy } from "../enemies.js";

// Phase G item 1 — the combat loop fires inert-by-default relic hooks at the right moments:
//   onTurnEnd · onKill · onDamageTaken · onExhaust · onShuffle
// These tests use SYNTHETIC relics (plain {id,hooks} objects, which createCombat accepts directly)
// to prove each hook fires exactly when expected. No shipped relic uses them yet (that's item 6).

function spyRelic(name) {
  const calls = [];
  return {
    relic: { id: `spy-${name}`, hooks: { [name]: (ctx) => calls.push(ctx) } },
    calls
  };
}

function combat(relics, { seed = 4, enemyId = "corrupt-packet" } = {}) {
  return createCombat({
    deck: STARTING_DECK,
    player: { hp: 50, maxHp: 50 },
    enemy: instantiateEnemy(enemyId, 1),
    seed,
    relics
  });
}

// ── onTurnEnd: fires once per endTurn, before the enemy acts ──────────────────────────────────────
{
  const { relic, calls } = spyRelic("onTurnEnd");
  const c = combat([relic]);
  assert.equal(calls.length, 0, "onTurnEnd does not fire at combat start");
  c.hand = []; endTurn(c);
  assert.equal(calls.length, 1, "onTurnEnd fires once when the player ends a turn");
  // Hook can mutate the fight (e.g. gain block) before the enemy hits.
  const blockRelic = { id: "te-block", hooks: { onTurnEnd: (ctx) => ctx.block(7) } };
  const c2 = combat([blockRelic]);
  c2.hand = []; c2.player.block = 0; endTurn(c2);
  assert.ok(c2.turn >= 2, "a new turn began");
}

// ── onKill: fires when the enemy is reduced to 0 HP ────────────────────────────────────────────────
{
  const { relic, calls } = spyRelic("onKill");
  const c = combat([relic]);
  c.enemy.hp = 1; c.enemy.armor = 0; c.enemy.block = 0;
  c.hand = ["SYN"]; c.player.energy = 3;
  playCard(c, 0); // SYN deals 8 -> enemy dies
  assert.equal(c.result, "win", "enemy died");
  assert.equal(calls.length, 1, "onKill fired exactly once on the kill");
}

// ── onDamageTaken: fires only when the enemy's turn actually costs HP, exposing the amount ─────────
{
  const { relic, calls } = spyRelic("onDamageTaken");
  // corrupt-packet's script attacks, so the player will lose HP on the enemy turn.
  const c = combat([relic]);
  c.hand = []; c.player.block = 0;
  endTurn(c); // enemy acts -> player takes damage
  assert.ok(calls.length >= 1, "onDamageTaken fired when the enemy hit the player");
  assert.ok(c.lastDamageTaken > 0, "the amount of HP lost is exposed on the combat");
}
{
  // No fire when the hit is fully blocked.
  const { relic, calls } = spyRelic("onDamageTaken");
  const c = combat([relic]);
  c.hand = []; c.player.block = 999; // soak everything
  endTurn(c);
  assert.equal(calls.length, 0, "onDamageTaken does NOT fire when damage is fully blocked");
}

// ── onExhaust: fires when an exhaust card leaves play ──────────────────────────────────────────────
{
  const { relic, calls } = spyRelic("onExhaust");
  const c = combat([relic]);
  c.hand = ["BURST_FRAME", "SYN"]; c.player.energy = 9;
  playCard(c, 1); // SYN — not an exhaust card
  assert.equal(calls.length, 0, "onExhaust does not fire for a normal card");
  playCard(c, c.hand.indexOf("BURST_FRAME")); // exhausts
  assert.equal(calls.length, 1, "onExhaust fires when an exhaust card is played");
  assert.equal(calls[0].card?.id, "BURST_FRAME", "the exhausted card is passed to the hook");
}

// ── onShuffle: fires when the discard recycles into the draw pile ──────────────────────────────────
{
  const { relic, calls } = spyRelic("onShuffle");
  const c = combat([relic]);
  // Empty the draw pile; everything sits in discard. The next draw must reshuffle discard → draw.
  c.discard = [...c.draw, ...c.hand]; c.draw = []; c.hand = [];
  assert.equal(calls.length, 0, "no reshuffle yet");
  // endTurn draws a fresh hand from the (empty) draw pile, forcing the reshuffle path.
  endTurn(c);
  assert.equal(calls.length, 1, "onShuffle fired once when the discard recycled into the draw pile");
}

console.log("stage5 combat-hooks tests passed");
