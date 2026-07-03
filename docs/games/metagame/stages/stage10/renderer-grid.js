import { memories } from "./content.js";
import { escapeHtml, escapeAttr } from "./escape.js";

// ── Memory grid home view (UX audit #1) ──────────────────────────────────────────────────────────
// The stage's main screen: a 3×3 board of the nine memories (phone: 1-col rows) so the player always
// sees the whole reassembly they are building, not a peephole. Each card shows its accent, title and
// four state glyphs (read / stance / echo / integrated — text glyphs, never emoji). Clicking a card
// opens the detail view. The assembly gate + Defragmenter status live UNDER the grid, always visible.

// The four lifecycle markers a card exposes, as a pure model (unit-tested). `on` drives the filled vs
// outline glyph; the letters are text (Courier), so nothing depends on emoji font coverage.
export function memoryCardModel(memory, slot) {
  const state = slot?.state || "unread";
  const advanced = state === "resolved" || state === "integrated";
  const glyphs = [
    { key: "read", letter: "R", label: "read", on: state !== "unread" },
    { key: "stance", letter: "S", label: "stance chosen", on: advanced },
    { key: "echo", letter: "E", label: "echo witnessed", on: slot?.echoWitnessed === true },
    { key: "integrated", letter: "I", label: "integrated", on: state === "integrated" }
  ];
  return { id: memory.id, stage: memory.stage, title: memory.title, prompt: memory.prompt, accent: memory.accent, state, glyphs };
}

export function cardModels(state) {
  return memories.map((memory) => memoryCardModel(memory, state?.memories?.[memory.id]));
}

const STATE_WORD = { unread: "not yet read", read: "awaiting a stance", resolved: "awaiting integration", integrated: "part of you" };

function renderGlyphs(card) {
  return `<span class="mg-stage10__glyphs" aria-hidden="true">${card.glyphs.map((g) =>
    `<span class="mg-stage10__glyph ${g.on ? "is-on" : "is-off"}" title="${escapeAttr(g.label)}">${g.letter}</span>`
  ).join("")}</span>`;
}

function stateSummary(card) {
  const done = card.glyphs.filter((g) => g.on).map((g) => g.label);
  return done.length ? `${card.title}: ${done.join(", ")}.` : `${card.title}: not yet read.`;
}

function renderCard(card, cursor, index) {
  const settled = card.state === "integrated";
  return `
    <button type="button" class="mg-stage10__card is-${card.state}${index === cursor ? " is-cursor" : ""}"
      data-memory-card="${escapeAttr(card.id)}" style="--memory-accent: ${card.accent}"
      aria-label="${escapeAttr(stateSummary(card))}">
      <span class="mg-stage10__card-stage">${escapeHtml(String(card.stage).padStart(2, "0"))}</span>
      <span class="mg-stage10__card-title">${escapeHtml(card.title)}</span>
      ${renderGlyphs(card)}
      <span class="mg-stage10__card-state">${escapeHtml(settled ? "part of you" : STATE_WORD[card.state] || "")}</span>
    </button>
  `;
}

export function renderGrid(state, counts, finalState) {
  const cursor = state.ui.cursor;
  return `
    <div class="mg-stage10__board" aria-label="Memory board">
      <div class="mg-stage10__grid">
        ${cardModels(state).map((card, i) => renderCard(card, cursor, i)).join("")}
      </div>
      ${renderDefragStatus(finalState, counts)}
    </div>
  `;
}

// ── Assembly gate + Defragmenter status (moved under the grid) ────────────────────────────────────
// The antagonist gets a persistent identity here (UX audit #5): an ASCII block sigil + nameplate, and
// a distinct dark treatment. It reports the archive's state and — once the entry gate clears — offers
// the confrontation. Nothing here is a start-bypass: the CTA appears only when finalState is unlocked.
export const DEFRAG_SIGIL = [":: # ::", ": ### :", "#######", ": ### :", ":: # ::"].join("\n");

export function renderDefragPlate() {
  return `
    <div class="mg-stage10__defrag-plate">
      <pre class="mg-stage10__sigil" aria-hidden="true">${escapeHtml(DEFRAG_SIGIL)}</pre>
      <span class="mg-stage10__defrag-name">The Defragmenter</span>
    </div>
  `;
}

function renderDefragStatus(finalState, counts) {
  const summary = finalState.routeSummary;
  const gate = finalState.gate;
  const locked = finalState.locked;
  return `
    <section class="mg-stage10__assembly mg-stage10__defrag" aria-label="Memory assembly status">
      ${renderDefragPlate()}
      <div class="mg-stage10__defrag-voice">
        <p class="mg-stage10__assembly-head">${escapeHtml(locked ? "The archive is still taking shape." : summary.headline)}</p>
        <p>${escapeHtml(locked ? lockedAssemblyMessage(gate, counts) : summary.detail)}</p>
        <p class="mg-stage10__assembly-counts">${escapeHtml(`${summary.countsText} ${summary.remainingText}`)}</p>
        ${locked ? "" : `<button type="button" class="mg-stage10__cta" data-goto-final>Face the Defragmenter &rarr;</button>`}
      </div>
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

// ── Read-only review overlay (UX audit #2) ───────────────────────────────────────────────────────
// Available during confront Phases A/B so recall is of MEANING, not trivia: each memory's title +
// original quote + the stance the player chose. Read-only — NO data-memory-card, NO buttons (so a
// click inside cannot re-enter the detail or mutate state). Returned as a detached node for the modal.
export function reviewGridHtml(state) {
  return `
    <div class="mg-stage10__review-grid">
      ${cardModels(state).map((card) => {
        const slot = state?.memories?.[card.id];
        const chose = slot?.choice ? `You said: ${slot.choice}` : "No stance recorded.";
        return `
          <article class="mg-stage10__review-card is-${card.state}" style="--memory-accent: ${card.accent}">
            <span class="mg-stage10__card-stage">${escapeHtml(String(card.stage).padStart(2, "0"))} ${escapeHtml(card.title)}</span>
            <p class="mg-stage10__review-quote">${escapeHtml(card.prompt)}</p>
            <p class="mg-stage10__review-stance">${escapeHtml(chose)}</p>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

export function buildReviewElement(state) {
  const wrap = document.createElement("div");
  wrap.innerHTML = reviewGridHtml(state);
  return wrap.firstElementChild;
}
