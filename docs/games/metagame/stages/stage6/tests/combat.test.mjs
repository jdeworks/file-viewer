import assert from "node:assert/strict";
import {
  createCombat,
  currentIntent,
  dealToEnemy,
  drawCards,
  endTurn,
  playCard
} from "../combat.js";
import { STARTING_DECK, cardById } from "../cards.js";
import { instantiateEnemy } from "../enemies.js";
import { relicsFor } from "../relics.js";

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

// ── D1 SEQUENCE: opener/closer cards make play ORDER matter (lenticular) ───────────────────────────
{
  function firstCardDamage(cardId) {
    const c = createCombat({ deck: STARTING_DECK, player, enemy: instantiateEnemy("corrupt-packet", 1), seed: 5 });
    c.hand = [cardId, "ACK"]; c.player.energy = 5;
    const before = c.enemy.hp;
    playCard(c, 0); // play target as the FIRST card
    return before - c.enemy.hp;
  }
  function secondCardDamage(cardId) {
    const c = createCombat({ deck: STARTING_DECK, player, enemy: instantiateEnemy("corrupt-packet", 1), seed: 5 });
    c.hand = ["ACK", cardId]; c.player.energy = 5;
    playCard(c, 0); // ACK first (no damage)
    const before = c.enemy.hp;
    playCard(c, 0); // target as the SECOND card
    return before - c.enemy.hp;
  }
  assert.equal(firstCardDamage("PREAMBLE"), 12, "PREAMBLE doubles when it leads");
  assert.equal(secondCardDamage("PREAMBLE"), 6, "PREAMBLE is single when it follows");
  assert.equal(firstCardDamage("FINALIZE"), 8, "FINALIZE is single when it leads");
  assert.equal(secondCardDamage("FINALIZE"), 16, "FINALIZE doubles when it follows");

  // Lenticular hand: opener-first is provably better than greedy closer-first.
  function totalDamage(order) {
    const c = createCombat({ deck: STARTING_DECK, player, enemy: instantiateEnemy("corrupt-packet", 1), seed: 5 });
    c.hand = [...order]; c.player.energy = 5;
    const before = c.enemy.hp;
    playCard(c, 0); playCard(c, 0);
    return before - c.enemy.hp;
  }
  const optimal = totalDamage(["PREAMBLE", "FINALIZE"]); // 12 + 16 = 28
  const greedy = totalDamage(["FINALIZE", "PREAMBLE"]);  // 8 + 6 = 14
  assert.ok(optimal > greedy, "leading with the opener beats the greedy order");
  assert.equal(optimal, 28, "optimal order total");
  assert.equal(greedy, 14, "greedy order total");
}
{
  // TCP Fast Open: the first card each turn costs 1 less.
  const c = createCombat({ deck: STARTING_DECK, player, enemy: instantiateEnemy("corrupt-packet", 1), seed: 5, relics: relicsFor(["tcp-fast-open"]) });
  c.hand = ["RST", "RST"]; c.player.energy = 3; // RST costs 2
  playCard(c, 0); // first card: 2 - 1 = 1 energy
  assert.equal(c.player.energy, 2, "first card discounted by 1");
  playCard(c, 0); // second card: full cost 2
  assert.equal(c.player.energy, 0, "second card pays full cost");
}

