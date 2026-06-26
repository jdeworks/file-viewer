import assert from "node:assert/strict";
import { generateRun, nodeById, enemyForNode } from "../mapgen.js";
import {
  availableNodes,
  buyCard,
  buyRelic,
  buyRemoval,
  buyUpgrade,
  closeNode,
  createRun,
  enemyForCurrentNode,
  moveTo,
  prestigeCost,
  removalCost,
  rest,
  resolveCombat,
  seatAtFinalBoss,
  takeReward,
  upgradeDeckCard,
  RELIC_COST,
  UPGRADE_COST,
  FINAL_BOSS_ACT
} from "../run.js";
import { makeRng, createCombat, playCard } from "../combat.js";
import { instantiateEnemy } from "../enemies.js";
import { STARTING_DECK } from "../cards.js";

// ── mapgen: structure + full connectivity ────────────────────────────────────────────────────────
{
  const run = generateRun(42, 4);
  assert.equal(run.acts.length, 4, "four acts");
  for (const act of run.acts) {
    const boss = act.layers.at(-1);
    assert.equal(boss.length, 1, "one boss node per act");
    assert.equal(boss[0].type, "boss", "final layer is the boss");

    // Every node reaches the boss (forward reachability).
    const all = act.layers.flat();
    const bossId = boss[0].id;
    for (const node of all) {
      assert.ok(reaches(run, node.id, bossId), `${node.id} can reach the boss`);
    }
    // Every non-start node has an incoming edge (backward connectivity).
    const startIds = new Set(act.startIds);
    for (const node of all) {
      if (startIds.has(node.id)) continue;
      const incoming = all.some((n) => n.next.includes(node.id));
      assert.ok(incoming, `${node.id} has an incoming edge`);
    }
  }
}

// ── run: starting state ──────────────────────────────────────────────────────────────────────────
{
  const run = createRun({ seed: 1 });
  assert.equal(run.status, "map");
  assert.equal(run.act, 1);
  assert.deepEqual(run.deck, STARTING_DECK);
  assert.equal(run.hp, 60);
  const opts = availableNodes(run);
  assert.ok(opts.length >= 1, "act 1 offers start nodes");
  assert.ok(opts.every((n) => n.type === "combat"), "start layer is combat");
}

// ── run: combat win -> reward -> deck grows ──────────────────────────────────────────────────────
{
  const run = createRun({ seed: 1 });
  const first = availableNodes(run)[0];
  moveTo(run, first.id);
  assert.equal(run.status, "combat");
  const before = run.deck.length;
  const r = resolveCombat(run, { win: true, hpRemaining: 55 });
  assert.equal(r.status, "reward");
  assert.equal(run.handshakes, 10, "combat grants 10 handshakes");
  assert.equal(run.pendingReward.cards.length, 3, "three card choices");
  takeReward(run, run.pendingReward.cards[0]);
  assert.equal(run.deck.length, before + 1, "chosen reward card added");
  assert.equal(run.status, "map");
}

// ── run: death ends the attempt ──────────────────────────────────────────────────────────────────
{
  const run = createRun({ seed: 1 });
  moveTo(run, availableNodes(run)[0].id);
  const r = resolveCombat(run, { win: false, hpRemaining: 0 });
  assert.equal(r.status, "dead");
  assert.equal(run.status, "dead");
}

// ── run: shop purchase spends handshakes ─────────────────────────────────────────────────────────
{
  const run = createRun({ seed: 1, handshakes: 100 });
  const ok = buyCard(run, "FLOOD", 75);
  assert.equal(ok.ok, true);
  assert.equal(run.handshakes, 25);
  assert.ok(run.deck.includes("FLOOD"));
  assert.equal(buyCard(run, "FLOOD", 75).ok, false, "cannot afford a second");
}

