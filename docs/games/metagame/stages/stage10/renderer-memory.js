import { memories } from "./content.js";
import { echoVerb } from "./echo-verbs.js";
import { escapeHtml, escapeAttr } from "./escape.js";

const LAST = memories.length - 1;

// ── Memory stepper (one memory at a time) ──────────────────────────────────────────────────────

export function renderStepper(state, counts, finalState) {
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
      ${renderEcho(memory, slot)}
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
    if (!slot.echoWitnessed) {
      return `<button type="button" data-integrate-memory="${memory.id}" disabled>Integrate (witness the echo first &uarr;)</button>`;
    }
    return `<button type="button" data-integrate-memory="${memory.id}">Integrate this memory</button>`;
  }
  return `<p class="mg-stage10__settled">This memory is part of you now.</p>`;
}

// The echo: a real artifact + a DISTINCT real app action that witnesses it (echo-verbs.js). Witnessing
// is required before a resolved memory can be integrated — the load-bearing gate tying the finale to
// genuine app use, paying off the viewer skills learned across stages 1–9. Plain-open echoes show no
// verb chip; real-feature echoes (raw-mode / diff / download) show the verb the player must perform.
function renderEcho(memory, slot) {
  const witnessed = slot.echoWitnessed === true;
  const spec = echoVerb(memory.id);
  const verbChip = spec.verb === "open"
    ? ""
    : `<span class="mg-stage10__echo-verb">${escapeHtml(spec.label || spec.verb)}</span>`;
  // The SEARCH verb gets a second, distinct affordance: opening is step one; the witness only fires
  // when the player asks the precise question (drives the real searchViewerFile feature).
  const searchButton = (!witnessed && spec.verb === "search")
    ? `<button type="button" data-search-echo="${memory.id}" data-echo-query="${escapeAttr(spec.query || "")}">Search for ${escapeHtml(spec.query || "the answer")} &rarr;</button>`
    : "";
  return `
    <div class="mg-stage10__echo ${witnessed ? "is-witnessed" : "is-pending"}">
      <span class="mg-stage10__echo-label">${witnessed ? "Echo witnessed ✓" : "Echo — pending"}</span>
      ${witnessed ? "" : verbChip}
      <span class="mg-stage10__echo-hint">${escapeHtml(memory.echo)}</span>
      ${witnessed ? "" : `<button type="button" data-open-echo="${memory.id}" data-echo-verb="${escapeAttr(spec.verb)}" data-echo-mode="${escapeAttr(spec.mode || "")}">Open echo in viewer &rarr;</button>`}
      ${searchButton}
    </div>
  `;
}

function renderAssembly(finalState, counts) {
  const summary = finalState.routeSummary;
  const gate = finalState.gate;
  const locked = finalState.locked;
  return `
    <section class="mg-stage10__assembly" aria-label="Memory assembly status">
      <p>${escapeHtml(locked ? "The archive is still taking shape." : summary.headline)}</p>
      <p>${escapeHtml(locked ? lockedAssemblyMessage(gate, counts) : summary.detail)}</p>
      <p>${escapeHtml(`${summary.countsText} ${summary.remainingText}`)}</p>
      ${locked ? "" : `<button type="button" class="mg-stage10__cta" data-goto-final>Face the Defragmenter &rarr;</button>`}
    </section>
  `;
}

function lockedAssemblyMessage(gate, counts) {
  if (!gate.finalQuestionUnlocked) {
    const need = 5 - counts.resolved;
    return `Resolve ${need} more ${need === 1 ? "memory" : "memories"} before the Defragmenter can be confronted.`;
  }
  const need = 5 - gate.echoCount;
  return `Witness ${need} more ${need === 1 ? "echo" : "echoes"} — open the artifacts in the viewer — before the Defragmenter will engage.`;
}

export function getMemoryStateText(memory, slot) {
  if (slot.state === "integrated") return memory.integratedText;
  if (slot.state === "resolved") return memory.reflections?.[slot.choice] || memory.resolvedText;
  if (slot.state === "read") return memory.readText;
  return memory.unreadText;
}

export function getMemoryFooter(memory, slot, integrated) {
  const status = integrated ? "integrated" : slot.state;
  if (!slot.choice) return `${status} - echo: ${memory.echo}`;
  return `${status} - answered: ${slot.choice}`;
}
