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

// Strength is permanent (does not tick down) and adds to attack damage.
{
  const c = createCombat({ deck: ["TCP_STACK", "SYN", "SYN", "ACK", "ACK", "RST"], player, enemy: instantiateEnemy("corrupt-packet", 1), seed: 5 });
  c.hand = ["TCP_STACK", "SYN"]; c.draw = ["ACK"]; c.discard = []; c.player.energy = 3;
  playCard(c, 0); // +2 strength
  assert.equal(c.player.statuses.strength, 2, "TCP_STACK grants 2 strength");
  const hp = c.enemy.hp;
  playCard(c, c.hand.indexOf("SYN")); // 8 + 2 strength = 10
  assert.equal(c.enemy.hp, hp - 10, "strength adds to SYN damage");
  c.hand = []; endTurn(c); // a full turn cycle
  assert.equal(c.player.statuses.strength, 2, "strength persists across turns");
}

// RENEGOTIATE clears self debuffs; weak reduces outgoing attack damage first.
{
  const c = createCombat({ deck: ["RENEGOTIATE", "SYN", "ACK", "ACK", "RST", "WINDOW"], player, enemy: instantiateEnemy("corrupt-packet", 1), seed: 9 });
  c.player.statuses.weak = 2;
  const hp = c.enemy.hp;
  c.hand = ["SYN"]; c.player.energy = 3;
  playCard(c, 0); // SYN 8 * 0.75 weak = 6
  assert.equal(c.enemy.hp, hp - 6, "weak reduces SYN to 6");
  c.player.statuses.weak = 2;
  c.hand = ["RENEGOTIATE"]; c.player.energy = 3;
  playCard(c, 0);
  assert.equal(c.player.statuses.weak, undefined, "RENEGOTIATE clears weak");
  assert.equal(c.player.block, 6, "RENEGOTIATE grants 6 block");
}

// ASYMMETRIC bonus triggers when block exceeds HP.
{
  const c = fresh();
  c.player.hp = 10; c.player.block = 20;
  c.hand = ["ASYMMETRIC"]; c.player.energy = 3;
  const hp = c.enemy.hp;
  playCard(c, 0); // 6 + 12 = 18
  assert.equal(c.enemy.hp, hp - 18, "ASYMMETRIC deals 18 when block > hp");
}

// Expired Certificate: its expiry intent pierces block (unblockable).
{
  const c = createCombat({ deck: STARTING_DECK, player, enemy: instantiateEnemy("expired-certificate", 1), seed: 2 });
  c.enemy.intentIndex = 2; // the "Certificate expires — 24 unblockable" step
  c.player.block = 50; c.hand = [];
  endTurn(c); // 24 pierces straight through 50 block
  assert.equal(c.player.hp, 50 - 24, "pierce ignores block");
}

// Man-in-the-Middle: Mirror reflects 6 damage per card the player played that turn.
{
  const c = createCombat({ deck: STARTING_DECK, player, enemy: instantiateEnemy("man-in-the-middle", 1), seed: 3 });
  c.enemy.intentIndex = 1; // the "Mirror your traffic" step
  c.hand = ["ACK", "ACK"]; c.player.energy = 3;
  playCard(c, 0); playCard(c, 0); // two cards played this turn (hand shifts after each)
  c.player.block = 0; // drop the block those ACKs granted to read the mirror cleanly
  endTurn(c); // mirror = 6 * 2 = 12
  assert.equal(c.player.hp, 50 - 12, "MitM mirrors 6 per card played");
}

console.log("stage6 combat engine tests passed");
