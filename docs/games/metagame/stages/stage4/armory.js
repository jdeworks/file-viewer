// armory.js — Stage 4 Fractal Bastion: the between-maps meta-progression (the Armory).
//
// After clearing a map the player visits the Armory and spends GLORY (a campaign-wide currency earned
// by clearing waves and maps) on PERMANENT campaign upgrades that buff every subsequent map. Glory and
// purchased levels live in state.campaign (persisted with the stage). Pure: definitions + spend logic +
// an effect aggregator the campaign reads when it resets a map's combat. No DOM, no RNG.

export const ARMORY_UPGRADES = [
  { id: 'reinforced-core',     label: 'Reinforced Core',     desc: '+25 starting integrity per level', baseCost: 30, costScale: 1.6, maxLevel: 4 },
  { id: 'capital-reserves',    label: 'Capital Reserves',    desc: '+60 starting cycles per level',    baseCost: 30, costScale: 1.6, maxLevel: 4 },
  { id: 'overclocked-emitters',label: 'Overclocked Emitters',desc: '+8% tower damage per level',       baseCost: 40, costScale: 1.8, maxLevel: 5 },
  { id: 'glory-dividend',      label: 'Glory Dividend',      desc: '+1 Glory per wave cleared',        baseCost: 50, costScale: 2.0, maxLevel: 3 },
];

export function armoryUpgradeById(id) {
  return ARMORY_UPGRADES.find((u) => u.id === id) || null;
}

export function armoryLevel(campaign, id) {
  return Math.max(0, Math.trunc(Number(campaign?.armory?.[id]) || 0));
}

// Cost to buy the NEXT level of an upgrade (baseCost × scale^currentLevel, floored). Infinity if maxed.
export function armoryCost(campaign, id) {
  const def = armoryUpgradeById(id);
  if (!def) return Infinity;
  const lvl = armoryLevel(campaign, id);
  if (lvl >= def.maxLevel) return Infinity;
  return Math.floor(def.baseCost * Math.pow(def.costScale, lvl));
}

export function canBuyArmory(campaign, id) {
  const cost = armoryCost(campaign, id);
  return Number.isFinite(cost) && Number(campaign?.glory || 0) >= cost;
}

// Buy one level. Returns { ok, level, cost } or { ok:false, reason }.
export function buyArmory(campaign, id) {
  const def = armoryUpgradeById(id);
  if (!def) return { ok: false, reason: 'unknown' };
  const lvl = armoryLevel(campaign, id);
  if (lvl >= def.maxLevel) return { ok: false, reason: 'maxed' };
  const cost = armoryCost(campaign, id);
  if (Number(campaign.glory || 0) < cost) return { ok: false, reason: 'poor', cost };
  campaign.glory = Number(campaign.glory || 0) - cost;
  if (!campaign.armory || typeof campaign.armory !== 'object') campaign.armory = {};
  campaign.armory[id] = lvl + 1;
  return { ok: true, level: lvl + 1, cost };
}

// Aggregate effects of all owned upgrades — the campaign applies these when resetting a map's combat.
export function armoryEffects(campaign) {
  return {
    integrityBonus: armoryLevel(campaign, 'reinforced-core') * 25,
    cyclesBonus: armoryLevel(campaign, 'capital-reserves') * 60,
    damageMult: 1 + armoryLevel(campaign, 'overclocked-emitters') * 0.08,
    gloryPerWaveBonus: armoryLevel(campaign, 'glory-dividend'),
  };
}
