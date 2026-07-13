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

// ── Phase G: relics built on the new combat hooks fire correctly ────────────────────────────────────
{
  // Reaper Thread (onKill): defeating an enemy heals 6.
  const c = combat(["reaper-thread"]);
  c.player.hp = 20; c.player.maxHp = 50;
  c.enemy.hp = 1; c.enemy.armor = 0; c.enemy.block = 0;
  c.hand = ["SYN"]; c.player.energy = 3;
  playCard(c, 0); // SYN deals 8 -> kill
  assert.equal(c.result, "win", "enemy defeated");
  assert.equal(c.player.hp, 26, "Reaper Thread heals 6 on the kill");
}
{
  // Coredump Collector (onExhaust): exhausting a card grants 1 Strength.
  const c = combat(["coredump-collector"]);
  c.hand = ["BURST_FRAME"]; c.player.energy = 9;
  playCard(c, 0); // BURST_FRAME exhausts
  assert.equal(c.player.statuses.strength, 1, "Coredump Collector grants 1 Strength on exhaust");
}
{
  // Write-Back Cache (onShuffle): reshuffling discard into draw grants 4 block (survives the reset).
  const c = combat(["write-back-cache"]);
  c.discard = [...c.draw, ...c.hand]; c.draw = []; c.hand = [];
  endTurn(c); // drawing a fresh hand forces a reshuffle
  assert.ok(c.player.block >= 4, "Write-Back Cache grants block on reshuffle");
}
{
  // Exception Handler (onDamageTaken): the first hit grants 2 Strength.
  const c = combat(["exception-handler"]);
  c.hand = []; c.player.block = 0; c.player.statuses = {};
  endTurn(c); // corrupt-packet opens with Attack 10 (unblocked)
  assert.equal(c.player.statuses.strength, 2, "Exception Handler grants 2 Strength on the first hit");
}
{
  // Nagle Buffer (onTurnEnd): unspent energy becomes block BEFORE the enemy acts, so it absorbs.
  function hpAfter(relicIds) {
    const c = combat(relicIds);
    c.hand = []; c.player.block = 0; c.player.energy = 3; c.player.hp = 50; c.player.statuses = {};
    endTurn(c); // corrupt-packet Attack 10
    return c.player.hp;
  }
  assert.equal(hpAfter([]), 40, "baseline: a 10 hit lands in full");
  assert.equal(hpAfter(["nagle-buffer"]), 43, "Nagle Buffer's 3 block absorbs 3 of the hit");
}

console.log("stage5 relics tests passed");
