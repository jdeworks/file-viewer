import assert from "node:assert/strict";
import { createCombat, endTurn, playCard } from "../combat.js";
import { STARTING_DECK } from "../cards.js";
import { instantiateEnemy } from "../enemies.js";
import { relicsFor } from "../relics.js";

const player = { hp: 50, maxHp: 50 };

function combat(relicIds, seed = 4) {
  return createCombat({
    deck: STARTING_DECK,
    player,
    enemy: instantiateEnemy("corrupt-packet", 1),
    seed,
    relics: relicsFor(relicIds)
  });
}

// onCombatStart: block + strength + extra draw.
{
  const c = combat(["handshake-token"]);
  assert.equal(c.player.block, 8, "Handshake Token grants 8 block at combat start");
}
{
  const c = combat(["overclock-chip"]);
  assert.equal(c.player.statuses.strength, 1, "Overclock Chip grants 1 strength at start");
}
{
  const base = combat([]);
  const withDraw = combat(["syn-cookie"]);
  assert.equal(withDraw.hand.length, base.hand.length + 1, "SYN Cookie draws 1 extra at start");
}

// onPlayerTurnStart: fires on the first turn and again after endTurn.
{
  const c = combat(["persistent-socket"]);
  assert.equal(c.player.block, 3, "Persistent Socket grants 3 block on turn 1");
  c.hand = []; endTurn(c); // enemy acts, new player turn
  assert.ok(c.player.block >= 3, "Persistent Socket grants block again next turn");
}

// onCardPlay: Protocol Primer triggers only on Protocol cards.
{
  const c = combat(["protocol-primer"]);
  c.hand = ["ACK", "SYN"]; c.player.energy = 3; c.player.block = 0;
  playCard(c, 1); // SYN (Signal) -> no primer block, ACK not played
  const afterSyn = c.player.block;
  playCard(c, c.hand.indexOf("ACK")); // ACK (Protocol) -> +10 block (card) +1 (primer)
  assert.equal(c.player.block, afterSyn + 11, "Protocol Primer adds 1 on Protocol cards only");
}

console.log("stage6 relics tests passed");
