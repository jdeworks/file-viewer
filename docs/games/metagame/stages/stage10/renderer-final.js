import { awakeningText } from "./content.js";
import { assembleSynthesis } from "./synthesis.js";
import { assembleCapstoneData } from "./capstone.js";
import { escapeHtml } from "./escape.js";

// ── Final question + completion ────────────────────────────────────────────────────────────────

export function renderFinalQuestion(finalState) {
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
            ${choice.disabled && Number(choice.echoRequired || 0) > finalState.gate.echoCount
              ? `<em class="mg-stage10__echo-req">Requires ${choice.echoRequired} echoes witnessed</em>` : ""}
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

export function renderCompletion(state, finalState) {
  return `
    <section class="mg-stage10__final">
      <div class="mg-stage10__voice">
        ${finalState.defragmenter.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
      </div>
      ${renderFinalOutcome(state, finalState)}
      ${renderRouteEpilogue(state, finalState)}
      ${renderAwakening(finalState)}
    </section>
  `;
}

// Route-specific epilogue panels with real weight: understand → woven Synthesis memory (+ stance
// closer), expand → personalized capstone grid of all nine stages/choices. continue/rest get none.
function renderRouteEpilogue(state, finalState) {
  const route = state.final?.route;
  if (route === "understand") return renderSynthesis(state);
  if (route === "expand") return renderCapstone(state);
  return "";
}

function renderSynthesis(state) {
  const syn = assembleSynthesis(state);
  const label = syn.stanceLabel ? ` — ${syn.stanceLabel}` : "";
  return `
    <section class="mg-stage10__synthesis" data-field="synthesis" aria-label="Synthesis memory">
      <h3>Synthesis${escapeHtml(label)}</h3>
      <div class="mg-stage10__synthesis-text">
        ${syn.text.split("\n\n").map((p) => `<p>${escapeHtml(p)}</p>`).join("")}
      </div>
    </section>
  `;
}

function renderCapstone(state) {
  const cap = assembleCapstoneData(state);
  const label = cap.stanceLabel ? ` (${cap.stanceLabel})` : "";
  return `
    <section class="mg-stage10__capstone" data-field="capstone" aria-label="Assembled record">
      <h3>The assembled record${escapeHtml(label)}</h3>
      <div class="mg-stage10__capstone-grid">
        ${cap.tiles.map((t) => `
          <div class="mg-stage10__capstone-tile ${t.integrated ? "is-integrated" : ""}" style="--tile-accent: ${t.accent}">
            <span class="mg-stage10__capstone-stage">${escapeHtml(String(t.stage).padStart(2, "0"))} ${escapeHtml(t.title)}</span>
            <span class="mg-stage10__capstone-choice">${escapeHtml(t.choice || "—")}</span>
          </div>
        `).join("")}
      </div>
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
