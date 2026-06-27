// ascension.test.mjs — `node docs/games/metagame/shared/ascension.test.mjs`
//
// Covers the shared opt-in difficulty ladder: cumulative modifier activation + fold, setLevel
// clamping to what's unlocked, recordClear raising the per-stage AND global completion summary,
// applyModifiers determinism, and the persistence round-trip (incl. sibling-slot safety). No DOM
// required; runs clean under Node.

import assert from 'node:assert/strict';
import { createAscension } from './ascension.js';

let failed = 0;
const ok = (cond, msg) => { console.log((cond ? '✓ ' : '✗ ') + msg); if (!cond) failed++; };

function freshSave() {
  return { stageState: { 1: {}, 2: {}, 6: {} }, global: { maxAscension: 0, ascensionCleared: {} } };
}

// A 3-level ladder; each level adds one rule that compounds onto a base config.
function mods() {
  return [
    { level: 1, id: 'fast', label: 'Faster', desc: 'cadence -25%', apply: (c) => ({ ...c, cadence: c.cadence * 0.75 }) },
    { level: 2, id: 'tough', label: 'Tougher', desc: 'hp +50%', apply: (c) => ({ ...c, hp: c.hp + 50 }) },
    { level: 3, id: 'tax', label: 'Taxed', desc: 'income halved', apply: (c) => ({ ...c, income: c.income / 2 }) },
  ];
}

// ── defaults: a fresh ladder starts at base, nothing unlocked beyond level 1 ────────────────────────
{
  const asc = createAscension({ save: freshSave(), stageId: 1, modifiers: mods() });
  ok(asc.level() === 0, 'starts selected at base (0)');
  ok(asc.maxCleared() === 0, 'nothing cleared yet');
  ok(asc.maxUnlocked() === 1, 'a never-cleared stage unlocks level 1 only');
  ok(asc.maxLevel === 3, 'maxLevel reflects the ladder length');
  ok(asc.activeModifiers(0).length === 0, 'base level has no active modifiers');
}

// ── setLevel clamps to 0..maxUnlocked() ─────────────────────────────────────────────────────────────
{
  const asc = createAscension({ save: freshSave(), stageId: 1, modifiers: mods() });
  ok(asc.setLevel(5) === 1, 'setLevel clamps above maxUnlocked down to 1');
  ok(asc.setLevel(-3) === 0, 'setLevel clamps negatives up to 0');
  ok(asc.setLevel(1) === 1, 'setLevel accepts an unlocked level');
}

// ── cumulative activation: ascension N includes all of 1..N ─────────────────────────────────────────
{
  const asc = createAscension({ save: freshSave(), stageId: 1, modifiers: mods() });
  ok(asc.activeModifiers(1).map((m) => m.id).join(',') === 'fast', 'level 1 activates only the first rule');
  ok(asc.activeModifiers(2).map((m) => m.id).join(',') === 'fast,tough', 'level 2 is cumulative (1+2)');
  ok(asc.activeModifiers(3).map((m) => m.id).join(',') === 'fast,tough,tax', 'level 3 is cumulative (1+2+3)');
}

// ── applyModifiers folds every active rule in order; pure (does not mutate base) ─────────────────────
{
  const asc = createAscension({ save: freshSave(), stageId: 1, modifiers: mods() });
  const base = { cadence: 100, hp: 100, income: 100 };
  const at0 = asc.applyModifiers(base, 0);
  ok(at0.cadence === 100 && at0.hp === 100 && at0.income === 100, 'level 0 leaves the base config unchanged');
  const at2 = asc.applyModifiers(base, 2);
  ok(at2.cadence === 75 && at2.hp === 150 && at2.income === 100, 'level 2 folds fast + tough, not tax');
  const at3 = asc.applyModifiers(base, 3);
  ok(at3.cadence === 75 && at3.hp === 150 && at3.income === 50, 'level 3 folds all three rules');
  ok(base.cadence === 100 && base.hp === 100 && base.income === 100, 'applyModifiers does not mutate the base config');
}

// ── determinism: same level ⇒ identical fold ────────────────────────────────────────────────────────
{
  const asc = createAscension({ save: freshSave(), stageId: 1, modifiers: mods() });
  const run = () => JSON.stringify(asc.applyModifiers({ cadence: 80, hp: 40, income: 200 }, 3));
  ok(run() === run(), 'same level ⇒ identical config (no Date.now / Math.random)');
}

