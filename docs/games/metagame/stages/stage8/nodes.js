// nodes.js — Stage 8 Entropy Field: the 14-node decay topology (pure data, no DOM, no logic).
// engine.js reads NODES for per-cycle decay/income and ADJACENCY for cascade propagation. Numbers
// are tier-scaled defaults from the buildplan schema; the 566-line design spec is the ground truth
// for final tuning. Zones: core(1) ← mid(2) ← {production(3), frontier(4)}.

// Tier defaults: deeper zones (frontier) decay faster but output more; cores are stable + precious.
const TIER = {
  1: { baseDecayPct: 2, baseOutput: 12, degradedOutput: 6, supportsHighLoad: false, debrisTier: 1 },
  2: { baseDecayPct: 3, baseOutput: 10, degradedOutput: 5, supportsHighLoad: false, debrisTier: 2 },
  3: { baseDecayPct: 4, baseOutput: 14, degradedOutput: 7, supportsHighLoad: true, debrisTier: 3 },
  4: { baseDecayPct: 6, baseOutput: 16, degradedOutput: 8, supportsHighLoad: true, debrisTier: 4 }
};

function node(id, name, zone, tier) {
  return { id, name, zone, tier, ...TIER[tier] };
}

export const NODES = [
  node("C1", "Core Kernel", "core", 1),
  node("C2", "Secondary Core", "core", 1),
  node("M1", "Mid Relay 1", "mid", 2),
  node("M2", "Mid Relay 2", "mid", 2),
  node("M3", "Mid Relay 3", "mid", 2),
  node("M4", "Mid Relay 4", "mid", 2),
  node("P1", "Production 1", "production", 3),
  node("P2", "Production 2", "production", 3),
  node("P3", "Production 3", "production", 3),
  node("P4", "Production 4", "production", 3),
  node("F1", "Frontier 1", "frontier", 4),
  node("F2", "Frontier 2", "frontier", 4),
  node("F3", "Frontier 3", "frontier", 4),
  node("F4", "Frontier 4", "frontier", 4)
];

export const NODE_BY_ID = new Map(NODES.map((n) => [n.id, n]));

export function nodeById(id) {
  return NODE_BY_ID.get(id) || null;
}

// Directed cascade edges: a failing node propagates decay DOWNSTREAM along these (frontier/production
// → mid → core; cores reinforce each other). ADJACENCY.get(id) = the nodes id cascades into.
const EDGES = [
  ["F1", "M1"], ["F2", "M2"], ["F3", "M3"], ["F4", "M4"],
  ["P1", "M1"], ["P2", "M2"], ["P3", "M3"], ["P4", "M4"],
  ["M1", "C1"], ["M2", "C1"], ["M3", "C2"], ["M4", "C2"],
  ["C1", "C2"], ["C2", "C1"]
];

export const ADJACENCY = (() => {
  const map = new Map(NODES.map((n) => [n.id, []]));
  for (const [from, to] of EDGES) map.get(from).push(to);
  return map;
})();