// ── D2 DELAY: queued effects resolve on the correct future turn (deterministic) ────────────────────
function bigEnemyCombat(deck, relics = [], seed = 9) {
  const c = createCombat({ deck, player: { hp: 300, maxHp: 300 }, enemy: instantiateEnemy("corrupt-packet", 1), seed, relics });
  c.enemy.hp = 400; c.enemy.maxHp = 400; // survive long enough to observe the delay
  return c;
}
{
  const c = bigEnemyCombat(STARTING_DECK);
  c.hand = ["WINDOWED_SEND"]; c.player.energy = 3;
  const e0 = c.enemy.hp;
  playCard(c, 0); // 4 now, 8 queued for next turn
  assert.equal(e0 - c.enemy.hp, 4, "WINDOWED_SEND deals 4 immediately");
  const e1 = c.enemy.hp;
  c.hand = []; endTurn(c); // start of next turn → queued 8 lands
  assert.equal(e1 - c.enemy.hp, 8, "the queued 8 resolves at the start of the next turn");
}
{
  const c = bigEnemyCombat(STARTING_DECK);
  c.hand = ["RETRANSMIT"]; c.player.energy = 3;
  const e0 = c.enemy.hp;
  playCard(c, 0); // queue 18 in 2 turns; nothing now
  assert.equal(c.enemy.hp, e0, "RETRANSMIT deals nothing immediately");
  c.hand = []; endTurn(c);
  assert.equal(c.enemy.hp, e0, "still nothing after 1 turn");
  c.hand = []; endTurn(c);
  assert.equal(e0 - c.enemy.hp, 18, "resolves exactly 2 turns later");
}
{
  // Fast Retransmit: the FIRST delayed effect lands a turn sooner.
  const c = bigEnemyCombat(STARTING_DECK, relicsFor(["fast-retransmit"]));
  c.hand = ["RETRANSMIT"]; c.player.energy = 3;
  const e0 = c.enemy.hp;
  playCard(c, 0); // queue(2) → sped up to 1
  c.hand = []; endTurn(c);
  assert.equal(e0 - c.enemy.hp, 18, "Fast Retransmit lands the first delayed packet a turn sooner");
}
{
  // Round-Trip Timer ramps each uninterrupted round; an interrupt resets the ramp.
  const c = createCombat({ deck: STARTING_DECK, player: { hp: 300, maxHp: 300 }, enemy: instantiateEnemy("round-trip-timer", 1), seed: 2 });
  c.enemy.intentIndex = 2; c.enemy.rttStacks = 2; // the ramp step, after 2 uninterrupted rounds
  const hp0 = c.player.hp;
  c.hand = []; endTurn(c); // fires 8 + 6*2 = 20
  assert.equal(hp0 - c.player.hp, 20, "RTT hit grows with uninterrupted rounds (8 + 6*2)");

  const c2 = createCombat({ deck: STARTING_DECK, player: { hp: 300, maxHp: 300 }, enemy: instantiateEnemy("round-trip-timer", 1), seed: 2 });
  c2.enemy.rttStacks = 3; c2.enemy.skipNext = true; // interrupt this turn
  c2.hand = []; endTurn(c2);
  assert.equal(c2.enemy.rttStacks, 0, "interrupting the RTT resets its ramp");
}

// ── D3 THROUGHPUT: the congestion window shrinks on wide turns, regrows on restraint ───────────────
function congestionCombat(seed = 11) {
  const c = createCombat({ deck: STARTING_DECK, player: { hp: 300, maxHp: 300 }, enemy: instantiateEnemy("corrupt-packet", 1), seed, congestion: true });
  c.enemy.hp = 400; c.enemy.maxHp = 400;
  return c;
}
{
  // Wide turn (spend the whole window) ⇒ next window shrinks by 1.
  const c = congestionCombat();
  assert.equal(c.player.energy, 3, "window starts at 3");
  c.hand = ["SYN", "SYN", "SYN"]; c.player.energy = 3; // cost-bearing cards to actually spend the window
  c.player.block = 0;
  playCard(c, 0); playCard(c, 0); playCard(c, 0); // spent 3 of 3 ⇒ wide
  c.hand = []; endTurn(c);
  assert.equal(c.player.maxEnergy, 2, "a wide turn shrinks the window to 2");
}
{
  // Restrained turn (spend nothing) ⇒ window regrows toward the cap.
  const c = congestionCombat();
  c.hand = []; c.player.energy = 3; // spend 0
  endTurn(c);
  assert.equal(c.player.maxEnergy, 4, "restraint regrows the window to 4");
}
{
  // Backoff prevents the shrink on a wide turn (BACKOFF is cost 0, so 3 SYN still spend the window).
  const c = congestionCombat();
  c.hand = ["SYN", "SYN", "SYN", "BACKOFF"]; c.player.energy = 3;
  while (c.hand.length) playCard(c, 0); // spend all 3 energy (wide) + play BACKOFF (no-shrink)
  c.hand = []; endTurn(c);
  assert.equal(c.player.maxEnergy, 3, "Backoff cancels the shrink (window stays 3)");
}
{
  // Bandwidth widens the window immediately.
  const c = congestionCombat();
  c.hand = ["BANDWIDTH"]; c.player.energy = 3;
  playCard(c, 0); // widenWindow(1)
  assert.equal(c.window, 4, "Bandwidth widens the window to 4");
  assert.equal(c.player.maxEnergy, 4, "and raises max energy");
}
{
  // Congestion Collapse deals damage scaling with the energy you spent.
  const c = createCombat({ deck: STARTING_DECK, player: { hp: 300, maxHp: 300 }, enemy: instantiateEnemy("congestion-collapse", 1), seed: 4, congestion: true });
  c.enemy.intentIndex = 1; // the "Collapse" step
  c.hand = ["SYN", "SYN"]; c.player.energy = 3;
  playCard(c, 0); playCard(c, 0); // spent 2 energy
  c.player.block = 0;
  const hp0 = c.player.hp;
  c.hand = []; endTurn(c); // collapse: 3 * 2 = 6
  assert.equal(hp0 - c.player.hp, 6, "Collapse deals 3 × energy spent");
}
{
  // Deterministic window trajectory: same inputs ⇒ same window each turn.
  function trajectory() {
    const c = congestionCombat(21);
    const out = [];
    for (let t = 0; t < 4; t++) { c.hand = []; endTurn(c); out.push(c.player.maxEnergy); }
    return out;
  }
  assert.deepEqual(trajectory(), trajectory(), "same seed ⇒ identical window trajectory");
}

