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
import { devCheat } from "./s9dev.js";
import { echoTokenFor } from "./echo-token.js";
import { echoVerb } from "./echo-verbs.js";
import { STAGE_ID } from "./messages.js";
import { renderStepper } from "./renderer-memory.js";
import { renderGrid, buildReviewElement } from "./renderer-grid.js";
import { renderConfront } from "./renderer-confront.js";
import { renderCompletion, renderFinalQuestion, completionBeats } from "./renderer-final.js";
import { createReveal } from "./reveal.js";
import { openModal } from "../../shared/modal.js";
import { flash, banner } from "../../shared/feedback.js";

const LAST = memories.length - 1;
const REVEAL_MS = 250;

function prefersReducedMotion() {
  try { return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true; } catch { return false; }
}

export function renderStage9(ctx) {
  const { host, state } = ctx;
  const save = () => (ctx.orchestrator && ctx.orchestrator.save) || null;
  let destroyed = false;
  let reveal = null;         // staged-reveal state machine for the completion screen (reveal.js)
  let revealTimer = null;    // interval that advances the reveal one beat at a time
  let reviewModal = null;    // open "review memories" overlay handle (closed on destroy)
  let prev = snapshot(state); // ceremony diff baseline (witnessed / integrated / confront / completed)

  const clearReveal = () => { if (revealTimer) { clearInterval(revealTimer); revealTimer = null; } };

  // Once the finale completes, size the reveal to exactly the route's beats and stage them in.
  const ensureReveal = (finalState) => {
    if (reveal) return;
    const total = completionBeats(state, finalState).length;
    reveal = createReveal(total, { reducedMotion: prefersReducedMotion() });
    if (!reveal.done) {
      revealTimer = setInterval(() => {
        if (destroyed) return clearReveal();
        if (!reveal.tick()) clearReveal();
        repaint();
      }, REVEAL_MS);
    }
  };

  const repaint = () => {
    if (destroyed) return;
    const counts = getMemoryCounts(state);
    const finalState = getFinalChoiceState(state);
    const ui = state.ui;

    let body;
    let mode = "grid";
    if (state.final?.completed) {
      ensureReveal(finalState);
      body = renderCompletion(state, finalState, reveal);
      mode = "completion";
    } else if (ui.view === "final" && !finalState.locked) {
      // Entry gate cleared → fight the Defragmenter; only after the confrontation is won does the
      // actual final question appear (boss never self-unlocks).
      const confronting = !finalState.confrontCompleted;
      body = confronting ? renderConfront(state, save()) : renderFinalQuestion(finalState);
      mode = confronting ? "confront" : "final";
    } else if (ui.view === "memories" && ui.detail) {
      markMemoryRead({ state, memoryId: memories[ui.cursor].id }); // auto-read on detail open (M2)
      body = renderStepper(state);
      mode = "detail";
    } else {
      body = renderGrid(state, counts, finalState);
    }

    host.innerHTML = `
      <section class="mg-stage9 mg-stage9--${mode}${mode === "confront" ? " is-confronting" : ""}" aria-label="Stage 9 Awakening">
        <header class="mg-stage9__header">
          <div>
            <p class="mg-stage9__eyebrow">Stage 9</p>
            <h2>Awakening</h2>
          </div>
          ${renderHeaderProgress(counts, state)}
        </header>
        ${body}
      </section>
    `;

    const next = snapshot(state);
    runCeremony(prev, next, mode);
    prev = next;
  };

  const openDetail = (index) => {
    state.ui.cursor = Math.min(Math.max(index, 0), LAST);
    state.ui.detail = true;
    markMemoryRead({ state, memoryId: memories[state.ui.cursor].id }); // reading it is opening it (M2)
    saveAndPaint(ctx, repaint);
  };

  const onClick = (event) => {
    if (handleMemoryClicks(event, ctx, repaint)) return;
    if (handleConfrontClicks(event, ctx, save, repaint)) return;

    const card = event.target.closest("[data-memory-card]");
    if (card) { openDetail(memories.findIndex((m) => m.id === card.dataset.memoryCard)); return; }

    const stepButton = event.target.closest("[data-step]");
    if (stepButton) { openDetail(state.ui.cursor + Number(stepButton.dataset.step)); return; }

    if (event.target.closest("[data-back-grid]")) {
      state.ui.detail = false;
      saveAndPaint(ctx, repaint);
      return;
    }

    if (event.target.closest("[data-review-memories]")) {
      if (reviewModal) reviewModal.close();
      reviewModal = openModal({
        title: "Memory review",
        className: "mg-stage9-review",
        contentEl: buildReviewElement(state),
        onClose: () => { reviewModal = null; }
      });
      return;
    }

    if (event.target.closest("[data-skip-reveal]")) {
      if (reveal && reveal.skip()) { clearReveal(); repaint(); }
      return;
    }

    if (event.target.closest("[data-goto-final]")) {
      state.ui.view = "final";
      state.ui.detail = false;
      startConfront(state); // begin the confrontation (idempotent; no-op if already started/won)
      saveAndPaint(ctx, repaint);
      return;
    }

    if (event.target.closest("[data-back-memories]")) {
      state.ui.view = "memories";
      state.ui.detail = false;
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
    dev(id) { devCheat(state, id); saveAndPaint(ctx, repaint); },
    destroy() {
      destroyed = true;
      clearReveal();
      if (reviewModal) { reviewModal.close(); reviewModal = null; }
      if (window.__fvStage9) delete window.__fvStage9;
      host.removeEventListener("click", onClick);
      host.innerHTML = "";
    }
  };
}

// ── header (M1: ONE progress notion + expandable four-way detail) ────────────────────────────────
function renderHeaderProgress(counts, state) {
  const echoes = getEchoCounts(state).witnessed;
  return `
    <details class="mg-stage9__progress-detail">
      <summary class="mg-stage9__restored">Memories restored <strong>${counts.integrated}/9</strong></summary>
      <dl class="mg-stage9__counts">
        <div><dt>Read</dt><dd>${counts.read}/9</dd></div>
        <div><dt>Resolved</dt><dd>${counts.resolved}/9</dd></div>
        <div><dt>Integrated</dt><dd>${counts.integrated}/9</dd></div>
        <div><dt>Echoes</dt><dd>${echoes}/9</dd></div>
      </dl>
    </details>
  `;
}

// ── ceremony (UX audit #3 — reduced-motion aware via games-chrome.css) ───────────────────────────
// A pure snapshot of the beats worth celebrating; the renderer diffs consecutive snapshots and attaches
// the shared micro-feedback classes (flash/banner) to the freshly-rendered nodes. Sigil slide-in and
// phase-pill motion are pure CSS keyframes on element creation — no JS needed for those.
function snapshot(state) {
  const witnessed = new Set();
  const integrated = new Set();
  for (const m of memories) {
    const slot = state.memories?.[m.id];
    if (slot?.echoWitnessed) witnessed.add(m.id);
    if (slot?.state === "integrated") integrated.add(m.id);
  }
  return { witnessed, integrated, confronting: state.ui.view === "final", completed: Boolean(state.final?.completed) };
}

function runCeremony(prev, next, mode) {
  if (typeof document === "undefined") return;
  const host = document.querySelector(".mg-stage9");
  if (!host) return;
  const newWitness = [...next.witnessed].filter((id) => !prev.witnessed.has(id));
  const newIntegrate = [...next.integrated].filter((id) => !prev.integrated.has(id));

  for (const id of newWitness) {
    const el = host.querySelector(`.mg-stage9__echo`) || host.querySelector(`[data-memory-card="${id}"]`);
    if (el) flash(el, "good");
  }
  if (newWitness.length) banner(host, "Echo witnessed");

  for (const id of newIntegrate) {
    const el = host.querySelector(`.mg-stage9__memory`) || host.querySelector(`[data-memory-card="${id}"]`);
    if (el) flash(el, "good");
    const restored = host.querySelector(".mg-stage9__restored strong");
    if (restored) flash(restored, "good");
  }
  if (newIntegrate.length) banner(host, "Memory integrated");

  if (next.completed && !prev.completed) banner(host, "Awakening");
}

// ── memory-body clicks (resolve / open-echo / integrate) ─────────────────────────────────────────
function handleMemoryClicks(event, ctx, repaint) {
  const { state } = ctx;
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
  const opts = { source: "stage9" };
  if (ECHO_MIME[ext]) opts.mime = ECHO_MIME[ext];
  if (ctx.viewer && typeof ctx.viewer.openFile === "function") ctx.viewer.openFile(path, opts);
  else if (ctx.viewer && typeof ctx.viewer.openViewerFile === "function") ctx.viewer.openViewerFile(path, opts);
}

// SEARCH echo (syntax): a SECOND, distinct affordance — opening is step one, but the witness only
// fires when the player asks the precise question. Drives the real searchViewerFile feature (same
// metagame-bridge call stage 7 uses); the un-cheat lives server-side in recordStage9EchoSearch
// (query + matched-line token must both check out). A bare open never triggers this.
function searchEcho(ctx, id) {
  const path = echoFileFor(id);
  const spec = echoVerb(id);
  if (!path || spec.verb !== "search") return;
  const v = ctx.viewer;
  if (v && typeof v.searchViewerFile === "function") v.searchViewerFile(path, spec.query, { source: "stage9" });
  else if (v && typeof v.searchFile === "function") v.searchFile(path, spec.query, { source: "stage9" });
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
  window.__fvStage9 = {
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
    // resolveAll / integrateAll drive the real engine functions so the screenshot/smoke tools can
    // actually REACH the confrontation (which needs resolved memories, not just witnessed echoes).
    resolveAll() {
      for (const m of memories) resolveMemory({ state, memoryId: m.id, choice: state.memories[m.id].choice || m.choices[0], actions: ctx.actions, achievements: ctx.achievements, bell: ctx.bell });
      paint();
      return getMemoryCounts(state);
    },
    integrateAll() {
      for (const m of memories) witnessEcho({ state, memoryId: m.id });
      this.resolveAll();
      for (const m of memories) integrateMemory({ state, memoryId: m.id, achievements: ctx.achievements, bell: ctx.bell });
      paint();
      return getMemoryCounts(state);
    },
    confront: {
      start() { state.ui.view = "final"; state.ui.detail = false; startConfront(state); paint(); return getConfrontState(state, save()); },
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
