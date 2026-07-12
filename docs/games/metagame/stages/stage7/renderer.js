import { applyDev } from "./s7dev.js";
import { commitIdentity, connectAlibiContradiction, ensureBossBoard, getBossLockState } from "./boss.js";
import {
  SUBSTAGE,
  diffField,
  flagField,
  markImpossible
} from "./substages.js";
import { accuseFromBoard, ensureCase2, ensureCase3 } from "./accusation.js";
import { togglePin } from "./evidence-board.js";
import { renderAccusation } from "./board-render.js";
import { renderScan, renderDup, renderTimeline, renderChain, renderBoss } from "./substage-views.js";
import { paintBoardStrings } from "./board-strings.js";
import { searchLabelState } from "./board-derive.js";
import { fireVerdict } from "./board-feedback.js";
import { banner } from "../../shared/feedback.js";
import { installStage7Hook, removeStage7Hook } from "./test-hook.js";
import { CASES } from "./content.js";
import {
  ALIBI_STATEMENT_PATH,
  BTS_PATH,
  CASE2_SOURCE_PATHS,
  CASE3_SOURCE_PATHS,
  CASE3_SEARCH_PATH,
  CASE3_SEARCH_QUERY,
  ENTITY_ANCHOR_PATH,
  TORN_LETTER_PATH,
  substageHints
} from "./messages.js";

const SOURCE_PATHS = { ...CASE2_SOURCE_PATHS, ...CASE3_SOURCE_PATHS };

const SUBSTAGE_LABEL = {
  1: "1/7 WITNESS STATEMENTS",
  2: "2/7 TWO STATEMENTS",
  3: "3/7 MOVEMENTS AUDIT",
  4: "4/7 PAPER TRAIL",
  5: "5/7 THE SECOND CLAIM",
  6: "6/7 THE DISTANT RELATIONS",
  7: "7/7 THE VERDICT"
};

// Light one-line arrival banner (00-F5) fired when the player advances to a NEW sub-stage.
const ARRIVAL = {
  1: "WITNESS STATEMENTS", 2: "TWO STATEMENTS", 3: "MOVEMENTS AUDIT", 4: "PAPER TRAIL",
  5: "CASE 2 — THE SECOND CLAIM", 6: "CASE 3 — THE DISTANT RELATIONS", 7: "THE VERDICT"
};

const BOARD_SUBSTAGES = new Set([SUBSTAGE.ACCUSE, SUBSTAGE.ACCUSE3]);

