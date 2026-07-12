// substage-views.js — Stage 7 SS1–SS4 + verdict view builders for "The Meridian Estate Affair". Pure
// DOM from state + content (no closure over the renderer); split out of renderer.js to keep it under the
// LOC cap. renderer's click delegation drives the [data-flag] / [data-diff] / [data-ev] / [data-pin] /
// [data-action] / [data-commit] buttons.

import {
  ambientFacts, AMBIENT_TRIGGERS, candidates,
  entityFEventLog, entityFields, statementRows, SCAN_ENTITIES, nameFor, BOSS_DOCS
} from "./content.js";
import { getCard } from "./evidence-board.js";

// Facts arrive AS USED: fact i is revealed once any of its trigger claimants is flagged, and all are
// revealed once the scan is complete. Pure; derived from state.evidence.flags.
export function revealedAmbient(state) {
  const flags = state?.evidence?.flags || {};
  const scanComplete = SCAN_ENTITIES.every((e) => flags[e]);
  const set = new Set();
  AMBIENT_TRIGGERS.forEach((triggers, i) => {
    if (scanComplete || triggers.some((e) => flags[e])) set.add(i);
  });
  return set;
}

export function renderScan(state) {
  const wrap = el("div", "s7-ss1");
  const facts = el("aside", "s7-ambient-facts");
  const revealed = revealedAmbient(state);
  const items = ambientFacts.map((f, i) => (revealed.has(i) ? `<li class="is-revealed">${esc(f)}</li>` : "")).join("");
  facts.innerHTML = `<h3>What you already know</h3>`
    + (items ? `<ul>${items}</ul>` : `<p class="s7-ambient-empty">Facts surface as you flag contradictions.</p>`);
  const cards = el("div", "s7-cards");
  for (const id of SCAN_ENTITIES) {
    const card = el("article", "s7-card");
    if (state.evidence.flags[id]) card.classList.add("is-flagged");
    card.innerHTML = `<strong>${esc(nameFor(id))}</strong>`;
    for (const f of entityFields[id]) {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.entity = id;
      b.dataset.flag = f.id;
      b.disabled = Boolean(state.evidence.flags[id]);
      b.innerHTML = `<span>${esc(f.label)}</span><em>${esc(f.value)}</em>`;
      card.append(b);
    }
    cards.append(card);
  }
  wrap.append(facts, cards);
  return wrap;
}

export function renderDup(state) {
  const wrap = el("div", "s7-ss2");
  const panel = el("div", "s7-duptest-panel");
  const colA = el("div", "s7-duptest-col");
  colA.innerHTML = `<h3>${esc(nameFor("A"))}</h3>${statementRows.A.map(([f, v]) =>
    `<div class="s7-row"><span>${esc(f)}</span><em>${esc(v)}</em></div>`).join("")}`;
  const colF = el("div", "s7-duptest-col");
  colF.innerHTML = `<h3>${esc(nameFor("F"))}</h3>`;
  for (const [f, v] of statementRows.F) {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.diff = f;
    b.innerHTML = `<span>${esc(f)}</span><em>${esc(v)}</em>`;
    colF.append(b);
  }
  panel.append(colA, colF);
  const note = el("p", "s7-duptest-hint");
  note.textContent = "TWO STATEMENTS — two lines differ, but only one was altered. Find it on Miss Marchmain's.";
  wrap.append(panel, note);
  return wrap;
}

export function renderTimeline() {
  const wrap = el("div", "s7-ss3");
  wrap.innerHTML = `<p class="s7-audit-header">MOVEMENTS AUDIT — Miss Marchmain's stated movements. One entry could not have happened; the rest are plausible. Mark it.</p>`;
  const list = el("ol", "s7-timeline");
  for (const ev of entityFEventLog) {
    const li = document.createElement("li");
    li.innerHTML = `<span>${esc(ev.when)}</span><span>${esc(ev.event)}</span>`;
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.ev = ev.id;
    b.textContent = "mark impossible";
    li.append(b);
    list.append(li);
  }
  wrap.append(list);
  return wrap;
}

export function renderChain() {
  const wrap = el("div", "s7-ss4");
  wrap.innerHTML = `
    <article class="s7-dossier-chain">
      <h3>Miss Marchmain — her claim to the estate</h3>
      <p>Rests upon: <strong>a letter of appointment to Meridian House</strong></p>
      <p>The record itself:
        <button type="button" data-action="open-anchor">letter of appointment &rarr; rescinded_appointment.txt [open record]</button>
      </p>
    </article>
    <p class="s7-chase-hint">Follow the reference. Open the appointment record in the viewer.</p>`;
  return wrap;
}

// The verdict / boss. When locked, the arbiter pins the two documents and connects them; connecting the
// contradiction eliminates Miss Marchmain and unlocks the commit row of six named claimants.
export function renderBoss(state, lock) {
  const wrap = el("div", "s7-ss5");
  const header = el("header", "s7-boss-header");
  header.textContent = "NAME THE TRUE HEIR OF MERIDIAN HOUSE";
  wrap.append(header);
  const intro = el("p");
  intro.textContent = "Miss Vane and Miss Marchmain are still tied. The documents cannot both be true — pin them and connect them.";
  wrap.append(intro);

  if (!lock.unlocked) {
    wrap.append(renderVerdictBoard(state));
    const waiting = el("p", "s7-hint");
    waiting.textContent = lock.hint;
    wrap.append(waiting);
    return wrap;
  }

  const verdict = el("div", "s7-verdict");
  verdict.innerHTML = `<p>Miss Marchmain's alibi cannot survive her own postmark. She is eliminated.</p>
    <p>Name the true heir.</p>`;
  const row = el("div", "s7-commit-row");
  for (const c of candidates) {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.commit = c.id;
    b.disabled = state.boss.defeated;
    b.textContent = `name ${c.name}`;
    row.append(b);
  }
  verdict.append(row);
  wrap.append(verdict);
  return wrap;
}

// The two-document evidence board for the verdict: pin BOTH, then connect. Connecting is the un-cheat.
function renderVerdictBoard(state) {
  const board = el("div", "s7-verdict-board");
  let bothPinned = true;
  for (const doc of BOSS_DOCS) {
    const card = getCard(state, doc.id);
    const pinned = Boolean(card?.pinned);
    if (!pinned) bothPinned = false;
    const row = el("div", "s7-verdict-doc");
    const pin = document.createElement("button");
    pin.type = "button";
    pin.dataset.pin = doc.id;
    pin.className = "s7-cardface s7-cardface--document" + (pinned ? " is-pinned" : "");
    pin.innerHTML = `<span class="s7-fact-stamp" aria-hidden="true">${esc(doc.stamp)}</span>`
      + `<span class="s7-cardface-body">${esc(doc.label)}</span>`;
    const open = document.createElement("button");
    open.type = "button";
    open.dataset.action = doc.id === "boss:alibi" ? "open-alibi" : "open-letter";
    open.className = "s7-doc-open";
    open.textContent = `read ${doc.file}`;
    row.append(pin, open);
    board.append(row);
  }
  const connect = document.createElement("button");
  connect.type = "button";
  connect.dataset.action = "connect-alibi";
  connect.className = "s7-connect-btn" + (bothPinned ? " is-armed" : "");
  connect.disabled = !bothPinned;
  connect.textContent = bothPinned ? "CONNECT — the alibi against the postmark" : "Pin both documents to connect them";
  board.append(connect);
  return board;
}

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function esc(value) {
  return String(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
}
