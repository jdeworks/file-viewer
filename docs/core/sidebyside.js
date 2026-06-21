// Side-by-side: edit two files at once in a full-screen overlay. Each pane is a SELF-CONTAINED
// mini-editor (its own Monaco rawview + preview + download), built by sidebyside-pane.js — it never
// touches global `state` editor fields or the sibling pane. A SHARED mode bar (sidebyside-mode.js)
// governs both panes: Current (independent panes) · Raw · Preview · Diff (one full-width Monaco
// diff). This module owns the overlay shell (head/close/Esc) + the open/close orchestration.
import { state, $, toast } from './state.js';
import { intakeFromFile } from './intake.js';
import { buildPane } from './sidebyside-pane.js';
import { initModeBar, rememberedMode } from './sidebyside-mode.js';

export function startSideBySide() {
  if (!state.intake) return;
  $('sbsInput').value = '';
  $('sbsInput').click();
}

// Open the overlay from a picked File (reads it into an intake first).
export async function openSideBySide(file2) {
  let intake2;
  try { intake2 = await intakeFromFile(file2); } catch (e) { toast('Could not read file: ' + e.message); return; }
  return openSideBySideWithIntake(intake2);
}

// Open the overlay against an already-read intake (used by the repurposed compare drop target,
// which already produced an intake and shouldn't re-read the file).
export async function openSideBySideWithIntake(intake2) {
  if (!state.intake) return;
  // Pane 1 seeds from the global intake — shallow-copy it (don't mutate; the pane edits its own copy).
  const intake1 = { ...state.intake };

  const overlay = document.createElement('div');
  overlay.className = 'sbs-overlay';
  overlay.innerHTML =
    '<div class="sbs-head"><span class="sbs-title">Side by side</span><button class="sbs-close" aria-label="Close">✕</button></div>'
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
  // Current). The entry points never force Diff — the user reaches it by clicking the Diff mode.
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
