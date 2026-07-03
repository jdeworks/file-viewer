// substage-views.js — Stage 7 SS1–SS4 + boss view builders. Pure DOM from state + content (no closure
// over the renderer); split out of renderer.js to keep it under the LOC cap. renderer's click
// delegation drives the [data-flag] / [data-diff] / [data-ev] / [data-action] / [data-commit] buttons.

import {
  ambientFacts, AMBIENT_TRIGGERS, candidates,
  entityFEventLog, entityFields, metadataRows, SCAN_ENTITIES
} from "./content.js";

// M2 — ambient facts arrive AS USED: fact i is revealed once any of its trigger entities is flagged,
// and all are revealed once the scan is complete. Pure; derived from state.evidence.flags.
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
  facts.innerHTML = `<h3>Ambient facts</h3>`
    + (items ? `<ul>${items}</ul>` : `<p class="s7-ambient-empty">Facts surface as you flag contradictions.</p>`);
  const cards = el("div", "s7-cards");
  for (const id of SCAN_ENTITIES) {
    const card = el("article", "s7-card");
    if (state.evidence.flags[id]) card.classList.add("is-flagged");
    card.innerHTML = `<strong>Entity ${esc(id)}</strong>`;
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
  colA.innerHTML = `<h3>Entity A</h3>${metadataRows.A.map(([f, v]) =>
    `<div class="s7-row"><span>${esc(f)}</span><em>${esc(v)}</em></div>`).join("")}`;
  const colF = el("div", "s7-duptest-col");
  colF.innerHTML = `<h3>Entity F</h3>`;
  for (const [f, v] of metadataRows.F) {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.diff = f;
    b.innerHTML = `<span>${esc(f)}</span><em>${esc(v)}</em>`;
    colF.append(b);
  }
  panel.append(colA, colF);
  const note = el("p", "s7-duptest-hint");
  note.textContent = "DIFF DOSSIERS — two fields differ, but only one is tampering. Identify it on Entity F.";
  wrap.append(panel, note);
  return wrap;
}

export function renderTimeline() {
  const wrap = el("div", "s7-ss3");
  wrap.innerHTML = `<p class="s7-audit-header">TIMELINE AUDIT — Entity F activity log. One entry is logically impossible; the rest are plausible. Mark it.</p>`;
  const list = el("ol", "s7-timeline");
  for (const ev of entityFEventLog) {
    const li = document.createElement("li");
    li.innerHTML = `<span>cycle ${esc(ev.cycle)}</span><span>${esc(ev.event)}</span>`;
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
      <h3>Entity F — Credential Chain</h3>
      <p>Route active via: <strong>ENTITY_ANCHOR_0043</strong></p>
      <p>Chain reference:
        <button type="button" data-action="open-anchor">CREDENTIAL_CHAIN &rarr; ENTITY_ANCHOR_0043 [open exhibit]</button>
      </p>
    </article>
    <p class="s7-chase-hint">Follow the citation. Open the referenced anchor record in the viewer.</p>`;
  return wrap;
}

export function renderBoss(state, lock) {
  const wrap = el("div", "s7-ss5");
  const header = el("header", "s7-boss-header");
  header.textContent = "IDENTITY REQUIRES PRIMARY SOURCE VERIFICATION";
  wrap.append(header);
  const intro = el("p");
  intro.textContent = "Entity F presents a verification image. Inspect its embedded metadata.";
  wrap.append(intro);
  const controls = el("div", "s7-controls");
  controls.innerHTML = `<button type="button" data-action="photo">open Entity F photo</button>`;
  wrap.append(controls);
  if (lock.unlocked) {
    const verdict = el("div", "s7-verdict");
    verdict.innerHTML = `<p>Entity F's image GPS is outside every known entity layer. F is eliminated.</p>
      <p>Commit to the real credential holder.</p>`;
    const row = el("div", "s7-commit-row");
    for (const c of candidates) {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.commit = c.id;
      b.disabled = state.boss.defeated;
      b.textContent = `commit ${c.id}`;
      row.append(b);
    }
    verdict.append(row);
    wrap.append(verdict);
  } else {
    const waiting = el("p", "s7-hint");
    waiting.textContent = lock.hint;
    wrap.append(waiting);
  }
  return wrap;
}

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function esc(value) {
  return String(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
}
