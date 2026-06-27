// board-render.js — Stage 7 Case 2 (Duplicate Roster) accusation view: the evidence board UI. Split
// out of renderer.js to keep it under the LOC cap. Builds DOM with data-attributes that renderer.js's
// click delegation handles (data-action="open-source", data-pin, data-accuse). Pure render — all state
// mutation goes through accusation.js / evidence-board.js from the renderer.

import { cardsForCase } from "./evidence-board.js";
import { case2Hint, pinnedTriad } from "./accusation.js";
import { CASE2_SOURCES } from "./content.js";

const KIND_GROUPS = [
  ["entity", "Dossiers"],
  ["field", "Claims"],
  ["fact", "Source facts (open the files)"]
];

export function renderAccusation(state) {
  const wrap = el("div", "s7-board");

  const header = el("p", "s7-board-header");
  header.textContent = "CASE 2 — DUPLICATE ROSTER. Open the system files, pin a triad, name the duplicate.";
  wrap.append(header);

  const hint = el("p", "s7-hint");
  hint.textContent = case2Hint(state);
  wrap.append(hint);

  // Source-file shelf — opening each in the real viewer mints its fact card (load-bearing).
  const sources = el("div", "s7-sources");
  for (const s of CASE2_SOURCES) {
    const b = button({ "data-action": "open-source", "data-source": s.action });
    const opened = cardsForCase(state, 2).some((c) => c.id === s.card.id);
    b.textContent = `${opened ? "✓ " : "open "}${s.file}`;
    if (opened) b.classList.add("is-opened");
    sources.append(b);
  }
  wrap.append(sources);

  // The board: clue cards grouped by kind. Click a card to pin/unpin it into the triad.
  const board = el("div", "s7-board-grid");
  for (const [kind, label] of KIND_GROUPS) {
    const col = el("section", "s7-board-col");
    col.innerHTML = `<h4>${label}</h4>`;
    const cards = cardsForCase(state, 2).filter((c) => c.kind === kind);
    if (!cards.length) {
      const empty = el("p", "s7-board-empty");
      empty.textContent = kind === "fact" ? "No facts yet — open the system files." : "—";
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
  const triad = pinnedTriad(state);
  const accuseRow = el("div", "s7-accuse-row");
  const accuse = button({ "data-accuse": "1" });
  accuse.disabled = !triad;
  accuse.textContent = triad
    ? `Accuse ${triad.entityId} (${triad.fieldId})`
    : "Pin one dossier, one claim, one fact";
  accuseRow.append(accuse);
  wrap.append(accuseRow);

  // Established facts (persistent across the rest of the run).
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
