import assert from "node:assert/strict";
import { generateRun, nodeById, enemyForNode } from "../mapgen.js";
import {
  availableNodes,
  buyCard,
  closeNode,
  createRun,
  enemyForCurrentNode,
  moveTo,
  prestigeCost,
  rest,
  resolveCombat,
  seatAtFinalBoss,
  takeReward,
  FINAL_BOSS_ACT
} from "../run.js";
import { makeRng } from "../combat.js";
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
