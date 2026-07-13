// s5dev.test.mjs — unit tests for Stage 5 dev-menu cheat mutators.
//
// Covers each pure function in s5dev.js: devHeal, devGrantKeys, devAddCards, devSkipToBoss,
// devAddEnergy, and the applyDev dispatcher. skip-boss's combat-null / combatRun.reset side
// effects live in renderer.js (they close over the live combat variable) and are not tested here;
// the state-mutation half (act/status/nodeId) is fully covered by the devSkipToBoss tests below.
import assert from "node:assert/strict";
import {
  devHeal, devGrantKeys, devAddCards, devSkipToBoss, devAddEnergy,
  applyDev, DEV_CARDS
} from "../s5dev.js";
import { createRun, KEY_UNTOUCHABLE, KEY_ASCETIC, KEY_SACRIFICE, FINAL_BOSS_ACT } from "../run.js";
import { nodeById } from "../mapgen.js";

function freshRun() { return createRun({ seed: 1 }); }

// ── devHeal ──────────────────────────────────────────────────────────────────────────────────────

{
  const run = freshRun();
  run.hp = 10;
  const r = devHeal(run, null);
  assert.equal(r.ok, true, "heal ok");
  assert.equal(run.hp, run.maxHp, "run hp restored to maxHp");
}

{
  // Also patches live combat.player.hp when supplied.
  const run = freshRun();
  run.hp = 5;
  const cp = { hp: 3, maxHp: 40 };
  devHeal(run, cp);
  assert.equal(run.hp, run.maxHp, "run hp restored");
  assert.equal(cp.hp, 40, "combat player hp patched to maxHp");
}

{
  // combatPlayer without maxHp is ignored (no crash).
  const run = freshRun();
  run.hp = 1;
  devHeal(run, { hp: 0 }); // maxHp missing → no patch
  assert.equal(run.hp, run.maxHp);
}

{
  const r = devHeal(null, null);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "no-run");
}

// ── devGrantKeys ─────────────────────────────────────────────────────────────────────────────────

{
  const run = freshRun();
  assert.equal(run.keys.length, 0, "fresh run has no keys");
  const r = devGrantKeys(run);
  assert.equal(r.ok, true);
  assert.equal(run.keys.length, 3, "all 3 keys granted");
  assert.ok(run.keys.includes(KEY_UNTOUCHABLE), "untouchable key present");
  assert.ok(run.keys.includes(KEY_ASCETIC), "ascetic key present");
  assert.ok(run.keys.includes(KEY_SACRIFICE), "sacrifice key present");
}

{
  // Idempotent: already-earned keys are not duplicated.
  const run = freshRun();
  run.keys = [KEY_UNTOUCHABLE];
  devGrantKeys(run);
  assert.equal(run.keys.length, 3, "3 keys total (not 4)");
  assert.equal(run.keys.filter((k) => k === KEY_UNTOUCHABLE).length, 1, "no duplicate");
}

{
  // Handles missing keys array.
  const run = freshRun();
  delete run.keys;
  devGrantKeys(run);
  assert.equal(run.keys.length, 3);
}

{
  const r = devGrantKeys(null);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "no-run");
}

// ── devAddCards ──────────────────────────────────────────────────────────────────────────────────

{
  const run = freshRun();
  const before = run.deck.length;
  const r = devAddCards(run);
  assert.equal(r.ok, true);
  assert.equal(r.added, DEV_CARDS.length, "reports correct added count");
  assert.equal(run.deck.length, before + DEV_CARDS.length, "deck grew by DEV_CARDS count");
  for (const id of DEV_CARDS) {
    assert.ok(run.deck.includes(id), `deck contains ${id}`);
  }
}

{
  // Calling twice is allowed (dev testing — duplicates are fine).
  const run = freshRun();
  devAddCards(run);
  devAddCards(run);
  assert.equal(run.deck.filter((id) => id === DEV_CARDS[0]).length, 2, "duplicate allowed");
}

{
  const r = devAddCards(null);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "no-run");
}

// ── devSkipToBoss ────────────────────────────────────────────────────────────────────────────────

{
  const run = freshRun();
  const r = devSkipToBoss(run);
  assert.equal(r.ok, true, "skip-boss ok");
  assert.equal(run.act, FINAL_BOSS_ACT, `act advanced to ${FINAL_BOSS_ACT}`);
  assert.equal(run.status, "boss", "run status is boss");
  assert.ok(run.currentNodeId, "currentNodeId is set");
  // The node itself must be the boss node in the generated map.
  const node = nodeById(run.map, run.currentNodeId);
  assert.equal(node?.type, "boss", "node type is boss");
  assert.equal(r.nodeId, run.currentNodeId, "returned nodeId matches run");
  assert.equal(r.act, FINAL_BOSS_ACT, "returned act matches FINAL_BOSS_ACT");
}

{
  // Calling from act 1 correctly jumps to act 6 boss.
  const run = freshRun();
  assert.equal(run.act, 1, "starts at act 1");
  devSkipToBoss(run);
  assert.equal(run.act, 6);
}

{
  const r = devSkipToBoss(null);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "no-run");
}

// ── devAddEnergy ─────────────────────────────────────────────────────────────────────────────────

{
  const cp = { energy: 2, maxHp: 60, hp: 40 };
  const r = devAddEnergy(cp, 3);
  assert.equal(r.ok, true, "energy ok");
  assert.equal(cp.energy, 5, "energy increased by 3");
}

{
  // Caps at 9.
  const cp = { energy: 8 };
  devAddEnergy(cp, 5);
  assert.equal(cp.energy, 9, "energy capped at 9");
}

{
  // 0 starting energy.
  const cp = { energy: 0 };
  devAddEnergy(cp, 3);
  assert.equal(cp.energy, 3);
}

{
  // No combat player: returns { ok: false }.
  const r = devAddEnergy(null, 3);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "no-combat");
}

// ── applyDev dispatcher ──────────────────────────────────────────────────────────────────────────

{
  const run = freshRun();
  run.hp = 1;
  applyDev("heal", run, null);
  assert.equal(run.hp, run.maxHp, "heal dispatched");
}

{
  const run = freshRun();
  applyDev("keys", run, null);
  assert.equal(run.keys.length, 3, "keys dispatched");
}

{
  const run = freshRun();
  const before = run.deck.length;
  applyDev("cards", run, null);
  assert.equal(run.deck.length, before + DEV_CARDS.length, "cards dispatched");
}

{
  // energy dispatched via combatPlayer (no run needed for energy).
  const cp = { energy: 0 };
  applyDev("energy", null, cp);
  assert.equal(cp.energy, 3, "energy dispatched");
}

{
  // skip-boss is NOT in applyDev (handled inline in renderer.js).
  const r = applyDev("skip-boss", freshRun(), null);
  assert.equal(r.ok, false, "skip-boss falls through to unknown-id in dispatcher");
  assert.equal(r.reason, "unknown-id");
}

{
  const r = applyDev("bogus", null, null);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "unknown-id");
}

console.log("stage5 s5dev tests passed");
