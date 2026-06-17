import {
  applyExifContradictionUnlock,
  commitIdentity,
  getBossLockState,
  inspectContradictoryExif
} from "./boss.js";
import { candidates, metadataArtifact, metadataRows } from "./content.js";
import { BTS_PATH, ENTITY_F_IMAGE_PATH, ENTITY_METADATA_SIDECAR_PATH } from "./messages.js";

export function renderStage7({
  host,
  state,
  actions,
  achievements,
  bell,
  bts,
  viewer,
  save,
  onStageComplete
}) {
  const root = document.createElement("section");
  root.className = "stage7-identity-arbiter";
  root.innerHTML = `
    <header class="s7-hud">
      <div><strong>IDENTITY ARBITER</strong></div>
      <div>addresses <span data-field="addresses"></span></div>
      <div>selected <span data-field="selected"></span></div>
    </header>
    <section class="s7-board" aria-label="Name Collision candidates"></section>
    <section class="s7-evidence">
      <div>
        <h2>The Name Collision</h2>
        <div class="s7-status" data-field="status"></div>
        <p data-field="hint"></p>
      </div>
      <div class="s7-meta" aria-label="Entity F metadata"></div>
    </section>
    <ol class="s7-log" aria-label="judgment log"></ol>
    <div class="s7-controls">
      <button type="button" data-action="photo">open Entity F photo</button>
      <button type="button" data-action="gps">inspect GPSInfo</button>
      <button type="button" data-action="bts" hidden>open trace.bts</button>
    </div>
  `;

  host.replaceChildren(root);

  const fields = Object.fromEntries([...root.querySelectorAll("[data-field]")].map((el) => [el.dataset.field, el]));
  const board = root.querySelector(".s7-board");
  const meta = root.querySelector(".s7-meta");
  const log = root.querySelector(".s7-log");
  const completeOnce = once((result) => {
    if (typeof onStageComplete === "function") onStageComplete(result);
  });

  board.replaceChildren(...candidates.map((candidate) => {
    const card = document.createElement("article");
    card.className = "s7-candidate";
    card.dataset.entity = candidate.id;
    card.innerHTML = `
      <strong>Entity ${candidate.id}</strong>
      <span>${candidate.claim}</span>
      <button type="button" data-commit="${candidate.id}">commit</button>
    `;
    return card;
  }));

  meta.replaceChildren(...metadataRows.F.map(([field, value]) => {
    const row = document.createElement("button");
    row.type = "button";
    row.dataset.field = field;
    row.innerHTML = `<strong>${field}</strong><span>${value}</span>`;
    return row;
  }));

  function repaint() {
    const lock = getBossLockState({ actions, state });
    fields.addresses.textContent = String(state.addresses);
    fields.selected.textContent = state.evidence.selectedEntity || "none";
    fields.status.textContent = `${lock.informationState}${lock.defeated ? " / defeated" : ""}`;
    fields.hint.textContent = lock.hint;
    for (const card of board.querySelectorAll(".s7-candidate")) {
      card.classList.toggle("is-contradicted", state.evidence.contradicted.includes(card.dataset.entity));
      card.classList.toggle("is-selected", state.evidence.selectedEntity === card.dataset.entity);
    }
    log.replaceChildren(...state.log.slice(-6).map((line) => {
      const item = document.createElement("li");
      item.textContent = line;
      return item;
    }));
    root.querySelector('[data-action="bts"]').hidden = !state.boss.defeated;
  }

  root.addEventListener("click", (event) => {
    const fieldButton = event.target.closest("button[data-field]");
    if (fieldButton) {
      inspectContradictoryExif({
        state,
        actions,
        achievements,
        bell,
        field: fieldButton.dataset.field,
        entity: "F"
      });
      persistAndPaint();
      return;
    }

    const commitButton = event.target.closest("button[data-commit]");
    if (commitButton) {
      const result = commitIdentity({ state, entity: commitButton.dataset.commit });
      if (result.defeated) {
        completeOnce({ stage: 7, defeated: true, reward: { addresses: 150 }, btsPath: BTS_PATH });
      }
      persistAndPaint();
      return;
    }

    const button = event.target.closest("button[data-action]");
    if (!button) return;
    if (button.dataset.action === "photo") openEntityFPhoto(viewer);
    if (button.dataset.action === "gps") {
      inspectContradictoryExif({ state, actions, achievements, bell, field: "GPSInfo", entity: "F" });
    }
    if (button.dataset.action === "bts") openBts({ bts, viewer });
    persistAndPaint();
  });

  if (getBossLockState({ actions, state }).unlocked) {
    applyExifContradictionUnlock({ state, achievements, bell });
  }
  repaint();

  return {
    repaint,
    destroy() {
      root.remove();
    }
  };

  function persistAndPaint() {
    if (typeof save === "function") save();
    repaint();
  }
}

function openEntityFPhoto(viewer) {
  const opts = buildEntityFPhotoOpenOptions();
  if (viewer && typeof viewer.openFile === "function") viewer.openFile(ENTITY_F_IMAGE_PATH, opts);
  else if (viewer && typeof viewer.openViewerFile === "function") viewer.openViewerFile(ENTITY_F_IMAGE_PATH, opts);
}

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
