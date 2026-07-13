import assert from "node:assert/strict";
import {
  createRun, resolveCombat, takeReward, rest, removeCard, seatAtFinalBoss,
  enemyForCurrentNode, awardKey, hasAllKeys,
  KEY_UNTOUCHABLE, KEY_ASCETIC, KEY_SACRIFICE, KEYS_FOR_SUPERBOSS, FINAL_BOSS_ACT
} from "../run.js";
import { SUPERBOSS_ID, SUPERBOSS_PHASE_HP, wireSuperboss } from "../superboss.js";
import { createCombat, playCard, endTurn, strHash } from "../combat.js";
import { cardById } from "../cards.js";
import { REPRESENTATIVE_ENDGAME_DECK, REPRESENTATIVE_ENDGAME_HP, ENDGAME_FIXTURE_SEED } from "../testhook.js";
import "../card-upgrades.js"; // register the upgraded "<ID>+" forms used by the representative deck

// ── awardKey / hasAllKeys ─────────────────────────────────────────────────────────────────────────
{
  const run = createRun({ seed: 3 });
  assert.deepEqual(run.keys, [], "a fresh run has no keys");
  assert.equal(awardKey(run, KEY_ASCETIC), true, "first award succeeds");
  assert.equal(awardKey(run, KEY_ASCETIC), false, "duplicate award is a no-op");
  assert.equal(run.keys.length, 1, "deduped");
  assert.equal(hasAllKeys(run), false, "one key is not enough");
  awardKey(run, KEY_UNTOUCHABLE); awardKey(run, KEY_SACRIFICE);
  assert.equal(hasAllKeys(run), true, `${KEYS_FOR_SUPERBOSS} keys unlocks the superboss`);
}

// ── untouchable key: clear an elite taking ≤5 damage ──────────────────────────────────────────────
{
  const run = createRun({ seed: 9 });
  const eliteId = findNode(run, "elite");
  assert.ok(eliteId, "the map has an elite node");
  run.currentNodeId = eliteId; run.hp = 50;
  resolveCombat(run, { win: true, hpRemaining: 47 }); // lost 3 ≤ 5 ⇒ key
  assert.ok(run.keys.includes(KEY_UNTOUCHABLE), "≤5 damage on an elite earns the untouchable key");

  const run2 = createRun({ seed: 9 });
  run2.currentNodeId = eliteId; run2.hp = 50;
  resolveCombat(run2, { win: true, hpRemaining: 40 }); // lost 10 > 5 ⇒ no key
  assert.ok(!run2.keys.includes(KEY_UNTOUCHABLE), ">5 damage on an elite does NOT earn the key");
}

// ── ascetic key: skip a card reward ───────────────────────────────────────────────────────────────
{
  const run = createRun({ seed: 11 });
  run.status = "reward"; run.pendingReward = { cards: ["SYN"] };
  takeReward(run, null);
  assert.ok(run.keys.includes(KEY_ASCETIC), "skipping a reward earns the ascetic key");

  const run2 = createRun({ seed: 11 });
  run2.status = "reward"; run2.pendingReward = { cards: ["SYN"] };
  takeReward(run2, "SYN"); // take the card ⇒ no key
  assert.ok(!run2.keys.includes(KEY_ASCETIC), "taking a reward does NOT earn the ascetic key");
}

// ── sacrifice key: rest on neither heal nor upgrade (remove) ───────────────────────────────────────
{
  const run = createRun({ seed: 13 });
  const restId = findNode(run, "rest");
  assert.ok(restId, "the map has a rest node");
  run.currentNodeId = restId;
  removeCard(run, 0);
  rest(run, "remove");
  assert.ok(run.keys.includes(KEY_SACRIFICE), "a remove-rest earns the sacrifice key");

  const run2 = createRun({ seed: 13 });
  run2.currentNodeId = findNode(run2, "rest");
  rest(run2, "heal");
  assert.ok(!run2.keys.includes(KEY_SACRIFICE), "a heal-rest does NOT earn the sacrifice key");
}

