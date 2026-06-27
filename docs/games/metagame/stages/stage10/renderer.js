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
import { renderStepper } from "./renderer-memory.js";
import { renderCompletion, renderFinalQuestion } from "./renderer-final.js";

const LAST = memories.length - 1;

export function renderStage10(ctx) {
  const { host, state } = ctx;
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
      body = renderFinalQuestion(finalState);
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
    const readButton = event.target.closest("[data-read-memory]");
    if (readButton) {
      markMemoryRead({ state, memoryId: readButton.dataset.readMemory });
      saveAndPaint(ctx, repaint);
      return;
    }

    const resolveButton = event.target.closest("[data-resolve-memory]");
    if (resolveButton) {
      resolveMemory({
        state,
        memoryId: resolveButton.dataset.resolveMemory,
        choice: resolveButton.dataset.choice,
        actions: ctx.actions,
        achievements: ctx.achievements,
        bell: ctx.bell
      });
      saveAndPaint(ctx, repaint);
      return;
    }

    const echoButton = event.target.closest("[data-open-echo]");
    if (echoButton) {
      openEcho(ctx, echoButton.dataset.openEcho);
      saveAndPaint(ctx, repaint);
      return;
    }

    const integrateButton = event.target.closest("[data-integrate-memory]");
    if (integrateButton) {
      integrateMemory({
        state,
        memoryId: integrateButton.dataset.integrateMemory,
        achievements: ctx.achievements,
        bell: ctx.bell
      });
      saveAndPaint(ctx, repaint);
      return;
    }

    const stepButton = event.target.closest("[data-step]");
    if (stepButton) {
      const delta = Number(stepButton.dataset.step);
      state.ui.cursor = Math.min(Math.max(state.ui.cursor + delta, 0), LAST);
      saveAndPaint(ctx, repaint);
      return;
    }

    if (event.target.closest("[data-goto-final]")) {
      state.ui.view = "final";
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
      chooseFinal({ state, choiceId: finalButton.dataset.finalChoice, onStageComplete: ctx.onStageComplete });
      saveAndPaint(ctx, repaint);
    }
  };

  host.addEventListener("click", onClick);
  repaint();

  // TEST/DEBUG hook (not a player affordance): witnesses echoes deterministically for the smoke. Not a
  // bypass — it sets the SAME echoWitnessed flag the real "open echo in viewer" file-open sets.
  window.__fvStage10 = {
    state: () => state,
    witness(id) { const r = witnessEcho({ state, memoryId: id }); saveAndPaint(ctx, repaint); return r; },
    witnessAll() { for (const m of memories) witnessEcho({ state, memoryId: m.id }); saveAndPaint(ctx, repaint); return getEchoCounts(state).witnessed; }
  };

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

function openEcho(ctx, id) {
  const path = echoFileFor(id);
  if (!path) return;
  if (ctx.viewer && typeof ctx.viewer.openFile === "function") ctx.viewer.openFile(path, { source: "stage10", mime: "text/plain" });
  else if (ctx.viewer && typeof ctx.viewer.openViewerFile === "function") ctx.viewer.openViewerFile(path);
}

function saveAndPaint(ctx, repaint) {
  if (typeof ctx.save === "function") ctx.save();
  repaint();
}
