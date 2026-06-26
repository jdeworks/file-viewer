// boss-combat.test.mjs — The Refused Connection fought with the REAL deck (acceptance hook).
import assert from "node:assert/strict";
import { createCombat, playCard, endTurn } from "../combat.js";
import { instantiateEnemy } from "../enemies.js";
import { wireBossCombat, autoNegotiate, BOSS_PHASE_HP } from "../boss-combat.js";

function bossCombat({ deck = ["SYN"], hp = 300, seed = 1, locked = false } = {}) {
  const c = createCombat({
    deck,
    player: { hp, maxHp: hp },
    enemy: instantiateEnemy("the-refused-connection", 4),
    seed
  });
  return wireBossCombat(c, { locked });
}

// ── wiring: starts at phase 1 with the phase-1 HP pool ────────────────────────────────────────────
{
  const c = bossCombat();
  assert.equal(c.bossPhase, 1, "starts in phase 1");
  assert.equal(c.enemy.hp, BOSS_PHASE_HP[1], "phase-1 HP pool");
  assert.equal(typeof c.acceptance, "function", "acceptance wired");
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

// ── phase 3: Signals always land; a turn with no ACK costs 8 ongoing ──────────────────────────────
{
  const c = bossCombat();
  c.bossPhase = 3; c.enemy.hp = BOSS_PHASE_HP[3];
  c.hand = ["SYN"]; c.player.energy = 5;
  const before = c.enemy.hp;
  playCard(c, 0);
  assert.ok(c.enemy.hp < before, "phase 3: Signal lands without ACK");

  // onPlayerTurnEnd in isolation (avoids the enemy attack confounding the HP delta).
  c.playedIdsThisTurn = [];
  const hp0 = c.player.hp;
  c.onPlayerTurnEnd(c);
  assert.equal(c.player.hp, hp0 - 8, "phase 3: no-ACK turn costs 8 ongoing");
  c.playedIdsThisTurn = ["ACK"];
  const hp1 = c.player.hp;
  c.onPlayerTurnEnd(c);
  assert.equal(c.player.hp, hp1, "phase 3: an ACK turn avoids the ongoing damage");
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

// ── locked (ch9 unread): every Signal is refused in EVERY phase ⇒ unwinnable (the un-cheat) ────────
{
  // Even a perfectly-correct handshake sequence deals 0 while ch9 is unread, in all three phases.
  for (const phase of [1, 2, 3]) {
    const c = bossCombat({ locked: true });
    c.bossPhase = phase; c.enemy.hp = BOSS_PHASE_HP[phase];
    c.hand = ["ACK", "SYN", "SYN"]; c.player.energy = 99;
    const before = c.enemy.hp;
    // Play a correct handshake (ACK then SYNs). Bounded — SYN draws 2 after an ACK, so the hand
    // can refill; the cap stops that from looping while still playing the whole opening sequence.
    for (let k = 0; k < 12 && c.hand.length && !c.over; k++) {
      if (!playCard(c, 0).ok) break;
    }
    assert.equal(c.enemy.hp, before, `locked: phase ${phase} boss takes 0 despite a correct sequence`);
  }
}
{
  const deck = ["SYN", "ACK", "PRIORITY_PACKET", "SYN"];
  const c = bossCombat({ deck, hp: 500, seed: 7, locked: true });
  autoNegotiate(c, 30);
  assert.equal(c.bossPhase, 1, "locked: never advances past phase 1");
  assert.equal(c.enemy.hp, BOSS_PHASE_HP[1], "locked: boss takes 0 — all Signals refused");
  assert.ok(!(c.over && c.result === "win"), "locked: cannot win the fight");
}

console.log("stage6 boss-combat tests passed");
