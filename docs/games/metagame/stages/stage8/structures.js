// structures.js — Stage 8 Entropy Field: placeable STRUCTURES (pure, deterministic, no DOM/rng).
//
// Where tech (tech.js) is global research, structures are physical units BUILT with Scrap and stacked
// up to a per-type cap. Their aggregate effect lives in dedicated `struct*` bonus fields the engine /
// heat / archive read ALONGSIDE the tech bonuses (no field collision: tech.recomputeTechBonuses owns
// the tech fields; recomputeStructureBonuses owns the struct fields). Two structures are AUTOMATION
// units that only function once the matching tech is researched: the Auto-Repair Drone (needs rep3)
// and Cold Storage (needs sal3 — which itself unlocks only after the manual archive un-cheat). So the
// un-cheat stays load-bearing: you cannot even BUILD the auto-archiver without having archived by hand.

import { isPurchased } from "./tech.js";

export const STRUCTURES = [
  { id: "heatSink", label: "Heat Sink", desc: "+4 passive heat venting.", scrap: 20, costScale: 1.6, max: 5,
    field: "structHeatVent", per: 4 },
  { id: "buffer", label: "Buffer Capacitor", desc: "+2 repair units / cycle.", scrap: 24, costScale: 1.6, max: 5,
    field: "structRepairBonus", per: 2 },
  { id: "refinery", label: "Scrap Refinery", desc: "+2 Scrap per archived file.", scrap: 18, costScale: 1.6, max: 5,
    field: "structScrapBonus", per: 2 },
  { id: "drone", label: "Auto-Repair Drone", desc: "Automation: heals a weak node each cycle.", scrap: 40, costScale: 1.8, max: 3,
    field: "autoRepairUnits", per: 1, requiresTech: "rep3" },
  { id: "coldStorage", label: "Cold Storage Bay", desc: "Automation: auto-archives a debris file each cycle.", scrap: 60, costScale: 1.8, max: 2,
    field: "coldStorageRate", per: 1, requiresTech: "sal3", needsManualArchive: true }
];

export const STRUCT_BY_ID = new Map(STRUCTURES.map((s) => [s.id, s]));

export function defaultStructureBonuses() {
  return { structHeatVent: 0, structRepairBonus: 0, structScrapBonus: 0, autoRepairUnits: 0, coldStorageRate: 0 };
}

export function levelOf(state, id) {
  return Math.max(0, Math.floor(Number(state.structures && state.structures[id]) || 0));
}

// Next-level Scrap cost (base * scale^level), rounded.
export function costOf(state, id) {
  const def = STRUCT_BY_ID.get(id);
  if (!def) return Infinity;
  return Math.round(def.scrap * Math.pow(def.costScale, levelOf(state, id)));
}

export function buildBlockReason(state, id) {
  const def = STRUCT_BY_ID.get(id);
  if (!def) return "unknown";
  if (levelOf(state, id) >= def.max) return "max";
  if (def.requiresTech && !isPurchased(state, def.requiresTech)) return "requires-tech";
  if (def.needsManualArchive && !state.manualArchiveDone) return "needs-archive";
  if (Number(state.scrap || 0) < costOf(state, id)) return "scrap";
  return null;
}

export function canBuildStructure(state, id) {
  return buildBlockReason(state, id) === null;
}

// Build one structure (validated). Debits Scrap, bumps the level, refolds the struct bonuses.
export function buildStructure(state, id) {
  const reason = buildBlockReason(state, id);
  if (reason) return { ok: false, reason };
  const cost = costOf(state, id);
  if (!state.structures || typeof state.structures !== "object") state.structures = {};
  state.scrap = Number(state.scrap || 0) - cost;
  state.structures[id] = levelOf(state, id) + 1;
  recomputeStructureBonuses(state);
  const def = STRUCT_BY_ID.get(id);
  pushLog(state, `built ${def.label} (lvl ${state.structures[id]}).`);
  return { ok: true };
}

// Fold built structures into the struct* bonus fields (idempotent; call on build + normalize/restore).
export function recomputeStructureBonuses(state) {
  const b = defaultStructureBonuses();
  for (const def of STRUCTURES) b[def.field] += def.per * levelOf(state, def.id);
  Object.assign(state, b);
  return b;
}

// UI/test snapshot of the whole structure list.
export function structureStatus(state) {
  return STRUCTURES.map((def) => ({
    id: def.id, label: def.label, desc: def.desc, level: levelOf(state, def.id), max: def.max,
    cost: costOf(state, def.id), reason: buildBlockReason(state, def.id), canBuild: canBuildStructure(state, def.id)
  }));
}

function pushLog(state, line) {
  state.log = [...(state.log || []), line].slice(-12);
}
