import { loadGlobal, vendor } from '../../core/script-loader.js';
import { cloneNode, installAdvKeys, nodeName, normalizeTransform, readSize, rgbToHex, writeSize } from './adv-edit-actions.js';
import { mountAdvLayersPanel } from './adv-edit-layers.js';
import { mountAdvPrecision } from './adv-edit-precision.js';
import { mountAdvPointEditor } from './adv-edit-points.js';
import { installTextControls, syncTextControls } from './adv-edit-text.js';
import { DEFAULTS, advToolbarHtml } from './adv-edit-toolbar.js';

let konvaPromise = null;
export function loadKonva() {
  if (!konvaPromise) konvaPromise = loadGlobal(vendor('konva/konva.min.js'), 'Konva');
  return konvaPromise;
}

export async function mountAdvEdit({ host, img, onDirty, pushUndo }) {
  const Konva = await loadKonva();
  const stageHost = host.querySelector('.imgv-stage');
  let naturalW = img.naturalWidth || 1, naturalH = img.naturalHeight || 1;
  const rect = img.getBoundingClientRect();
  let stageW = Math.max(1, Math.round(rect.width)), stageH = Math.max(1, Math.round(rect.height));

  const container = document.createElement('div');
  container.className = 'imgv-adv-stage';
  container.tabIndex = 0;
  container.style.cssText = `position:absolute;left:0;top:0;width:${stageW}px;height:${stageH}px;z-index:6;`;
  const hostRect = stageHost.getBoundingClientRect();
  container.style.left = Math.round(rect.left - hostRect.left) + 'px';
  container.style.top = Math.round(rect.top - hostRect.top) + 'px';
  stageHost.style.position = 'relative';
  stageHost.appendChild(container);

  const stage = new Konva.Stage({ container, width: stageW, height: stageH });
  const layer = new Konva.Layer();
  stage.add(layer);
  const tr = new Konva.Transformer({
    rotateEnabled: true,
    keepRatio: false,
    centeredScaling: false,
    flipEnabled: true,
    rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315],
    rotationSnapTolerance: 5,
    enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right'],
    boundBoxFunc: (oldBox, newBox) => (newBox.width < 8 || newBox.height < 8 ? oldBox : newBox),
  });
  layer.add(tr);

  let interactive = true;
  let selected = [];
  const markDirty = () => onDirty?.();
  const snap = () => pushUndo?.();
  const objects = () => layer.getChildren().filter((n) => n.hasName?.('obj'));
  const precision = mountAdvPrecision({ Konva, stage, tr, getObjects: objects, getSelected: () => selected, snap, markDirty, refreshLayers: () => refreshLayers(), stageW: () => stageW, stageH: () => stageH });
  const pointEdit = mountAdvPointEditor({ Konva, stage, tr, getSelected: () => selected, markDirty, refreshLayers: () => refreshLayers() });

  const bar = host.querySelector('.imgv-bar');
  const tb = document.createElement('span');
  tb.className = 'imgv-adv-bar';
  tb.hidden = true;
  tb.style.cssText = 'display:none;flex-basis:100%;flex-wrap:wrap;gap:6px;align-items:center;';
  tb.innerHTML = advToolbarHtml();
  bar.appendChild(tb);
  const $ = (s) => tb.querySelector(s);

  function textNodeOf(label) { return label.findOne('Text'); }
  function tagNodeOf(label) { return label.findOne('Tag'); }
  const isGroup = (n) => n instanceof Konva.Group || n?.getClassName?.() === 'Group';
  const isLocked = (n) => !!n?.getAttr?.('locked');

  const primary = () => selected[selected.length - 1] || null;
  function syncToolbar() {
    const node = primary();
    const has = !!node, label = isLabel(node), multi = selected.length > 1;
    const cls = node?.getClassName?.();
    const shape = has && !label && !isGroup(node);
    tb.querySelectorAll('.imgv-adv-txtctl').forEach((el) => { el.style.display = label ? '' : 'none'; });
    tb.querySelectorAll('.imgv-adv-shpctl').forEach((el) => { el.style.display = shape ? '' : 'none'; });
    const line = ['Line', 'Arrow'].includes(cls);
    const arc = ['Ring', 'Wedge', 'Arc'].includes(cls);
    tb.querySelectorAll('.imgv-adv-anyctl').forEach((el) => { el.style.display = has ? '' : 'none'; });
    tb.querySelectorAll('.imgv-adv-sizectl').forEach((el) => { el.style.display = (has && !label && !['Line', 'Arrow'].includes(cls)) ? '' : 'none'; });
    tb.querySelectorAll('.imgv-adv-linectl').forEach((el) => { el.style.display = line ? '' : 'none'; });
    $('.imgv-adv-pointedit').classList.toggle('active', pointEdit.isEnabled());
    tb.querySelectorAll('.imgv-adv-lineonlyctl').forEach((el) => { el.style.display = cls === 'Line' ? '' : 'none'; });
    tb.querySelectorAll('.imgv-adv-arrowctl').forEach((el) => { el.style.display = cls === 'Arrow' ? '' : 'none'; });
    tb.querySelectorAll('.imgv-adv-radctl').forEach((el) => { el.style.display = ['Circle', 'Wedge', 'RegularPolygon'].includes(cls) ? '' : 'none'; });
    tb.querySelectorAll('.imgv-adv-arcctl').forEach((el) => { el.style.display = arc ? '' : 'none'; });
    tb.querySelectorAll('.imgv-adv-xformctl').forEach((el) => { el.style.display = has ? '' : 'none'; });
    tb.querySelectorAll('.imgv-adv-rectctl').forEach((el) => { el.style.display = cls === 'Rect' ? '' : 'none'; });
    tb.querySelectorAll('.imgv-adv-polyctl').forEach((el) => { el.style.display = cls === 'RegularPolygon' ? '' : 'none'; });
    tb.querySelectorAll('.imgv-adv-starctl').forEach((el) => { el.style.display = cls === 'Star' ? '' : 'none'; });
    tb.querySelectorAll('.imgv-adv-innerctl').forEach((el) => { el.style.display = ['Star', 'Ring', 'Arc'].includes(cls) ? '' : 'none'; });
    $('.imgv-adv-del').disabled = !has;
    $('.imgv-adv-fill').disabled = !has || isGroup(node);
    $('.imgv-adv-group').disabled = selected.length < 2;
    $('.imgv-adv-ungroup').disabled = !selected.some(isGroup);
    if (!has) return;
    $('.imgv-adv-blend').value = node.globalCompositeOperation() || 'source-over';
    $('.imgv-adv-opacity').value = Math.round((node.opacity() ?? 1) * 100);
    $('.imgv-adv-x').value = Math.round(node.x());
    $('.imgv-adv-y').value = Math.round(node.y());
    $('.imgv-adv-rot').value = Math.round(node.rotation() || 0);
    const sz = readSize(node); $('.imgv-adv-w').value = sz.w; $('.imgv-adv-h').value = sz.h;
    if (cls === 'Rect') $('.imgv-adv-corner').value = Math.round(node.cornerRadius() || 0);
    if (['Circle', 'Wedge'].includes(cls)) $('.imgv-adv-radius').value = Math.round(node.radius());
    if (arc) $('.imgv-adv-angle').value = Math.round(node.angle());
    if (cls === 'RegularPolygon') { $('.imgv-adv-sides').value = node.sides(); $('.imgv-adv-radius').value = Math.round(node.radius()); }
    if (cls === 'Star') { $('.imgv-adv-points').value = node.numPoints(); $('.imgv-adv-inner').value = Math.round(node.innerRadius()); }
    if (['Ring', 'Arc'].includes(cls)) $('.imgv-adv-inner').value = Math.round(node.innerRadius());
    if (label) {
      syncTextControls($, node, { multi, textNodeOf, tagNodeOf, rgbToHex });
    } else if (shape) {
      $('.imgv-adv-fill').value = rgbToHex(node.fill() || '#3388ff');
      $('.imgv-adv-stroke').value = rgbToHex(node.stroke() || '#1144aa');
      $('.imgv-adv-strokew').value = Math.round(node.strokeWidth() || 0);
      $('.imgv-adv-dash').value = (node.dash?.() || []).join(',');
      $('.imgv-adv-shadow').value = Math.round(node.shadowBlur?.() || 0);
      $('.imgv-adv-shadowc').value = rgbToHex(node.shadowColor?.() || '#000000');
      if (line) { $('.imgv-adv-cap').value = node.lineCap() || 'butt'; $('.imgv-adv-join').value = node.lineJoin() || 'miter'; $('.imgv-adv-tension').value = node.tension?.() || 0; }
      if (cls === 'Line') $('.imgv-adv-closed').checked = !!node.closed();
      if (cls === 'Arrow') { $('.imgv-adv-head').value = Math.round(node.pointerLength()); $('.imgv-adv-headstart').checked = !!node.pointerAtBeginning(); }
    }
  }

  function select(nodes, opts = {}) {
    const incoming = Array.isArray(nodes) ? nodes.filter(Boolean) : (nodes ? [nodes] : []);
    if (opts.toggle && incoming.length === 1) {
      selected = selected.includes(incoming[0]) ? selected.filter((n) => n !== incoming[0]) : [...selected, incoming[0]];
    } else if (opts.add) {
      selected = [...new Set([...selected, ...incoming])];
    } else {
      selected = incoming;
    }
    container.dataset.selectedCount = String(selected.length);
    tr.nodes(selected.filter((n) => !isLocked(n)));
    if (interactive && selected.length) container.focus({ preventScroll: true });
    layer.draw();
    syncToolbar();
    refreshLayers();
    pointEdit.refresh();
  }

  function wireObject(node) {
    node.name('obj');
    node.on('click tap', (e) => {
      e.cancelBubble = true;
      if (interactive) select(node, { toggle: e.evt?.shiftKey || e.evt?.ctrlKey || e.evt?.metaKey });
    });
    node.on('dblclick dbltap', (e) => { e.cancelBubble = true; if (interactive && isLabel(node)) editLabelText(node); });
    node.on('dragstart transformstart', () => snap());   // snapshot the PRE-drag state
    node.on('dragmove', () => precision.snapDrag(node));
    node.on('transformend', () => { selected.forEach(normalizeTransform); layer.draw(); markDirty(); syncToolbar(); });
    node.on('dragend', () => { precision.clearGuides(); markDirty(); });
  }

  function placeObject(node) {
    wireObject(node);
    layer.add(node);
    select(node);
    markDirty();
  }

  function addShape(type) {
    snap();
    const cx = stageW / 2, cy = stageH / 2;
    const common = { x: cx - 60, y: cy - 40, draggable: true, fill: '#3388ff', stroke: '#1144aa', strokeWidth: 2 };
    let node;
    if (type === 'rect') node = new Konva.Rect({ ...common, width: 120, height: 80, cornerRadius: 4 });
    else if (type === 'circle') node = new Konva.Circle({ x: cx, y: cy, radius: 56, draggable: true, fill: '#3388ff', stroke: '#1144aa', strokeWidth: 2 });
    else if (type === 'ellipse') node = new Konva.Ellipse({ x: cx, y: cy, radiusX: 60, radiusY: 40, draggable: true, fill: '#3388ff', stroke: '#1144aa', strokeWidth: 2 });
    else if (type === 'ring') node = new Konva.Ring({ x: cx, y: cy, innerRadius: 28, outerRadius: 56, draggable: true, fill: '#3388ff', stroke: '#1144aa', strokeWidth: 2 });
    else if (type === 'wedge') node = new Konva.Wedge({ x: cx, y: cy, radius: 64, angle: 120, draggable: true, fill: '#3388ff', stroke: '#1144aa', strokeWidth: 2 });
    else if (type === 'arc') node = new Konva.Arc({ x: cx, y: cy, innerRadius: 36, outerRadius: 62, angle: 180, draggable: true, fill: '#3388ff', stroke: '#1144aa', strokeWidth: 2 });
    else if (type === 'line') node = new Konva.Line({ points: [cx - 60, cy, cx + 60, cy], stroke: '#1144aa', strokeWidth: 4, hitStrokeWidth: 14, draggable: true });
    else if (type === 'arrow') node = new Konva.Arrow({ points: [cx - 60, cy, cx + 60, cy], stroke: '#1144aa', strokeWidth: 4, fill: '#1144aa', pointerLength: 12, pointerWidth: 12, hitStrokeWidth: 14, draggable: true });
    else if (type === 'poly') node = new Konva.RegularPolygon({ x: cx, y: cy, sides: 5, radius: 56, draggable: true, fill: '#3388ff', stroke: '#1144aa', strokeWidth: 2 });
    else node = new Konva.Star({ x: cx, y: cy, numPoints: 5, innerRadius: 26, outerRadius: 56, draggable: true, fill: '#3388ff', stroke: '#1144aa', strokeWidth: 2 });
    placeObject(node);
  }

  function addText() {
    snap();
    const label = new Konva.Label({ x: stageW / 2 - 60, y: stageH / 2 - 24, draggable: true });
    label.add(new Konva.Tag({ fill: DEFAULTS.bg, opacity: DEFAULTS.bgOpacity, cornerRadius: 4 }));
    label.add(new Konva.Text({ text: DEFAULTS.text, fontFamily: DEFAULTS.fontFamily, fontSize: DEFAULTS.fontSize, fill: DEFAULTS.fill, padding: 6 }));
    placeObject(label);
  }
  const isLabel = (n) => n && n.getClassName && n.getClassName() === 'Label';

  function editLabelText(label) {
    const text = textNodeOf(label);
    if (!text) return;
    select(label);
    const box = text.getClientRect({ relativeTo: stage });
    const ta = document.createElement('textarea');
    ta.className = 'imgv-adv-textarea';
    ta.value = text.text();
    ta.style.cssText = `position:absolute;z-index:9;left:${container.offsetLeft + box.x}px;top:${container.offsetTop + box.y}px;width:${Math.max(80, box.width)}px;height:${Math.max(32, box.height)}px;font:${text.fontSize()}px ${text.fontFamily()};line-height:1.15;color:${text.fill()};background:var(--bg,#fff);border:1px solid var(--accent,#2563eb);padding:4px;resize:both;`;
    stageHost.appendChild(ta);
    tr.nodes([]);
    text.hide(); layer.draw();
    const done = (commit) => {
      if (!ta.isConnected) return;
      if (commit) { snap(); text.text(ta.value); markDirty(); }
      ta.remove(); text.show(); select(label); layer.draw(); refreshLayers();
    };
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); done(false); }
      else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); done(true); }
    });
    ta.addEventListener('blur', () => done(true));
    ta.focus(); ta.select();
  }

  // Empty-stage drag creates marquee selection; click clears.
  let marquee = null, marqueeStart = null, suppressClick = false;
  stage.on('mousedown touchstart', (e) => {
    if (!interactive || e.target !== stage) return;
    marqueeStart = stage.getPointerPosition();
    marquee = new Konva.Rect({ x: marqueeStart.x, y: marqueeStart.y, width: 0, height: 0, fill: 'rgba(76,154,255,.16)', stroke: '#4c9aff', dash: [4, 3], listening: false });
    layer.add(marquee); marquee.moveToTop(); tr.moveToTop();
  });
  stage.on('mousemove touchmove', () => {
    if (!marquee || !marqueeStart) return;
    const p = stage.getPointerPosition(); if (!p) return;
    const x = Math.min(p.x, marqueeStart.x), y = Math.min(p.y, marqueeStart.y);
    marquee.setAttrs({ x, y, width: Math.abs(p.x - marqueeStart.x), height: Math.abs(p.y - marqueeStart.y) });
    layer.batchDraw();
  });
  stage.on('mouseup touchend', () => {
    if (!marquee || !marqueeStart) return;
    const box = marquee.getClientRect();
    const moved = box.width > 4 || box.height > 4;
    const hits = moved ? objects().filter((n) => Konva.Util.haveIntersection(box, n.getClientRect())) : [];
    marquee.destroy(); marquee = null; marqueeStart = null;
    if (moved) { suppressClick = true; select(hits); }
  });
  stage.on('click tap', (e) => {
    if (suppressClick) { suppressClick = false; return; }
    if (e.target === stage && interactive) select(null);
  });

  $('.imgv-adv-add').addEventListener('click', addText);
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
  function deleteSelection() { if (!selected.length) return; snap(); const doomed = selected.slice(); tr.nodes([]); selected = []; doomed.forEach((n) => n.destroy()); select(null); markDirty(); }
  function duplicateSelection() {
    if (!selected.length) return;
    snap();
    const clones = selected.map((n) => cloneNode(n, stageW, stageH));
    clones.forEach((n) => placeObject(n));
    select(clones);
  }
  function nudgeSelection(dx, dy) {
    if (!selected.length) return;
    snap();
    selected.forEach((n) => n.move({ x: dx, y: dy }));
    layer.draw(); refreshLayers(); markDirty();
  }
  function groupSelection() {
    if (selected.length < 2) return;
    snap();
    const group = new Konva.Group({ draggable: true });
    wireObject(group);
    layer.add(group);
    selected.slice().forEach((n) => {
      const pos = n.getAbsolutePosition();
      n.name('group-child');
      n.moveTo(group);
      n.absolutePosition(pos);
    });
    select(group);
    refreshLayers(); syncToolbar(); markDirty();
  }
  function ungroupSelection() {
    const groups = selected.filter(isGroup);
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
  $('.imgv-adv-del').addEventListener('click', deleteSelection);
  $('.imgv-adv-fill').addEventListener('input', () => { selected.forEach((n) => (isLabel(n) ? textNodeOf(n) : n).fill($('.imgv-adv-fill').value)); layer.draw(); markDirty(); });
  $('.imgv-adv-stroke').addEventListener('input', () => { selected.filter((n) => !isLabel(n)).forEach((n) => n.stroke($('.imgv-adv-stroke').value)); layer.draw(); markDirty(); });
  $('.imgv-adv-strokew').addEventListener('input', () => { selected.filter((n) => !isLabel(n)).forEach((n) => n.strokeWidth(parseInt($('.imgv-adv-strokew').value, 10) || 0)); layer.draw(); markDirty(); });
  $('.imgv-adv-dash').addEventListener('change', () => { selected.filter((n) => !isLabel(n)).forEach((n) => n.dash?.($('.imgv-adv-dash').value ? $('.imgv-adv-dash').value.split(',').map(Number) : [])); layer.draw(); markDirty(); });
  $('.imgv-adv-cap').addEventListener('change', () => { selected.forEach((n) => n.lineCap?.($('.imgv-adv-cap').value)); layer.draw(); markDirty(); });
  $('.imgv-adv-join').addEventListener('change', () => { selected.forEach((n) => n.lineJoin?.($('.imgv-adv-join').value)); layer.draw(); markDirty(); });
  $('.imgv-adv-opacity').addEventListener('input', () => { selected.forEach((n) => n.opacity((parseInt($('.imgv-adv-opacity').value, 10) || 0) / 100)); layer.draw(); markDirty(); });
  $('.imgv-adv-x').addEventListener('change', () => { const n = primary(); if (n) { n.x(parseFloat($('.imgv-adv-x').value) || 0); layer.draw(); refreshLayers(); markDirty(); } });
  $('.imgv-adv-y').addEventListener('change', () => { const n = primary(); if (n) { n.y(parseFloat($('.imgv-adv-y').value) || 0); layer.draw(); refreshLayers(); markDirty(); } });
  $('.imgv-adv-rot').addEventListener('change', () => { selected.forEach((n) => n.rotation(parseFloat($('.imgv-adv-rot').value) || 0)); layer.draw(); markDirty(); });
  function applySizeInputs() { const w = parseFloat($('.imgv-adv-w').value) || 1, h = parseFloat($('.imgv-adv-h').value) || 1; selected.forEach((n) => writeSize(n, w, h)); layer.draw(); markDirty(); syncToolbar(); }
  $('.imgv-adv-w').addEventListener('change', applySizeInputs);
  $('.imgv-adv-h').addEventListener('change', applySizeInputs);
  $('.imgv-adv-corner').addEventListener('input', () => { selected.filter((n) => n.getClassName?.() === 'Rect').forEach((n) => n.cornerRadius(parseInt($('.imgv-adv-corner').value, 10) || 0)); layer.draw(); markDirty(); });
  $('.imgv-adv-sides').addEventListener('change', () => { selected.filter((n) => n.getClassName?.() === 'RegularPolygon').forEach((n) => n.sides(Math.max(3, parseInt($('.imgv-adv-sides').value, 10) || 5))); layer.draw(); refreshLayers(); markDirty(); });
  $('.imgv-adv-points').addEventListener('change', () => { selected.filter((n) => n.getClassName?.() === 'Star').forEach((n) => n.numPoints(Math.max(3, parseInt($('.imgv-adv-points').value, 10) || 5))); layer.draw(); markDirty(); });
  $('.imgv-adv-inner').addEventListener('change', () => { selected.filter((n) => ['Star', 'Ring', 'Arc'].includes(n.getClassName?.())).forEach((n) => n.innerRadius(Math.max(1, parseInt($('.imgv-adv-inner').value, 10) || 1))); layer.draw(); markDirty(); });
  $('.imgv-adv-radius').addEventListener('change', () => { selected.forEach((n) => { const v = Math.max(1, parseInt($('.imgv-adv-radius').value, 10) || 1); if (['Circle', 'Wedge', 'RegularPolygon'].includes(n.getClassName?.())) n.radius(v); }); layer.draw(); markDirty(); });
  $('.imgv-adv-angle').addEventListener('change', () => { selected.forEach((n) => { if (['Ring', 'Wedge', 'Arc'].includes(n.getClassName?.())) n.angle(Math.max(1, Math.min(360, parseInt($('.imgv-adv-angle').value, 10) || 1))); }); layer.draw(); markDirty(); });
  $('.imgv-adv-head').addEventListener('change', () => { selected.filter((n) => n.getClassName?.() === 'Arrow').forEach((n) => { const v = Math.max(1, parseInt($('.imgv-adv-head').value, 10) || 1); n.pointerLength(v); n.pointerWidth(v); }); layer.draw(); markDirty(); });
  $('.imgv-adv-headstart').addEventListener('change', () => { selected.filter((n) => n.getClassName?.() === 'Arrow').forEach((n) => n.pointerAtBeginning($('.imgv-adv-headstart').checked)); layer.draw(); markDirty(); });
  $('.imgv-adv-tension').addEventListener('change', () => { selected.forEach((n) => n.tension?.(Math.max(0, Math.min(1, parseFloat($('.imgv-adv-tension').value) || 0)))); layer.draw(); markDirty(); });
  $('.imgv-adv-closed').addEventListener('change', () => { selected.filter((n) => n.getClassName?.() === 'Line').forEach((n) => n.closed($('.imgv-adv-closed').checked)); layer.draw(); markDirty(); });
  $('.imgv-adv-shadow').addEventListener('input', () => { selected.filter((n) => !isLabel(n)).forEach((n) => { n.shadowBlur(parseInt($('.imgv-adv-shadow').value, 10) || 0); n.shadowOpacity(n.shadowBlur() ? 0.45 : 0); n.shadowOffset({ x: 2, y: 2 }); }); layer.draw(); markDirty(); });
  $('.imgv-adv-shadowc').addEventListener('input', () => { selected.filter((n) => !isLabel(n)).forEach((n) => n.shadowColor($('.imgv-adv-shadowc').value)); layer.draw(); markDirty(); });
  $('.imgv-adv-ratio').addEventListener('change', () => tr.keepRatio($('.imgv-adv-ratio').checked));
  $('.imgv-adv-center').addEventListener('change', () => tr.centeredScaling($('.imgv-adv-center').checked));
  $('.imgv-adv-flip').addEventListener('change', () => tr.flipEnabled($('.imgv-adv-flip').checked));
  // Blend is overlay-object-relative; flatten draws the whole overlay over the base.
  $('.imgv-adv-blend').addEventListener('change', () => { if (selected.length) { snap(); selected.forEach((n) => n.globalCompositeOperation($('.imgv-adv-blend').value)); layer.draw(); markDirty(); } });
  $('.imgv-adv-front').addEventListener('click', () => { if (!selected.length) return; snap(); selected.forEach((n) => n.moveToTop()); tr.moveToTop(); layer.draw(); refreshLayers(); markDirty(); });
  $('.imgv-adv-back').addEventListener('click', () => { if (!selected.length) return; snap(); selected.forEach((n) => n.moveToBottom()); tr.moveToTop(); layer.draw(); refreshLayers(); markDirty(); });
  tb.querySelectorAll('.imgv-adv-align').forEach((b) => b.addEventListener('click', () => precision.align(b.dataset.align)));
  tb.querySelectorAll('.imgv-adv-dist').forEach((b) => b.addEventListener('click', () => precision.distribute(b.dataset.axis)));
  tb.addEventListener('click', (e) => {
    if (e.target.closest('.imgv-adv-group')) groupSelection();
    if (e.target.closest('.imgv-adv-ungroup')) ungroupSelection();
    if (e.target.closest('.imgv-adv-pointedit')) pointEdit.setEnabled(!pointEdit.isEnabled());
  });
  $('.imgv-adv-grid').addEventListener('change', () => precision.setGrid($('.imgv-adv-grid').checked));
  syncToolbar();
  const uninstallKeys = installAdvKeys({
    ownerDocument: host.ownerDocument,
    keyTarget: container,
    isActive: () => interactive && host.isConnected,
    getSelection: () => selected.slice(),
    deleteSelection,
    duplicateSelection,
    nudgeSelection,
    clearSelection: () => select(null),
  });
  const onContainerDelete = (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace' || e.code === 'Delete' || e.code === 'Backspace' || e.keyCode === 46 || e.keyCode === 8) && selected.length) {
      e.preventDefault();
      e.stopPropagation();
      deleteSelection();
    }
  };
  container.addEventListener('keydown', onContainerDelete, true);
  container.addEventListener('keyup', onContainerDelete, true);
  container.onkeydown = onContainerDelete;
  container.onkeyup = onContainerDelete;

  function labelName(node) {
    return nodeName(node, isLabel, textNodeOf);
  }
  const layersPanel = mountAdvLayersPanel({ stageHost, layer, tr, getObjects: objects, getSelected: () => selected, select, snap, markDirty, cloneNode, placeObject, labelName, stageW: () => stageW, stageH: () => stageH });
  const panel = layersPanel.panel;
  const refreshLayers = layersPanel.refresh;
  installTextControls({ $, selectedLabels: () => selected.filter(isLabel), textNodeOf, tagNodeOf, layer, markDirty, refreshLayers });

  // Flatten a copy for export/ASCII without baking the editor state.
  function flattenToCanvas() {
    const wasSel = selected.slice(); select(null);
    const nW = img.naturalWidth || naturalW, nH = img.naturalHeight || naturalH;
    const canvas = document.createElement('canvas');
    canvas.width = nW; canvas.height = nH;
    const g = canvas.getContext('2d');
    g.drawImage(img, 0, 0, nW, nH);
    const precisionWasVisible = precision.layer.visible();
    const pointsWasVisible = pointEdit.layer.visible();
    precision.layer.visible(false);
    pointEdit.layer.visible(false);
    const overlay = stage.toCanvas({ pixelRatio: nW / stageW });
    precision.layer.visible(precisionWasVisible);
    pointEdit.layer.visible(pointsWasVisible);
    g.drawImage(overlay, 0, 0, nW, nH);
    if (wasSel.length) select(wasSel);
    return canvas;
  }

  // Keep overlay registered to the displayed image during fit/zoom/pan.
  function relayout() {
    const hostR = stageHost.getBoundingClientRect();
    const r = img.getBoundingClientRect();
    container.style.left = Math.round(r.left - hostR.left) + 'px';
    container.style.top = Math.round(r.top - hostR.top) + 'px';
    const s = stageW ? r.width / stageW : 1;
    container.style.transformOrigin = 'top left';
    container.style.transform = Math.abs(s - 1) < 1e-3 ? '' : `scale(${s})`;
  }

  // Re-baseline an empty stage after base geometry changes.
  function rebaseline() {
    naturalW = img.naturalWidth || naturalW; naturalH = img.naturalHeight || naturalH;
    const r = img.getBoundingClientRect();
    stageW = Math.max(1, Math.round(r.width)); stageH = Math.max(1, Math.round(r.height));
    stage.width(stageW); stage.height(stageH);
    container.style.width = stageW + 'px'; container.style.height = stageH + 'px';
    container.style.transform = '';
    precision.relayout();
    relayout();
  }

  // Transform top-level objects by the same natural-space geometry affine as the base.
  function applyGeometry(affine) {
    const oldK = naturalW / stageW;                          // stageOld → naturalOld scale
    const objs = objects();
    const olds = objs.map((n) => n.getTransform().copy());   // local → stageOld, captured before resize
    naturalW = img.naturalWidth || naturalW; naturalH = img.naturalHeight || naturalH;
    const r = img.getBoundingClientRect();
    stageW = Math.max(1, Math.round(r.width)); stageH = Math.max(1, Math.round(r.height));
    stage.width(stageW); stage.height(stageH);
    container.style.width = stageW + 'px'; container.style.height = stageH + 'px';
    container.style.transform = '';
    precision.relayout();
    const newK = naturalW / stageW;                          // naturalNew → stageNew = 1/newK
    const Sk = new Konva.Transform([oldK, 0, 0, oldK, 0, 0]);
    const A = new Konva.Transform(affine);
    const InvK = new Konva.Transform([1 / newK, 0, 0, 1 / newK, 0, 0]);
    select(null);
    objs.forEach((node, i) => {
      const d = InvK.copy().multiply(A).multiply(Sk).multiply(olds[i]).decompose();
      node.setAttrs({ x: d.x, y: d.y, rotation: d.rotation, scaleX: d.scaleX, scaleY: d.scaleY, skewX: d.skewX, skewY: d.skewY, offsetX: 0, offsetY: 0 });
    });
    relayout();
    layer.draw(); refreshLayers(); markDirty();
  }

  // Remove every object while keeping the stage mounted.
  function clear() {
    objects().forEach((n) => n.destroy());
    select(null); layer.draw(); refreshLayers(); markDirty();
  }

  return {
    addText,
    isEmpty: () => objects().length === 0,
    objectCount: () => objects().length,
    setInteractive(on) {
      interactive = on;
      if (!on) pointEdit.setEnabled(false);
      tb.hidden = !on; tb.style.display = on ? 'flex' : 'none';
      panel.hidden = !on; panel.style.display = on ? 'block' : 'none';
      container.style.pointerEvents = on ? 'auto' : 'none';
      if (on) refreshLayers(); else select(null);
    },
    // Overlay history bridge for editor-core's unified undo.
    serialize: () => layer.toJSON(),
    restore: (json) => { if (json) rebuild(json); else clear(); },
    flattenToCanvas,
    relayout,
    rebaseline,
    applyGeometry,
    clear,
    destroy() { uninstallKeys(); container.removeEventListener('keydown', onContainerDelete, true); container.removeEventListener('keyup', onContainerDelete, true); container.onkeydown = null; container.onkeyup = null; pointEdit.destroy(); precision.destroy(); tr.destroy(); stage.destroy(); container.remove(); tb.remove(); layersPanel.destroy(); },
  };

  function rebuild(json) {
    layer.destroyChildren();
    const tmp = Konva.Node.create(json);
    tmp.find('.obj').forEach((src) => {
      const node = src.clone();
      node.draggable(true);
      wireObject(node);
      layer.add(node);
    });
    layer.add(tr);
    select(null);
    markDirty();
  }
}
