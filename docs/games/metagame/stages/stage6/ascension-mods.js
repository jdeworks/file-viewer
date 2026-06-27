// ascension-mods.js — Stage 6 Protocol Codex ascension ladder (the 15-rung replay-difficulty tail).
//
// Each rung adds ONE cumulative RULE change (not just bigger numbers): ascension N applies rules
// 1..N on top of each other. The defs are written in the SAME fold idiom as shared/ascension.js
// (`apply(config) -> config`) so the shared module owns the ladder STATE (selected / unlocked /
// cleared, persisted in the save) while this module owns the ladder CONTENT. createRun applies the
// content to a run's tunable config via foldAscension (a standalone equivalent of the shared
// applyModifiers, used where no save-bound ascension instance is in scope — tests + the test hook).
//
// COMPOSITION WITH PRESTIGE (modifiers.js is RETIRED into this ladder): a run's effective rule level
// is max(selectedAscension, protocolVersion). The old 5 prestige rules are rungs 1–5 here, so a
// prestige-v3 player always plays under rungs 1–3 (the historical "one harder rule per version",
// now extended past 5), and the ascension picker can push beyond that. Each rule applies AT MOST
// once (the max, never the sum) — that is the "compose, don't double-apply" contract.

// The tunable run config every rule folds into. createRun starts from this and copies the folded
// result onto the run; every field below is read by run.js (economy/rest/reward) or the renderer's
// makeCombat (enemy/boss scaling). Keep this in sync with createRun's assignment.
export function baseRunConfig() {
  return {
    handshakeMult: 1,    // run.js resolveCombat: combat handshake reward multiplier
    restHealMod: 0,      // run.js rest: added to the 0.30 heal fraction
    windowCapMod: 0,     // renderer makeCombat: Act-3 congestion window cap delta
    eliteHpBonus: 0,     // renderer makeCombat: flat HP added to elite enemies
    bossHpMult: 1,       // boss-combat: per-phase HP multiplier for The Refused Connection
    enemyHpMult: 1,      // renderer makeCombat: HP multiplier for NON-boss enemies
    enemyArmorBonus: 0,  // renderer makeCombat: flat armor added to NON-boss enemies
    startHpMod: 0,       // run.js createRun: delta to the run's STARTING hp (not maxHp)
    skipRewardMod: 0,    // run.js takeReward: delta to the skip-a-card handshake payout
    removalCostMod: 0,   // run.js removalCost: delta to the base deck-removal price
    rewardChoicesMod: 0, // run.js reward draft: delta to the number of cards offered
    bossExtraPhase: false // boss-combat: The Refused Connection gains a 4th mutating phase
  };
}

// The ordered ladder (level 1..15, cumulative). Each apply(config) mutates+returns the config clone.
export const ASCENSION_MODS = [
  { level: 1,  id: "lean-rewards",   label: "Lean economy",     desc: "Handshake rewards reduced by 25%.",                 apply: (c) => { c.handshakeMult *= 0.75; return c; } },
  { level: 2,  id: "stingy-rest",    label: "Stingy rests",     desc: "Rest sites heal 10% less.",                          apply: (c) => { c.restHealMod -= 0.10; return c; } },
  { level: 3,  id: "tight-window",   label: "Tight windows",    desc: "The Act-3 congestion cap is 1 lower.",               apply: (c) => { c.windowCapMod -= 1; return c; } },
  { level: 4,  id: "meaner-elites",  label: "Meaner elites",    desc: "Elites gain +24 HP.",                                apply: (c) => { c.eliteHpBonus += 24; return c; } },
  { level: 5,  id: "tougher-boss",   label: "Tougher boss",     desc: "The Refused Connection has +30% phase HP.",          apply: (c) => { c.bossHpMult *= 1.3; return c; } },
  { level: 6,  id: "hardened-foes",  label: "Hardened foes",    desc: "All non-boss enemies have +15% HP.",                 apply: (c) => { c.enemyHpMult *= 1.15; return c; } },
  { level: 7,  id: "attrition",      label: "Attrition",        desc: "Each run starts at 8 HP below maximum.",             apply: (c) => { c.startHpMod -= 8; return c; } },
  { level: 8,  id: "thankless",      label: "Thankless thinning", desc: "Skipping a reward card pays nothing.",             apply: (c) => { c.skipRewardMod -= 5; return c; } },
  { level: 9,  id: "costly-removal", label: "Costly removal",   desc: "Deck removal costs 20 more handshakes.",             apply: (c) => { c.removalCostMod += 20; return c; } },
  { level: 10, id: "fewer-options",  label: "Fewer options",    desc: "Reward drafts offer one fewer card.",                apply: (c) => { c.rewardChoicesMod -= 1; return c; } },
  { level: 11, id: "armored-foes",   label: "Armored foes",     desc: "All non-boss enemies gain +3 armor.",                apply: (c) => { c.enemyArmorBonus += 3; return c; } },
  { level: 12, id: "austere",        label: "Austere economy",  desc: "Handshake rewards reduced a further 20%.",           apply: (c) => { c.handshakeMult *= 0.8; return c; } },
  { level: 13, id: "brutal-elites",  label: "Brutal elites",    desc: "Elites gain a further +30 HP.",                      apply: (c) => { c.eliteHpBonus += 30; return c; } },
  { level: 14, id: "boss-overclock", label: "Boss overclock",   desc: "The Refused Connection gains a further +25% phase HP.", apply: (c) => { c.bossHpMult *= 1.25; return c; } },
  { level: 15, id: "endurance",      label: "Endurance test",   desc: "The Refused Connection gains a fourth mutating phase.", apply: (c) => { c.bossExtraPhase = true; return c; } }
];

export const MAX_ASCENSION = ASCENSION_MODS.length;

// activeAscensionMods(level) — the rules in force at `level`, in ladder order (cumulative).
export function activeAscensionMods(level) {
  const cap = Math.max(0, Math.floor(Number(level) || 0));
  return ASCENSION_MODS.filter((m) => m.level <= cap);
}

// foldAscension(baseConfig, level) — fold every active rule's apply() into a clone of baseConfig
// (standalone equivalent of shared/ascension.js applyModifiers; same defs, no save dependency). Pure.
export function foldAscension(baseConfig, level) {
  let acc = { ...(baseConfig || baseRunConfig()) };
  for (const def of activeAscensionMods(level)) {
    if (typeof def.apply !== "function") continue;
    const next = def.apply(acc, def);
    if (next !== undefined) acc = next;
  }
  return acc;
}
