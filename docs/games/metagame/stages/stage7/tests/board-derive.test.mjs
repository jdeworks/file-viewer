// board-derive.test.mjs — Stage 7 evidence-board pure derivations: the accuse-plate socket state (#3),
// the Case-3 search hint-ladder label (#6), and the relevant-vs-archived fact partition (M1).
import assert from "node:assert/strict";
import { socketState, accusedMonogram, searchLabelState, partitionFacts } from "../board-derive.js";
import { ensureCase2, ensureCase3, mintSourceFact } from "../accusation.js";
import { setPinned } from "../evidence-board.js";
import { defaultState } from "../state.js";

// ── Socket state (#3): fills as the triad is pinned; a 2nd card of a kind conflicts the socket ──────
{
  const state = defaultState();
  ensureCase2(state);
  mintSourceFact(state, "route_table_examined"); // fact:route

  let s = socketState(state, 2);
  assert.equal(s.dossier.filled, false);
  assert.equal(s.complete, false, "nothing pinned → no triad");

  setPinned(state, "entity:K", true);
  setPinned(state, "field:K:route", true);
  s = socketState(state, 2);
  assert.equal(s.dossier.filled, true);
  assert.equal(s.claim.filled, true);
  assert.equal(s.fact.filled, false);
  assert.equal(s.complete, false, "2/3 sockets is not a triad");
  assert.equal(accusedMonogram(state, 2), null, "no monogram until the triad is complete");

  setPinned(state, "fact:route", true);
  s = socketState(state, 2);
  assert.equal(s.complete, true, "1/1/1 is a complete triad");
  assert.equal(accusedMonogram(state, 2), "K", "the accused dossier's monogram surfaces on a full triad");

  // Pin a rival dossier → the DOSSIER socket conflicts (the 4th-pin case).
  setPinned(state, "entity:G", true);
  s = socketState(state, 2);
  assert.equal(s.dossier.conflicted, true, "two dossiers pinned → socket highlights the replacement");
  assert.equal(s.complete, false, "a conflicted socket is not a clean triad");
}

// ── Search hint-ladder label (#6): the token S-7741 is hidden until step 2 ──────────────────────────
{
  const state = defaultState();
  state.evidence.case3HintStep = 0;
  let l = searchLabelState(state);
  assert.equal(l.revealsToken, false);
  assert.ok(!l.label.includes("S-7741"), "step 0 names only the file, not the token");
  assert.ok(l.label.includes("session_ledger.csv"));

  state.evidence.case3HintStep = 1;
  l = searchLabelState(state);
  assert.equal(l.revealsToken, false);
  assert.ok(/session/i.test(l.label) && !l.label.includes("S-7741"), "step 1 names the column, still no token");

  state.evidence.case3HintStep = 2;
  l = searchLabelState(state);
  assert.equal(l.revealsToken, true, "step 2 reveals the token → the button may carry the full query");
  assert.ok(l.label.includes("S-7741"));
}

// ── Relevant-facts filter (M1): a fact archives once its subject entity is eliminated ───────────────
{
  const state = defaultState();
  ensureCase2(state);
  mintSourceFact(state, "route_table_examined"); // fact:route  (about K)
  mintSourceFact(state, "access_log_examined");  // fact:activity (no subject)

  let p = partitionFacts(state, 2);
  assert.equal(p.live.length, 2, "with nobody eliminated, both facts are live");
  assert.equal(p.archived.length, 0);

  state.evidence.eliminated = ["K"];
  p = partitionFacts(state, 2);
  assert.deepEqual(p.archived.map((c) => c.id), ["fact:route"], "K eliminated → its fact archives");
  assert.deepEqual(p.live.map((c) => c.id), ["fact:activity"], "the subject-less fact stays live");
}

// ── Case 3 socket + monogram wiring (regression: kinds resolve per-case) ────────────────────────────
{
  const state = defaultState();
  state.substage = 6;
  ensureCase3(state);
  mintSourceFact(state, "session_revoked_found"); // fact:session
  setPinned(state, "entity:N", true);
  setPinned(state, "field:N:session", true);
  setPinned(state, "fact:session", true);
  assert.equal(socketState(state, 3).complete, true);
  assert.equal(accusedMonogram(state, 3), "N");
}

console.log("stage7 board-derive tests passed");
