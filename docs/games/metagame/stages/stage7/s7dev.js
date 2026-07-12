// s7dev.js — Stage 7 dev-menu cheat functions (pure state mutations, no DOM, no timers).
// Imported by renderer.js (dev(id) dispatcher) and testable without a browser.
//
// CONTROLS
//   skip-case1       Fast-forward SS1–SS4 (Witness Statements → Two Statements → Movements → Paper
//                    Trail) → land at Case 2 accusation (substage 5). Sets all upstream satisfied flags.
//   mint-case-facts  Mint every source-fact card for both cases, including the search-gated
//                    decisive fact (fact:session for Case 3). No accusation is attempted.
//   solve-accusation At SS5: mint decisive fact:route, pin correct triad, submit Case 2 accusation.
//                    At SS6: mint fact:session, pin correct triad, submit Case 3 accusation.
//                    No-op at any other substage.
//   mark-uncheat     Set state.boss.unlocked = true (the flag applyAlibiContradictionUnlock sets when
//                    the alibi statement is connected to the postmarked letter — an optional buff, not
//                    a gate: it pre-eliminates Miss Marchmain for free). Also marks her contradicted.

import { flagField, diffField, markImpossible, markChainBroken } from "./substages.js";
import { mintSourceFact, ensureCase2, ensureCase3, attemptAccusationForCase } from "./accusation.js";
import { mintCard, setPinned } from "./evidence-board.js";
import {
  entityFields, entityFEventLog, SCAN_ENTITIES,
  CASE2_SOURCES, CASE3_SOURCES, CASE3_SEARCH
} from "./content.js";

// Derived from content so s7dev stays in sync with any content change automatically.
const wrongField = (id) => (entityFields[id] || []).find((f) => f.wrong)?.id;
const impossibleEvId = entityFEventLog.find((e) => e.impossible)?.id;

// ── skip-case1 ─────────────────────────────────────────────────────────────────────────────────────
// Fast-forward all four Case 1 sub-stages. Each sub-function is idempotent (already-flagged returns
// early; chainBroken guard in markChainBroken; advance() uses < so it never regresses substage).
export function devSkipCase1(state) {
  for (const id of SCAN_ENTITIES) flagField({ state, entityId: id, fieldId: wrongField(id) });
  diffField({ state, fieldName: "Where on the night of the 12th" });
  markImpossible({ state, evId: impossibleEvId });
  markChainBroken({ state }); // sets chainBroken + carries case1 facts + advances to SS5
  ensureCase2(state);         // idempotent — seeds Case 2 entity/field clue cards
}

// ── mint-case-facts ─────────────────────────────────────────────────────────────────────────────────
// Mint every open-minted source fact for Case 2, every open-minted + the search-gated decisive
// fact for Case 3. Cards are idempotent (mintCard is a no-op for an existing id). Does NOT pin or
// accuse — player still has to work the board to submit the triad.
export function devMintCaseFacts(state) {
  ensureCase2(state);
  for (const src of CASE2_SOURCES) mintSourceFact(state, src.action);
  ensureCase3(state);
  for (const src of CASE3_SOURCES) mintSourceFact(state, src.action);
  mintSourceFact(state, CASE3_SEARCH.action); // the SEARCH-gated decisive fact (fact:session)
}

// ── solve-accusation ────────────────────────────────────────────────────────────────────────────────
// Bypass the real-file gate: mints the decisive fact card, pins the correct triad, and submits
// the accusation. The accusation logic itself (attemptAccusationForCase) is unchanged — it still
// validates the full triad; we just supply it programmatically instead of via player interaction.
export function devSolveAccusation(state) {
  const ss = Number(state.substage || 1);
  if (ss === 5) {
    ensureCase2(state);
    mintSourceFact(state, "route_table_examined"); // mints fact:route (decisive for Case 2)
    setPinned(state, "entity:K", true);
    setPinned(state, "field:K:route", true);
    setPinned(state, "fact:route", true);
    attemptAccusationForCase(state, 2, { entityId: "K", fieldId: "route", factId: "fact:route" });
    ensureCase3(state); // seed Case 3 board now that we've advanced past Case 2
  } else if (ss === 6) {
    ensureCase3(state);
    mintSourceFact(state, CASE3_SEARCH.action); // mints fact:session (search-gated decisive)
    setPinned(state, "entity:N", true);
    setPinned(state, "field:N:session", true);
    setPinned(state, "fact:session", true);
    attemptAccusationForCase(state, 3, { entityId: "N", fieldId: "session", factId: "fact:session" });
  }
  // No-op at all other substages — boss-never-from-start is preserved by the accusation gate.
}

// ── mark-uncheat ────────────────────────────────────────────────────────────────────────────────────
// Set the boss un-cheat satisfied flag directly. Replicates exactly the state mutations that
// applyAlibiContradictionUnlock performs (minus DOM bell/achievement side-effects that require a
// browser). The production gating in commitIdentity (substage 7 check) is untouched.
export function devMarkUncheat(state) {
  state.boss.unlocked = true;
  const set = new Set(state.evidence.contradicted || []);
  set.add("F");
  state.evidence.contradicted = [...set];
}

// ── dispatch ────────────────────────────────────────────────────────────────────────────────────────
export const devControls = [
  { id: "skip-case1",       label: "Skip Case 1 (SS1–SS4)" },
  { id: "mint-case-facts",  label: "Mint all case fact cards" },
  { id: "solve-accusation", label: "Solve current accusation" },
  { id: "mark-uncheat",     label: "Mark alibi contradiction found" }
];

export function applyDev(state, id) {
  if (id === "skip-case1")        devSkipCase1(state);
  else if (id === "mint-case-facts")   devMintCaseFacts(state);
  else if (id === "solve-accusation")  devSolveAccusation(state);
  else if (id === "mark-uncheat")      devMarkUncheat(state);
}
