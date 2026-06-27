import { commitIdentity, getBossLockState } from "./boss.js";
import {
  SUBSTAGE,
  diffField,
  flagField,
  markImpossible
} from "./substages.js";
import {
  ambientFacts,
  candidates,
  entityFEventLog,
  entityFields,
  metadataArtifact,
  metadataRows,
  SCAN_ENTITIES
} from "./content.js";
import {
  BTS_PATH,
  ENTITY_ANCHOR_PATH,
  ENTITY_F_IMAGE_PATH,
  ENTITY_METADATA_SIDECAR_PATH,
  substageHints
} from "./messages.js";

const SUBSTAGE_LABEL = {
  1: "1/5 CREDENTIAL SCAN",
  2: "2/5 DUPLICATE TEST",
  3: "3/5 TIMELINE AUDIT",
  4: "4/5 REFERENCE CHASE",
  5: "5/5 EXIF ARBITER (BOSS)"
};

export function renderStage7({ host, state, actions, achievements, bell, bts, viewer, save, onStageComplete }) {
  const root = document.createElement("section");
  root.className = "stage7-identity-arbiter";
  root.innerHTML = `
    <header class="s7-hud">
      <div><strong>IDENTITY ARBITER</strong></div>
      <div>stage <span data-field="substage"></span></div>
      <div>addresses <span data-field="addresses"></span></div>
    </header>
    <section class="s7-main" aria-label="investigation"></section>
    <p class="s7-hint" data-field="hint"></p>
    <ol class="s7-log" aria-label="judgment log"></ol>
    <div class="s7-controls">
      <button type="button" data-action="bts" hidden>open trace.bts</button>
    </div>
  `;
  host.replaceChildren(root);

  const fields = Object.fromEntries([...root.querySelectorAll("[data-field]")].map((el) => [el.dataset.field, el]));
  const main = root.querySelector(".s7-main");
  const log = root.querySelector(".s7-log");
  const completeOnce = once((result) => { if (typeof onStageComplete === "function") onStageComplete(result); });

  root.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action], button[data-flag], button[data-diff], button[data-ev], button[data-commit]");
    if (!button) return;
    const d = button.dataset;
    if (d.flag) flagField({ state, entityId: d.entity, fieldId: d.flag });
    else if (d.diff) diffField({ state, fieldName: d.diff });
    else if (d.ev) markImpossible({ state, evId: d.ev });
    else if (d.commit) commitBoss(d.commit);
    else if (d.action === "open-anchor") openInViewer(ENTITY_ANCHOR_PATH, { mime: "text/plain", source: "stage7" });
    else if (d.action === "photo") openInViewer(ENTITY_F_IMAGE_PATH, buildEntityFPhotoOpenOptions());
    else if (d.action === "bts") openBts({ bts, viewer });
    persistAndPaint();
  });

  repaint();

  // TEST/DEBUG hook (not a player affordance): drives the investigation deterministically for the
  // smoke. SS4 (anchor) and SS5 (photo) still require the REAL viewer file-opens — this only fast-
  // forwards the in-game deductions SS1–SS3.
  window.__fvStage7 = {
    state: () => state,
    solveInvestigation() {
      for (const id of SCAN_ENTITIES) flagField({ state, entityId: id, fieldId: entityFields[id].find((f) => f.wrong).id });
      diffField({ state, fieldName: "GPSInfo" });
      markImpossible({ state, evId: entityFEventLog.find((e) => e.impossible).id });
      persistAndPaint();
      return state.substage;
    }
  };

  return {
    repaint,
    destroy() {
      if (window.__fvStage7) delete window.__fvStage7;
      root.remove();
    }
  };

  function commitBoss(entity) {
    const result = commitIdentity({ state, entity });
    if (result.defeated) completeOnce({ stage: 7, defeated: true, reward: { addresses: 150 }, btsPath: BTS_PATH });
  }

  function openInViewer(path, opts) {
    if (viewer && typeof viewer.openFile === "function") viewer.openFile(path, opts);
    else if (viewer && typeof viewer.openViewerFile === "function") viewer.openViewerFile(path, opts);
  }

  function repaint() {
    const lock = getBossLockState({ actions, state });
    fields.substage.textContent = SUBSTAGE_LABEL[state.substage] || String(state.substage);
    fields.addresses.textContent = String(state.addresses);
    fields.hint.textContent = state.boss.defeated ? "Case closed." : (substageHints[state.substage] || lock.hint);
    renderMain(lock);
    root.querySelector('[data-action="bts"]').hidden = !state.boss.defeated;
    log.replaceChildren(...state.log.slice(-6).map((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      return li;
    }));
  }

  function renderMain(lock) {
    if (state.substage === SUBSTAGE.SCAN) return main.replaceChildren(renderScan());
    if (state.substage === SUBSTAGE.DUP) return main.replaceChildren(renderDup());
    if (state.substage === SUBSTAGE.TIMELINE) return main.replaceChildren(renderTimeline());
    if (state.substage === SUBSTAGE.CHAIN) return main.replaceChildren(renderChain());
    return main.replaceChildren(renderBoss(lock));
  }

  function renderScan() {
    const wrap = el("div", "s7-ss1");
    const facts = el("aside", "s7-ambient-facts");
    facts.innerHTML = `<h3>Ambient facts</h3><ul>${ambientFacts.map((f) => `<li>${f}</li>`).join("")}</ul>`;
    const cards = el("div", "s7-cards");
    for (const id of SCAN_ENTITIES) {
      const card = el("article", "s7-card");
      if (state.evidence.flags[id]) card.classList.add("is-flagged");
      card.innerHTML = `<strong>Entity ${id}</strong>`;
      for (const f of entityFields[id]) {
        const b = document.createElement("button");
        b.type = "button";
        b.dataset.entity = id;
        b.dataset.flag = f.id;
        b.disabled = Boolean(state.evidence.flags[id]);
        b.innerHTML = `<span>${f.label}</span><em>${f.value}</em>`;
        card.append(b);
      }
      cards.append(card);
    }
    wrap.append(facts, cards);
    return wrap;
  }

  function renderDup() {
    const wrap = el("div", "s7-ss2");
    const panel = el("div", "s7-duptest-panel");
    const colA = el("div", "s7-duptest-col");
    colA.innerHTML = `<h3>Entity A</h3>${metadataRows.A.map(([f, v]) => `<div class="s7-row"><span>${f}</span><em>${v}</em></div>`).join("")}`;
    const colF = el("div", "s7-duptest-col");
    colF.innerHTML = `<h3>Entity F</h3>`;
    for (const [f, v] of metadataRows.F) {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.diff = f;
      b.innerHTML = `<span>${f}</span><em>${v}</em>`;
      colF.append(b);
    }
    panel.append(colA, colF);
    const note = el("p", "s7-duptest-hint");
    note.textContent = "DIFF DOSSIERS — identify the tampered field on Entity F.";
    wrap.append(panel, note);
    return wrap;
  }

  function renderTimeline() {
    const wrap = el("div", "s7-ss3");
    wrap.innerHTML = `<p class="s7-audit-header">TIMELINE AUDIT — Entity F activity log. Mark the impossible entry.</p>`;
    const list = el("ol", "s7-timeline");
    for (const ev of entityFEventLog) {
      const li = document.createElement("li");
      li.innerHTML = `<span>cycle ${ev.cycle}</span><span>${ev.event}</span>`;
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

  function renderChain() {
    const wrap = el("div", "s7-ss4");
    wrap.innerHTML = `
      <article class="s7-dossier-chain">
        <h3>Entity F — Credential Chain</h3>
        <p>Route active via: <strong>ENTITY_ANCHOR_0043</strong></p>
        <p>Chain reference:
          <button type="button" data-action="open-anchor">CREDENTIAL_CHAIN → ENTITY_ANCHOR_0043 [open exhibit]</button>
        </p>
      </article>
      <p class="s7-chase-hint">Follow the citation. Open the referenced anchor record in the viewer.</p>`;
    return wrap;
  }

  function renderBoss(lock) {
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

  function persistAndPaint() {
    if (typeof save === "function") save();
    repaint();
  }
}

// Kept stable for artifact.test + the load-bearing un-cheat: opening this image with these opts fires
// recordStage7MetadataInspection (viewer-actions.js) → the exif-contradiction action. No in-game bypass.
export function buildEntityFPhotoOpenOptions() {
  return {
    mime: "image/png",
    source: "stage7",
    metadataField: metadataArtifact.decisiveField,
    entity: metadataArtifact.decisiveEntity,
    metadataSidecar: ENTITY_METADATA_SIDECAR_PATH,
    metadataRows: metadataRows.F.map(([field, value]) => ({ field, value }))
  };
}

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function openBts({ bts, viewer }) {
  if (bts && typeof bts.open === "function") bts.open(7);
  else if (bts && typeof bts.openBts === "function") bts.openBts(7);
  else if (viewer && typeof viewer.openFile === "function") viewer.openFile(BTS_PATH);
  else if (viewer && typeof viewer.openViewerFile === "function") viewer.openViewerFile(BTS_PATH);
}

function once(fn) {
  let called = false;
  return (value) => {
    if (called) return;
    called = true;
    fn(value);
  };
}
