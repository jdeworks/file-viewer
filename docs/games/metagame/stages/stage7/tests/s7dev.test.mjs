// s7dev.test.mjs — unit tests for the Stage 7 dev-menu cheat functions (s7dev.js).
// All tests are pure (no DOM, no browser). Each asserts the exact state change that would let
// the metagame dev menu gate open at that point in the investigation.
import assert from "node:assert/strict";
import { defaultState } from "../state.js";
import { SUBSTAGE } from "../substages.js";
import { getCard } from "../evidence-board.js";
import {
  devSkipCase1,
  devMintCaseFacts,
  devSolveAccusation,
  devMarkUncheat,
  devControls,
  applyDev
} from "../s7dev.js";

// ── devControls shape ──────────────────────────────────────────────────────────────────────────────
{
  assert.ok(Array.isArray(devControls), "devControls is an array");
  assert.ok(devControls.length >= 2 && devControls.length <= 5, "2–5 dev controls");
  for (const c of devControls) {
    assert.ok(typeof c.id === "string" && c.id.length > 0, `control ${c.id} has an id`);
    assert.ok(typeof c.label === "string" && c.label.length > 0, `control ${c.id} has a label`);
  }
  const ids = devControls.map((c) => c.id);
  assert.ok(ids.includes("skip-case1"),       "skip-case1 present");
  assert.ok(ids.includes("mint-case-facts"),  "mint-case-facts present");
  assert.ok(ids.includes("solve-accusation"), "solve-accusation present");
  assert.ok(ids.includes("mark-uncheat"),     "mark-uncheat present");
}

// ── devSkipCase1 — advances SS1→SS5, sets all Case 1 satisfied flags ──────────────────────────────
{
  const state = defaultState();
  assert.equal(state.substage, 1, "starts at SS1");
  devSkipCase1(state);
  assert.equal(state.substage, SUBSTAGE.ACCUSE, "skip-case1 advances to Case 2 accusation (SS5)");
  assert.equal(state.evidence.chainBroken, true, "chain broken flag set");
  assert.equal(state.evidence.dupTestComplete, true, "dup test complete flag set");
  assert.ok(state.evidence.timelineContradictionCycle, "timeline contradiction cycle recorded");
  // All four scan entities flagged with their correct wrong fields
  assert.ok(state.evidence.flags["B"], "B flagged");
  assert.ok(state.evidence.flags["C"], "C flagged");
  assert.ok(state.evidence.flags["D"], "D flagged");
  assert.ok(state.evidence.flags["E"], "E flagged");
  // Case 1 deductions promoted to the board
  assert.ok(state.evidence.case1Carried, "Case 1 facts carried to board");
  // Case 2 board seeded (entity/field clue cards minted)
  assert.ok(state.evidence.case2Seeded, "Case 2 board seeded");
  assert.ok(getCard(state, "entity:K"), "entity K card on board");
  assert.ok(getCard(state, "field:K:route"), "field K:route card on board");
}

// devSkipCase1 is idempotent (calling twice does not regress substage or duplicate facts)
{
  const state = defaultState();
  devSkipCase1(state);
  devSkipCase1(state);
  assert.equal(state.substage, SUBSTAGE.ACCUSE, "substage does not regress on second call");
  assert.equal(state.evidence.case1Carried, true, "case1Carried still true");
}

// ── devMintCaseFacts — mints all open + search-gated fact cards for both cases ───────────────────
{
  const state = defaultState();
  devMintCaseFacts(state);
  // Case 2 facts
  assert.ok(getCard(state, "fact:route"),    "fact:route (decisive Case 2) minted");
  assert.ok(getCard(state, "fact:spec"),     "fact:spec minted");
  assert.ok(getCard(state, "fact:activity"), "fact:activity minted");
  assert.ok(getCard(state, "fact:comms"),    "fact:comms minted");
  // Case 3 facts, including the search-gated decisive fact
  assert.ok(getCard(state, "fact:qspec"),      "fact:qspec minted");
  assert.ok(getCard(state, "fact:audit"),      "fact:audit minted");
  assert.ok(getCard(state, "fact:handshake"),  "fact:handshake minted");
  assert.ok(getCard(state, "fact:ledgerhint"), "fact:ledgerhint minted");
  assert.ok(getCard(state, "fact:session"),    "fact:session (search-gated decisive) minted");
}