// ── run: full traversal clears all 3 acts and wins ──────────────────────────────────────────────
{
  const run = createRun({ seed: 7 });
  let guard = 0;
  while (run.status !== "won" && guard++ < 2000) {
    if (run.status === "map") {
      const opts = availableNodes(run);
      moveTo(run, opts[0].id);
    } else if (run.status === "combat" || run.status === "boss") {
      resolveCombat(run, { win: true, hpRemaining: run.hp });
    } else if (run.status === "reward") {
      takeReward(run, run.pendingReward.cards[0]);
    } else if (run.status === "rest") {
      rest(run, "heal");
    } else if (run.status === "shop" || run.status === "event") {
      closeNode(run);
    } else {
      break;
    }
  }
  assert.equal(run.status, "won", "a clean run clears all four acts");
  assert.equal(run.act, 4, "ended in act 4");
}

// ── run: elites and act bosses award relics (deduped, deterministic) ─────────────────────────────
{
  // Drive a seed where act 1 contains an elite; clearing it grants a relic via the reward.
  const run = createRun({ seed: 7 });
  let guard = 0;
  let eliteRelic = null;
  while (run.act === 1 && run.status !== "won" && guard++ < 500) {
    if (run.status === "map") moveTo(run, availableNodes(run)[0].id);
    else if (run.status === "combat" || run.status === "boss") resolveCombat(run, { win: true, hpRemaining: run.hp });
    else if (run.status === "reward") { if (run.pendingReward.relic) eliteRelic = run.pendingReward.relic; takeReward(run, run.pendingReward.cards[0]); }
    else if (run.status === "rest") rest(run, "heal");
    else closeNode(run);
  }
  // Clearing act 1's boss advanced us to act 2 and granted a relic notice.
  assert.ok(run.act >= 2, "advanced past act 1");
  assert.ok(run.relics.length >= 1, "at least one relic owned after an act");
  assert.equal(new Set(run.relics).size, run.relics.length, "relics are never duplicated");
  if (eliteRelic) assert.ok(run.relics.includes(eliteRelic), "elite relic was retained");
}

// ── prestige: Protocol Version raises HP and grants starting relics ──────────────────────────────
{
  assert.equal(prestigeCost(0), 40, "v0->v1 costs 40 banked");
  assert.equal(prestigeCost(2), 120, "cost scales with version");
  const v0 = createRun({ seed: 1, version: 0 });
  assert.equal(v0.maxHp, 60, "v0 starts at base HP");
  assert.equal(v0.relics.length, 0, "v0 starts with no relics");
  const v2 = createRun({ seed: 1, version: 2 });
  assert.equal(v2.maxHp, 70, "each version adds 5 max HP");
  assert.equal(v2.hp, 70, "starts at full HP");
  assert.equal(v2.relics.length, 2, "version grants one starting relic each");
  assert.equal(new Set(v2.relics).size, 2, "starting relics are distinct");
}

// ── A1: enemy picks are deterministic from seed (no Math.random leak) ─────────────────────────────
{
  // enemyForNode requires a seeded rng — no live-entropy fallback.
  const combatNode = { type: "combat" };
  assert.throws(() => enemyForNode(combatNode, 1), /seeded rng/, "enemyForNode rejects a missing rng");

  // Same seed ⇒ identical enemy id at the same node across two independent runs.
  for (const seed of [1, 7, 42, 1234]) {
    const a = createRun({ seed });
    const b = createRun({ seed });
    a.currentNodeId = b.currentNodeId = a.map.acts[0].startIds[0];
    const ea = enemyForCurrentNode(a, makeRng(101));
    const eb = enemyForCurrentNode(b, makeRng(101));
    assert.equal(ea, eb, `seed ${seed}: same node ⇒ same enemy`);
    // The default rng path is also deterministic (derived from run.seed + node), never Math.random.
    assert.equal(enemyForCurrentNode(a), enemyForCurrentNode(b), `seed ${seed}: default rng is replayable`);
  }
}

