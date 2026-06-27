// state.test.mjs — Stage 8: the additive node-health array on top of the existing gate state.
import assert from "node:assert/strict";
import { defaultState, normalizeState, freshNodes } from "../state.js";
import { NODES } from "../nodes.js";

// defaultState carries a full 14-node health array at 100, alongside the existing gate fields.
{
  const s = defaultState();
  assert.equal(s.nodes.length, NODES.length, "one health entry per node");
  assert.ok(s.nodes.every((n) => n.health === 100), "all nodes start at full health");
  assert.deepEqual(s.nodes.map((n) => n.id), NODES.map((n) => n.id), "node ids align with the topology");
  // existing gate fields preserved.
  assert.ok(Array.isArray(s.debris) && s.boss, "debris/boss gate state still present");
}

// normalize rebuilds a missing/short array and clamps health to 0–100.
{
  assert.equal(normalizeState({}).nodes.length, NODES.length, "missing nodes rebuilt");
  const damaged = normalizeState({ nodes: freshNodes().map((n, i) => ({ id: n.id, health: i === 0 ? 250 : -5 })) });
  assert.equal(damaged.nodes[0].health, 100, "over-100 health clamped");
  assert.equal(damaged.nodes[1].health, 0, "negative health clamped to 0");
  assert.equal(normalizeState({ nodes: [{ id: "C1", health: 50 }] }).nodes.length, NODES.length, "wrong-length array rebuilt");
}

console.log("stage8 state tests passed");
