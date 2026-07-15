// boss-combat.test.mjs — The Refused Connection fought with the REAL deck (acceptance hook).
import assert from "node:assert/strict";
import { createCombat, playCard, endTurn } from "../combat.js";
import { makeCtx } from "../combat-ctx.js";
import { instantiateEnemy } from "../enemies.js";
import { relicsFor } from "../relics.js";
import { wireBossCombat, autoNegotiate, currentDemand, BOSS_PHASE_HP } from "../boss-combat.js";

function bossCombat({ deck = ["SYN"], hp = 300, seed = 1 } = {}) {
  const c = createCombat({
    deck,
    player: { hp, maxHp: hp },
    enemy: instantiateEnemy("the-refused-connection", 4),
    seed
  });
  return wireBossCombat(c);
}

// ── wiring: starts at phase 1 with the phase-1 HP pool ────────────────────────────────────────────
{
  const c = bossCombat();
  assert.equal(c.bossPhase, 1, "starts in phase 1");
  assert.equal(c.enemy.hp, BOSS_PHASE_HP[1], "phase-1 HP pool");
  assert.equal(typeof c.acceptance, "function", "acceptance wired");
}

// ── E1: prestige hpMult scales the boss phase HP ───────────────────────────────────────────────────
{
  const c = createCombat({ deck: ["SYN"], player: { hp: 300, maxHp: 300 }, enemy: instantiateEnemy("the-refused-connection", 4), seed: 1 });
  wireBossCombat(c, { hpMult: 1.3 });
  assert.equal(c.enemy.hp, Math.round(BOSS_PHASE_HP[1] * 1.3), "tougher-boss scales phase-1 HP");
}

// ── phase 1: Signals land only when SYN leads the turn ────────────────────────────────────────────
{
  const c = bossCombat();
  c.hand = ["RST", "SYN"]; // RST is a Signal but not SYN
  c.player.energy = 5;
  const before = c.enemy.hp;
  playCard(c, 0); // lead with RST (not SYN) ⇒ mismatch
  assert.equal(c.enemy.hp, before, "phase 1: leading a non-SYN Signal deals 0");
  playCard(c, 0); // now SYN, but the turn's FIRST card was RST ⇒ still poisoned
  assert.equal(c.enemy.hp, before, "phase 1: a wrong lead poisons the whole turn");
}
{
  const c = bossCombat();
  c.hand = ["SYN", "RST"];
  c.player.energy = 5;
  const before = c.enemy.hp;
  playCard(c, 0); // SYN first ⇒ accepted (deals 8)
  assert.ok(c.enemy.hp < before, "phase 1: leading SYN lands damage");
  const afterSyn = c.enemy.hp;
  playCard(c, 0); // RST now ⇒ accepted because SYN led
  assert.ok(c.enemy.hp < afterSyn, "phase 1: later Signals land once SYN led");
}

// ── phase 2: Signals land only after an ACK (Protocol) this turn ──────────────────────────────────
{
  const c = bossCombat();
  c.bossPhase = 2; c.enemy.hp = BOSS_PHASE_HP[2];
  c.hand = ["SYN", "ACK", "SYN"];
  c.player.energy = 5;
  const before = c.enemy.hp;
  playCard(c, 0); // SYN before any ACK ⇒ 0
  assert.equal(c.enemy.hp, before, "phase 2: Signal before ACK deals 0");
  playCard(c, 0); // ACK (Protocol) ⇒ resolves (block)
  playCard(c, 0); // SYN after ACK ⇒ lands
  assert.ok(c.enemy.hp < before, "phase 2: Signal after ACK lands");
}

// ── D4 phase 3: the demand MUTATES each turn (lead-SYN ⇄ ACK-first) ────────────────────────────────
{
  // Odd turn ⇒ LEAD-SYN demand.
  const c = bossCombat();
  c.bossPhase = 3; c.enemy.hp = BOSS_PHASE_HP[3]; c.turn = 1;
  assert.equal(currentDemand(c), "lead-syn", "phase 3 odd turn demands lead-SYN");
  c.hand = ["ACK", "SYN"]; c.player.energy = 5;
  const before = c.enemy.hp;
  playCard(c, 0); // lead ACK ⇒ violates lead-SYN
  playCard(c, 0); // SYN refused (turn was not SYN-led)
  assert.equal(c.enemy.hp, before, "lead-SYN turn: a non-SYN lead refuses Signals");
}
{
  // Even turn ⇒ ACK-FIRST demand.
  const c = bossCombat();
  c.bossPhase = 3; c.enemy.hp = BOSS_PHASE_HP[3]; c.turn = 2;
  assert.equal(currentDemand(c), "ack-first", "phase 3 even turn demands ACK-first");
  c.hand = ["SYN"]; c.player.energy = 5;
  const before = c.enemy.hp;
  playCard(c, 0); // SYN with no ACK ⇒ refused
  assert.equal(c.enemy.hp, before, "ACK-first turn: a Signal before ACK is refused");
  c.hand = ["ACK", "SYN"]; c.player.energy = 5;
  playCard(c, 0); playCard(c, 0); // ACK then SYN ⇒ lands
  assert.ok(c.enemy.hp < before, "ACK-first turn: Signal after ACK lands");
}

