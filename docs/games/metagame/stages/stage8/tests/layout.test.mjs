// layout.test.mjs — Stage 8 spatial-map derivation (UX-audit #2): sector grouping, edges, sweep order.
import assert from "node:assert/strict";
import { defaultState } from "../state.js";
import { bringSectorOnline } from "../storms.js";
import { NODES, SECTORS } from "../nodes.js";
import { sectorGroups, mapEdges, decayOrder } from "../layout.js";
import { popoverActionSpecs } from "../popover.js";

// ── a fresh field shows ONLY the core sector (α/β/γ absent, not empty blocks) ───────────────────────
{
  const s = defaultState();
  const groups = sectorGroups(s);
  assert.equal(groups.length, 1, "only one sector online at boot");
  assert.equal(groups[0].sector, "core", "the online sector is core");
  assert.equal(groups[0].nodes.length, 14, "core sector lays out its 14 nodes");
}

// ── the fully-grown field lays out ALL 34 nodes exactly once, grouped by sector in unlock order ─────
{
  const s = defaultState();
  for (const sector of SECTORS.slice(1)) bringSectorOnline(s, sector); // alpha, beta, gamma
  const groups = sectorGroups(s);
  assert.deepEqual(groups.map((g) => g.sector), ["core", "alpha", "beta", "gamma"], "sectors in unlock order");
  const laidOut = groups.flatMap((g) => g.nodes.map((n) => n.id));
  assert.equal(laidOut.length, 34, "all 34 nodes laid out");
  assert.equal(new Set(laidOut).size, 34, "each node laid out exactly once");
  assert.deepEqual([...laidOut].sort(), NODES.map((n) => n.id).sort(), "the laid-out set is exactly the topology");
}

// ── edges only connect present nodes; a failed source marks its downstream edges stressed ───────────
{
  const s = defaultState();
  const edges = mapEdges(s);
  const ids = new Set(s.nodes.map((n) => n.id));
  for (const e of edges) assert.ok(ids.has(e.from) && ids.has(e.to), "edge endpoints are online");
  assert.ok(edges.some((e) => e.from === "F1" && e.to === "M1"), "F1→M1 edge present");
  assert.ok(edges.every((e) => !e.stressed), "no stressed edges on a healthy field");

  s.nodes.find((n) => n.id === "F1").health = 0; // fail F1
  const stressed = mapEdges(s).filter((e) => e.stressed).map((e) => e.from);
  assert.ok(stressed.every((id) => id === "F1"), "only the failed node's edges are stressed");
  assert.ok(stressed.length > 0, "the failed node stresses at least one edge");
}

// ── decay order is deterministic = the live nodes array order ───────────────────────────────────────
{
  const s = defaultState();
  assert.deepEqual(decayOrder(s), s.nodes.map((n) => n.id), "sweep order = decay order from state");
}

// ── popover routing: the SAME data-attrs the renderer delegates to, gated by node capability ────────
{
  const s = defaultState();
  s.repairUnits = 6;
  const core = popoverActionSpecs(s, "C1"); // core: repair only (no high-load; freeze not yet)
  assert.deepEqual(core.map((a) => a.dataAttr), ["data-repair"], "core tile offers repair only at cycle 1");

  const prod = popoverActionSpecs(s, "P1"); // production supports high-load
  assert.ok(prod.some((a) => a.dataAttr === "data-repair"), "production offers repair");
  assert.ok(prod.some((a) => a.dataAttr === "data-high-load"), "production offers High-Load");

  s.cycle = 6; s.stabilizers = 1;
  const late = popoverActionSpecs(s, "P1");
  assert.ok(late.some((a) => a.dataAttr === "data-stabilize-node"), "freeze appears once cycle ≥ 6");
  const freeze = late.find((a) => a.dataAttr === "data-stabilize-node");
  assert.equal(freeze.disabled, false, "freeze enabled with a held stabilizer and no active freeze");
}

console.log("stage8 layout + popover-routing tests passed");