// devMintCaseFacts is idempotent (no card duplicates on repeated calls)
{
  const state = defaultState();
  devMintCaseFacts(state);
  devMintCaseFacts(state);
  const routeCards = state.board.cards.filter((c) => c.id === "fact:route");
  assert.equal(routeCards.length, 1, "fact:route card not duplicated");
}

// ── devSolveAccusation at SS5 — solves Case 2, advances to Case 3 (SS6) ──────────────────────────
{
  const state = defaultState();
  state.substage = SUBSTAGE.ACCUSE; // 5
  devSolveAccusation(state);
  assert.equal(state.evidence.case2Solved, true, "Case 2 solved");
  assert.equal(state.substage, SUBSTAGE.ACCUSE3, "advances to Case 3 (SS6)");
  assert.ok(state.evidence.eliminated.includes("K"), "Entity K eliminated");
  assert.ok(state.board.established.some((f) => f.id === "triad:K"), "triad:K established");
  // Case 3 board seeded for the next step
  assert.ok(state.evidence.case3Seeded, "Case 3 board seeded after Case 2 solve");
}

// ── devSolveAccusation at SS6 — solves Case 3, advances to Boss (SS7) ────────────────────────────
{
  const state = defaultState();
  state.substage = SUBSTAGE.ACCUSE3; // 6
  devSolveAccusation(state);
  assert.equal(state.evidence.case3Solved, true, "Case 3 solved");
  assert.equal(state.substage, SUBSTAGE.BOSS, "advances to Boss (SS7)");
  assert.ok(state.evidence.eliminated.includes("N"), "Entity N eliminated");
  assert.ok(state.board.established.some((f) => f.id === "triad:N"), "triad:N established");
}

// devSolveAccusation is a no-op outside SS5 and SS6 (boss-never-from-start preserved)
{
  const state = defaultState();
  assert.equal(state.substage, 1, "starts at SS1");
  devSolveAccusation(state);
  assert.equal(state.substage, 1, "no-op at SS1 — boss not reachable");
  assert.notEqual(state.evidence.case2Solved, true, "Case 2 not solved");
}
{
  const state = defaultState();
  state.substage = SUBSTAGE.BOSS; // 7 — already at boss
  devSolveAccusation(state);
  // Should be a no-op (neither ss === 5 nor ss === 6)
  assert.ok(!state.evidence.case2Solved, "no retroactive Case 2 solve at SS7");
}

// ── devMarkUncheat — sets the same flag as applyExifContradictionUnlock ───────────────────────────
{
  const state = defaultState();
  assert.equal(state.boss.unlocked, false, "boss.unlocked starts false");
  assert.ok(!state.evidence.contradicted.includes("F"), "F not contradicted initially");
  devMarkUncheat(state);
  // These are exactly the two mutations applyExifContradictionUnlock makes on state:
  assert.equal(state.boss.unlocked, true, "mark-uncheat sets boss.unlocked = true");
  assert.ok(state.evidence.contradicted.includes("F"), "F marked contradicted");
}

// devMarkUncheat is idempotent — no duplicate F in the contradicted array
{
  const state = defaultState();
  devMarkUncheat(state);
  devMarkUncheat(state);
  assert.equal(state.boss.unlocked, true, "still unlocked");
  const fCount = state.evidence.contradicted.filter((x) => x === "F").length;
  assert.equal(fCount, 1, "F appears exactly once in contradicted");
}

// ── applyDev dispatch — all registered ids route to the right function ─────────────────────────────
{
  // Skip-case1 via applyDev
  const s1 = defaultState();
  applyDev(s1, "skip-case1");
  assert.equal(s1.substage, SUBSTAGE.ACCUSE, "applyDev skip-case1 dispatches correctly");

  // Mint-case-facts via applyDev
  const s2 = defaultState();
  applyDev(s2, "mint-case-facts");
  assert.ok(getCard(s2, "fact:route"), "applyDev mint-case-facts dispatches correctly");

  // Mark-uncheat via applyDev
  const s3 = defaultState();
  applyDev(s3, "mark-uncheat");
  assert.equal(s3.boss.unlocked, true, "applyDev mark-uncheat dispatches correctly");

  // Unknown id — silent no-op
  const s4 = defaultState();
  applyDev(s4, "no-such-control");
  assert.equal(s4.substage, 1, "unknown id is a no-op");
}

console.log("stage7 s7dev tests passed");
