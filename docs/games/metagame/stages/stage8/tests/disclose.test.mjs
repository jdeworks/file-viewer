// disclose.test.mjs — Stage 8 act-gated progressive disclosure (M1) + the boss-gate checklist rows.
import assert from "node:assert/strict";
import { defaultState } from "../state.js";
import { getBossLockState } from "../boss.js";
import { computeDisclosure, isVeteran, DISCLOSE_ORDER } from "../disclose.js";
import { bossGateRows } from "../hud.js";

// ── a FRESH cycle-1 save discloses nothing (only nodes+repair+entropy+command bar show) ─────────────
{
  const s = defaultState();
  const d = computeDisclosure(s);
  assert.equal(isVeteran(s), false, "a fresh save is not a veteran");
  for (const key of DISCLOSE_ORDER) assert.equal(d[key], false, `${key} hidden on a fresh field`);
}

// ── each system's first-relevance event reveals exactly that system on a non-veteran save ───────────
{
  const income = defaultState();
  income.totalStatesEarned = 184;           // first States income
  assert.equal(computeDisclosure(income).states, true, "States disclosed on first income");
  assert.equal(computeDisclosure(income).debris, false, "debris still hidden (no failure yet)");

  const fail = defaultState();
  fail.debris = [{ id: "node_F1_cycle3.sav", value: 30 }]; // first node failure shed debris
  assert.equal(computeDisclosure(fail).debris, true, "archive panel disclosed on first failure");

  const parts = defaultState();
  parts.parts = 3;                           // first salvage-parts income
  const dp = computeDisclosure(parts);
  assert.equal(dp.parts, true, "parts (and tech) disclosed on first parts income");

  const built = defaultState();
  built.tech = { rep1: true };               // first tech owned → structures relevant
  assert.equal(computeDisclosure(built).structures, true, "structures disclosed once a tech is owned");

  const heat = defaultState();
  heat.heat = 4;                             // first thermal tick
  assert.equal(computeDisclosure(heat).heat, true, "THERMAL disclosed on first heat");
}

// ── a veteran save (any storm survived / cycle ≥ 8 / boss reached / prior clear) shows EVERYTHING ────
{
  const vet = defaultState();
  vet.stormsSurvived = 1;
  assert.equal(isVeteran(vet), true, "a survived storm makes a veteran");
  const d = computeDisclosure(vet);
  for (const key of DISCLOSE_ORDER) assert.equal(d[key], true, `${key} shown for a veteran (never regress a save)`);

  const deep = defaultState();
  deep.cycle = 8;
  assert.equal(isVeteran(deep), true, "cycle ≥ 8 makes a veteran");
}

// ── disclosure is additive: a persisted flag keeps a system shown even if its live condition lapses ──
{
  const s = defaultState();
  s.disclosed = { heat: true };
  s.heat = 0; // heat vented back to zero
  assert.equal(computeDisclosure(s).heat, true, "a once-disclosed system stays disclosed");
}

// ── the boss-gate checklist rows reflect the computed lock state exactly ─────────────────────────────
{
  const s = defaultState();
  const lock0 = getBossLockState({ actions: null, state: s });
  const rows0 = bossGateRows(lock0);
  assert.equal(rows0.length, 5, "five labelled gate rows");
  assert.ok(rows0.every((r) => r[2] === false), "a fresh field meets no gate");
  assert.equal(rows0[0][1], "0/3", "storm row shows live survived/required");

  // satisfy every gate and confirm the rows flip to met
  s.stormsSurvived = 3; s.cycle = 30; s.salvageTotal = 200; s.totalStatesEarned = 5000;
  const lock1 = getBossLockState({ actions: { hasAction: () => true }, state: s });
  const rows1 = bossGateRows(lock1);
  assert.ok(rows1.every((r) => r[2] === true), "all gates met ⇒ every row met");
  assert.equal(rows1[2][1], `200/${lock1.salvageRequired}`, "salvage row tracks live salvageTotal");
}

console.log("stage8 disclose tests passed");
