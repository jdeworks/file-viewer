// Side-by-side: edit two files at once in a full-screen overlay. Each pane is a SELF-CONTAINED
// mini-editor (its own Monaco rawview + preview + download), built by sidebyside-pane.js — it never
// touches global `state` editor fields or the sibling pane. A SHARED mode bar (sidebyside-mode.js)
// governs both panes: Choose views (independent Source/Preview choices) · Sources · Previews ·
// Text diff (one full-width Monaco diff). This module owns the overlay shell (head/close/Esc) +
// the open/close orchestration.
import { state } from './state.js';
import { buildPane } from './sidebyside-pane.js';
import { initModeBar, rememberedMode } from './sidebyside-mode.js';

// Open the overlay against an already-read intake. Entry points that pick/drop file 2 read the
// file first, then hand the intake here.
export async function openSideBySideWithIntake(intake2) {
  if (!state.intake) return;
  // Pane 1 seeds from the global intake — shallow-copy it (don't mutate; the pane edits its own copy).
  const intake1 = { ...state.intake };

  const overlay = document.createElement('div');
  overlay.className = 'sbs-overlay';
  overlay.innerHTML =
    '<div class="sbs-head"><span class="sbs-title">Compare two files</span><button class="sbs-close" aria-label="Close comparison">✕</button></div>'
    + '<div class="sbs-body">'
    + '<div class="sbs-pane"><div class="sbs-name"></div><div class="sbs-host"></div></div>'
    + '<div class="sbs-pane"><div class="sbs-name"></div><div class="sbs-host"></div></div>'
    + '</div>';
  document.body.appendChild(overlay);

  const paneEls = overlay.querySelectorAll('.sbs-pane');
  const panes = [buildPane(paneEls[0], intake1), buildPane(paneEls[1], intake2)];
  overlay.__sbsPanes = panes;   // test hook: { rawview(), isEditable(), setView(), ... } per pane
  await Promise.all(panes.map((p) => p.ready));

  // Shared mode bar lives in the head, next to the title. Opens at the remembered mode (default
  // Choose views). Entry points never force Text diff — the user selects it explicitly.
  const head = overlay.querySelector('.sbs-head');
  const body = overlay.querySelector('.sbs-body');
  const modeBar = initModeBar(head, body, panes, { initialMode: rememberedMode() });
  overlay.__sbsMode = modeBar;   // test hook: current()/setMode()
  await modeBar.ready;

  function close() {
    modeBar.destroy();
    panes.forEach((p) => p.destroy());
    overlay.remove();
    document.removeEventListener('keydown', onEsc, true);
  }
  function onEsc(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }
  overlay.querySelector('.sbs-close').addEventListener('click', close);
  document.addEventListener('keydown', onEsc, true);
}
