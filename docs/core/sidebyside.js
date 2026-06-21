// Side-by-side: edit two files at once in a full-screen overlay. Each pane is a SELF-CONTAINED
// mini-editor (its own Monaco rawview + preview + download), built by sidebyside-pane.js — it never
// touches global `state` editor fields or the sibling pane. This module owns only the overlay shell
// (head/close/Esc) and the open/close orchestration. Extracted from app.js; imports shared state +
// primitives from state.js (no circular dep back into app.js).
import { state, $, toast } from './state.js';
import { intakeFromFile } from './intake.js';
import { buildPane } from './sidebyside-pane.js';

export function startSideBySide() {
  if (!state.intake) return;
  $('sbsInput').value = '';
  $('sbsInput').click();
}

export async function openSideBySide(file2) {
  let intake2;
  try { intake2 = await intakeFromFile(file2); } catch (e) { toast('Could not read file: ' + e.message); return; }
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
  overlay.__sbsPanes = panes;   // test hook: { rawview(), isEditable(), ... } per pane
  await Promise.all(panes.map((p) => p.ready));

  function close() {
    panes.forEach((p) => p.destroy());
    overlay.remove();
    document.removeEventListener('keydown', onEsc, true);
  }
  function onEsc(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }
  overlay.querySelector('.sbs-close').addEventListener('click', close);
  document.addEventListener('keydown', onEsc, true);
}