// ── superboss gating: the act-6 boss diverts to the superboss only with all keys ──────────────────
{
  const run = createRun({ seed: 17 });
  seatAtFinalBoss(run);
  run.keys = [KEY_UNTOUCHABLE, KEY_ASCETIC, KEY_SACRIFICE];
  const r = resolveCombat(run, { win: true, hpRemaining: 40 });
  assert.equal(r.status, "superboss", "all keys ⇒ the hidden superboss opens after the negotiation");
  assert.equal(run.atSuperboss, true, "run flagged at the superboss");
  assert.equal(enemyForCurrentNode(run), SUPERBOSS_ID, "the synthetic node spawns the superboss");
  assert.ok(/:superboss$/.test(run.currentNodeId), "synthetic superboss node id");

  const noKeys = createRun({ seed: 17 });
  seatAtFinalBoss(noKeys);
  const r2 = resolveCombat(noKeys, { win: true, hpRemaining: 40 });
  assert.equal(r2.status, "won", "without all keys the negotiation simply wins (no superboss)");
  assert.equal(noKeys.atSuperboss, false, "not diverted to the superboss");
}

// ── superboss shape sanity ────────────────────────────────────────────────────────────────────────
{
  assert.equal(SUPERBOSS_PHASE_HP.length, 3, "the superboss has 3 phases");
  assert.ok(SUPERBOSS_PHASE_HP.every((h) => h > 0), "each phase has HP");
}

// ── superboss tuning: a CLIMACTIC pool, escalating per phase ────────────────────────────────────────
{
  assert.deepEqual(SUPERBOSS_PHASE_HP, [82, 88, 94], "the superboss is tuned to its climactic 264-HP ladder");
  const total = SUPERBOSS_PHASE_HP.reduce((a, b) => a + b, 0);
  assert.equal(total, 264, "total HP across the 3 phases");
  assert.ok(total > 165, "the new tuning is far heavier than the old timid [50,55,60]=165 pool");
  assert.ok(SUPERBOSS_PHASE_HP[2] > SUPERBOSS_PHASE_HP[1] && SUPERBOSS_PHASE_HP[1] > SUPERBOSS_PHASE_HP[0], "phases escalate (the final phase is the hardest)");
}

// ── superboss winnability + margin: the auto-player clears it with the representative end-game deck ──
// Mirrors testhook.autoSuperboss EXACTLY against the same pinned fixture (deck + 50 HP + seed 7, with
// the act-6 boss node id always "a6-l6-n0"), so the smoke's down-to-the-wire win is asserted here
// deterministically. This is the guard the round-4 attempt lacked: proof the higher pool is winnable.
{
  const combatSeed = strHash(`${ENDGAME_FIXTURE_SEED}:a6-l6-n0:superboss:combat`);
  const combat = createCombat({
    deck: REPRESENTATIVE_ENDGAME_DECK,
    player: { hp: REPRESENTATIVE_ENDGAME_HP, maxHp: 60 },
    enemy: { id: SUPERBOSS_ID, name: "The Kernel of Refusal", hp: 50, armor: 0, script: [] },
    seed: combatSeed,
    congestion: false
  });
  wireSuperboss(combat);
  const startHp = combat.player.hp;
  let turns = 0;
  while (!combat.over && turns++ < 120) {
    let guard = 0;
    while (guard++ < 30 && !combat.over) {
      const idx = combat.hand.findIndex((id) => { const c = cardById(id); return c && c.cost <= combat.player.energy; });
      if (idx < 0) break;
      playCard(combat, idx);
    }
    if (combat.over) break;
    endTurn(combat);
  }
  const endHp = combat.player.hp;
  assert.equal(combat.result, "win", "the auto-player defeats the superboss with the representative loadout");
  assert.equal(startHp, 50, "enters the bonus fight at the representative 50 HP");
  assert.ok(endHp > 0, "survives the fight (a real win, not a mutual KO)");
  assert.ok(startHp - endHp >= 25, `it is no pushover — a real amount of HP is spent (lost ${startHp - endHp})`);
  assert.ok(endHp <= 25, `it comes down to the wire — not a trivial romp (ended at ${endHp}/${startHp})`);
}

function findNode(run, type) {
  for (const act of run.map.acts) {
    for (const layer of act.layers) {
      for (const node of layer) if (node.type === type) return node.id;
    }
  }
  return null;
}

console.log("stage5 keys + superboss tests passed");
