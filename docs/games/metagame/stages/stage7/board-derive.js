// board-derive.js — Stage 7 evidence-board PURE derivations (no DOM, deterministic, unit-testable).
// Feeds board-render / board-cards with: the DOSSIER/CLAIM/FACT socket state for the accuse plate (#3),
// the Case-3 SEARCH hint-ladder LABEL state that keeps the decisive token OFF the button until earned
// (#6), and the relevant-vs-archived fact partition that shrinks the board as the case is settled (M1).

import { pinnedCards, cardsForCase } from "./evidence-board.js";
import { CASE3_SEARCH } from "./content.js";

const SEARCH_FILE = CASE3_SEARCH.file;    // session_ledger.csv
const SEARCH_QUERY = CASE3_SEARCH.query;  // S-7741

// Socket state for the accuse plate. Each of the three sockets is FILLED by exactly one pinned card of
// its kind; a socket with 2+ pinned cards of that kind is CONFLICTED — the "4th pin" case (#3), where
// pinning a rival highlights the socket being replaced. `complete` == a clean 1/1/1 triad.
export function socketState(state, caseId = 2) {
  const pinned = pinnedCards(state).filter((c) => Number(c.caseId) === Number(caseId));
  const sock = (kind) => {
    const cards = pinned.filter((c) => c.kind === kind);
    return { kind, count: cards.length, filled: cards.length >= 1, conflicted: cards.length > 1, card: cards[0] || null };
  };
  const dossier = sock("entity");
  const claim = sock("field");
  const fact = sock("fact");
  const complete = dossier.count === 1 && claim.count === 1 && fact.count === 1;
  return { dossier, claim, fact, complete };
}

// The accused entity's monogram for the Accuse plate, only when a clean triad is pinned.
export function accusedMonogram(state, caseId = 2) {
  const s = socketState(state, caseId);
  return s.complete ? (s.dossier.card?.entity || null) : null;
}

// Case-3 SEARCH hint-ladder LABEL state (#6). The decisive token (S-7741) is NOT printed until the
// ladder reaches its token step; before that the button only NAMES the file (step 0) then the COLUMN
// (step 1). Driven by the SAME case3HintStep the wrong-accusation ladder advances — so earning the
// token costs the (unchanged) ladder economics. `revealsToken` gates the button carrying the query.
export function searchLabelState(state) {
  const step = Math.max(0, Number(state?.evidence?.case3HintStep || 0));
  if (step >= 2) return { step, revealsToken: true, label: `search ${SEARCH_FILE} for "${SEARCH_QUERY}"` };
  if (step === 1) return { step, revealsToken: false, label: `search the SESSION column of ${SEARCH_FILE}` };
  return { step, revealsToken: false, label: `search ${SEARCH_FILE}` };
}

// Partition a case's FACT cards into the LIVE board vs. the case-file accordion (M1). A source fact is
// ARCHIVED once every entity it speaks to (its `about` subjects) has been eliminated — its subject is
// settled, so the fact column only shows evidence still relevant to entities in question. Facts with no
// declared subject stay live.
export function partitionFacts(state, caseId = 2) {
  const eliminated = new Set(state?.evidence?.eliminated || []);
  const facts = cardsForCase(state, caseId).filter((c) => c.kind === "fact");
  const live = [];
  const archived = [];
  for (const f of facts) {
    const about = Array.isArray(f.about) ? f.about : [];
    (about.length && about.every((e) => eliminated.has(e)) ? archived : live).push(f);
  }
  return { live, archived };
}
