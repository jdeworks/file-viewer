// board-render.js — Stage 7 accusation view: the evidence board UI, shared by Case 2 (Duplicate
// Roster) and Case 3 (Quorum Ghost). Split out of renderer.js to keep it under the LOC cap. Builds DOM
// with data-attributes that renderer.js's click delegation handles (data-action="open-source" /
// "search-source", data-pin, data-accuse). Pure render — all state mutation goes through accusation.js
// / evidence-board.js from the renderer.

import { cardsForCase } from "./evidence-board.js";
import { caseHint, pinnedTriad } from "./accusation.js";
import { CASE2_SOURCES, CASE3_SOURCES, CASE3_SEARCH } from "./content.js";

const KIND_GROUPS = [
  ["entity", "Dossiers"],
  ["field", "Claims"],
  ["fact", "Source facts (open / search the files)"]
];

const SOURCES_FOR_CASE = { 2: CASE2_SOURCES, 3: CASE3_SOURCES };

const HEADERS = {
  2: "CASE 2 — DUPLICATE ROSTER. Open the system files, pin a triad, name the duplicate.",
  3: "CASE 3 — QUORUM GHOST. Two anomalies are decoys (different files clear them). SEARCH the ledger to expose the real lie."
};

export function renderAccusation(state, caseId = 2) {
  const cid = Number(caseId);
  const wrap = el("div", "s7-board");

  const header = el("p", "s7-board-header");
  header.textContent = HEADERS[cid] || HEADERS[2];
  wrap.append(header);

  const hint = el("p", "s7-hint");
  hint.textContent = caseHint(state, cid);
  wrap.append(hint);

  // Carried Case-1 deductions (continuity) — shown atop Case 2 so the case file reads as one thread.
  const carried = (state.board?.established || []).filter((f) => f.id.startsWith("case1:"));
  if (carried.length) {
    const c = el("ul", "s7-established s7-carried");
    c.innerHTML = `<h4>Case file — established earlier</h4>`;
    for (const f of carried) { const li = document.createElement("li"); li.textContent = f.label; c.append(li); }
    wrap.append(c);
  }

  // Source-file shelf — opening each in the real viewer mints its fact card (load-bearing).
  const sources = el("div", "s7-sources");
  for (const s of SOURCES_FOR_CASE[cid] || []) {
    const b = button({ "data-action": "open-source", "data-source": s.action });
    const opened = cardsForCase(state, cid).some((c) => c.id === s.card.id);
    b.textContent = `${opened ? "✓ " : "open "}${s.file}`;
    if (opened) b.classList.add("is-opened");
    sources.append(b);
  }
  // Case 3 SEARCH un-cheat: a distinct affordance — the decisive fact is search-only.
  if (cid === 3) {
    const searched = cardsForCase(state, 3).some((c) => c.id === CASE3_SEARCH.card.id);
    const sb = button({ "data-action": "search-source", "data-source": CASE3_SEARCH.action });
    sb.classList.add("s7-search-btn");
    sb.textContent = `${searched ? "✓ " : "🔍 "}search ${CASE3_SEARCH.file} for "${CASE3_SEARCH.query}"`;
    if (searched) sb.classList.add("is-opened");
    sources.append(sb);
  }
  wrap.append(sources);

  // The board: clue cards grouped by kind. Click a card to pin/unpin it into the triad.
  const board = el("div", "s7-board-grid");
  for (const [kind, label] of KIND_GROUPS) {
    const col = el("section", "s7-board-col");
    col.innerHTML = `<h4>${label}</h4>`;
    const cards = cardsForCase(state, cid).filter((c) => c.kind === kind);
    if (!cards.length) {
      const empty = el("p", "s7-board-empty");
      empty.textContent = kind === "fact" ? "No facts yet — open / search the system files." : "—";
      col.append(empty);
    }
    for (const c of cards) {
      const b = button({ "data-pin": c.id });
      if (c.pinned) b.classList.add("is-pinned");
      b.textContent = (c.pinned ? "📌 " : "") + c.label;
      col.append(b);
    }
    board.append(col);
  }
  wrap.append(board);

  // Accusation row — enabled only when a full triad is pinned (silent otherwise).
  const triad = pinnedTriad(state, cid);
  const accuseRow = el("div", "s7-accuse-row");
  const accuse = button({ "data-accuse": String(cid) });
  accuse.disabled = !triad;
  accuse.textContent = triad
    ? `Accuse ${triad.entityId} (${triad.fieldId})`
    : "Pin one dossier, one claim, one fact";
  accuseRow.append(accuse);
  wrap.append(accuseRow);

  // Established triad facts (persistent across the rest of the run).
  const established = (state.board?.established || []).filter((f) => f.id.startsWith("triad:"));
  if (established.length) {
    const facts = el("ul", "s7-established");
    facts.innerHTML = `<h4>Established</h4>`;
    for (const f of established) {
      const li = document.createElement("li");
      li.textContent = f.label;
      facts.append(li);
    }
    wrap.append(facts);
  }

  return wrap;
}

function button(dataset) {
  const b = document.createElement("button");
  b.type = "button";
  for (const [k, v] of Object.entries(dataset)) b.setAttribute(k, v);
  return b;
}

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}
