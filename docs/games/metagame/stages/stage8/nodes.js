// nodes.js — Stage 8 Entropy Field: the decay topology (pure data, no DOM, no logic).
//
// The network GROWS across three acts. The CORE sector (14 nodes) is online from cycle 1; surviving
// each Cascade Storm (storms.js) brings the next sector online: ALPHA (+8 → 22), BETA (+6 → 28),
// GAMMA (+6 → 34). Every node carries a `sector` (which storm unlocks it) so the engine only ticks
// online sectors. New sectors add qualitatively-new zones: RESEARCH nodes (insight engines) and
// COOLANT nodes (passive heat venting). The two core nodes are `noCascade` recovery anchors — they
// take decay but never accumulate cascade stress, so a spiral can always be recovered from.
//
// Zones: core(1) ← mid(2) ← {production(3), frontier(4)}; research/coolant are support zones.

// Tier defaults drive debris value + thermal load. Deeper zones decay faster but output more.
const TIER = {
  1: { baseDecayPct: 2, baseOutput: 12, degradedOutput: 6, supportsHighLoad: false, debrisTier: 1 },
  2: { baseDecayPct: 3, baseOutput: 10, degradedOutput: 5, supportsHighLoad: false, debrisTier: 2 },
  3: { baseDecayPct: 4, baseOutput: 14, degradedOutput: 7, supportsHighLoad: true, debrisTier: 3 },
  4: { baseDecayPct: 6, baseOutput: 16, degradedOutput: 8, supportsHighLoad: true, debrisTier: 4 }
};

// Support zones: low States output, but research feeds Insight (resources.js) and coolant vents Heat
// (heat.js). They still shed debris when they fail (debrisTier governs value).
const ZONE_OVERRIDE = {
  research: { baseDecayPct: 3, baseOutput: 4, degradedOutput: 2, supportsHighLoad: false, debrisTier: 2 },
  coolant: { baseDecayPct: 3, baseOutput: 3, degradedOutput: 1, supportsHighLoad: false, debrisTier: 2, coolantVent: 5 }
};

function node(id, name, zone, tier, sector, extra = {}) {
  const base = ZONE_OVERRIDE[zone] || TIER[tier];
  return { id, name, zone, tier, sector, ...base, ...extra };
}

export const NODES = [
  // ── CORE sector (online from cycle 1) ────────────────────────────────────────────────────────────
  node("C1", "Core Kernel", "core", 1, "core", { noCascade: true }),
  node("C2", "Secondary Core", "core", 1, "core", { noCascade: true }),
  node("M1", "Mid Relay 1", "mid", 2, "core"),
  node("M2", "Mid Relay 2", "mid", 2, "core"),
  node("M3", "Mid Relay 3", "mid", 2, "core"),
  node("M4", "Mid Relay 4", "mid", 2, "core"),
  node("P1", "Production 1", "production", 3, "core"),
  node("P2", "Production 2", "production", 3, "core"),
  node("P3", "Production 3", "production", 3, "core"),
  node("P4", "Production 4", "production", 3, "core"),
  node("F1", "Frontier 1", "frontier", 4, "core"),
  node("F2", "Frontier 2", "frontier", 4, "core"),
  node("F3", "Frontier 3", "frontier", 4, "core"),
  node("F4", "Frontier 4", "frontier", 4, "core"),
  // ── ALPHA sector (unlocked by surviving Storm α) — +8 → 22 ───────────────────────────────────────
  node("M5", "Mid Relay 5", "mid", 2, "alpha"),
  node("M6", "Mid Relay 6", "mid", 2, "alpha"),
  node("P5", "Production 5", "production", 3, "alpha"),
  node("P6", "Production 6", "production", 3, "alpha"),
  node("F5", "Frontier 5", "frontier", 4, "alpha"),
  node("F6", "Frontier 6", "frontier", 4, "alpha"),
  node("R1", "Research Lab α", "research", 3, "alpha"),
  node("K1", "Coolant Loop α", "coolant", 2, "alpha"),
  // ── BETA sector (unlocked by surviving Storm β) — +6 → 28 ────────────────────────────────────────
  node("P7", "Production 7", "production", 3, "beta"),
  node("P8", "Production 8", "production", 3, "beta"),
  node("F7", "Frontier 7", "frontier", 4, "beta"),
  node("F8", "Frontier 8", "frontier", 4, "beta"),
  node("R2", "Research Lab β", "research", 3, "beta"),
  node("K2", "Coolant Loop β", "coolant", 2, "beta"),
  // ── GAMMA sector (unlocked by surviving Storm γ) — +6 → 34 ───────────────────────────────────────
  node("P9", "Production 9", "production", 3, "gamma"),
  node("F9", "Frontier 9", "frontier", 4, "gamma"),
  node("F10", "Frontier 10", "frontier", 4, "gamma"),
  node("F11", "Frontier 11", "frontier", 4, "gamma"),
  node("R3", "Research Lab γ", "research", 3, "gamma"),
  node("K3", "Coolant Loop γ", "coolant", 2, "gamma")
];

export const NODE_BY_ID = new Map(NODES.map((n) => [n.id, n]));

export function nodeById(id) {
  return NODE_BY_ID.get(id) || null;
}

// Sectors in unlock order. `core` is online at boot; alpha/beta/gamma unlock on storm survival.
export const SECTORS = ["core", "alpha", "beta", "gamma"];

export function nodesForSector(sector) {
  return NODES.filter((n) => n.sector === sector);
}

// Live-state node objects (health/cascadeStress) for a sector — appended when it comes online.
export function freshSectorNodes(sector) {
  return nodesForSector(sector).map((n) => ({ id: n.id, health: 100, cascadeStress: 0 }));
}

// Directed cascade edges: a failing node propagates decay DOWNSTREAM (frontier/production/support →
// mid → core; cores reinforce each other). New-sector nodes route into their own mid relays / cores.
const EDGES = [
  // core sector
  ["F1", "M1"], ["F2", "M2"], ["F3", "M3"], ["F4", "M4"],
  ["P1", "M1"], ["P2", "M2"], ["P3", "M3"], ["P4", "M4"],
  ["M1", "C1"], ["M2", "C1"], ["M3", "C2"], ["M4", "C2"],
  ["C1", "C2"], ["C2", "C1"],
  // alpha
  ["F5", "M5"], ["F6", "M6"], ["P5", "M5"], ["P6", "M6"], ["R1", "M5"], ["K1", "M6"],
  ["M5", "C1"], ["M6", "C2"],
  // beta (routes through alpha relays)
  ["F7", "M5"], ["F8", "M6"], ["P7", "M5"], ["P8", "M6"], ["R2", "M5"], ["K2", "M6"],
  // gamma
  ["F9", "M5"], ["F10", "M6"], ["F11", "M5"], ["P9", "M6"], ["R3", "M5"], ["K3", "M6"]
];

export const ADJACENCY = (() => {
  const map = new Map(NODES.map((n) => [n.id, []]));
  for (const [from, to] of EDGES) map.get(from).push(to);
  return map;
})();