// ── recordClear raises the per-stage cleared + the global summary; unlocks the next level ────────────
{
  const save = freshSave();
  const asc = createAscension({ save, stageId: 6, modifiers: mods() });
  asc.setLevel(1);
  ok(asc.recordClear() === 1, 'recordClear() banks the selected level (1)');
  ok(asc.maxCleared() === 1 && asc.maxUnlocked() === 2, 'clearing level 1 unlocks level 2');
  ok(save.global.ascensionCleared[6] === 1 && save.global.maxAscension === 1, 'recordClear updates the global summary');
  // A lower clear never lowers the high-water mark.
  ok(asc.recordClear(0) === 1, 'a lower clear does not lower the cleared mark');
  // An explicit higher clear (capped at maxLevel) raises both.
  ok(asc.recordClear(3) === 3, 'an explicit higher clear raises the mark');
  ok(asc.maxUnlocked() === 3, 'maxUnlocked caps at the ladder length even when cleared = max');
  ok(save.global.ascensionCleared[6] === 3 && save.global.maxAscension === 3, 'global summary tracks the highest clear');
  ok(asc.recordClear(99) === 3, 'recordClear clamps an over-cap level to maxLevel');
}

// ── global maxAscension is a single max ACROSS stages ───────────────────────────────────────────────
{
  const save = freshSave();
  createAscension({ save, stageId: 1, modifiers: mods() }).recordClear(2);
  createAscension({ save, stageId: 2, modifiers: mods() }).recordClear(1);
  ok(save.global.ascensionCleared[1] === 2 && save.global.ascensionCleared[2] === 1, 'per-stage cleared tracked separately');
  ok(save.global.maxAscension === 2, 'maxAscension is the single highest across all stages');
}

// ── persistence round-trip + selection clamps to unlocked on reload ─────────────────────────────────
{
  const save = freshSave();
  const a = createAscension({ save, stageId: 6, modifiers: mods() });
  a.setLevel(1);
  a.recordClear(2);   // now cleared 2 -> unlocks 3
  a.setLevel(3);
  ok(save.stageState[6].ascension.selected === 3 && save.stageState[6].ascension.cleared === 2, 'state persists in the slot');
  // A rebuilt ascension on the SAME save restores selected + cleared.
  const b = createAscension({ save, stageId: 6, modifiers: mods() });
  ok(b.level() === 3 && b.maxCleared() === 2 && b.maxUnlocked() === 3, 'rebuilt ascension restores persisted state');
}

// ── load reconciles the slot against the global summary (takes the max) ─────────────────────────────
{
  const save = freshSave();
  // Global says stage 6 cleared at 2, but the per-stage slot is empty (e.g. migrated save).
  save.global.ascensionCleared[6] = 2;
  save.global.maxAscension = 2;
  const asc = createAscension({ save, stageId: 6, modifiers: mods() });
  ok(asc.maxCleared() === 2 && asc.maxUnlocked() === 3, 'load lifts cleared from the global summary');
  ok(save.stageState[6].ascension.cleared === 2, 'reconciled cleared is written back into the slot');
}

// ── sibling-slot safety: ascension leaves other slots untouched ─────────────────────────────────────
{
  const save = freshSave();
  save.stageState[1].economy = { balance: 42 };
  save.stageState[1].run = { hp: 9 };
  createAscension({ save, stageId: 1, modifiers: mods() }).setLevel(1);
  ok(save.stageState[1].economy.balance === 42 && save.stageState[1].run.hp === 9, 'ascension leaves sibling slots untouched');
  ok(save.stageState[1].ascension.selected === 1, 'ascension writes only into its own slot');
}

// ── selection persisted above the unlocked cap is clamped down on load ──────────────────────────────
{
  const save = freshSave();
  save.stageState[6].ascension = { selected: 3, cleared: 0 }; // tampered/stale: selecting 3 with nothing cleared
  const asc = createAscension({ save, stageId: 6, modifiers: mods() });
  ok(asc.level() === 1, 'a stale over-selection is clamped to maxUnlocked on load');
}

// ── empty/degenerate inputs are safe ────────────────────────────────────────────────────────────────
{
  const asc = createAscension({ save: freshSave(), stageId: 1, modifiers: [] });
  ok(asc.maxLevel === 0 && asc.maxUnlocked() === 0, 'an empty ladder offers nothing');
  ok(asc.applyModifiers({ x: 1 }, 5).x === 1, 'applyModifiers on an empty ladder returns the base');
  const noSave = createAscension({ stageId: 1, modifiers: mods() });
  ok(noSave.level() === 0 && noSave.recordClear(2) === 2, 'works without a save object (in-memory only)');
}

console.log(failed ? `\nASCENSION FAILED (${failed})` : '\nASCENSION PASSED');
process.exit(failed ? 1 : 0);
