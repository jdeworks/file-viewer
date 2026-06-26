import { memories, awakeningText } from "./content.js";
import {
  chooseFinal,
  getFinalChoiceState,
  getMemoryCounts,
  integrateMemory,
  markMemoryRead,
  resolveMemory
} from "./boss.js";

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

  return {
    repaint,
    destroy() {
      destroyed = true;
      host.removeEventListener("click", onClick);
      host.innerHTML = "";
    }
  };
}

// ── Memory stepper (one memory at a time) ──────────────────────────────────────────────────────

function renderStepper(state, counts, finalState) {
  const cursor = state.ui.cursor;
  const memory = memories[cursor];
  const slot = state.memories[memory.id];
  return `
    ${renderProgress(state, cursor)}
    ${renderMemory(memory, slot)}
    <nav class="mg-stage10__nav" aria-label="Memory navigation">
      <button type="button" data-step="-1" ${cursor === 0 ? "disabled" : ""}>&larr; Previous</button>
      <button type="button" data-step="1" ${cursor === LAST ? "disabled" : ""}>Next &rarr;</button>
    </nav>
    ${renderAssembly(finalState, counts)}
  `;
}

function renderProgress(state, cursor) {
  const dots = memories.map((memory, index) => {
    const slot = state.memories[memory.id];
    const cls = ["mg-stage10__dot", `is-${slot.state}`, index === cursor ? "is-current" : ""]
      .filter(Boolean)
      .join(" ");
    return `<span class="${cls}" style="--memory-accent: ${memory.accent}" title="${escapeAttr(`${memory.stage}. ${memory.title}`)}"></span>`;
  }).join("");
  return `
    <div class="mg-stage10__progress">
      <p class="mg-stage10__progress-label">Memory ${cursor + 1} of ${memories.length}</p>
      <div class="mg-stage10__dots" aria-hidden="true">${dots}</div>
    </div>
  `;
}

function renderMemory(memory, slot) {
  const resolved = ["resolved", "integrated"].includes(slot.state);
  const integrated = slot.state === "integrated";
  return `
    <article class="mg-stage10__memory mg-stage10__memory--solo" style="--memory-accent: ${memory.accent}">
      <header>
        <span>${String(memory.stage).padStart(2, "0")}</span>
        <h3>${escapeHtml(memory.title)}</h3>
      </header>
      <p class="mg-stage10__file">${escapeHtml(memory.file)}</p>
      <p class="mg-stage10__prompt">${escapeHtml(memory.prompt)}</p>
      <p class="mg-stage10__memory-state">${escapeHtml(getMemoryStateText(memory, slot))}</p>
      <div class="mg-stage10__memory-actions">
        ${renderMemoryActions(memory, slot, resolved, integrated)}
      </div>
      <footer>${escapeHtml(getMemoryFooter(memory, slot, integrated))}</footer>
    </article>
  `;
}

// Reveal the interaction appropriate to the memory's current state, one step at a time:
// unread -> Read; read -> pick a stance; resolved -> Integrate; integrated -> nothing left.
function renderMemoryActions(memory, slot, resolved, integrated) {
  if (slot.state === "unread") {
    return `<button type="button" data-read-memory="${memory.id}">Read this memory</button>`;
  }
  if (slot.state === "read") {
    return `
      <p class="mg-stage10__ask">How did it feel?</p>
      ${memory.choices.map((choice) => `
        <button type="button" data-resolve-memory="${memory.id}" data-choice="${escapeAttr(choice)}">
          ${escapeHtml(choice)}
        </button>
      `).join("")}
    `;
  }
  if (resolved && !integrated) {
    return `<button type="button" data-integrate-memory="${memory.id}">Integrate this memory</button>`;
  }
  return `<p class="mg-stage10__settled">This memory is part of you now.</p>`;
}

function renderAssembly(finalState, counts) {
  const summary = finalState.routeSummary;
  const locked = finalState.locked;
  return `
    <section class="mg-stage10__assembly" aria-label="Memory assembly status">
      <p>${escapeHtml(locked ? "The archive is still taking shape." : summary.headline)}</p>
      <p>${escapeHtml(locked
        ? `Resolve ${5 - counts.resolved} more ${5 - counts.resolved === 1 ? "memory" : "memories"} before the Defragmenter can ask its final question.`
        : summary.detail)}</p>
      <p>${escapeHtml(`${summary.countsText} ${summary.remainingText}`)}</p>
      ${locked ? "" : `<button type="button" class="mg-stage10__cta" data-goto-final>Answer the final question &rarr;</button>`}
    </section>
  `;
}

// ── Final question + completion ────────────────────────────────────────────────────────────────

function renderFinalQuestion(finalState) {
  return `
    <button type="button" class="mg-stage10__back" data-back-memories>&larr; Back to the memories</button>
    <section class="mg-stage10__final">
      <div class="mg-stage10__voice">
        ${finalState.defragmenter.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
      </div>
      <div class="mg-stage10__choices" aria-label="Final choices">
        ${finalState.choices.map((choice) => `
          <button type="button" data-final-choice="${choice.id}" ${choice.disabled ? "disabled" : ""}>
            <span>${escapeHtml(choice.label)}</span>
            ${escapeHtml(choice.text)}
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function renderCompletion(state, finalState) {
  return `
    <section class="mg-stage10__final">
      <div class="mg-stage10__voice">
        ${finalState.defragmenter.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
      </div>
      ${renderFinalOutcome(state, finalState)}
      ${renderAwakening(finalState)}
    </section>
  `;
}

// The ending narration — the awakening itself, in the first person. Capstone routes get the extra
// line. Previously authored (content.awakeningText) but never rendered; this is the finale screen.
function renderAwakening(finalState) {
  const fullCapstone = finalState.routeSummary?.tier === "capstone";
  const paragraphs = awakeningText({ fullCapstone }).split("\n\n");
  return `
    <div class="mg-stage10__awakening" data-field="awakening">
      ${paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}
    </div>
  `;
}

function renderFinalOutcome(state, finalState) {
  if (!state.final?.completed) return "";
  const summary = finalState.routeSummary;
  return `
    <aside class="mg-stage10__outcome" data-field="finalOutcome">
      <strong>${escapeHtml(state.final.choice)}</strong>
      <span>${escapeHtml(summary.label)}</span>
      <p>${escapeHtml(summary.finalChoiceText)}</p>
      <p>${escapeHtml(summary.detail)}</p>
      <p>${escapeHtml(summary.countsText)}</p>
      <p>${escapeHtml(summary.integratedText)}</p>
      <ol class="mg-stage10__route-lines">
        ${summary.memoryLines.map((line) => `
          <li>
            <span>${escapeHtml(String(line.stage).padStart(2, "0"))} ${escapeHtml(line.title)}</span>
            ${escapeHtml(line.text)}
          </li>
        `).join("")}
      </ol>
    </aside>
  `;
}

function getMemoryStateText(memory, slot) {
  if (slot.state === "integrated") return memory.integratedText;
  if (slot.state === "resolved") return memory.reflections?.[slot.choice] || memory.resolvedText;
  if (slot.state === "read") return memory.readText;
  return memory.unreadText;
}

function getMemoryFooter(memory, slot, integrated) {
  const status = integrated ? "integrated" : slot.state;
  if (!slot.choice) return `${status} - echo: ${memory.echo}`;
  return `${status} - answered: ${slot.choice}`;
}

function saveAndPaint(ctx, repaint) {
  if (typeof ctx.save === "function") ctx.save();
  repaint();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value);
}
