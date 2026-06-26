// mapgen.test.mjs — authored act composition invariants + determinism.
import assert from "node:assert/strict";
import { generateRun, generateAct } from "../mapgen.js";

function typesIn(act) {
  return act.layers.flat().map((n) => n.type);
}

// ── composition: every act offers an elite, a shop, an event, a pre-boss rest, a boss ──────────────
for (const seed of [1, 2, 7, 42, 99, 1234, 5000]) {
  const run = generateRun(seed, 4);
  for (const act of run.acts) {
    const layers = act.layers;
    const types = typesIn(act);
    assert.ok(types.includes("elite"), `seed ${seed} act ${act.act}: has an elite`);
    assert.ok(types.includes("shop"), `seed ${seed} act ${act.act}: has a shop`);
    assert.ok(types.includes("event"), `seed ${seed} act ${act.act}: has an event`);

    // Start layer is all combat.
    assert.ok(layers[0].every((n) => n.type === "combat"), `seed ${seed} act ${act.act}: start layer is combat`);
    // The layer before the boss is an all-rest pre-boss rest.
    const preBoss = layers[layers.length - 2];
    assert.ok(preBoss.every((n) => n.type === "rest"), `seed ${seed} act ${act.act}: pre-boss layer is rest`);
    // Exactly one boss, last.
    const last = layers[layers.length - 1];
    assert.equal(last.length, 1, "single boss node");
    assert.equal(last[0].type, "boss", "final node is the boss");

    // The elite is never on the very first content layer (the act warms up first).
    const eliteLayers = act.layers.filter((layer) => layer.some((n) => n.type === "elite")).map((layer) => layer[0].layer);
    assert.ok(eliteLayers.every((l) => l >= 2), `seed ${seed} act ${act.act}: elite not on layer 1`);

    // Combat is still the dominant node type (plenty of reps before the mini-boss).
    const combats = types.filter((t) => t === "combat").length;
    assert.ok(combats >= 4, `seed ${seed} act ${act.act}: enough combat reps (${combats})`);
  }
}

// ── determinism: same seed ⇒ identical type layout ─────────────────────────────────────────────────
{
  const a = generateAct(3, 77);
  const b = generateAct(3, 77);
  assert.deepEqual(typesIn(a), typesIn(b), "same seed ⇒ same act composition");
  const c = generateAct(3, 78);
  assert.notDeepEqual(typesIn(a), typesIn(c), "different seed ⇒ (very likely) different composition");
}

console.log("stage6 mapgen tests passed");
