// nodes.test.mjs — Stage 8 topology: growing 34-node network, sectors, zones, cascade adjacency.
import assert from "node:assert/strict";
import { NODES, ADJACENCY, nodeById, SECTORS, nodesForSector, freshSectorNodes } from "../nodes.js";

// 34 nodes total; the CORE sector (online at boot) is the original 14.
assert.equal(NODES.length, 34, "34 nodes once fully grown");
assert.equal(nodesForSector("core").length, 14, "core sector = 14 nodes");
assert.equal(freshSectorNodes("core").length, 14, "fresh core sector boots 14 live nodes");
assert.deepEqual(SECTORS, ["core", "alpha", "beta", "gamma"], "four sectors in unlock order");
assert.equal(nodesForSector("alpha").length, 8, "alpha adds 8 (→22)");
assert.equal(nodesForSector("beta").length, 6, "beta adds 6 (→28)");
assert.equal(nodesForSector("gamma").length, 6, "gamma adds 6 (→34)");

const core = nodesForSector("core");
const byZone = (z) => core.filter((n) => n.zone === z).length;
assert.equal(byZone("core"), 2, "2 core nodes");
assert.equal(byZone("mid"), 4, "4 mid nodes");
assert.equal(byZone("production"), 4, "4 production nodes");
assert.equal(byZone("frontier"), 4, "4 frontier nodes");

// new support zones in later sectors; cores are recovery anchors (noCascade)
assert.ok(NODES.some((n) => n.zone === "research"), "research nodes exist");
assert.ok(NODES.some((n) => n.zone === "coolant"), "coolant nodes exist");
assert.equal(nodeById("C1").noCascade, true, "core is an un-cascadable anchor");

// ids unique; every node has the required fields.
assert.equal(new Set(NODES.map((n) => n.id)).size, 34, "ids unique");
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
