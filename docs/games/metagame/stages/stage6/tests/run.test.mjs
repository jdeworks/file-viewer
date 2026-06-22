import assert from "node:assert/strict";
import { generateRun, nodeById } from "../mapgen.js";
import {
  availableNodes,
  buyCard,
  closeNode,
  createRun,
  moveTo,
  rest,
  resolveCombat,
  takeReward
} from "../run.js";
import { STARTING_DECK } from "../cards.js";

// ── mapgen: structure + full connectivity ────────────────────────────────────────────────────────
{
  const run = generateRun(42, 3);
  assert.equal(run.acts.length, 3, "three acts");
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
  assert.equal(run.status, "won", "a clean run clears all three acts");
  assert.equal(run.act, 3, "ended in act 3");
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
