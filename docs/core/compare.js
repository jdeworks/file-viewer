// Compare with another file. REPURPOSED: the compare button no longer runs an in-place Monaco
// diff in the main editor. Instead it shows the `#compareBar` drop target as a file-2 PICKER —
// drop a sidebar file or choose one — and hands the picked intake to the side-by-side overlay
// (which now folds "diff" into a shared mode bar). The user reaches the actual comparison by
// clicking the Diff mode inside the overlay. syncRawModeButtons (raw-pane toolbar) is injected via
// initCompare so this module doesn't import app.js back.
import { state, $, toast } from './state.js';
import { intakeFromFile } from './intake.js';
import { applyLayout } from './layout.js';
import { TREE_DRAG_TYPE, getDraggedTreeNode } from './filetree.js';
import { openSideBySideWithIntake } from './sidebyside.js';

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
    await handPicked(await intakeFromFile(file));
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
      await handPicked(await intakeFromFile(file));
    } catch (err) {
      toast('Could not read file: ' + err.message);
    }
  });
}

// "Stop comparing" / cancel — just hides the picker chrome (there is no in-place diff to clear).
export function stopCompare() {
  resetCompare();
}

// Hide the compare picker chrome (used on cancel / file load / teardown).
export function resetCompare() {
  $('rawPane')?.classList.remove('comparing');
  const bar = $('compareBar');
  if (bar) {
    bar.hidden = true;
    bar.classList.remove('drag-over', 'flash');
    bar.querySelector('.compare-label').textContent = '';
  }
}

function showCompareTarget() {
  $('rawPane').classList.add('comparing');
  const bar = $('compareBar');
  bar.querySelector('.compare-label').textContent = 'Drop a sidebar file here to compare, or choose a file.';
  bar.hidden = false;
  // Flash the bar so the (easy-to-miss) drop target draws the eye. Outline + background only —
  // no border, so the surrounding layout never shifts. Reflow restarts the animation each time.
  bar.classList.remove('flash');
  void bar.offsetWidth;
  bar.classList.add('flash');
  state.mode = 'raw';
  syncRawModeButtons();
  applyLayout();
  state.rawview.layout();
}

// A file-2 intake was picked/dropped → hide the picker and open the side-by-side overlay at the
// remembered mode (default Current). Diff is now a mode the user selects inside the overlay.
async function handPicked(intake) {
  resetCompare();
  await openSideBySideWithIntake(intake);
}
