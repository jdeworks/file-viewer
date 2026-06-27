// accusation.test.mjs — Stage 7 Case 2: the rule-of-three. Silent on partial, penalty on wrong,
// confirms only on a complete correct triad, and the decisive fact is gated behind a real file-open.
import assert from "node:assert/strict";
import {
  attemptAccusation,
  case2Hint,
  ensureCase2,
  mintSourceFact
} from "../accusation.js";
import { SUBSTAGE } from "../substages.js";
import { getCard, setPinned } from "../evidence-board.js";
import { CASE2 } from "../content.js";
import { defaultState } from "../state.js";

function freshAtAccuse() {
  const state = defaultState();
  state.substage = SUBSTAGE.BOSS - 1; // the accusation substage, whatever its number
  ensureCase2(state);
  return state;
}

// ── seeding mints entity + field cards but NO fact cards (those need real file-opens) ─────────────
{
  const state = freshAtAccuse();
  assert.ok(getCard(state, "entity:K"), "entity cards seeded");
  assert.ok(getCard(state, "field:K:route"), "field cards seeded");
  assert.equal(getCard(state, "fact:route"), null, "fact cards are NOT seeded — only minted by opens");
}

// ── load-bearing: the correct triad is impossible without opening the route table ────────────────
{
  const state = freshAtAccuse();
  setPinned(state, "entity:K", true);
  setPinned(state, "field:K:route", true);
  // No fact card yet → silent, no penalty.
  const before = state.addresses;
  const r = attemptAccusation(state, { entityId: "K", fieldId: "route", factId: "fact:route" });
  assert.equal(r.silent, true);
  assert.equal(r.reason, "missing-card");
  assert.equal(state.addresses, before, "silent partial costs nothing");
  assert.notEqual(state.substage, SUBSTAGE.BOSS, "no advance without the real fact");
}

// ── a real file-open mints the route fact; a COMPLETE WRONG triad penalises silently-about-which ──
{
  const state = freshAtAccuse();
  state.addresses = 100;
  mintSourceFact(state, "route_table_examined");
  mintSourceFact(state, "spec_examined");
  // Accuse the red herring H with a complete-but-wrong triad.
  for (const id of ["entity:H", "field:H:tier", "fact:spec"]) setPinned(state, id, true);
  const start = state.addresses;
  const wrong = attemptAccusation(state, { entityId: "H", fieldId: "tier", factId: "fact:spec" });
  assert.equal(wrong.ok, false);
  assert.equal(wrong.reason, "incorrect");
  assert.equal(state.evidence.case2Attempts, 1, "wrong commit counts");
  assert.equal(state.evidence.case2HintStep, 1, "wrong commit advances the hint ladder");
  assert.ok(state.addresses < start, "wrong commit costs a small penalty");
  assert.notEqual(state.substage, SUBSTAGE.BOSS, "wrong commit does not reach the boss");
  assert.equal(state.evidence.case2Solved, undefined, "progress not wiped, case not solved");
}

// ── the COMPLETE CORRECT triad confirms, establishes the fact, and reaches the boss ──────────────
{
  const state = freshAtAccuse();
  mintSourceFact(state, "route_table_examined");
  for (const id of ["entity:K", "field:K:route", "fact:route"]) setPinned(state, id, true);
  const r = attemptAccusation(state, { entityId: "K", fieldId: "route", factId: "fact:route" });
  assert.equal(r.solved, true);
  assert.equal(state.evidence.case2Solved, true);
  assert.equal(state.substage, SUBSTAGE.BOSS, "correct triad reaches the EXIF boss");
  assert.ok(state.evidence.eliminated.includes("K"));
  assert.ok(state.board.established.some((f) => f.id === "triad:K"), "the triad becomes an established fact");
}

// ── hint ladder is bounded ───────────────────────────────────────────────────────────────────────
{
  const state = freshAtAccuse();
  assert.equal(typeof case2Hint(state), "string");
  assert.equal(CASE2.triad.entity, "K");
}

console.log("stage7 accusation tests passed");