export function renderStage7({ host, state, actions, achievements, bell, bts, viewer, save, onStageComplete }) {
  const root = document.createElement("section");
  root.className = "stage7-identity-arbiter";
  root.innerHTML = `
    <header class="s7-hud">
      <div><strong>IDENTITY ARBITER</strong></div>
      <div>stage <span data-field="substage"></span></div>
      <div>leads <span data-field="addresses"></span></div>
    </header>
    <section class="s7-main" aria-label="investigation"></section>
    <p class="s7-hint" data-field="hint"></p>
    <details class="s7-log-wrap"><summary>judgment log</summary>
      <ol class="s7-log" aria-label="judgment log"></ol>
    </details>
    <div class="s7-controls">
      <button type="button" data-action="bts" hidden>open trace.bts</button>
    </div>
  `;
  host.replaceChildren(root);

  const fields = Object.fromEntries([...root.querySelectorAll("[data-field]")].map((el) => [el.dataset.field, el]));
  const main = root.querySelector(".s7-main");
  const log = root.querySelector(".s7-log");
  const completeOnce = once((result) => { if (typeof onStageComplete === "function") onStageComplete(result); });
  // Track the sub-stage across paints so a genuine advance fires exactly one arrival banner. Seed it to
  // the current stage so mounting mid-run does NOT fire a spurious banner.
  let lastSubstage = state.substage;
  let verdictInFlight = false;

  root.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action], button[data-flag], button[data-diff], button[data-ev], button[data-commit], button[data-pin], button[data-accuse]");
    if (!button) return;
    const d = button.dataset;
    let verdict = null;
    if (d.flag) flagField({ state, entityId: d.entity, fieldId: d.flag });
    else if (d.diff) diffField({ state, fieldName: d.diff });
    else if (d.ev) markImpossible({ state, evId: d.ev });
    else if (d.pin) togglePin(state, d.pin);
    else if (d.accuse) verdict = doAccuse(Number(d.accuse));
    else if (d.commit) commitBoss(d.commit);
    else if (d.action === "open-source") openSource(d.source);
    else if (d.action === "search-source") searchSource();
    else if (d.action === "open-anchor") openInViewer(ENTITY_ANCHOR_PATH, { mime: "text/plain", source: "stage7" });
    else if (d.action === "open-alibi") openInViewer(ALIBI_STATEMENT_PATH, { mime: "text/plain", source: "stage7" });
    else if (d.action === "open-letter") openInViewer(TORN_LETTER_PATH, { mime: "text/plain", source: "stage7" });
    else if (d.action === "connect-alibi") connectAlibiContradiction({ state, actions, achievements, bell });
    else if (d.action === "bts") openBts({ bts, viewer });
    verdictInFlight = Boolean(verdict);
    persistAndPaint();
    verdictInFlight = false;
    if (verdict) fireVerdict(main, state, verdict);
  });

  repaint();

  // TEST/DEBUG hook (split into test-hook.js): fast-forwards in-game deductions; real viewer
  // file-opens / searches still gate progress (Case 2 needs the route table opened; Case 3 the ledger
  // searched).
  installStage7Hook({ state, persistAndPaint });

  function dev(id) {
    applyDev(state, id);
    if (typeof save === "function") save();
    repaint();
  }

  return {
    repaint,
    dev,
    destroy() {
      removeStage7Hook();
      root.remove();
    }
  };

  // Board accusation: run the rule-of-three, then hand a verdict descriptor to the feedback kit.
  function doAccuse(cid) {
    const result = accuseFromBoard(state, cid);
    if (result.silent) return null; // partial pin — the accusation stays quiet (no beat)
    const cfg = CASES[cid] || {};
    return { cid, correct: result.solved === true, caseName: cfg.name || `CASE ${cid}`, reward: rewardFor(cid, result) };
  }

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
    // Arrival banner on a genuine sub-stage advance — but not during a verdict beat (which fires its
    // own CASE CLOSED interstitial), and never on the very first paint.
    if (state.substage !== lastSubstage) {
      if (!verdictInFlight && ARRIVAL[state.substage]) banner(main, ARRIVAL[state.substage]);
      lastSubstage = state.substage;
    }
    root.querySelector('[data-action="bts"]').hidden = !state.boss.defeated;
    log.replaceChildren(...state.log.slice(-6).map((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      return li;
    }));
  }

  function renderMain(lock) {
    if (state.substage === SUBSTAGE.SCAN) return main.replaceChildren(renderScan(state));
    if (state.substage === SUBSTAGE.DUP) return main.replaceChildren(renderDup(state));
    if (state.substage === SUBSTAGE.TIMELINE) return main.replaceChildren(renderTimeline());
    if (state.substage === SUBSTAGE.CHAIN) return main.replaceChildren(renderChain());
    if (state.substage === SUBSTAGE.ACCUSE) { ensureCase2(state); main.replaceChildren(renderAccusation(state, 2)); return paintStrings(2); }
    if (state.substage === SUBSTAGE.ACCUSE3) { ensureCase3(state); main.replaceChildren(renderAccusation(state, 3)); return paintStrings(3); }
    ensureBossBoard(state);
    return main.replaceChildren(renderBoss(state, lock));
  }

  function paintStrings(cid) {
    if (!BOARD_SUBSTAGES.has(state.substage)) return;
    paintBoardStrings(main.querySelector(".s7-board-surface"), state, cid, {});
  }

  function openSource(action) {
    const path = SOURCE_PATHS[action];
    if (path) openInViewer(path, { source: "stage7" });
  }

  // Case 3 SEARCH un-cheat (#6): the decisive fact is minted only by a REAL search that finds the
  // REVOKED line (via recordStage7Search). The assisted button carries the token ONLY once the hint
  // ladder has revealed it; before that it lands the player IN the ledger to search manually — a player
  // who deduces the token early (it is N's claimed session, visible on the board) can always do so.
  function searchSource() {
    const { revealsToken } = searchLabelState(state);
    if (revealsToken && viewer && typeof viewer.searchViewerFile === "function") {
      viewer.searchViewerFile(CASE3_SEARCH_PATH, CASE3_SEARCH_QUERY, { source: "stage7" });
    } else if (revealsToken && viewer && typeof viewer.searchFile === "function") {
      viewer.searchFile(CASE3_SEARCH_PATH, CASE3_SEARCH_QUERY, { source: "stage7" });
    } else {
      openInViewer(CASE3_SEARCH_PATH, { source: "stage7" });
    }
  }

  function persistAndPaint() {
    if (typeof save === "function") save();
    repaint();
  }
}

const ACCUSE_REWARD = { 2: 40, 3: 60 };
function rewardFor(cid, result) {
  return result.solved ? (ACCUSE_REWARD[cid] || 40) : 0;
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