// ── A2: seatAtFinalBoss lands a run at the act-4 boss node (test/debug helper) ────────────────────
{
  const run = createRun({ seed: 3 });
  assert.equal(run.act, 1, "fresh run starts in act 1");
  const bossId = seatAtFinalBoss(run);
  assert.equal(run.act, FINAL_BOSS_ACT, "seated in the final act");
  assert.equal(run.status, "boss", "status is boss");
  assert.equal(run.currentNodeId, bossId, "current node is the returned boss id");
  const node = nodeById(run.map, run.currentNodeId);
  assert.equal(node.type, "boss", "the seated node is the boss node");
  assert.equal(enemyForCurrentNode(run, makeRng(1)), "the-refused-connection", "act-4 boss is The Refused Connection");
  // Optional deck swap is honoured and isolated (copy, not alias).
  const known = ["SYN", "ACK", "Signal"];
  seatAtFinalBoss(run, known);
  assert.deepEqual(run.deck, known, "known deck installed");
  run.deck.push("X");
  assert.deepEqual(known, ["SYN", "ACK", "Signal"], "deck swap copies, does not alias");
}

// ── B1: The Refused Connection is ONLY the act-4 boss (acts 1–3 are other mini-bosses) ────────────
{
  const run = createRun({ seed: 9 });
  for (let act = 1; act <= FINAL_BOSS_ACT; act++) {
    run.act = act;
    const bossNode = run.map.acts[act - 1].layers.at(-1)[0];
    run.currentNodeId = bossNode.id;
    const enemy = enemyForCurrentNode(run, makeRng(act));
    if (act === FINAL_BOSS_ACT) {
      assert.equal(enemy, "the-refused-connection", "act 4 boss IS The Refused Connection");
    } else {
      assert.notEqual(enemy, "the-refused-connection", `act ${act} boss is a different mini-boss`);
    }
  }
}

// ── C2a: escalating deck-removal economy + skip-for-handshakes ─────────────────────────────────────
{
  const run = createRun({ seed: 1, handshakes: 200 });
  assert.equal(removalCost(run), 25, "first removal costs the base price");
  const len0 = run.deck.length;
  const r1 = buyRemoval(run, 0);
  assert.ok(r1.ok && r1.cost === 25, "first removal succeeds at 25");
  assert.equal(run.deck.length, len0 - 1, "a card was removed");
  assert.equal(run.handshakes, 175, "handshakes deducted deterministically");
  assert.equal(removalCost(run), 50, "the price climbs after a purchase");
  const r2 = buyRemoval(run, 0);
  assert.ok(r2.ok && r2.cost === 50, "second removal costs 50");
  assert.equal(removalCost(run), 75, "and climbs again");

  // insufficient handshakes are rejected; nothing is spent or removed.
  const poor = createRun({ seed: 1, handshakes: 10 });
  const len1 = poor.deck.length;
  const bad = buyRemoval(poor, 0);
  assert.equal(bad.ok, false, "cannot afford a removal");
  assert.equal(poor.deck.length, len1, "deck unchanged when too poor");
  assert.equal(poor.handshakes, 10, "handshakes unchanged when too poor");
}
{
  // Skipping a reward pays a few handshakes (keeps decks thin).
  const run = createRun({ seed: 1 });
  moveTo(run, availableNodes(run)[0].id);
  resolveCombat(run, { win: true, hpRemaining: run.hp });
  const before = run.handshakes;
  const lenBefore = run.deck.length;
  const r = takeReward(run, null); // skip
  assert.ok(r.ok && r.skipped, "skip reported");
  assert.equal(run.deck.length, lenBefore, "skipping adds no card");
  assert.equal(run.handshakes, before + 5, "skipping pays 5 handshakes");
}

