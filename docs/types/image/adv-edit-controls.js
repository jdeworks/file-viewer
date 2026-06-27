// Advanced-editor selection actions + toolbar control wiring, split out of
// adv-edit.js to keep that file under the LOC cap. Two installers, both driven by
// the live selection (passed in via getSelected so reassignment in adv-edit.js is
// always reflected):
//   • installObjectActions — delete / duplicate / nudge / group / ungroup.
//   • installShapeControls — wires the toolbar buttons + per-shape property inputs.
import { writeSize } from './adv-edit-actions.js';

// Selection mutations. Returns the action functions (also reused by the keyboard
// handlers in adv-edit.js). select(null) clears + refreshes after destroys.
export function installObjectActions(ctx) {
  const { getSelected, select, snap, tr, layer, Konva, cloneNode, placeObject, wireObject, isGroup, stageW, stageH, refreshLayers, syncToolbar, markDirty } = ctx;

  function deleteSelection() {
    const sel = getSelected();
    if (!sel.length) return;
    snap();
    tr.nodes([]);
    sel.slice().forEach((n) => n.destroy());
    select(null);
    markDirty();
  }
  function duplicateSelection() {
    const sel = getSelected();
    if (!sel.length) return;
    snap();
    const clones = sel.map((n) => cloneNode(n, stageW(), stageH()));
    clones.forEach((n) => placeObject(n));
    select(clones);
  }
  function nudgeSelection(dx, dy) {
    const sel = getSelected();
    if (!sel.length) return;
    snap();
    sel.forEach((n) => n.move({ x: dx, y: dy }));
    layer.draw(); refreshLayers(); markDirty();
  }
  function groupSelection() {
    const sel = getSelected();
    if (sel.length < 2) return;
    snap();
    const group = new Konva.Group({ draggable: true });
    wireObject(group);
    layer.add(group);
    sel.slice().forEach((n) => {
      const pos = n.getAbsolutePosition();
      n.name('group-child');
      n.moveTo(group);
      n.absolutePosition(pos);
    });
    select(group);
    refreshLayers(); syncToolbar(); markDirty();
  }
  function ungroupSelection() {
    const groups = getSelected().filter(isGroup);
    if (!groups.length) return;
    snap();
    const kids = [];
    groups.forEach((group) => {
      group.getChildren().slice().forEach((child) => {
        const pos = child.getAbsolutePosition();
        child.off('click tap dblclick dbltap dragstart transformstart dragmove transformend dragend');
        wireObject(child);
        child.moveTo(layer);
        child.absolutePosition(pos);
        kids.push(child);
      });
      group.destroy();
    });
    layer.add(tr);
    select(kids);
    refreshLayers(); markDirty();
  }
  return { deleteSelection, duplicateSelection, nudgeSelection, groupSelection, ungroupSelection };
}

