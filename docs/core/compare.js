// Compare with another file: pick a second file and diff the CURRENT file against it
// (current ↔ other) in Monaco's diff (and any type custom diff). Edit-tracking (original ↔
// current) is untouched. Extracted from app.js; syncRawModeButtons (raw-pane toolbar) is injected
// via initCompare so this module doesn't import app.js back.
import { state, $, toast } from './state.js';
import { intakeFromFile } from './intake.js';
import { applyLayout } from './layout.js';
import { TREE_DRAG_TYPE, getDraggedTreeNode } from './filetree.js';

let syncRawModeButtons = () => {};
export function initCompare(deps) { syncRawModeButtons = deps.syncRawModeButtons; }

export function startCompare() {
  if (!state.rawview) return;
  showCompareTarget();
}

export function openComparePicker() {
  $('compareInput').value = '';
  $('compareInput').click();
}

export async function onComparePicked(e) {
  const file = e.target.files && e.target.files[0];
  if (!file || !state.rawview) return;
  try {
    await compareWithIntake(await intakeFromFile(file), file.name || 'file');
  } catch (err) {
    toast('Could not read file: ' + err.message);
  }
}

export function initCompareDropTarget() {
  const bar = $('compareBar');
  bar.querySelector('.compare-pick').addEventListener('click', openComparePicker);
  bar.addEventListener('dragover', (e) => {
    if (![...e.dataTransfer.types].includes(TREE_DRAG_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    bar.classList.add('drag-over');
  });
  bar.addEventListener('dragleave', (e) => {
    if (!bar.contains(e.relatedTarget)) bar.classList.remove('drag-over');
  });
  bar.addEventListener('drop', async (e) => {
    if (![...e.dataTransfer.types].includes(TREE_DRAG_TYPE)) return;
    e.preventDefault();
    bar.classList.remove('drag-over');
    const path = e.dataTransfer.getData(TREE_DRAG_TYPE);
    const node = getDraggedTreeNode();
    const entry = state.treeEntries?.find((item) => item.path === path);
    const file = node?.path === path ? node.file : entry?.file;
    if (!file) { toast('Could not find that sidebar file.'); return; }
    try {
      await compareWithIntake(await intakeFromFile(file), path);
    } catch (err) {
      toast('Could not read file: ' + err.message);
    }
  });
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
  const bar = $('compareBar');
  if (bar) {
    bar.hidden = true;
    bar.classList.remove('drag-over');
    bar.querySelector('.compare-label').textContent = '';
  }
}

function showCompareTarget() {
  $('rawPane').classList.add('comparing');
  const bar = $('compareBar');
  bar.querySelector('.compare-label').textContent = 'Drop a sidebar file here to compare, or choose a file.';
  bar.hidden = false;
  state.mode = 'raw';
  syncRawModeButtons();
  applyLayout();
  state.rawview.layout();
}

async function compareWithIntake(other, label) {
  if (!state.rawview) return;
  if (other.isBinary) { toast('Can’t compare binary files as text.'); return; }
  state.rawview.setCompare(other.text || '');
  state.rawMode = 'diff';
  $('rawPane').classList.add('comparing');
  const bar = $('compareBar');
  bar.querySelector('.compare-label').textContent = 'Comparing current ↔ ' + (label || other.filename || 'file');
  bar.hidden = false;
  state.mode = 'raw';
  syncRawModeButtons();
  applyLayout();
  state.rawview.layout();
}
