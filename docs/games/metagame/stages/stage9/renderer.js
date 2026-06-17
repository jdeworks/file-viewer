import {
  activateOfflineMode,
  getBossLockState,
  getBossSeed,
  readServiceWorkerNotes,
  recordObserverBossAttempt
} from "./boss.js";
import { bossDiagram, serviceWorkerNotesText } from "./content.js";
import { btsSummary, BTS_PATH, NOTES_PATH } from "./messages.js";

export function renderStage9({ host, state, actions, achievements, bell, bts, viewer, save, onStageComplete }) {
  const root = document.createElement("section");
  root.className = "stage9-observer-state";
  root.innerHTML = `
    <header class="s9-hud">
      <strong>OBSERVER STATE</strong>
      <span>level <b data-field="level"></b></span>
      <span>clarity <b data-field="clarity"></b></span>
      <span>seed <b data-field="seed"></b></span>
    </header>
    <div class="s9-layout">
      <pre class="s9-arena" data-field="arena" aria-label="observer boss diagram"></pre>
      <aside class="s9-side">
        <button type="button" data-action="notes">open service-worker-notes.txt</button>
        <button type="button" data-action="offline" hidden>Activate Offline Mode (Stage 9)</button>
        <pre data-field="notes" hidden></pre>
      </aside>
    </div>
    <div class="s9-boss">
      <strong>THE OBSERVER EFFECT (FULL)</strong>
      <div data-field="boss"></div>
      <div data-field="hint"></div>
    </div>
    <ol class="s9-log"></ol>
    <div class="s9-controls">
      <button type="button" data-action="sample">sample seed</button>
      <button type="button" data-action="boss">cross without looking</button>
      <button type="button" data-action="bts" hidden>open observer_state.bts</button>
    </div>
  `;
  host.replaceChildren(root);

  const fields = Object.fromEntries([...root.querySelectorAll("[data-field]")].map((el) => [el.dataset.field, el]));
  const log = root.querySelector(".s9-log");
  const completeOnce = once((result) => {
    if (typeof onStageComplete === "function") onStageComplete(result);
  });

  root.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    if (button.dataset.action === "notes") openNotes();
    if (button.dataset.action === "offline") activateOfflineMode({ state, actions, achievements, bell });
    if (button.dataset.action === "sample") getBossSeed({ state, actions });
    if (button.dataset.action === "boss") challengeBoss();
    if (button.dataset.action === "bts") openBts({ bts, viewer });
    persistAndPaint();
  });

  repaint();

  return {
    repaint,
    destroy() {
      root.remove();
    }
  };

  function openNotes() {
    readServiceWorkerNotes({ state, bell });
    fields.notes.textContent = serviceWorkerNotesText;
    fields.notes.hidden = false;
    const opts = { text: serviceWorkerNotesText, mime: "text/plain", source: "stage9" };
    if (viewer && typeof viewer.openFile === "function") viewer.openFile(NOTES_PATH, opts);
    else if (viewer && typeof viewer.openViewerFile === "function") viewer.openViewerFile(NOTES_PATH, opts);
  }

  function challengeBoss() {
    const result = recordObserverBossAttempt({ state, actions });
    if (result.defeated) completeOnce({ stage: 9, defeated: true, btsPath: BTS_PATH });
  }

  function repaint() {
    const lock = getBossLockState({ actions, state });
    fields.level.textContent = String(state.currentLevel);
    fields.clarity.textContent = String(state.clarity);
    fields.seed.textContent = lock.seedMode === "fixed-cache" ? "0" : "random";
    fields.arena.textContent = bossDiagram(lock);
    fields.boss.textContent = state.boss.defeated ? "defeated. BTS trace available." : `${lock.unlocked ? "UNLOCKED" : "LOCKED"} / ${lock.seedMode}`;
    fields.hint.textContent = lock.hint;
    root.querySelector('[data-action="offline"]').hidden = !state.offlineControlVisible;
    root.querySelector('[data-action="bts"]').hidden = !state.boss.defeated;
    log.replaceChildren(...state.log.slice(-5).map((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      return li;
    }));
  }

  function persistAndPaint() {
    if (typeof save === "function") save();
    repaint();
  }
}

function openBts({ bts, viewer }) {
  if (bts && typeof bts.open === "function") bts.open(9);
  else if (bts && typeof bts.openBts === "function") bts.openBts(9);
  else if (viewer && typeof viewer.openFile === "function") viewer.openFile(BTS_PATH);
  else if (viewer && typeof viewer.openViewerFile === "function") viewer.openViewerFile(BTS_PATH);
  else console.info(btsSummary.join("\n"));
}

function once(fn) {
  let called = false;
  return (value) => {
    if (called) return;
    called = true;
    fn(value);
  };
}
