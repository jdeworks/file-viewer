// layout.js — Stage 8 Entropy Field: PURE spatial-map derivation (no DOM). Turns the live node state +
// the static topology (nodes.js) into (a) the online sector groups the map draws as blocks, (b) the
// adjacency edges among currently-online nodes (with a cascade-stress flag), and (c) the deterministic
// tile sweep order for the cycle beat. Presentation only — the engine/topology are untouched; this just
// reshapes existing data so map.js can lay it out spatially instead of as a flat list. Unit-tested.

import { SECTORS, nodeById, ADJACENCY } from "./nodes.js";
import { status } from "./engine.js";

// The sectors that are online AND have live nodes, in unlock order (core → alpha → beta → gamma). A
// not-yet-online sector is simply absent (map.js renders NOTHING for it — no empty block). Each group
// carries the live node objects for that sector, in the stable nodes.js declaration order.
export function sectorGroups(state) {
  const online = new Set(state.onlineSectors || ["core"]);
  const byId = new Map((state.nodes || []).map((n) => [n.id, n]));
  return SECTORS.filter((s) => online.has(s)).map((sector) => {
    const nodes = [];
    for (const live of state.nodes || []) {
      const def = nodeById(live.id);
      if (def && def.sector === sector) nodes.push(live);
    }
    return { sector, nodes };
  }).filter((g) => g.nodes.length > 0);
}

// Adjacency edges among currently-present nodes. `stressed` = the source node has FAILED and is
// actively propagating cascade decay downstream (the edge tint that shows where a spiral is spreading).
export function mapEdges(state) {
  const present = new Map((state.nodes || []).map((n) => [n.id, n]));
  const edges = [];
  for (const from of state.nodes || []) {
    for (const to of ADJACENCY.get(from.id) || []) {
      if (!present.has(to)) continue;
      edges.push({ from: from.id, to, stressed: status(from.health) === "failed" });
    }
  }
  return edges;
}

// Deterministic tile sweep order for the cycle beat (#6): the exact order the engine decays nodes —
// the live `state.nodes` array order. No randomness; replays identically for a given state.
export function decayOrder(state) {
  return (state.nodes || []).map((n) => n.id);
}