// ── C2b: shop upgrade + relic buys ─────────────────────────────────────────────────────────────────
{
  // buyUpgrade: deducts and upgrades; not-upgradable spends nothing; too-poor rejected.
  const run = createRun({ seed: 1, handshakes: 100 });
  const idx = run.deck.indexOf("SYN");
  const r = buyUpgrade(run, idx, UPGRADE_COST);
  assert.ok(r.ok, "upgrade purchased");
  assert.equal(run.deck[idx], "SYN+", "card upgraded");
  assert.equal(run.handshakes, 100 - UPGRADE_COST, "handshakes deducted");
  const again = buyUpgrade(run, idx, UPGRADE_COST); // already upgraded
  assert.equal(again.ok, false, "cannot upgrade an upgraded card");
  assert.equal(run.handshakes, 100 - UPGRADE_COST, "no spend on a failed upgrade");
  const poor = createRun({ seed: 1, handshakes: 5 });
  assert.equal(buyUpgrade(poor, 0, UPGRADE_COST).ok, false, "too poor to upgrade");
  assert.equal(poor.handshakes, 5, "nothing spent when too poor");
}
{
  // buyRelic: grants distinct relics until the pool is exhausted, then reports sold-out (no spend).
  const run = createRun({ seed: 1, handshakes: 10000 });
  run.currentNodeId = "a1-l3-n0";
  let granted = 0;
  for (let i = 0; i < 10; i++) {
    const r = buyRelic(run, RELIC_COST);
    if (r.ok) granted++;
    else { assert.equal(r.reason, "sold-out", "pool exhausts with sold-out"); break; }
  }
  assert.equal(granted, 5, "all 5 relics can be bought, then the pool is empty");
  assert.equal(new Set(run.relics).size, run.relics.length, "bought relics are distinct");
  const before = run.handshakes;
  assert.equal(buyRelic(run, RELIC_COST).ok, false, "no relics left to buy");
  assert.equal(run.handshakes, before, "sold-out spends nothing");
}

// ── C1: rest = heal XOR upgrade; upgraded card resolves the stronger effect ────────────────────────
{
  const restNode = findNode(createRun({ seed: 1 }), (n) => n.type === "rest");
  assert.ok(restNode, "the map has a rest node");

  // heal: restores HP, spends the site, does not touch the deck.
  const a = createRun({ seed: 1 });
  a.currentNodeId = restNode.id; a.hp = 20;
  const deckBefore = [...a.deck];
  const rh = rest(a, "heal");
  assert.ok(rh.ok && a.hp > 20, "rest heals");
  assert.deepEqual(a.deck, deckBefore, "heal leaves the deck unchanged");
  assert.equal(a.status, "map", "the site is spent");

  // upgrade: replaces ONE card in place with its "+" form, spends the site, does not heal.
  const b = createRun({ seed: 1 });
  b.currentNodeId = restNode.id; b.hp = 20;
  const idx = b.deck.indexOf("SYN");
  const ru = rest(b, "upgrade", idx);
  assert.ok(ru.ok, "upgrade succeeds");
  assert.equal(b.deck[idx], "SYN+", "the card is upgraded in place");
  assert.equal(b.hp, 20, "upgrade does not heal");

  // a non-upgradable index is rejected and does NOT spend the site.
  const c = createRun({ seed: 1 });
  c.currentNodeId = restNode.id; c.status = "rest";
  c.deck = ["SYN+"]; // already upgraded ⇒ cannot upgrade again
  const bad = rest(c, "upgrade", 0);
  assert.equal(bad.ok, false, "already-upgraded card cannot be upgraded");
  assert.equal(c.status, "rest", "a failed upgrade does not spend the site");

  assert.equal(upgradeDeckCard(c, 99).ok, false, "out-of-range index rejected");
}
{
  // The upgraded SYN deals more than the base in real combat.
  const base = playOneCard("SYN");
  const up = playOneCard("SYN+");
  assert.equal(base, 8, "base SYN deals 8");
  assert.equal(up, 11, "upgraded SYN+ deals 11");
  assert.ok(up > base, "the upgrade is stronger in combat");
}

function playOneCard(cardId) {
  const c = createCombat({
    deck: [cardId], player: { hp: 50, maxHp: 50 },
    enemy: instantiateEnemy("corrupt-packet", 1), seed: 1
  });
  c.hand = [cardId]; c.player.energy = 5;
  const before = c.enemy.hp;
  playCard(c, 0);
  return before - c.enemy.hp;
}

function findNode(run, pred) {
  for (const act of run.map.acts) for (const layer of act.layers) for (const n of layer) if (pred(n)) return n;
  return null;
}

function reaches(run, fromId, targetId) {
  const seen = new Set();
  const stack = [fromId];
  while (stack.length) {
    const id = stack.pop();
    if (id === targetId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    const node = nodeById(run, id);
    for (const n of node?.next || []) stack.push(n);
  }
  return false;
}

console.log("stage6 run + mapgen tests passed");
