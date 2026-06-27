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

// ── C3 build-definers fire on the right primitive ──────────────────────────────────────────────────
{
  // Checksum Offload: a Protocol play deals 3; a Signal play does not.
  const c = combat(["checksum-offload"]);
  c.hand = ["SYN", "ACK"]; c.player.energy = 3;
  const hp0 = c.enemy.hp;
  playCard(c, 0); // SYN (Signal) deals 8, no relic bonus
  const afterSyn = hp0 - c.enemy.hp;
  const beforeAck = c.enemy.hp;
  playCard(c, c.hand.indexOf("ACK")); // ACK (Protocol) deals 0 itself, +3 from the relic
  assert.equal(beforeAck - c.enemy.hp, 3, "Checksum Offload deals 3 on a Protocol card");
  assert.equal(afterSyn, 8, "Signal play got no relic bonus");
}
{
  // Full Duplex: drawing fires only on the 3rd card of the turn.
  const withRelic = combat(["full-duplex"]);
  const baseline = combat([]);
  for (const c of [withRelic, baseline]) { c.hand = ["SEGMENT", "SEGMENT", "SEGMENT", "ACK"]; c.player.energy = 9; }
  for (let i = 0; i < 3; i++) { playCard(withRelic, 0); playCard(baseline, 0); }
  assert.equal(withRelic.hand.length, baseline.hand.length + 1, "Full Duplex draws 1 on the 3rd card");
}

// ── C3 cursed relics: a real downside applies alongside the upside ──────────────────────────────────
{
  const c = combat(["memory-leak"]);
  assert.equal(c.player.statuses.strength, 2, "Memory Leak grants 2 Strength");
  assert.equal(c.player.statuses.weak, 2, "Memory Leak also inflicts 2 Weak (the curse)");
}
{
  const c = combat(["overcommit-buffer"]);
  assert.equal(c.player.energy, c.player.maxEnergy + 1, "Overcommit Buffer grants +1 energy on turn start");
  assert.equal(c.player.statuses.vulnerable, 1, "Overcommit Buffer makes you Vulnerable (the curse)");
}

console.log("stage6 relics tests passed");