// Wire every toolbar button + property input onto the current selection.
export function installShapeControls(ctx) {
  const {
    $, tb, addText, addShape, openImageOcrPanel, stageHost, flattenToCanvas,
    deleteSelection, groupSelection, ungroupSelection, pointEdit, precision,
    getSelected, primary, isLabel, textNodeOf, layer, markDirty, snap, tr, refreshLayers, syncToolbar,
  } = ctx;
  const sel = () => getSelected();

  $('.imgv-adv-add').addEventListener('click', addText);
  // OCR reads a flattened canvas of the current image (heavy engine lazy-loads on click, behind a consent gate).
  $('.imgv-adv-ocr').addEventListener('click', () => openImageOcrPanel({ host: stageHost, getCanvas: () => flattenToCanvas() }));
  $('.imgv-adv-rect').addEventListener('click', () => addShape('rect'));
  $('.imgv-adv-ellipse').addEventListener('click', () => addShape('ellipse'));
  $('.imgv-adv-line').addEventListener('click', () => addShape('line'));
  $('.imgv-adv-arrow').addEventListener('click', () => addShape('arrow'));
  $('.imgv-adv-poly').addEventListener('click', () => addShape('poly'));
  $('.imgv-adv-star').addEventListener('click', () => addShape('star'));
  $('.imgv-adv-more').addEventListener('click', () => {
    const next = ['circle', 'ring', 'wedge', 'arc'][$('.imgv-adv-more').dataset.next || 0];
    $('.imgv-adv-more').dataset.next = String((Number($('.imgv-adv-more').dataset.next || 0) + 1) % 4);
    addShape(next);
  });
  $('.imgv-adv-del').addEventListener('click', deleteSelection);
  $('.imgv-adv-fill').addEventListener('input', () => { sel().forEach((n) => (isLabel(n) ? textNodeOf(n) : n).fill($('.imgv-adv-fill').value)); layer.draw(); markDirty(); });
  $('.imgv-adv-stroke').addEventListener('input', () => { sel().filter((n) => !isLabel(n)).forEach((n) => n.stroke($('.imgv-adv-stroke').value)); layer.draw(); markDirty(); });
  $('.imgv-adv-strokew').addEventListener('input', () => { sel().filter((n) => !isLabel(n)).forEach((n) => n.strokeWidth(parseInt($('.imgv-adv-strokew').value, 10) || 0)); layer.draw(); markDirty(); });
  $('.imgv-adv-dash').addEventListener('change', () => { sel().filter((n) => !isLabel(n)).forEach((n) => n.dash?.($('.imgv-adv-dash').value ? $('.imgv-adv-dash').value.split(',').map(Number) : [])); layer.draw(); markDirty(); });
  $('.imgv-adv-cap').addEventListener('change', () => { sel().forEach((n) => n.lineCap?.($('.imgv-adv-cap').value)); layer.draw(); markDirty(); });
  $('.imgv-adv-join').addEventListener('change', () => { sel().forEach((n) => n.lineJoin?.($('.imgv-adv-join').value)); layer.draw(); markDirty(); });
  $('.imgv-adv-opacity').addEventListener('input', () => { sel().forEach((n) => n.opacity((parseInt($('.imgv-adv-opacity').value, 10) || 0) / 100)); layer.draw(); markDirty(); });
  $('.imgv-adv-x').addEventListener('change', () => { const n = primary(); if (n) { n.x(parseFloat($('.imgv-adv-x').value) || 0); layer.draw(); refreshLayers(); markDirty(); } });
  $('.imgv-adv-y').addEventListener('change', () => { const n = primary(); if (n) { n.y(parseFloat($('.imgv-adv-y').value) || 0); layer.draw(); refreshLayers(); markDirty(); } });
  $('.imgv-adv-rot').addEventListener('change', () => { sel().forEach((n) => n.rotation(parseFloat($('.imgv-adv-rot').value) || 0)); layer.draw(); markDirty(); });
  function applySizeInputs() { const w = parseFloat($('.imgv-adv-w').value) || 1, h = parseFloat($('.imgv-adv-h').value) || 1; sel().forEach((n) => writeSize(n, w, h)); layer.draw(); markDirty(); syncToolbar(); }
  $('.imgv-adv-w').addEventListener('change', applySizeInputs);
  $('.imgv-adv-h').addEventListener('change', applySizeInputs);
  $('.imgv-adv-corner').addEventListener('input', () => { sel().filter((n) => n.getClassName?.() === 'Rect').forEach((n) => n.cornerRadius(parseInt($('.imgv-adv-corner').value, 10) || 0)); layer.draw(); markDirty(); });
  $('.imgv-adv-sides').addEventListener('change', () => { sel().filter((n) => n.getClassName?.() === 'RegularPolygon').forEach((n) => n.sides(Math.max(3, parseInt($('.imgv-adv-sides').value, 10) || 5))); layer.draw(); refreshLayers(); markDirty(); });
  $('.imgv-adv-points').addEventListener('change', () => { sel().filter((n) => n.getClassName?.() === 'Star').forEach((n) => n.numPoints(Math.max(3, parseInt($('.imgv-adv-points').value, 10) || 5))); layer.draw(); markDirty(); });
  $('.imgv-adv-inner').addEventListener('change', () => { sel().filter((n) => ['Star', 'Ring', 'Arc'].includes(n.getClassName?.())).forEach((n) => n.innerRadius(Math.max(1, parseInt($('.imgv-adv-inner').value, 10) || 1))); layer.draw(); markDirty(); });
  $('.imgv-adv-radius').addEventListener('change', () => { sel().forEach((n) => { const v = Math.max(1, parseInt($('.imgv-adv-radius').value, 10) || 1); if (['Circle', 'Wedge', 'RegularPolygon'].includes(n.getClassName?.())) n.radius(v); }); layer.draw(); markDirty(); });
  $('.imgv-adv-angle').addEventListener('change', () => { sel().forEach((n) => { if (['Ring', 'Wedge', 'Arc'].includes(n.getClassName?.())) n.angle(Math.max(1, Math.min(360, parseInt($('.imgv-adv-angle').value, 10) || 1))); }); layer.draw(); markDirty(); });
  $('.imgv-adv-head').addEventListener('change', () => { sel().filter((n) => n.getClassName?.() === 'Arrow').forEach((n) => { const v = Math.max(1, parseInt($('.imgv-adv-head').value, 10) || 1); n.pointerLength(v); n.pointerWidth(v); }); layer.draw(); markDirty(); });
  $('.imgv-adv-headstart').addEventListener('change', () => { sel().filter((n) => n.getClassName?.() === 'Arrow').forEach((n) => n.pointerAtBeginning($('.imgv-adv-headstart').checked)); layer.draw(); markDirty(); });
  $('.imgv-adv-tension').addEventListener('change', () => { sel().forEach((n) => n.tension?.(Math.max(0, Math.min(1, parseFloat($('.imgv-adv-tension').value) || 0)))); layer.draw(); markDirty(); });
  $('.imgv-adv-closed').addEventListener('change', () => { sel().filter((n) => n.getClassName?.() === 'Line').forEach((n) => n.closed($('.imgv-adv-closed').checked)); layer.draw(); markDirty(); });
  $('.imgv-adv-shadow').addEventListener('input', () => { sel().filter((n) => !isLabel(n)).forEach((n) => { n.shadowBlur(parseInt($('.imgv-adv-shadow').value, 10) || 0); n.shadowOpacity(n.shadowBlur() ? 0.45 : 0); n.shadowOffset({ x: 2, y: 2 }); }); layer.draw(); markDirty(); });
  $('.imgv-adv-shadowc').addEventListener('input', () => { sel().filter((n) => !isLabel(n)).forEach((n) => n.shadowColor($('.imgv-adv-shadowc').value)); layer.draw(); markDirty(); });
  $('.imgv-adv-ratio').addEventListener('change', () => tr.keepRatio($('.imgv-adv-ratio').checked));
  $('.imgv-adv-center').addEventListener('change', () => tr.centeredScaling($('.imgv-adv-center').checked));
  $('.imgv-adv-flip').addEventListener('change', () => tr.flipEnabled($('.imgv-adv-flip').checked));
  // Blend is overlay-object-relative; flatten draws the whole overlay over the base.
  $('.imgv-adv-blend').addEventListener('change', () => { if (sel().length) { snap(); sel().forEach((n) => n.globalCompositeOperation($('.imgv-adv-blend').value)); layer.draw(); markDirty(); } });
  $('.imgv-adv-front').addEventListener('click', () => { if (!sel().length) return; snap(); sel().forEach((n) => n.moveToTop()); tr.moveToTop(); layer.draw(); refreshLayers(); markDirty(); });
  $('.imgv-adv-back').addEventListener('click', () => { if (!sel().length) return; snap(); sel().forEach((n) => n.moveToBottom()); tr.moveToTop(); layer.draw(); refreshLayers(); markDirty(); });
  tb.querySelectorAll('.imgv-adv-align').forEach((b) => b.addEventListener('click', () => precision.align(b.dataset.align)));
  tb.querySelectorAll('.imgv-adv-dist').forEach((b) => b.addEventListener('click', () => precision.distribute(b.dataset.axis)));
  tb.addEventListener('click', (e) => {
    if (e.target.closest('.imgv-adv-group')) groupSelection();
    if (e.target.closest('.imgv-adv-ungroup')) ungroupSelection();
    if (e.target.closest('.imgv-adv-pointedit')) pointEdit.setEnabled(!pointEdit.isEnabled());
  });
  $('.imgv-adv-grid').addEventListener('change', () => precision.setGrid($('.imgv-adv-grid').checked));
}
