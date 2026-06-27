// tech.js — Stage 8 Entropy Field: the TECH TREE (pure, deterministic, no DOM/rng).
//
// Twelve techs across four branches (repair / thermal / salvage / topology), bought with Insight +
// Scrap. Effects are persistent: buying a tech flips it in state.tech and recomputeTechBonuses() folds
// every purchased tech into the plain "bonus" fields the engine/heat/resources already read
// (repairBudgetBonus, repairEfficiencyBonus, heatVentBonus, thermalThresholdBonus, decayReduction,
// cascadeStressMult, coreRegen, scrapMult, debrisDecayBonus) plus the AUTOMATION unlock flags consumed
// by structures.js (autoRepair, coldStorage). COLD STORAGE (auto-archive) is unlocked LATE and ONLY
// after the manual drag-drop archive un-cheat has fired (state.manualArchiveDone) — so the un-cheat
// stays load-bearing; automation can never replace the lesson, only follow it.

export const TECHS = [
  // ── REPAIR branch ────────────────────────────────────────────────────────────────────────────────
  { id: "rep1", branch: "repair", label: "Repair Drones Mk I", desc: "+3 repair units / cycle.",
    insight: 18, scrap: 12, requires: null, apply: (b) => { b.repairBudgetBonus += 3; } },
  { id: "rep2", branch: "repair", label: "Efficient Welds", desc: "+2 health restored per repair unit.",
    insight: 40, scrap: 30, requires: "rep1", apply: (b) => { b.repairEfficiencyBonus += 2; } },
  { id: "rep3", branch: "repair", label: "Auto-Repair Drone", desc: "Automation: repairs the weakest spine node each cycle.",
    insight: 85, scrap: 60, requires: "rep2", apply: (b) => { b.autoRepair = true; } },
  // ── THERMAL branch ───────────────────────────────────────────────────────────────────────────────
  { id: "thm1", branch: "thermal", label: "Heat Sinks", desc: "+5 passive heat venting / cycle.",
    insight: 18, scrap: 12, requires: null, apply: (b) => { b.heatVentBonus += 5; } },
  { id: "thm2", branch: "thermal", label: "Thermal Throttle", desc: "+12 heat before it amplifies decay.",
    insight: 40, scrap: 28, requires: "thm1", apply: (b) => { b.thermalThresholdBonus += 12; } },
  { id: "thm3", branch: "thermal", label: "Cryo Loop", desc: "+8 more passive heat venting / cycle.",
    insight: 80, scrap: 55, requires: "thm2", apply: (b) => { b.heatVentBonus += 8; } },
  // ── SALVAGE branch ───────────────────────────────────────────────────────────────────────────────
  { id: "sal1", branch: "salvage", label: "Refinery Optics", desc: "+50% Scrap from archived debris.",
    insight: 20, scrap: 10, requires: null, apply: (b) => { b.scrapMult += 0.5; } },
  { id: "sal2", branch: "salvage", label: "Deep Salvage", desc: "Debris survives +1 cycle before decaying.",
    insight: 42, scrap: 30, requires: "sal1", apply: (b) => { b.debrisDecayBonus += 1; } },
  { id: "sal3", branch: "salvage", label: "Cold Storage", desc: "Automation: auto-archives a debris file each cycle (after you have archived by hand).",
    insight: 95, scrap: 80, requires: "sal2", needsManualArchive: true, apply: (b) => { b.coldStorage = true; } },
  // ── TOPOLOGY branch ──────────────────────────────────────────────────────────────────────────────
  { id: "top1", branch: "topology", label: "Reinforced Relays", desc: "-1 base decay on every node.",
    insight: 22, scrap: 14, requires: null, apply: (b) => { b.decayReduction += 1; } },
  { id: "top2", branch: "topology", label: "Load Balancer", desc: "Cascade stress propagates at half strength.",
    insight: 45, scrap: 32, requires: "top1", apply: (b) => { b.cascadeStressMult = Math.min(b.cascadeStressMult, 0.5); } },
  { id: "top3", branch: "topology", label: "Redundant Cores", desc: "Core anchors regenerate +3 health / cycle.",
    insight: 90, scrap: 65, requires: "top2", apply: (b) => { b.coreRegen += 3; } }
];

export const TECH_BY_ID = new Map(TECHS.map((t) => [t.id, t]));

// Default tech bonus fields (the engine/heat/resources read these). recomputeTechBonuses rebuilds
// them from the purchased set, so the source of truth is always state.tech.
export function defaultTechBonuses() {
  return {
    repairBudgetBonus: 0,
    repairEfficiencyBonus: 0,
    heatVentBonus: 0,
    thermalThresholdBonus: 0,
    decayReduction: 0,
    cascadeStressMult: 1,
    coreRegen: 0,
    scrapMult: 1,
    debrisDecayBonus: 0,
    autoRepair: false,
    coldStorage: false
  };
}

export function isPurchased(state, id) {
  return Boolean(state.tech && state.tech[id]);
}

// Why a tech can't be bought right now (null = it can).
export function buyBlockReason(state, id) {
  const tech = TECH_BY_ID.get(id);
  if (!tech) return "unknown";
  if (isPurchased(state, id)) return "owned";
  if (tech.requires && !isPurchased(state, tech.requires)) return "requires";
  if (tech.needsManualArchive && !state.manualArchiveDone) return "needs-archive";
  if (Number(state.insight || 0) < tech.insight) return "insight";
  if (Number(state.scrap || 0) < tech.scrap) return "scrap";
  return null;
}

export function canBuyTech(state, id) {
  return buyBlockReason(state, id) === null;
}

// Buy a tech: validate, debit Insight + Scrap, mark purchased, refold bonuses. Returns {ok,reason}.
export function buyTech(state, id) {
  const reason = buyBlockReason(state, id);
  if (reason) return { ok: false, reason };
  const tech = TECH_BY_ID.get(id);
  if (!state.tech || typeof state.tech !== "object") state.tech = {};
  state.insight = Number(state.insight || 0) - tech.insight;
  state.scrap = Number(state.scrap || 0) - tech.scrap;
  state.tech[id] = true;
  recomputeTechBonuses(state);
  pushLog(state, `tech: ${tech.label} online.`);
  return { ok: true };
}

// Fold every purchased tech into the bonus fields (idempotent — call on buy and on mount/restore).
export function recomputeTechBonuses(state) {
  const b = defaultTechBonuses();
  for (const tech of TECHS) if (isPurchased(state, tech.id)) tech.apply(b);
  Object.assign(state, b);
  return b;
}

// A UI/test-friendly snapshot of the whole tree's purchase + affordability status.
export function techStatus(state) {
  return TECHS.map((t) => ({
    id: t.id, branch: t.branch, label: t.label, desc: t.desc,
    insight: t.insight, scrap: t.scrap, requires: t.requires,
    owned: isPurchased(state, t.id), reason: buyBlockReason(state, t.id), canBuy: canBuyTech(state, t.id)
  }));
}

function pushLog(state, line) {
  state.log = [...(state.log || []), line].slice(-12);
}
