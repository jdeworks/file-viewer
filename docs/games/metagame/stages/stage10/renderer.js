import { memories } from "./content.js";
import {
  chooseFinal,
  getFinalChoiceState,
  getMemoryCounts,
  integrateMemory,
  markMemoryRead,
  resolveMemory
} from "./boss.js";

export function renderStage10(ctx) {
  const { host, state } = ctx;
  let destroyed = false;

  const repaint = () => {
    if (destroyed) return;
    const counts = getMemoryCounts(state);
    const finalState = getFinalChoiceState(state);
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
        ${renderAssemblyStatus(finalState.routeSummary, finalState.locked)}
        <div class="mg-stage10__grid">
          ${memories.map((memory) => renderMemory(memory, state.memories[memory.id])).join("")}
        </div>
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
          ${renderFinalOutcome(state, finalState)}
        </section>
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

function renderAssemblyStatus(summary, locked) {
  return `
    <section class="mg-stage10__assembly" aria-label="Memory assembly status">
      <p>${escapeHtml(locked ? "The archive is still taking shape." : summary.headline)}</p>
      <p>${escapeHtml(locked
        ? "Five resolved memories are needed before the Defragmenter can ask its final question."
        : summary.detail)}</p>
      <p>${escapeHtml(`${summary.countsText} ${summary.remainingText}`)}</p>
    </section>
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

function renderMemory(memory, slot) {
  const resolved = ["resolved", "integrated"].includes(slot.state);
  const integrated = slot.state === "integrated";
  return `
    <article class="mg-stage10__memory" style="--memory-accent: ${memory.accent}">
      <header>
        <span>${String(memory.stage).padStart(2, "0")}</span>
        <h3>${escapeHtml(memory.title)}</h3>
      </header>
      <p class="mg-stage10__file">${escapeHtml(memory.file)}</p>
      <p class="mg-stage10__memory-state">${escapeHtml(getMemoryStateText(memory, slot))}</p>
      <p>${escapeHtml(memory.prompt)}</p>
      <div class="mg-stage10__memory-actions">
        <button type="button" data-read-memory="${memory.id}" ${slot.state !== "unread" ? "disabled" : ""}>Read</button>
        ${memory.choices.map((choice) => `
          <button type="button" data-resolve-memory="${memory.id}" data-choice="${escapeAttr(choice)}">
            ${escapeHtml(choice)}
          </button>
        `).join("")}
        <button type="button" data-integrate-memory="${memory.id}" ${resolved && !integrated ? "" : "disabled"}>
          Integrate
        </button>
      </div>
      <footer>${escapeHtml(getMemoryFooter(memory, slot, integrated))}</footer>
    </article>
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
