// Compare with another file: pick a second file and diff the CURRENT file against it
// (current ↔ other) in Monaco's diff (and any type custom diff). Edit-tracking (original ↔
// current) is untouched. Extracted from app.js; syncRawModeButtons (raw-pane toolbar) is injected
// via initCompare so this module doesn't import app.js back.
import { state, $, toast } from './state.js';
import { intakeFromFile } from './intake.js';
import { applyLayout } from './layout.js';

let syncRawModeButtons = () => {};
export function initCompare(deps) { syncRawModeButtons = deps.syncRawModeButtons; }

export function startCompare() {
  if (!state.rawview) return;
  $('compareInput').value = '';
  $('compareInput').click();
}

export async function onComparePicked(e) {
  const file = e.target.files && e.target.files[0];
  if (!file || !state.rawview) return;
  try {
    const other = await intakeFromFile(file);
    if (other.isBinary) { toast('Can’t compare binary files as text.'); return; }
    state.rawview.setCompare(other.text || '');     // keeps the current file's language on both sides
    state.rawMode = 'diff';
    $('rawPane').classList.add('comparing');
    const bar = $('compareBar');
    bar.querySelector('.compare-label').textContent = 'Comparing current ↔ ' + (file.name || 'file');
    bar.hidden = false;
    syncRawModeButtons();
    applyLayout();
    state.rawview.layout();
  } catch (err) {
    toast('Could not read file: ' + err.message);
  }
}

export function stopCompare() {
  if (!state.rawview?.hasCompare?.()) { resetCompare(); return; }
  state.rawview.clearCompare();
  resetCompare();
  state.rawMode = state.rawview.mode();
  syncRawModeButtons();
  state.rawview.layout();
}

// Hide the compare UI without touching the rawview (used on file load / teardown).
export function resetCompare() {
  $('rawPane')?.classList.remove('comparing');
  const bar = $('compareBar'); if (bar) bar.hidden = true;
}
