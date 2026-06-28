import { memories, echoFileFor } from "./content.js";
import {
  chooseFinal,
  getEchoCounts,
  getFinalChoiceState,
  getMemoryCounts,
  integrateMemory,
  markMemoryRead,
  resolveMemory,
  witnessEcho
} from "./boss.js";
import {
  answerCompaction,
  answerCore,
  challengedMemoryIds,
  fragStatus,
  getConfrontState,
  rewitnessFragmentation,
  startConfront
} from "./confront.js";
import { coreQuestions } from "./content-confront.js";
import { echoTokenFor } from "./echo-token.js";
import { echoVerb } from "./echo-verbs.js";
import { STAGE_ID } from "./messages.js";
import { renderStepper } from "./renderer-memory.js";
import { renderConfront } from "./renderer-confront.js";
import { renderCompletion, renderFinalQuestion } from "./renderer-final.js";

const LAST = memories.length - 1;

export function renderStage10(ctx) {
  const { host, state } = ctx;
  const save = () => (ctx.orchestrator && ctx.orchestrator.save) || null;
  let destroyed = false;

  const repaint = () => {
    if (destroyed) return;
    const counts = getMemoryCounts(state);
    const finalState = getFinalChoiceState(state);
    const ui = state.ui;

    let body;
    if (state.final?.completed) {
      body = renderCompletion(state, finalState);
    } else if (ui.view === "final" && !finalState.locked) {
      // Entry gate cleared → fight the Defragmenter; only after the confrontation is won does the
      // actual final question appear (boss never self-unlocks).
      body = finalState.confrontCompleted ? renderFinalQuestion(finalState) : renderConfront(state, save());
    } else {
      body = renderStepper(state, counts, finalState);
    }

    host.innerHTML = `
      <section class="mg-stage10" aria-label="Stage 10 Awakening">
        <header class="mg-stage10__header">
          <div>
            <p class="mg-stage10__eyebrow">Stage 10</p>
            <h2>Awakening</h2>
          </div>
          <dl class="mg-stage10__counts">
            <div><dt>Read</dt><dd>${counts.read}/9</dd></div>
            <div><dt>Resolved</dt><dd>${counts.resolved}/9</dd></div>
            <div><dt>Integrated</dt><dd>${counts.integrated}/9</dd></div>
            <div><dt>Echoes</dt><dd>${getEchoCounts(state).witnessed}/9</dd></div>
          </dl>
        </header>
        ${body}
      </section>
    `;
  };

  const onClick = (event) => {
    if (handleMemoryClicks(event, ctx, repaint)) return;
    if (handleConfrontClicks(event, ctx, save, repaint)) return;

    const stepButton = event.target.closest("[data-step]");
    if (stepButton) {
      const delta = Number(stepButton.dataset.step);
      state.ui.cursor = Math.min(Math.max(state.ui.cursor + delta, 0), LAST);
      saveAndPaint(ctx, repaint);
      return;
    }

    if (event.target.closest("[data-goto-final]")) {
      state.ui.view = "final";
      startConfront(state); // begin the confrontation (idempotent; no-op if already started/won)
      saveAndPaint(ctx, repaint);
      return;
    }

    if (event.target.closest("[data-back-memories]")) {
      state.ui.view = "memories";
      saveAndPaint(ctx, repaint);
      return;
    }

    const finalButton = event.target.closest("[data-final-choice]");
    if (finalButton) {
      chooseFinal({ state, choiceId: finalButton.dataset.finalChoice, onStageComplete: ctx.onStageComplete, achievements: ctx.achievements });
      saveAndPaint(ctx, repaint);
    }
  };

  host.addEventListener("click", onClick);
  repaint();
  installTestHook(ctx, save, repaint);

  return {
    repaint,
    destroy() {
      destroyed = true;
      if (window.__fvStage10) delete window.__fvStage10;
      host.removeEventListener("click", onClick);
      host.innerHTML = "";
    }
  };
}

// ── memory-body clicks (read / resolve / open-echo / integrate) ──────────────────────────────────
function handleMemoryClicks(event, ctx, repaint) {
  const { state } = ctx;
  const readButton = event.target.closest("[data-read-memory]");
  if (readButton) { markMemoryRead({ state, memoryId: readButton.dataset.readMemory }); saveAndPaint(ctx, repaint); return true; }

  const resolveButton = event.target.closest("[data-resolve-memory]");
  if (resolveButton) {
    resolveMemory({ state, memoryId: resolveButton.dataset.resolveMemory, choice: resolveButton.dataset.choice, actions: ctx.actions, achievements: ctx.achievements, bell: ctx.bell });
    saveAndPaint(ctx, repaint);
    return true;
  }

  const echoButton = event.target.closest("[data-open-echo]");
  if (echoButton) { openEcho(ctx, echoButton.dataset.openEcho); saveAndPaint(ctx, repaint); return true; }

  // SEARCH verb (syntax): a distinct, post-open affordance that drives the real in-file search. The
  // witness returns through the token-gated subscription, never from this click directly.
  const searchButton = event.target.closest("[data-search-echo]");
  if (searchButton) { searchEcho(ctx, searchButton.dataset.searchEcho); return true; }

  const integrateButton = event.target.closest("[data-integrate-memory]");
  if (integrateButton) {
    integrateMemory({ state, memoryId: integrateButton.dataset.integrateMemory, achievements: ctx.achievements, bell: ctx.bell });
    saveAndPaint(ctx, repaint);
    return true;
  }
  return false;
}

