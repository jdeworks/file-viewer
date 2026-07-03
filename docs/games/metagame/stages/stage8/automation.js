// automation.js — Stage 8 Entropy Field: the deterministic pre-decay AUTOMATION pass.
//
// Runs at the START of each cycle (engine.advanceCycle, before decay), driven entirely by built
// structures (structures.js) whose automation is unlocked by tech. Pure + deterministic: node/debris
// selection is by stable (health, id) / (cycle, id) ordering — no Math.random. Two passes:
//   • AUTO-REPAIR DRONES — heal the weakest non-core spine nodes (cores already self-handle), free of
//     the manual repair budget; strength = state.autoRepairUnits (drone count).
//   • COLD STORAGE — auto-archive the oldest debris files (strength = state.coldStorageRate). This is
//     pure convenience built ON TOP of the manual un-cheat (Cold Storage can't even be built until a
//     hand archive has fired), so it grants States + Scrap but NEVER fires the un-cheat action.

import { nodeById } from "./nodes.js";
import { earnParts, partsYield } from "./resources.js";

const AUTO_HEAL = 6; // health restored per drone to its target node

export function runAutomation(state) {
  const detail = { repaired: [], archived: [] };
  autoRepair(state, detail);
  autoArchive(state, detail);
  return detail;
}

function autoRepair(state, detail) {
  const units = Math.max(0, Math.floor(Number(state.autoRepairUnits || 0)));
  if (!units) return;
  // weakest non-core, still-alive nodes first (stable: health asc, then id)
  const candidates = state.nodes
    .filter((n) => n.health > 0 && n.health < 100 && !isCore(n.id))
    .sort((a, b) => (a.health - b.health) || (a.id < b.id ? -1 : 1));
  for (let i = 0; i < units && i < candidates.length; i += 1) {
    const n = candidates[i];
    n.health = Math.min(100, n.health + AUTO_HEAL);
    detail.repaired.push(n.id);
  }
}

function autoArchive(state, detail) {
  const rate = Math.max(0, Math.floor(Number(state.coldStorageRate || 0)));
  if (!rate || !Array.isArray(state.debris) || !state.debris.length) return;
  // oldest debris first (stable: cycle asc, then id)
  const order = [...state.debris].sort((a, b) => (a.cycle - b.cycle) || (a.id < b.id ? -1 : 1));
  const partsBonus = Math.max(0, Number(state.structScrapBonus || 0));
  const partsMult = Math.max(1, Number(state.scrapMult || 1));
  for (let i = 0; i < rate && i < order.length; i += 1) {
    const debris = order[i];
    const idx = state.debris.findIndex((d) => d.id === debris.id);
    if (idx < 0) continue;
    state.debris.splice(idx, 1);
    const archived = { ...debris, archivedAtCycle: state.cycle, path: `/entropy/active_archive/${debris.id}`, auto: true };
    state.archive = [...(state.archive || []), archived];
    state.salvageTotal = Number(state.salvageTotal || 0) + Number(debris.value || 0);
    state.states = Number(state.states || 0) + Number(debris.value || 0);
    earnParts(state, Math.round(partsYield(debris) * partsMult) + partsBonus);
    detail.archived.push(debris.id);
  }
  if (detail.archived.length) pushLog(state, `Cold Storage auto-archived ${detail.archived.length} file(s).`);
}

const isCore = (id) => (nodeById(id) || {}).noCascade === true;

function pushLog(state, line) {
  state.log = [...(state.log || []), line].slice(-12);
}