// ── phase advance: depleting a phase refills to the next pool ──────────────────────────────────────
{
  const c = bossCombat();
  c.hand = Array(12).fill("SYN"); c.player.energy = 999;
  while (c.bossPhase === 1 && c.hand.length) playCard(c, 0);
  assert.equal(c.bossPhase, 2, "depleting phase 1 advances to phase 2");
  assert.equal(c.enemy.hp, BOSS_PHASE_HP[2], "phase 2 refills its HP pool");
}

// ── full win with a real deck (autoNegotiate), deterministic from seed ─────────────────────────────
{
  const deck = ["SYN", "SYN", "SYN", "SYN", "ACK", "ACK", "ACK", "ACK", "PRIORITY_PACKET", "PRIORITY_PACKET"];
  const a = bossCombat({ deck, hp: 500, seed: 7 });
  autoNegotiate(a);
  assert.ok(a.over && a.result === "win", "a real deck with Protocol cards clears all 3 phases");
  const b = bossCombat({ deck, hp: 500, seed: 7 });
  autoNegotiate(b);
  assert.equal(b.result, a.result, "same seed ⇒ same result");
  assert.equal(b.turn, a.turn, "same seed ⇒ same turn count");
}

// ── D4: deck-building matters — a Protocol-less deck cannot satisfy the ACK-FIRST demand ────────────
{
  const deck = ["SYN", "SYN", "SYN", "SYN", "PRIORITY_PACKET", "PRIORITY_PACKET", "JITTER", "JITTER", "PUSH", "PUSH"]; // no Protocol
  const c = bossCombat({ deck, hp: 1000, seed: 3 });
  autoNegotiate(c, 60);
  assert.ok(!(c.over && c.result === "win"), "a Protocol-less deck cannot clear the negotiation");
  assert.equal(c.bossPhase, 2, "it stalls at phase 2 (the ACK-FIRST demand is unmeetable)");
}

// ── H · relic / corruption damage: the demand-gate applies to relic damage too ───────────
{
  // Checksum Offload (a relic that deals on Protocol play) is refused here because the ACK itself
  // doesn't satisfy phase 1's LEAD-SYN demand — the same demand-gate real Signal cards face.
  const c = createCombat({
    deck: ["ACK"], player: { hp: 300, maxHp: 300 },
    enemy: instantiateEnemy("the-refused-connection", 4), seed: 1,
    relics: relicsFor(["checksum-offload"])
  });
  wireBossCombat(c);
  const before = c.enemy.hp;
  c.hand = ["ACK"]; c.player.energy = 3;
  playCard(c, 0); // Protocol play, but ACK isn't SYN ⇒ phase-1 LEAD-SYN demand unmet ⇒ refused
  assert.equal(c.enemy.hp, before, "relic damage is refused by the demand-gate, same as any other card");
}
{
  // The same relic does land once the demand is met.
  const c = createCombat({
    deck: ["SYN", "ACK"], player: { hp: 300, maxHp: 300 },
    enemy: instantiateEnemy("the-refused-connection", 4), seed: 1,
    relics: relicsFor(["checksum-offload"])
  });
  wireBossCombat(c);
  c.hand = ["SYN", "ACK"]; c.player.energy = 5;
  const before = c.enemy.hp;
  playCard(c, 0); // SYN leads ⇒ demand met
  playCard(c, 0); // Protocol play → checksum-offload lands too
  assert.ok(c.enemy.hp < before, "relic damage lands once the demand is met");
}
{
  // The boss is immune to CORRUPTION — a corruption build can't sidestep the handshake.
  const c = bossCombat();
  assert.ok(c.enemy.immuneCorruption, "the boss carries corruption immunity");
  const before = c.enemy.hp;
  const ctx = makeCtx(c, null);
  ctx.applyCorruption(8);
  assert.equal(c.enemy.statuses.corruption || 0, 0, "corruption never applies to the boss");
  endTurn(c); // even after an enemy turn, no DoT damage
  assert.ok(c.enemy.hp >= before - 0, "boss takes no corruption damage");
}

console.log("stage5 boss-combat tests passed");
