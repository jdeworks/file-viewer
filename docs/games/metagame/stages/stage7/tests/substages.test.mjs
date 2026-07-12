// substages.test.mjs — Stage 7: the four investigation sub-stages gate the boss (SS5).
import assert from "node:assert/strict";
import { SUBSTAGE, flagField, diffField, markImpossible, markChainBroken } from "../substages.js";
import { entityFields, SCAN_ENTITIES } from "../content.js";
import { defaultState } from "../state.js";

// ── SS1 Credential Scan ──────────────────────────────────────────────────────────────────────────
{
  const state = defaultState();
  // a correct field (not the wrong one) does not advance and counts as a misflag
  const correctFieldId = entityFields.B.find((f) => !f.wrong).id;
  const miss = flagField({ state, entityId: "B", fieldId: correctFieldId });
  assert.equal(miss.ok, false);
  assert.equal(state.evidence.wrongFlagCount, 1);
  assert.equal(state.substage, SUBSTAGE.SCAN, "a misflag does not advance");

  // flag the actual wrong field on each impostor → advances to DUP
  for (const id of SCAN_ENTITIES) {
    const wrongId = entityFields[id].find((f) => f.wrong).id;
    flagField({ state, entityId: id, fieldId: wrongId });
  }
  assert.equal(state.substage, SUBSTAGE.DUP, "scanning all four advances to the dup test");
  assert.equal(Object.keys(state.evidence.flags).length, 4);
  assert.deepEqual(state.evidence.eliminated.sort(), ["B", "C", "D", "E"]);
}

// ── SS1 precision bonus when there are no misflags ────────────────────────────────────────────────
{
  const state = defaultState();
  for (const id of SCAN_ENTITIES) flagField({ state, entityId: id, fieldId: entityFields[id].find((f) => f.wrong).id });
  assert.equal(state.addresses, 4 * 10 + 25, "clean scan pays the precision bonus");
}

// ── SS2 Two Statements ───────────────────────────────────────────────────────────────────────────
{
  const state = defaultState();
  state.substage = SUBSTAGE.DUP;
  assert.equal(diffField({ state, fieldName: "Claimed residence" }).ok, false, "a matching line is not the diff");
  // Decoy: the "Recorded by" line ALSO differs between A and F, but a different clerk is routine, so the
  // dup test requires a real comparison — clicking it does NOT complete the case.
  const benign = diffField({ state, fieldName: "Recorded by" });
  assert.equal(benign.ok, false, "the benign-difference decoy is not the tamper");
  assert.equal(benign.reason, "benign-diff");
  assert.equal(state.substage, SUBSTAGE.DUP, "the decoy does not advance the case");
  const hit = diffField({ state, fieldName: "Where on the night of the 12th" });
  assert.equal(hit.complete, true);
  assert.equal(state.evidence.dupTestComplete, true);
  assert.deepEqual(state.evidence.partialContra, ["F.whereabouts"]);
  assert.equal(state.substage, SUBSTAGE.TIMELINE);
}

// ── SS3 Timeline Audit ───────────────────────────────────────────────────────────────────────────
{
  const state = defaultState();
  state.substage = SUBSTAGE.TIMELINE;
  assert.equal(markImpossible({ state, evId: "ev1" }).ok, false, "plausible entry is not impossible");
  // Decoy row (#7): ev2b is a SECOND event at cycle 0040 — a duplicate-cycle that LOOKS anomalous but
  // is routine (two events per cycle already occur), so it must not read as the impossible entry.
  assert.equal(markImpossible({ state, evId: "ev2b" }).ok, false, "the duplicate-cycle decoy is plausible");
  assert.equal(state.substage, SUBSTAGE.TIMELINE);
  const hit = markImpossible({ state, evId: "ev6" });
  assert.equal(hit.complete, true);
  assert.equal(state.evidence.timelineContradictionCycle, "the 13th");
  assert.equal(state.substage, SUBSTAGE.CHAIN);
}

// ── SS4 Reference Chase ──────────────────────────────────────────────────────────────────────────
{
  const state = defaultState();
  state.substage = SUBSTAGE.CHAIN;
  const hit = markChainBroken({ state });
  assert.equal(hit.complete, true);
  assert.equal(state.evidence.chainBroken, true);
  assert.equal(state.substage, SUBSTAGE.ACCUSE, "breaking the chain opens Case 2 (the accusation)");
  assert.equal(markChainBroken({ state }).already, true, "idempotent");
  // Continuity: closing Case 1 promotes its four deductions onto the board as established facts.
  const case1 = state.board.established.filter((f) => f.id.startsWith("case1:"));
  assert.equal(case1.length, 4, "all four Case-1 deductions carried onto the board");
  assert.equal(state.evidence.case1Carried, true);
}

console.log("stage7 substages tests passed");
