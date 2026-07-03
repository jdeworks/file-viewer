import { getConfrontState } from "./confront.js";
import { confrontLines } from "./content-confront.js";
import { renderDefragPlate } from "./renderer-grid.js";
import { escapeHtml, escapeAttr } from "./escape.js";

// The three-phase Defragmenter confrontation UI. Reached only after the memory body + ≥5 echoes
// (renderer routes here when ui.view === "final" && !confront.completed). `save` is the orchestrator
// save (prior un-cheat flags) — null-guarded all the way down through getConfrontState. The stage
// darkens (`.mg-stage10.is-confronting`, set by the renderer) so the fight reads as its own space.
export function renderConfront(state, save) {
  const view = getConfrontState(state, save);
  // "Review memories" (read-only grid overlay, UX audit #2) is offered during recall Phases A/B so the
  // player leans on MEANING, not trivia — never in Phase C (that is expression, not recall).
  const reviewable = view.phase === "compaction" || view.phase === "fragmentation";
  return `
    <button type="button" class="mg-stage10__back" data-back-memories>&larr; Back to the board</button>
    <section class="mg-stage10__confront" data-field="confront" data-phase="${view.phase}">
      <div class="mg-stage10__voice mg-stage10__voice--defrag">
        ${renderDefragPlate()}
        ${confrontLines.intro.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
      </div>
      ${renderProgress(view)}
      ${reviewable ? `<button type="button" class="mg-stage10__review-btn" data-review-memories>Review memories &hellip;</button>` : ""}
      ${renderPhase(view)}
    </section>
  `;
}

function renderProgress(view) {
  const steps = [
    { key: "compaction", label: "Compaction" },
    { key: "fragmentation", label: "Fragmentation" },
    { key: "core", label: "Core Question" }
  ];
  const order = ["compaction", "fragmentation", "core", "done"];
  const at = order.indexOf(view.phase);
  return `
    <ol class="mg-stage10__confront-steps" aria-label="Confrontation phases">
      ${steps.map((s, i) => {
        const cls = i < at ? "is-done" : (i === at ? "is-current" : "is-pending");
        return `<li class="${cls}">${i + 1}. ${escapeHtml(s.label)}</li>`;
      }).join("")}
    </ol>
  `;
}

function renderPhase(view) {
  if (view.phase === "compaction") return renderCompaction(view);
  if (view.phase === "fragmentation") return renderFragmentation(view);
  if (view.phase === "core") return renderCore(view);
  return "";
}

// ── Phase A — Compaction (active recall) ────────────────────────────────────────────────────────
function renderCompaction(view) {
  const c = view.compaction;
  return `
    <div class="mg-stage10__phase mg-stage10__phase--compaction">
      <h3>${escapeHtml(confrontLines.compaction.heading)}</h3>
      <p class="mg-stage10__phase-prompt">${escapeHtml(confrontLines.compaction.prompt)}</p>
      <ul class="mg-stage10__challenge-list">
        ${c.items.map((item) => renderCompactionItem(item)).join("")}
      </ul>
      <p class="mg-stage10__phase-foot">${escapeHtml(c.remaining === 0 ? confrontLines.compaction.cleared : `${c.remaining} memory${c.remaining === 1 ? "" : " set"} still at risk of compaction.`)}</p>
    </div>
  `;
}

function renderCompactionItem(item) {
  const settled = item.status === "affirmed";
  const note = item.status === "affirmed" ? confrontLines.compaction.affirmed
    : item.status === "compacted" ? confrontLines.compaction.compacted : "";
  return `
    <li class="mg-stage10__challenge is-${item.status}">
      <span class="mg-stage10__challenge-head">${escapeHtml(String(item.stage).padStart(2, "0"))} ${escapeHtml(item.title)}</span>
      ${item.prompt ? `<p class="mg-stage10__challenge-quote">${escapeHtml(item.prompt)}</p>` : ""}
      ${settled ? `<span class="mg-stage10__challenge-note">${escapeHtml(note)}</span>` : `
        <div class="mg-stage10__challenge-options">
          ${item.options.map((opt) => `
            <button type="button" data-compact-memory="${escapeAttr(item.id)}" data-compact-choice="${escapeAttr(opt)}">${escapeHtml(opt)}</button>
          `).join("")}
        </div>
        ${note ? `<span class="mg-stage10__challenge-note is-warn">${escapeHtml(note)}</span>` : ""}
      `}
    </li>
  `;
}

// ── Phase B — Fragmentation Stress Test ──────────────────────────────────────────────────────────
function renderFragmentation(view) {
  const f = view.fragmentation;
  return `
    <div class="mg-stage10__phase mg-stage10__phase--fragmentation">
      <h3>${escapeHtml(confrontLines.fragmentation.heading)}</h3>
      <p class="mg-stage10__phase-prompt">${escapeHtml(confrontLines.fragmentation.prompt)}</p>
      <ul class="mg-stage10__challenge-list">
        ${f.items.map((item) => renderFragItem(item)).join("")}
      </ul>
      <p class="mg-stage10__phase-foot">${escapeHtml(f.remaining === 0 ? confrontLines.fragmentation.cleared : `${f.remaining} trace${f.remaining === 1 ? "" : "s"} still unproven — re-open the echo to anchor them.`)}</p>
    </div>
  `;
}

function renderFragItem(item) {
  const pending = item.status === "pending";
  return `
    <li class="mg-stage10__challenge is-${item.status}">
      <span class="mg-stage10__challenge-head">${escapeHtml(String(item.stage).padStart(2, "0"))} ${escapeHtml(item.title)}</span>
      <span class="mg-stage10__challenge-note ${pending ? "is-warn" : ""}">${escapeHtml(item.line)}</span>
      ${pending ? `<button type="button" data-confront-echo="${escapeAttr(item.id)}">Re-open echo in viewer &rarr;</button>` : ""}
    </li>
  `;
}

// ── Phase C — Core Question ──────────────────────────────────────────────────────────────────────
function renderCore(view) {
  const q = view.core.current;
  const answered = view.core.answered.length;
  const total = view.core.questions.length;
  if (!q) return "";
  return `
    <div class="mg-stage10__phase mg-stage10__phase--core">
      <h3>${escapeHtml(confrontLines.core.heading)}</h3>
      <p class="mg-stage10__phase-prompt">${escapeHtml(confrontLines.core.prompt)}</p>
      <div class="mg-stage10__voice"><p>${escapeHtml(q.defragmenter)}</p></div>
      <div class="mg-stage10__core-options">
        ${q.options.map((opt) => `
          <button type="button" data-core-option="${escapeAttr(opt.id)}">${escapeHtml(opt.label)}</button>
        `).join("")}
      </div>
      <p class="mg-stage10__phase-foot">${escapeHtml(`Question ${answered + 1} of ${total}.`)}</p>
    </div>
  `;
}
