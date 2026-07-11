import { awakeningText } from "./content.js";
import { assembleSynthesis } from "./synthesis.js";
import { assembleCapstoneData } from "./capstone.js";
import { routeEpilogues } from "./content-confront.js";
import { renderDefragPlate } from "./renderer-grid.js";
import { escapeHtml, escapeAttr } from "./escape.js";

// ── Final question + completion ────────────────────────────────────────────────────────────────

export function renderFinalQuestion(finalState) {
  return `
    <button type="button" class="mg-stage9__back" data-back-memories>&larr; Back to the board</button>
    <section class="mg-stage9__final">
      <div class="mg-stage9__voice mg-stage9__voice--defrag">
        ${renderDefragPlate()}
        ${finalState.defragmenter.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
      </div>
      <div class="mg-stage9__choices" aria-label="Final choices">
        ${finalState.choices.map((choice) => `
          <button type="button" data-final-choice="${choice.id}" ${choice.disabled ? "disabled" : ""}>
            <span>${escapeHtml(choice.label)}</span>
            ${escapeHtml(choice.text)}
            ${choice.disabled && Number(choice.echoRequired || 0) > finalState.gate.echoCount
              ? `<em class="mg-stage9__echo-req">Requires ${choice.echoRequired} echoes witnessed</em>` : ""}
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

// ── Completion (staged reveal, UX audit #3) ──────────────────────────────────────────────────────
// The ending is revealed one beat at a time by the renderer's reveal state machine (reveal.js): each
// beat block gets `is-shown` only once revealed. Under reduced motion the reveal starts complete, so
// everything is shown at once. A click anywhere skips to the end. The FULL text is always in the DOM
// (only opacity/transform differ) so completion assertions still read every paragraph.

// The ordered list of beat HTML strings for the current route — pure, so the renderer can size the
// reveal to exactly this many beats and both stay in lock-step.
export function completionBeats(state, finalState) {
  const beats = [];
  beats.push(renderVoice(finalState));
  const outcome = renderFinalOutcome(state, finalState);
  if (outcome) beats.push(outcome);
  beats.push(...routeEpilogueBeats(state));
  beats.push(renderAwakening(finalState));
  return beats;
}

function renderAwakening(finalState) {
  const fullCapstone = finalState.routeSummary?.tier === "capstone";
  const paragraphs = awakeningText({ fullCapstone }).split("\n\n");
  return `
    <div class="mg-stage9__awakening" data-field="awakening">
      ${paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}
    </div>
  `;
}

export function renderCompletion(state, finalState, reveal) {
  const beats = completionBeats(state, finalState);
  const shows = reveal ? (i) => reveal.shows(i) : () => true;
  const complete = reveal ? reveal.done : true;
  return `
    <section class="mg-stage9__final mg-stage9__final--staged ${complete ? "is-complete" : ""}"
      data-field="completion" data-reveal-done="${complete ? "1" : "0"}">
      ${!complete ? `<button type="button" class="mg-stage9__skip" data-skip-reveal>Skip &rsaquo;&rsaquo;</button>` : ""}
      ${beats.map((html, i) => `
        <div class="mg-stage9__beat ${shows(i) ? "is-shown" : ""}" data-reveal-index="${i}">${html}</div>
      `).join("")}
    </section>
  `;
}

function renderVoice(finalState) {
  return `
    <div class="mg-stage9__voice mg-stage9__voice--defrag">
      ${renderDefragPlate()}
      ${finalState.defragmenter.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
    </div>
  `;
}

// Route-specific epilogue beats: understand → one beat per woven-Synthesis paragraph; expand →
// heading beat + one beat per capstone tile (tiles light up one stage at a time); continue/rest →
// one beat per stance-flavored closer line.
function routeEpilogueBeats(state) {
  const route = state.final?.route;
  if (route === "understand") return synthesisBeats(state);
  if (route === "expand") return capstoneBeats(state);
  if (route === "continue" || route === "rest") return closerBeats(state, route);
  return [];
}

function closerBeats(state, route) {
  const ep = routeEpilogues[route];
  if (!ep) return [];
  const stance = state?.confront?.stance?.dominant;
  const paragraphs = [ep.base];
  if (stance && ep[stance]) paragraphs.push(ep[stance]);
  return [`
    <section class="mg-stage9__route-closer" data-field="routeCloser" data-route="${escapeAttr(route)}" aria-label="Route closer">
      <h3>${escapeHtml(ep.heading)}</h3>
      ${paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}
    </section>
  `];
}

function synthesisBeats(state) {
  const syn = assembleSynthesis(state);
  const label = syn.stanceLabel ? ` — ${syn.stanceLabel}` : "";
  const paras = syn.text.split("\n\n");
  return [`
    <section class="mg-stage9__synthesis" data-field="synthesis" aria-label="Synthesis memory">
      <h3>Synthesis${escapeHtml(label)}</h3>
      <div class="mg-stage9__synthesis-text">
        ${paras.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}
      </div>
    </section>
  `];
}

function capstoneBeats(state) {
  const cap = assembleCapstoneData(state);
  const label = cap.stanceLabel ? ` (${cap.stanceLabel})` : "";
  return [`
    <section class="mg-stage9__capstone" data-field="capstone" aria-label="Assembled record">
      <h3>The assembled record${escapeHtml(label)}</h3>
      <div class="mg-stage9__capstone-grid">
        ${cap.tiles.map((t, i) => `
          <div class="mg-stage9__capstone-tile ${t.integrated ? "is-integrated" : ""}" style="--tile-accent: ${t.accent}; --tile-i: ${i}">
            <span class="mg-stage9__capstone-stage">${escapeHtml(String(t.stage).padStart(2, "0"))} ${escapeHtml(t.title)}</span>
            <span class="mg-stage9__capstone-choice">${escapeHtml(t.choice || "—")}</span>
          </div>
        `).join("")}
      </div>
    </section>
  `];
}

function renderFinalOutcome(state, finalState) {
  if (!state.final?.completed) return "";
  const summary = finalState.routeSummary;
  return `
    <aside class="mg-stage9__outcome" data-field="finalOutcome">
      <strong>${escapeHtml(state.final.choice)}</strong>
      <span>${escapeHtml(summary.label)}</span>
      <p>${escapeHtml(summary.finalChoiceText)}</p>
      <p>${escapeHtml(summary.detail)}</p>
      <p>${escapeHtml(summary.countsText)}</p>
      <p>${escapeHtml(summary.integratedText)}</p>
      <ol class="mg-stage9__route-lines">
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
