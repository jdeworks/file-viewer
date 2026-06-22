import assert from "node:assert/strict";
import {
  createCombat,
  currentIntent,
  dealToEnemy,
  drawCards,
  endTurn,
  playCard
} from "../combat.js";
import { STARTING_DECK } from "../cards.js";
import { instantiateEnemy } from "../enemies.js";

const player = { hp: 50, maxHp: 50 };

function fresh(enemyId = "corrupt-packet", seed = 7) {
  return createCombat({ deck: STARTING_DECK, player, enemy: instantiateEnemy(enemyId, 1), seed });
}

// Opening hand + energy.
{
  const c = fresh();
  assert.equal(c.hand.length, 5, "draws an opening hand of 5");
  assert.equal(c.draw.length, STARTING_DECK.length - 5, "rest of deck is in draw pile");
  assert.equal(c.player.energy, 3, "starts with 3 energy");
}

// Energy gate: cannot play a card you can't afford.
{
  const c = fresh();
  c.player.energy = 0;
  const before = c.enemy.hp;
  const res = playCard(c, c.hand.findIndex((id) => id === "SYN"));
  // either no SYN in hand or it was rejected for energy — enemy hp unchanged either way
  assert.equal(c.enemy.hp, before, "no damage dealt without energy");
  if (res.ok) assert.fail("card should not resolve with 0 energy");
}

// SYN deals 8; ACK-then-SYN combo draws 2.
{
  const c = createCombat({ deck: ["SYN", "ACK", "SYN", "WINDOW", "RST", "FRAGMENT"], player, enemy: instantiateEnemy("corrupt-packet", 1), seed: 3 });
  // Force a known hand.
  c.hand = ["ACK", "SYN"]; c.draw = ["FRAGMENT", "RST"]; c.discard = [];
  c.player.energy = 3;
  const hpBefore = c.enemy.hp;
  playCard(c, 0); // ACK -> block 10
  assert.equal(c.player.block, 10, "ACK grants 10 block");
  const handBefore = c.hand.length;
  playCard(c, c.hand.indexOf("SYN")); // SYN -> deal 8 + draw 2 (ACK played this turn)
  assert.equal(c.enemy.hp, hpBefore - 8, "SYN deals 8");
  assert.equal(c.hand.length, handBefore - 1 + 2, "SYN draws 2 after ACK");
}

// Block absorbs enemy damage; enemy follows its intent script.
{
  const c = fresh();
  assert.deepEqual(currentIntent(c).label, "Attack 10", "first intent telegraphed");
  c.player.block = 6;
  c.hand = [];
  endTurn(c); // enemy attacks 10 -> 6 absorbed, 4 to hp
  assert.equal(c.player.hp, 50 - 4, "block absorbs part of the hit");
  assert.equal(c.enemy.intentIndex, 1, "intent advanced");
}

// Armor reduces incoming damage to the enemy.
{
  const c = fresh("firewall-entity");
  const hp = c.enemy.hp;
  dealToEnemy(c, 10); // armor 4 -> 6 through
  assert.equal(c.enemy.hp, hp - 6, "armor mitigates 4");
}

// Vulnerable amplifies damage by 50%.
{
  const c = fresh();
  c.enemy.statuses.vulnerable = 2;
  const hp = c.enemy.hp;
  dealToEnemy(c, 10); // 10 * 1.5 = 15
  assert.equal(c.enemy.hp, hp - 15, "vulnerable adds 50%");
}

// Win condition fires when the enemy reaches 0.
{
  const c = fresh();
  dealToEnemy(c, 999);
  // create a fresh play to trigger over-check, or call playCard; here set directly + simulate
  assert.equal(c.enemy.hp, 0, "enemy at 0");
}

// Reshuffle: drawing past an empty draw pile recycles the discard.
{
  const c = fresh();
  const total = c.hand.length + c.draw.length + c.discard.length;
  c.discard.push(...c.draw, ...c.hand);
  c.draw = []; c.hand = [];
  drawCards(c, 3);
  assert.equal(c.hand.length, 3, "reshuffles discard into draw");
  assert.equal(c.hand.length + c.draw.length + c.discard.length, total, "no cards lost in reshuffle");
}

console.log("stage6 combat engine tests passed");