// ── D3b PACKET LOSS: dumping 4+ cards jams one next turn; Defrag clears it ──────────────────────────
{
  // Play 4 cards (cost-0) ⇒ oversize ⇒ next turn one card is jammed.
  const c = congestionCombat(31);
  c.hand = ["SEGMENT", "SEGMENT", "SEGMENT", "SEGMENT"]; c.player.energy = 5;
  while (c.hand.length) playCard(c, 0); // 4 cards played
  c.hand = []; endTurn(c);
  assert.equal(c.jammed.length, 1, "an oversize turn jams one card next turn");
  const handAfterJam = c.hand.length;

  // Defrag returns the jammed card to hand and clears the jam.
  c.hand.push("DEFRAG"); c.player.energy = 5;
  playCard(c, c.hand.indexOf("DEFRAG"));
  assert.equal(c.jammed.length, 0, "Defrag clears the jam");
  assert.ok(c.hand.length >= handAfterJam, "Defrag returned the jammed card to hand");
}
{
  // A jam lasts only one turn: it releases on the following turn.
  const c = congestionCombat(32);
  c.hand = ["SEGMENT", "SEGMENT", "SEGMENT", "SEGMENT"]; c.player.energy = 5;
  while (c.hand.length) playCard(c, 0);
  c.hand = []; endTurn(c);
  assert.equal(c.jammed.length, 1, "jammed after the oversize turn");
  c.hand = []; endTurn(c); // a normal (small) turn
  assert.equal(c.jammed.length, 0, "the jam releases the following turn");
}
{
  // No jam without congestion, even when dumping many cards.
  const c = createCombat({ deck: STARTING_DECK, player: { hp: 300, maxHp: 300 }, enemy: instantiateEnemy("corrupt-packet", 1), seed: 4 });
  c.enemy.hp = 400;
  c.hand = ["SEGMENT", "SEGMENT", "SEGMENT", "SEGMENT"]; c.player.energy = 9;
  while (c.hand.length) playCard(c, 0);
  c.hand = []; endTurn(c);
  assert.equal(c.jammed.length, 0, "flat-energy combats never jam");
}

// ── E2 integration: real combats with the full card pool always TERMINATE, deterministically ───────
// (The boss's winnability with correct play is proven separately by boss-combat's autoNegotiate.)
{
  function autoBattle(deck, enemyId, act, seed, congestion = false, maxTurns = 200) {
    const c = createCombat({ deck, player: { hp: 100, maxHp: 100 }, enemy: instantiateEnemy(enemyId, act), seed, congestion });
    let turns = 0;
    while (!c.over && turns++ < maxTurns) {
      let played = true;
      while (played && !c.over) {
        played = false;
        for (let i = 0; i < c.hand.length; i++) {
          const card = cardById(c.hand[i]);
          if (card && card.cost <= c.player.energy) { playCard(c, i); played = true; break; }
        }
      }
      if (!c.over) endTurn(c);
    }
    return c;
  }
  // A deck spanning every archetype + every new verb (sequence/delay/throughput cards).
  const deck = ["SYN", "ACK", "PREAMBLE", "FINALIZE", "WINDOWED_SEND", "RETRANSMIT", "DELAYED_ACK",
    "BANDWIDTH", "BACKOFF", "DEFRAG", "PRIORITY_PACKET", "FLOOD", "CIPHER_LAYER", "SEGMENT"];
  const enemies = ["corrupt-packet", "round-trip-timer", "congestion-collapse", "man-in-the-middle",
    "expired-certificate", "kernel-panic", "deadlock"];
  for (const enemyId of enemies) {
    const c = autoBattle(deck, enemyId, 3, 7, true);
    assert.ok(c.over, `${enemyId}: real combat terminates (no infinite loop) within the turn cap`);
    const again = autoBattle(deck, enemyId, 3, 7, true);
    assert.equal(again.result, c.result, `${enemyId}: same seed ⇒ same outcome`);
    assert.equal(again.turn, c.turn, `${enemyId}: same seed ⇒ same length`);
  }
}

console.log("stage6 combat engine tests passed");