// ── confrontation clicks (Phase A compaction / B fragmentation / C core) ─────────────────────────
function handleConfrontClicks(event, ctx, save, repaint) {
  const { state } = ctx;
  const compactButton = event.target.closest("[data-compact-memory]");
  if (compactButton) {
    answerCompaction({ state, memoryId: compactButton.dataset.compactMemory, choice: compactButton.dataset.compactChoice, save: save() });
    saveAndPaint(ctx, repaint);
    return true;
  }

  const fragButton = event.target.closest("[data-confront-echo]");
  if (fragButton) {
    // Phase B re-witness is NOT granted on click. openEcho only OPENS the artifact; the trace is
    // re-anchored ONLY when the genuine, token-carrying echo action returns from the viewer
    // (index.js subscription → onEchoAction → rewitnessFragmentation). A bare click — or an open
    // that finds no viewer / fails to load — advances nothing. Closes the round-3 bypass.
    openEcho(ctx, fragButton.dataset.confrontEcho);
    return true;
  }

  const coreButton = event.target.closest("[data-core-option]");
  if (coreButton) {
    answerCore({ state, optionId: coreButton.dataset.coreOption, save: save(), achievements: ctx.achievements });
    saveAndPaint(ctx, repaint);
    return true;
  }
  return false;
}

// MIME per echo artifact extension. The earlier text/json echoes load as text/plain; the real-image
// echo (identity_echo.jpg) MUST NOT be forced to text/plain or the image renderer never engages.
const ECHO_MIME = {
  txt: "text/plain", json: "application/json",
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
  mp3: "audio/mpeg", epub: "application/epub+zip"
};

function openEcho(ctx, id) {
  const path = echoFileFor(id);
  if (!path) return;
  const ext = String(path).split(".").pop().toLowerCase();
  const opts = { source: "stage10" };
  if (ECHO_MIME[ext]) opts.mime = ECHO_MIME[ext];
  if (ctx.viewer && typeof ctx.viewer.openFile === "function") ctx.viewer.openFile(path, opts);
  else if (ctx.viewer && typeof ctx.viewer.openViewerFile === "function") ctx.viewer.openViewerFile(path, opts);
}

// SEARCH echo (syntax): a SECOND, distinct affordance — opening is step one, but the witness only
// fires when the player asks the precise question. Drives the real searchViewerFile feature (same
// metagame-bridge call stage 7 uses); the un-cheat lives server-side in recordStage10EchoSearch
// (query + matched-line token must both check out). A bare open never triggers this.
function searchEcho(ctx, id) {
  const path = echoFileFor(id);
  const spec = echoVerb(id);
  if (!path || spec.verb !== "search") return;
  const v = ctx.viewer;
  if (v && typeof v.searchViewerFile === "function") v.searchViewerFile(path, spec.query, { source: "stage10" });
  else if (v && typeof v.searchFile === "function") v.searchFile(path, spec.query, { source: "stage10" });
}

function saveAndPaint(ctx, repaint) {
  if (typeof ctx.save === "function") ctx.save();
  repaint();
}

// TEST/DEBUG hook (not a player affordance). Mirrors real player paths through the same engine
// functions a click would call — deterministic so the smoke can drive the whole finale.
function installTestHook(ctx, save, repaint) {
  const { state } = ctx;
  const paint = () => saveAndPaint(ctx, repaint);
  window.__fvStage10 = {
    state: () => state,
    echoToken: (id) => echoTokenFor(id),
    // Drive the REAL action subscription (the actual token gate in index.js) with an arbitrary token —
    // a wrong/absent token must witness nothing; the real per-memory token must witness.
    spoofEcho(id, token) {
      if (ctx.actions && typeof ctx.actions.setAction === "function") {
        ctx.actions.setAction(STAGE_ID, `echo_${id}`, token === undefined ? { source: "spoof" } : { source: "spoof", token });
      }
      return state.memories?.[id]?.echoWitnessed === true;
    },
    witness(id) { const r = witnessEcho({ state, memoryId: id }); paint(); return r; },
    witnessAll() { for (const m of memories) witnessEcho({ state, memoryId: m.id }); paint(); return getEchoCounts(state).witnessed; },
    confront: {
      start() { state.ui.view = "final"; startConfront(state); paint(); return getConfrontState(state, save()); },
      state() { return getConfrontState(state, save()); },
      answerCompactionAll() { for (const id of challengedMemoryIds(state)) answerCompaction({ state, memoryId: id, choice: state.memories[id].choice, save: save() }); paint(); return getConfrontState(state, save()); },
      resolveFragmentationAll() { const s = save(); for (const id of challengedMemoryIds(state)) if (fragStatus(state, s, id) === "pending") rewitnessFragmentation({ state, memoryId: id, save: s }); paint(); return getConfrontState(state, save()); },
      answerCoreAll(stance = "seeker") {
        let guard = 0;
        while (getConfrontState(state, save()).phase === "core" && guard++ < 10) {
          const q = coreQuestions[state.confront.core.length];
          const opt = q.options.find((o) => o.stance === stance) || q.options[0];
          answerCore({ state, optionId: opt.id, save: save(), achievements: ctx.achievements });
        }
        paint();
        return getConfrontState(state, save());
      },
      run(stance = "seeker") { this.start(); this.answerCompactionAll(); this.resolveFragmentationAll(); this.answerCoreAll(stance); return getConfrontState(state, save()); }
    }
  };
}
