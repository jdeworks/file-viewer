import assert from "node:assert/strict";
import {
  ASCENSION_MODS, MAX_ASCENSION, baseRunConfig, foldAscension, activeAscensionMods
} from "../ascension-mods.js";
import { createRun, effectiveAscension, removalCost, takeReward } from "../run.js";
import { createAscension } from "../../../shared/ascension.js";

// ── ladder content: ordered, cumulative, deterministic ────────────────────────────────────────────
{
  assert.equal(MAX_ASCENSION, 15, "the ladder offers 15 rungs");
  ASCENSION_MODS.forEach((m, i) => {
    assert.equal(m.level, i + 1, `rung ${i + 1} is in order`);
    assert.equal(typeof m.apply, "function", `${m.id} has an apply`);
    assert.ok(m.label && m.desc, `${m.id} has label + desc`);
  });
  assert.equal(activeAscensionMods(0).length, 0, "level 0 = base rules");
  assert.equal(activeAscensionMods(7).length, 7, "level 7 = first 7 rules");
  assert.equal(activeAscensionMods(99).length, MAX_ASCENSION, "clamps to ladder length");
}

// ── foldAscension: rules fold into config without mutating the base ────────────────────────────────
{
  const base = baseRunConfig();
  const snapshot = JSON.stringify(base);
  const c5 = foldAscension(base, 5);
  assert.equal(JSON.stringify(base), snapshot, "baseRunConfig is not mutated by the fold");
  assert.ok(Math.abs(c5.handshakeMult - 0.75) < 1e-9, "lean-rewards folds at level 5");
  assert.ok(Math.abs(c5.restHealMod + 0.10) < 1e-9, "stingy-rest folds");
  assert.equal(c5.windowCapMod, -1, "tight-window folds");
  assert.equal(c5.eliteHpBonus, 24, "meaner-elites folds");
  assert.ok(Math.abs(c5.bossHpMult - 1.3) < 1e-9, "tougher-boss folds");
  assert.equal(c5.bossExtraPhase, false, "no extra phase below level 15");

  const c15 = foldAscension(base, 15);
  assert.ok(Math.abs(c15.handshakeMult - 0.75 * 0.8) < 1e-9, "austere stacks the economy cut (×0.75×0.8)");
  assert.equal(c15.eliteHpBonus, 24 + 30, "brutal-elites stacks elite HP");
  assert.ok(Math.abs(c15.bossHpMult - 1.3 * 1.25) < 1e-9, "boss-overclock stacks boss HP");
  assert.equal(c15.startHpMod, -8, "attrition lowers starting HP");
  assert.equal(c15.skipRewardMod, -5, "thankless zeroes the skip payout");
  assert.equal(c15.removalCostMod, 20, "costly-removal raises removal price");
  assert.equal(c15.rewardChoicesMod, -1, "fewer-options trims the draft");
  assert.equal(c15.enemyArmorBonus, 3, "armored-foes folds");
  assert.equal(c15.bossExtraPhase, true, "endurance adds the 4th phase at level 15");
}

// ── composition with prestige: effective level is the MAX (never the sum) ──────────────────────────
{
  assert.equal(effectiveAscension(0, 0), 0, "base");
  assert.equal(effectiveAscension(3, 0), 3, "prestige acts as a floor");
  assert.equal(effectiveAscension(0, 7), 7, "ascension picker raises the level");
  assert.equal(effectiveAscension(3, 7), 7, "max, not sum — no double-apply");
  assert.equal(effectiveAscension(9, 2), 9, "the higher of the two wins");
  assert.equal(effectiveAscension(99, 99), MAX_ASCENSION, "clamped to the ladder");
}

// ── createRun applies the effective rules onto the run ─────────────────────────────────────────────
{
  const base = createRun({ seed: 7, version: 0, ascension: 0 });
  assert.equal(base.ascension, 0, "base run has ascension 0");
  assert.equal(base.hp, base.maxHp, "base run starts at full HP");
  assert.equal(base.handshakeMult, 1, "no economy penalty at base");

  const a7 = createRun({ seed: 7, version: 0, ascension: 7 });
  assert.equal(a7.ascension, 7, "ascension level recorded on the run");
  assert.ok(Math.abs(a7.handshakeMult - 0.75) < 1e-9, "lean economy applied");
  assert.equal(a7.hp, a7.maxHp - 8, "attrition: starts 8 below max");
  assert.deepEqual(a7.modifiers, ASCENSION_MODS.slice(0, 7).map((m) => m.id), "modifier id list");

  // Prestige floor: version 5 with ascension 0 still plays under rungs 1–5.
  const v5 = createRun({ seed: 7, version: 5, ascension: 0 });
  assert.equal(v5.ascension, 5, "prestige floor lifts the effective level");
  assert.ok(Math.abs(v5.bossHpMult - 1.3) < 1e-9, "tougher-boss in force via prestige floor");
  assert.ok(v5.relics.length >= 1, "prestige still grants starting relics (power, separate from rules)");

  // No double-apply: version 5 + ascension 5 == version 5 alone for the shared levers.
  const both = createRun({ seed: 7, version: 5, ascension: 5 });
  assert.ok(Math.abs(both.handshakeMult - v5.handshakeMult) < 1e-9, "handshakeMult not double-applied");
  assert.ok(Math.abs(both.bossHpMult - v5.bossHpMult) < 1e-9, "bossHpMult not double-applied");
}

// ── new levers are read by run.js ─────────────────────────────────────────────────────────────────
{
  const a0 = createRun({ seed: 1, ascension: 0 });
  const a9 = createRun({ seed: 1, ascension: 9 });
  assert.equal(removalCost(a9) - removalCost(a0), 20, "costly-removal raises the removal price by 20");

  // Thankless thinning (rung 8): skipping a reward pays nothing.
  const a8 = createRun({ seed: 1, ascension: 8 });
  a8.status = "reward"; a8.pendingReward = { cards: ["SYN"] };
  const before = a8.handshakes;
  takeReward(a8, null);
  assert.equal(a8.handshakes, before, "skip pays 0 at rung 8");

  a0.status = "reward"; a0.pendingReward = { cards: ["SYN"] };
  const before0 = a0.handshakes;
  takeReward(a0, null);
  assert.ok(a0.handshakes > before0, "skip still pays at base");
}

// ── shared ascension module owns the ladder STATE (unlock/clear, persisted in a save) ─────────────
{
  const save = { stageState: { 6: {} }, global: {} };
  const asc = createAscension({ save, stageId: 6, modifiers: ASCENSION_MODS });
  assert.equal(asc.maxLevel, 15, "ladder length surfaced");
  assert.equal(asc.maxUnlocked(), 1, "a fresh stage unlocks rung 1 (after base clear)");
  assert.equal(asc.setLevel(5), 1, "cannot select beyond what's unlocked");

  asc.recordClear(1);
  assert.equal(asc.maxCleared(), 1, "clear at rung 1 recorded");
  assert.equal(asc.maxUnlocked(), 2, "rung 2 now unlocked");
  assert.equal(save.global.maxAscension, 1, "global summary updated");
  assert.equal(save.global.ascensionCleared[6], 1, "per-stage global summary updated");
}

console.log("stage6 ascension ladder tests passed");
