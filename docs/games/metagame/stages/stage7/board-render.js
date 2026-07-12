// board-render.js — Stage 7 accusation view: the evidence BOARD, shared by Case 2 (The Second Claim)
// and Case 3 (The Distant Relations). A dark board surface (styles-board.css) holding three distinct card
// surfaces (board-cards.js), a red-string SVG overlay painted by the renderer (board-strings.js), the
// DOSSIER/CLAIM/FACT socket plate + armed Accuse button (#3, M3), a status strip with the last judgment
// line (#5), and a collapsing case-file accordion of settled evidence (#5, M1). Pure render — all state
// mutation goes through accusation.js / evidence-board.js from the renderer via data-* delegation.

import { cardsForCase } from "./evidence-board.js";
import { caseHint, pinnedTriad } from "./accusation.js";
import { renderColumns, renderSockets } from "./board-cards.js";
import { searchLabelState, accusedMonogram, partitionFacts } from "./board-derive.js";
import { CASE2_SOURCES, CASE3_SOURCES, CASE3_SEARCH, nameFor } from "./content.js";

const SOURCES_FOR_CASE = { 2: CASE2_SOURCES, 3: CASE3_SOURCES };
const ACCUSE_COST = 10;

const HEADERS = {
  2: "CASE 2 — THE SECOND CLAIM. Open the estate records, pin a triad, name the impostor.",
  3: "CASE 3 — THE DISTANT RELATIONS. Two oddities are decoys (different records clear them). SEARCH the ledger to expose the real lie."
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

  wrap.append(renderSources(state, cid));

  // The board surface: position:relative so the SVG string overlay + verdict stamp anchor to it.
  const surface = el("div", "s7-board-surface");
  surface.append(renderColumns(state, cid));
  surface.append(renderPlate(state, cid));
  wrap.append(surface);

  const casefile = renderCaseFile(state, cid);
  if (casefile) wrap.append(casefile);

  return wrap;
}

// Source-file shelf — opening each in the real viewer mints its fact card (load-bearing). The Case-3
// SEARCH is a distinct affordance whose LABEL hides the decisive token until the ladder earns it (#6).
function renderSources(state, cid) {
  const sources = el("div", "s7-sources");
  for (const s of SOURCES_FOR_CASE[cid] || []) {
    const b = button({ "data-action": "open-source", "data-source": s.action });
    const opened = cardsForCase(state, cid).some((c) => c.id === s.card.id);
    b.textContent = `${opened ? "[done] " : "open "}${s.file}`;
    if (opened) b.classList.add("is-opened");
    sources.append(b);
  }
  if (cid === 3) {
    const searched = cardsForCase(state, 3).some((c) => c.id === CASE3_SEARCH.card.id);
    const label = searchLabelState(state).label;
    const sb = button({ "data-action": "search-source", "data-source": CASE3_SEARCH.action });
    sb.classList.add("s7-search-btn");
    sb.textContent = `${searched ? "[done] " : "[search] "}${label}`;
    if (searched) sb.classList.add("is-opened");
    sources.append(sb);
  }
  return sources;
}

// The accuse plate: the socket triad (#3), the armed Accuse button carrying the accused monogram + the
// wrong-cost at decision time (#3, M3), and the last-judgment status strip (#5).
function renderPlate(state, cid) {
  const plate = el("div", "s7-accuse-plate");
  plate.append(renderSockets(state, cid));

  const triad = pinnedTriad(state, cid);
  const mono = accusedMonogram(state, cid);
  const row = el("div", "s7-accuse-row");
  const accuse = button({ "data-accuse": String(cid) });
  accuse.className = "s7-accuse-btn" + (triad ? " is-armed" : "");
  accuse.disabled = !triad;
  accuse.innerHTML = triad
    ? `NAME THE IMPOSTOR — <strong>${esc(nameFor(mono))}</strong> <small>&middot; costs ${ACCUSE_COST} leads if wrong</small>`
    : "Pin one claimant, one claim, one fact";
  row.append(accuse);
  plate.append(row);

  const strip = el("div", "s7-status-strip");
  const last = (state.log || [])[(state.log || []).length - 1] || "";
  strip.textContent = last;
  plate.append(strip);
  return plate;
}

// The case-file accordion: settled evidence collapses out of the live board so it shrinks as you solve
// (#5, M1) — carried Case-1 deductions, ESTABLISHED triads, and facts whose subject is now eliminated.
function renderCaseFile(state, cid) {
  const carried = (state.board?.established || []).filter((f) => f.id.startsWith("case1:"));
  const established = (state.board?.established || []).filter((f) => f.id.startsWith("triad:"));
  const { archived } = partitionFacts(state, cid);
  const count = carried.length + established.length + archived.length;
  if (!count) return null;

  const det = el("details", "s7-casefile");
  const sum = document.createElement("summary");
  sum.textContent = `Case file — ${count} settled`;
  det.append(sum);
  const body = el("div", "s7-casefile-body");
  for (const f of established) body.append(fileLine(f.label, "is-established"));
  for (const f of carried) body.append(fileLine(f.label));
  for (const f of archived) body.append(fileLine(f.label, "is-archived"));
  det.append(body);
  return det;
}

function fileLine(text, cls) {
  const p = el("p", "s7-casefile-line" + (cls ? " " + cls : ""));
  p.textContent = text;
  return p;
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

function esc(value) {
  return String(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
}
