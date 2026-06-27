// nodes.test.mjs — Stage 8 topology: 14 nodes, zones, tier scaling, cascade adjacency.
import assert from "node:assert/strict";
import { NODES, ADJACENCY, nodeById } from "../nodes.js";

// 14 nodes across the four zones.
assert.equal(NODES.length, 14, "14 nodes");
const byZone = (z) => NODES.filter((n) => n.zone === z).length;
assert.equal(byZone("core"), 2, "2 core nodes");
assert.equal(byZone("mid"), 4, "4 mid nodes");
assert.equal(byZone("production"), 4, "4 production nodes");
assert.equal(byZone("frontier"), 4, "4 frontier nodes");

// ids unique; every node has the required fields.
assert.equal(new Set(NODES.map((n) => n.id)).size, 14, "ids unique");
for (const n of NODES) {
  for (const k of ["baseDecayPct", "baseOutput", "degradedOutput", "debrisTier", "tier"]) {
    assert.ok(Number.isFinite(n[k]), `${n.id}.${k} is a number`);
  }
}

// Tier scaling: frontier decays faster and outputs more than core.
assert.ok(nodeById("F1").baseDecayPct > nodeById("C1").baseDecayPct, "frontier decays faster than core");
assert.ok(nodeById("F1").baseOutput > nodeById("M1").baseOutput, "frontier outputs more than mid");
assert.equal(nodeById("P1").supportsHighLoad, true, "production supports high load");
assert.equal(nodeById("C1").supportsHighLoad, false, "core does not support high load");

// Cascade adjacency: frontier/production → mid → core; cores reinforce each other.
assert.ok(ADJACENCY.get("F1").includes("M1"), "F1 cascades into M1");
assert.ok(ADJACENCY.get("P3").includes("M3"), "P3 cascades into M3");
assert.ok(ADJACENCY.get("M1").includes("C1"), "M1 cascades into C1");
assert.ok(ADJACENCY.get("C1").includes("C2") && ADJACENCY.get("C2").includes("C1"), "cores are mutual");

console.log("stage8 nodes tests passed");
