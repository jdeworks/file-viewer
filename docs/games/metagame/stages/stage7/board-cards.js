// board-cards.js — Stage 7 evidence-board card + socket DOM. Three DISTINCT physical surfaces so the
// board reads as evidence, not identical form controls (#1): dossiers = folder-tab cards with a
// monogram, claims = paper slips (grouped under an entity header, #5), facts = stamped notes (the
// source filename is the stamp). Pinned cards get a CSS pushpin (a shape, NOT an emoji — headless
// tofu) + a small deterministic rotation + shadow lift. The DOSSIER/CLAIM/FACT socket plate lives here
// too (#3). Pure DOM from card data; renderer's [data-pin] delegation drives pin/unpin.

import { cardsForCase } from "./evidence-board.js";
import { socketState, partitionFacts } from "./board-derive.js";

// Deterministic per-index rotations (−2°..+2°) so pinned notes sit at a natural, stable slight angle.
const ROT = [-2, 1.5, -1.5, 2, -1, 1];

// The three board columns, each a distinct surface. Claims grouped by entity; facts filtered to those
// still relevant to un-eliminated entities (M1) — archived facts move to the case-file accordion.
export function renderColumns(state, cid) {
  const grid = el("div", "s7-board-grid");
  grid.append(dossierCol(state, cid));
  grid.append(claimCol(state, cid));
  grid.append(factCol(state, cid));
  return grid;
}

function dossierCol(state, cid) {
  const col = el("section", "s7-board-col s7-col--dossier");
  col.innerHTML = `<h4>Dossiers</h4>`;
  const cards = cardsForCase(state, cid).filter((c) => c.kind === "entity");
  if (!cards.length) col.append(emptyNote("—"));
  cards.forEach((c, i) => col.append(dossierCard(c, i, state)));
  return col;
}

function claimCol(state, cid) {
  const col = el("section", "s7-board-col s7-col--claim");
  col.innerHTML = `<h4>Claims</h4>`;
  const cards = cardsForCase(state, cid).filter((c) => c.kind === "field");
  if (!cards.length) return col.append(emptyNote("—")), col;
  const groups = new Map();
  for (const c of cards) {
    if (!groups.has(c.entity)) groups.set(c.entity, []);
    groups.get(c.entity).push(c);
  }
  let i = 0;
  for (const [entity, group] of groups) {
    const det = el("details", "s7-claim-group");
    det.open = true;
    const sum = document.createElement("summary");
    sum.className = "s7-claim-head";
    sum.textContent = `Entity ${entity}`;
    det.append(sum);
    for (const c of group) det.append(slipCard(c, i++));
    col.append(det);
  }
  return col;
}

function factCol(state, cid) {
  const col = el("section", "s7-board-col s7-col--fact");
  col.innerHTML = `<h4>Source facts</h4>`;
  const { live } = partitionFacts(state, cid);
  if (!live.length) {
    col.append(emptyNote("No facts yet — open / search the system files."));
    return col;
  }
  live.forEach((c, i) => col.append(factCard(c, i)));
  return col;
}

// Dossier: a folder-tab card whose tab bears the entity monogram.
function dossierCard(card, i, state) {
  const b = pinButton(card, i, "s7-cardface--dossier");
  const eliminated = (state?.evidence?.eliminated || []).includes(card.entity);
  if (eliminated) b.classList.add("is-eliminated");
  b.innerHTML = `<span class="s7-mono" aria-hidden="true">${esc(card.entity)}</span>`
    + `<span class="s7-cardface-body"><strong>${esc(card.label)}</strong></span>`;
  b.append(pin());
  return b;
}

// Claim: a torn paper slip.
function slipCard(card, i) {
  const b = pinButton(card, i, "s7-cardface--claim");
  b.innerHTML = `<span class="s7-cardface-body">${esc(card.label)}</span>`;
  b.append(pin());
  return b;
}

// Fact: a stamped note — the source filename is the rubber stamp.
function factCard(card, i) {
  const b = pinButton(card, i, "s7-cardface--fact");
  const stamp = card.stamp ? `<span class="s7-fact-stamp" aria-hidden="true">${esc(card.stamp)}</span>` : "";
  b.innerHTML = stamp + `<span class="s7-cardface-body">${esc(card.label)}</span>`;
  b.append(pin());
  return b;
}

function pinButton(card, i, faceClass) {
  const b = document.createElement("button");
  b.type = "button";
  b.setAttribute("data-pin", card.id);
  b.className = `s7-cardface ${faceClass}`;
  if (card.pinned) {
    b.classList.add("is-pinned");
    b.style.setProperty("--rot", `${ROT[i % ROT.length]}deg`);
  }
  return b;
}

// The pushpin glyph — a pure CSS shape (no emoji: headless renders emoji as tofu). Only visible when
// the card is pinned (CSS).
function pin() {
  const s = document.createElement("span");
  s.className = "s7-pin";
  s.setAttribute("aria-hidden", "true");
  return s;
}

// The DOSSIER / CLAIM / FACT socket plate (#3): fills as the triad is pinned; a conflicted socket (a
// rival pinned) highlights the slot being replaced.
export function renderSockets(state, cid) {
  const s = socketState(state, cid);
  const row = el("div", "s7-sockets");
  row.append(socketEl("DOSSIER", s.dossier, s.dossier.card?.entity || ""));
  row.append(socketEl("CLAIM", s.claim, s.claim.card ? claimShort(s.claim.card) : ""));
  row.append(socketEl("FACT", s.fact, s.fact.card?.stamp || (s.fact.card ? "fact" : "")));
  return row;
}

function socketEl(label, sock, fill) {
  const d = el("div", "s7-socket");
  if (sock.filled) d.classList.add("is-filled");
  if (sock.conflicted) d.classList.add("is-conflict");
  d.innerHTML = `<span class="s7-socket-label">${label}</span>`
    + `<span class="s7-socket-fill">${sock.filled ? esc(fill) : "○"}</span>`;
  return d;
}

function claimShort(card) {
  const m = String(card.label || "").split("·").pop();
  return (m || card.fieldId || "claim").trim();
}

function emptyNote(text) {
  const p = el("p", "s7-board-empty");
  p.textContent = text;
  return p;
}

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function esc(value) {
  return String(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
}
