// accusation.test.mjs — Stage 7 Cases 2 & 3: the rule-of-three. Silent on partial, penalty on wrong,
// confirms only on a complete correct triad, and the decisive fact is gated behind a real file
// interaction (Case 2: open the route table; Case 3: SEARCH the session ledger).
import assert from "node:assert/strict";
import {
  attemptAccusation,
  attemptAccusationForCase,
  case2Hint,
  case3Hint,
  ensureCase2,
  ensureCase3,
  mintSourceFact
} from "../accusation.js";
import { SUBSTAGE } from "../substages.js";
import { getCard, setPinned } from "../evidence-board.js";
import { CASE2, CASE3 } from "../content.js";
import { defaultState } from "../state.js";

function freshAtCase2() {
  const state = defaultState();
  state.substage = SUBSTAGE.ACCUSE; // 5 — the Case 2 accusation
  ensureCase2(state);
  return state;
}
function freshAtCase3() {
  const state = defaultState();
  state.substage = SUBSTAGE.ACCUSE3; // 6 — the Case 3 accusation
  ensureCase3(state);
  return state;
}

// ── Case 2: seeding mints entity + field cards but NO fact cards (those need real file-opens) ──────
{
  const state = freshAtCase2();
  assert.ok(getCard(state, "entity:K"), "entity cards seeded");
  assert.ok(getCard(state, "field:K:route"), "field cards seeded");
  assert.equal(getCard(state, "fact:route"), null, "fact cards are NOT seeded — only minted by opens");
}

// ── Case 2 load-bearing: the correct triad is impossible without opening the route table ───────────
{
  const state = freshAtCase2();
  setPinned(state, "entity:K", true);
  setPinned(state, "field:K:route", true);
  const before = state.addresses;
  const r = attemptAccusation(state, { entityId: "K", fieldId: "route", factId: "fact:route" });
  assert.equal(r.silent, true);
  assert.equal(r.reason, "missing-card");
  assert.equal(state.addresses, before, "silent partial costs nothing");
  assert.notEqual(state.substage, SUBSTAGE.ACCUSE3, "no advance without the real fact");
}

// ── Case 2 wrong triad penalises silently-about-which; correct triad advances to Case 3 ───────────
{
  const state = freshAtCase2();
  state.addresses = 100;
  mintSourceFact(state, "route_table_examined");
  mintSourceFact(state, "spec_examined");
  for (const id of ["entity:H", "field:H:tier", "fact:spec"]) setPinned(state, id, true);
  const start = state.addresses;
  const wrong = attemptAccusation(state, { entityId: "H", fieldId: "tier", factId: "fact:spec" });
  assert.equal(wrong.reason, "incorrect");
  assert.equal(state.evidence.case2Attempts, 1, "wrong commit counts");
  assert.ok(state.addresses < start, "wrong commit costs a small penalty");
  assert.notEqual(state.evidence.case2Solved, true, "progress not wiped, case not solved");
}
{
  const state = freshAtCase2();
  mintSourceFact(state, "route_table_examined");
  for (const id of ["entity:K", "field:K:route", "fact:route"]) setPinned(state, id, true);
  const r = attemptAccusation(state, { entityId: "K", fieldId: "route", factId: "fact:route" });
  assert.equal(r.solved, true);
  assert.equal(state.evidence.case2Solved, true);
  assert.equal(state.substage, SUBSTAGE.ACCUSE3, "correct Case 2 triad opens Case 3, NOT the boss");
  assert.ok(state.board.established.some((f) => f.id === "triad:K"));
}

// ── Case 3 load-bearing: the decisive fact is SEARCH-only — opening the ledger is not enough ───────
{
  const state = freshAtCase3();
  assert.ok(getCard(state, "entity:N"), "Case 3 entity cards seeded");
  assert.ok(getCard(state, "field:N:session"), "Case 3 field cards seeded");
  // Open the ledger → only a hint card, NOT the decisive fact.
  mintSourceFact(state, "ledger_examined");
  assert.ok(getCard(state, "fact:ledgerhint"), "opening the ledger mints a hint card");
  assert.equal(getCard(state, "fact:session"), null, "the decisive fact is search-only, not open-minted");
  setPinned(state, "entity:N", true);
  setPinned(state, "field:N:session", true);
  const r = attemptAccusationForCase(state, 3, { entityId: "N", fieldId: "session", factId: "fact:session" });
  assert.equal(r.silent, true, "no decisive fact → silent");
  assert.notEqual(state.substage, SUBSTAGE.BOSS, "no boss without the searched fact");
}

// ── Case 3 red herrings (exonerated by DIFFERENT files) penalise on a complete-but-wrong accusation ─
{
  const state = freshAtCase3();
  state.addresses = 100;
  mintSourceFact(state, "quorum_spec_examined"); // fact:qspec
  mintSourceFact(state, "audit_examined");       // fact:audit
  for (const id of ["entity:Q", "field:Q:tier", "fact:qspec"]) setPinned(state, id, true);
  const wrong = attemptAccusationForCase(state, 3, { entityId: "Q", fieldId: "tier", factId: "fact:qspec" });
  assert.equal(wrong.reason, "incorrect", "the spec-exonerated red herring is wrong");
  assert.equal(state.evidence.case3Attempts, 1);
  assert.notEqual(state.evidence.case3Solved, true);
}

// ── Case 3 correct triad (search fact) confirms and reaches the boss ──────────────────────────────
{
  const state = freshAtCase3();
  mintSourceFact(state, "session_revoked_found"); // the SEARCH un-cheat mints fact:session
  assert.ok(getCard(state, "fact:session"), "the search mints the decisive fact");
  for (const id of ["entity:N", "field:N:session", "fact:session"]) setPinned(state, id, true);
  const r = attemptAccusationForCase(state, 3, { entityId: "N", fieldId: "session", factId: "fact:session" });
  assert.equal(r.solved, true);
  assert.equal(state.evidence.case3Solved, true);
  assert.equal(state.substage, SUBSTAGE.BOSS, "correct Case 3 triad reaches the EXIF boss");
  assert.ok(state.evidence.eliminated.includes("N"));
  assert.ok(state.board.established.some((f) => f.id === "triad:N"));
}

// ── hints are bounded + config sanity ─────────────────────────────────────────────────────────────
{
  const state = freshAtCase3();
  assert.equal(typeof case2Hint(state), "string");
  assert.equal(typeof case3Hint(state), "string");
  assert.equal(CASE2.triad.entity, "K");
  assert.equal(CASE3.triad.entity, "N");
  assert.equal(CASE3.triad.factId, "fact:session");
}

console.log("stage7 accusation tests passed");
