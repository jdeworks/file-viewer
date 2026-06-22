// Advanced (vector) editing — the Adv Edit mode. A Konva stage overlays the image
// with re-editable TEXT objects (drag/resize/rotate, font/size/colour, background
// colour + opacity, multiple, Cancel-safe). The overlay is non-destructive: it's
// flattened onto the pixel base only for output (export/ASCII) or when the user
// leaves to a pixel mode. See ADV_EDIT.md for the full model.
//
// Konva is vendored (docs/vendor/konva/konva.min.js, MIT, UMD) and lazy-loaded the
// first time Adv Edit is entered — View/Edit/ASCII never fetch it.
import { loadGlobal, vendor } from '../../core/script-loader.js';

let konvaPromise = null;
export function loadKonva() {
  if (!konvaPromise) konvaPromise = loadGlobal(vendor('konva/konva.min.js'), 'Konva');
  return konvaPromise;
}

const DEFAULTS = { text: 'Text', fontFamily: 'system-ui, sans-serif', fontSize: 48, fill: '#ffffff', bg: '#000000', bgOpacity: 0.5 };

// mountAdvEdit builds the stage over `.imgv-stage` sized to the displayed image,
// plus an editing toolbar appended to `.imgv-bar`. Returns the controller the
// renderer drives (flatten / interactive / dirty / destroy).
export async function mountAdvEdit({ host, img, onDirty }) {
  const Konva = await loadKonva();
  const stageHost = host.querySelector('.imgv-stage');
  let naturalW = img.naturalWidth || 1, naturalH = img.naturalHeight || 1;
  // Stage matches the DISPLAYED image box; flatten scales back up to natural res.
  // (let, not const — rebaseline() updates them after a base-resizing geometry op.)
  const rect = img.getBoundingClientRect();
  let stageW = Math.max(1, Math.round(rect.width)), stageH = Math.max(1, Math.round(rect.height));

  const container = document.createElement('div');
  container.className = 'imgv-adv-stage';
  container.style.cssText = `position:absolute;left:0;top:0;width:${stageW}px;height:${stageH}px;z-index:6;`;
  // Centre the stage over the image within the (possibly larger) stage host.
  const hostRect = stageHost.getBoundingClientRect();
  container.style.left = Math.round(rect.left - hostRect.left) + 'px';
  container.style.top = Math.round(rect.top - hostRect.top) + 'px';
  stageHost.style.position = 'relative';
  stageHost.appendChild(container);

  const stage = new Konva.Stage({ container, width: stageW, height: stageH });
  const layer = new Konva.Layer();
  stage.add(layer);
  const tr = new Konva.Transformer({ rotateEnabled: true, keepRatio: false, enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right'] });
  layer.add(tr);

  let interactive = true;
  let selected = null;
  const undoStack = [];
  const markDirty = () => onDirty?.();
  const snapshot = () => { undoStack.push(layer.toJSON()); if (undoStack.length > 50) undoStack.shift(); };

  // The selected-object toolbar (only meaningful while one label is selected).
  const bar = host.querySelector('.imgv-bar');
  const tb = document.createElement('span');
  tb.className = 'imgv-adv-bar';
  tb.hidden = true;
  tb.style.cssText = 'display:none;flex-basis:100%;flex-wrap:wrap;gap:6px;align-items:center;';
  tb.innerHTML = `
    <button class="imgv-adv-add">+ Text</button>
    <button class="imgv-adv-rect" title="Add rectangle">▭</button>
    <button class="imgv-adv-ellipse" title="Add ellipse">◯</button>
    <button class="imgv-adv-line" title="Add line">╱</button>
    <button class="imgv-adv-arrow" title="Add arrow">➤</button>
    <span class="imgv-sep"></span>
    <input class="imgv-adv-text imgv-adv-txtctl" type="text" placeholder="Selected text" style="min-width:120px">
    <label class="imgv-adv-txtctl" style="font-size:.8em">Size <input class="imgv-adv-size" type="number" min="6" max="400" value="${DEFAULTS.fontSize}" style="width:56px"></label>
    <select class="imgv-adv-font imgv-adv-txtctl" title="Font"><option value="system-ui, sans-serif">Sans</option><option value="Georgia, serif">Serif</option><option value="monospace">Mono</option><option value="Impact, sans-serif">Impact</option><option value="cursive">Cursive</option></select>
    <label style="font-size:.8em">Fill <input class="imgv-adv-fill" type="color" value="${DEFAULTS.fill}"></label>
    <label class="imgv-adv-txtctl" style="font-size:.8em">BG <input class="imgv-adv-bg" type="color" value="${DEFAULTS.bg}"></label>
    <label class="imgv-adv-txtctl" style="font-size:.8em">BG opacity <input class="imgv-adv-bgop" type="range" min="0" max="100" value="${DEFAULTS.bgOpacity * 100}" style="width:70px"></label>
    <label class="imgv-adv-shpctl" style="font-size:.8em">Stroke <input class="imgv-adv-stroke" type="color" value="#1144aa"></label>
    <label class="imgv-adv-shpctl" style="font-size:.8em">Width <input class="imgv-adv-strokew" type="number" min="0" max="80" value="2" style="width:48px"></label>
    <button class="imgv-adv-del" title="Delete selected">🗑 Delete</button>`;
  bar.appendChild(tb);
  const $ = (s) => tb.querySelector(s);

  function textNodeOf(label) { return label.findOne('Text'); }
  function tagNodeOf(label) { return label.findOne('Tag'); }

  function syncToolbar() {
    const has = !!selected, label = isLabel(selected);
    tb.querySelectorAll('.imgv-adv-txtctl').forEach((el) => { el.style.display = label ? '' : 'none'; });
    tb.querySelectorAll('.imgv-adv-shpctl').forEach((el) => { el.style.display = (has && !label) ? '' : 'none'; });
    $('.imgv-adv-del').disabled = !has;
    $('.imgv-adv-fill').disabled = !has;
    if (!has) return;
    if (label) {
      const t = textNodeOf(selected), tag = tagNodeOf(selected);
      $('.imgv-adv-text').value = t.text();
      $('.imgv-adv-size').value = Math.round(t.fontSize());
      $('.imgv-adv-font').value = t.fontFamily();
      $('.imgv-adv-fill').value = rgbToHex(t.fill());
      $('.imgv-adv-bg').value = rgbToHex(tag.fill());
      $('.imgv-adv-bgop').value = Math.round((tag.opacity() ?? 1) * 100);
    } else {
      $('.imgv-adv-fill').value = rgbToHex(selected.fill() || '#3388ff');
      $('.imgv-adv-stroke').value = rgbToHex(selected.stroke() || '#1144aa');
      $('.imgv-adv-strokew').value = Math.round(selected.strokeWidth() || 0);
    }
  }

  function select(label) {
    selected = label;
    tr.nodes(label ? [label] : []);
    layer.draw();
    syncToolbar();
    refreshLayers();
  }

  // Wire an object (text or shape) for selection + undo-on-change, then select it.
  function placeObject(node) {
    node.name('obj');
    node.on('click tap', (e) => { e.cancelBubble = true; if (interactive) select(node); });
    node.on('transformend dragend', () => { snapshot(); markDirty(); });
    layer.add(node);
    select(node);
    markDirty();
  }

  function addShape(type) {
    snapshot();
    const cx = stageW / 2, cy = stageH / 2;
    const common = { x: cx - 60, y: cy - 40, draggable: true, fill: '#3388ff', stroke: '#1144aa', strokeWidth: 2 };
    let node;
    if (type === 'rect') node = new Konva.Rect({ ...common, width: 120, height: 80, cornerRadius: 4 });
    else if (type === 'ellipse') node = new Konva.Ellipse({ x: cx, y: cy, radiusX: 60, radiusY: 40, draggable: true, fill: '#3388ff', stroke: '#1144aa', strokeWidth: 2 });
    else if (type === 'line') node = new Konva.Line({ points: [cx - 60, cy, cx + 60, cy], stroke: '#1144aa', strokeWidth: 4, hitStrokeWidth: 14, draggable: true });
    else node = new Konva.Arrow({ points: [cx - 60, cy, cx + 60, cy], stroke: '#1144aa', strokeWidth: 4, fill: '#1144aa', pointerLength: 12, pointerWidth: 12, hitStrokeWidth: 14, draggable: true });
    placeObject(node);
  }

  function addText() {
    snapshot();
    const label = new Konva.Label({ x: stageW / 2 - 60, y: stageH / 2 - 24, draggable: true });
    label.add(new Konva.Tag({ fill: DEFAULTS.bg, opacity: DEFAULTS.bgOpacity, cornerRadius: 4 }));
    label.add(new Konva.Text({ text: DEFAULTS.text, fontFamily: DEFAULTS.fontFamily, fontSize: DEFAULTS.fontSize, fill: DEFAULTS.fill, padding: 6 }));
    placeObject(label);
  }
  const isLabel = (n) => n && n.getClassName && n.getClassName() === 'Label';

  // Click empty stage → deselect.
  stage.on('click tap', (e) => { if (e.target === stage && interactive) select(null); });

  $('.imgv-adv-add').addEventListener('click', addText);
  $('.imgv-adv-rect').addEventListener('click', () => addShape('rect'));
  $('.imgv-adv-ellipse').addEventListener('click', () => addShape('ellipse'));
  $('.imgv-adv-line').addEventListener('click', () => addShape('line'));
  $('.imgv-adv-arrow').addEventListener('click', () => addShape('arrow'));
  $('.imgv-adv-del').addEventListener('click', () => { if (!selected) return; snapshot(); selected.destroy(); select(null); markDirty(); });
  $('.imgv-adv-text').addEventListener('input', () => { if (isLabel(selected)) { textNodeOf(selected).text($('.imgv-adv-text').value); layer.draw(); refreshLayers(); markDirty(); } });
  $('.imgv-adv-size').addEventListener('input', () => { if (isLabel(selected)) { textNodeOf(selected).fontSize(parseInt($('.imgv-adv-size').value, 10) || DEFAULTS.fontSize); layer.draw(); markDirty(); } });
  $('.imgv-adv-font').addEventListener('change', () => { if (isLabel(selected)) { textNodeOf(selected).fontFamily($('.imgv-adv-font').value); layer.draw(); markDirty(); } });
  $('.imgv-adv-fill').addEventListener('input', () => { if (!selected) return; (isLabel(selected) ? textNodeOf(selected) : selected).fill($('.imgv-adv-fill').value); layer.draw(); markDirty(); });
  $('.imgv-adv-bg').addEventListener('input', () => { if (isLabel(selected)) { tagNodeOf(selected).fill($('.imgv-adv-bg').value); layer.draw(); markDirty(); } });
  $('.imgv-adv-bgop').addEventListener('input', () => { if (isLabel(selected)) { tagNodeOf(selected).opacity((parseInt($('.imgv-adv-bgop').value, 10) || 0) / 100); layer.draw(); markDirty(); } });
  $('.imgv-adv-stroke').addEventListener('input', () => { if (selected && !isLabel(selected)) { selected.stroke($('.imgv-adv-stroke').value); layer.draw(); markDirty(); } });
  $('.imgv-adv-strokew').addEventListener('input', () => { if (selected && !isLabel(selected)) { selected.strokeWidth(parseInt($('.imgv-adv-strokew').value, 10) || 0); layer.draw(); markDirty(); } });
  syncToolbar();

  // ── Layers panel ── one row per object, docked top-right of the stage host:
  // select, eye-toggle visibility, reorder (z-order), delete. The Transformer is
  // kept on top after any reorder so its handles never get buried.
  const panel = document.createElement('div');
  panel.className = 'imgv-adv-layers';
  panel.hidden = true;
  panel.style.cssText = 'position:absolute;top:8px;right:8px;z-index:7;width:172px;max-height:60%;overflow:auto;background:var(--bg-2,#222);color:var(--fg,#eee);border:1px solid var(--border,#444);border-radius:6px;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,.3);';
  stageHost.appendChild(panel);

  function labelName(node) {
    if (isLabel(node)) { const t = textNodeOf(node)?.text?.(); if (t && t.trim()) return t.trim().slice(0, 18); }
    return ({ Rect: 'Rectangle', Ellipse: 'Ellipse', Line: 'Line', Arrow: 'Arrow', Label: 'Text' })[node.getClassName?.()] || 'Layer';
  }

  function refreshLayers() {
    const labels = layer.find('.obj').slice().reverse();   // top-most first
    panel.innerHTML = `<div style="padding:5px 8px;font-weight:600;border-bottom:1px solid var(--border,#444)">Layers (${labels.length})</div>`;
    labels.forEach((label) => {
      const row = document.createElement('div');
      row.style.cssText = `display:flex;align-items:center;gap:4px;padding:3px 6px;cursor:pointer;${label === selected ? 'background:var(--accent,#2563eb);color:#fff;' : ''}`;
      const eye = document.createElement('button');
      eye.textContent = label.visible() ? '👁' : '🚫';
      eye.title = 'Show / hide'; eye.style.cssText = 'background:none;border:none;cursor:pointer;font-size:12px;padding:0';
      eye.addEventListener('click', (e) => { e.stopPropagation(); snapshot(); label.visible(!label.visible()); if (!label.visible() && selected === label) select(null); layer.draw(); refreshLayers(); markDirty(); });
      const name = document.createElement('span');
      name.textContent = labelName(label); name.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
      const up = mkMini('↑', 'Bring forward', (e) => { e.stopPropagation(); snapshot(); label.moveUp(); tr.moveToTop(); layer.draw(); refreshLayers(); markDirty(); });
      const dn = mkMini('↓', 'Send backward', (e) => { e.stopPropagation(); snapshot(); label.moveDown(); tr.moveToTop(); layer.draw(); refreshLayers(); markDirty(); });
      const del = mkMini('🗑', 'Delete', (e) => { e.stopPropagation(); snapshot(); if (selected === label) select(null); label.destroy(); layer.draw(); refreshLayers(); markDirty(); });
      row.append(eye, name, up, dn, del);
      row.addEventListener('click', () => { if (label.visible()) select(label); });
      panel.appendChild(row);
    });
  }
  function mkMini(txt, title, fn) { const b = document.createElement('button'); b.textContent = txt; b.title = title; b.style.cssText = 'background:none;border:none;color:inherit;cursor:pointer;font-size:11px;padding:0 1px'; b.addEventListener('click', fn); return b; }

  // Flatten the base image + the vector overlay into a fresh natural-res canvas.
  // Transformer handles are hidden first so they don't bake in. Reads the CURRENT
  // image dimensions (the base may have been re-encoded by a non-geometry pixel edit).
  function flattenToCanvas() {
    const wasSel = selected; select(null);
    const nW = img.naturalWidth || naturalW, nH = img.naturalHeight || naturalH;
    const canvas = document.createElement('canvas');
    canvas.width = nW; canvas.height = nH;
    const g = canvas.getContext('2d');
    g.drawImage(img, 0, 0, nW, nH);
    const overlay = stage.toCanvas({ pixelRatio: nW / stageW });
    g.drawImage(overlay, 0, 0, nW, nH);
    if (wasSel) select(wasSel);
    return canvas;
  }

  // Keep the overlay container glued to the displayed image box as the view changes
  // (fit/zoom/pan). The Konva stage keeps its mount-time pixel coords; a CSS scale on
  // the container tracks zoom so objects stay registered to the image without touching
  // their coordinates. The renderer calls this from its apply()/applyPan().
  function relayout() {
    const hostR = stageHost.getBoundingClientRect();
    const r = img.getBoundingClientRect();
    container.style.left = Math.round(r.left - hostR.left) + 'px';
    container.style.top = Math.round(r.top - hostR.top) + 'px';
    const s = stageW ? r.width / stageW : 1;
    container.style.transformOrigin = 'top left';
    container.style.transform = Math.abs(s - 1) < 1e-3 ? '' : `scale(${s})`;
  }

  // Re-baseline the (empty) stage onto the CURRENT base image — display size + natural
  // res — after a geometry op resized the base while the overlay was away. Only valid
  // with no objects (it resets the coordinate frame); the renderer calls it on Adv
  // entry when the overlay is empty.
  function rebaseline() {
    naturalW = img.naturalWidth || naturalW; naturalH = img.naturalHeight || naturalH;
    const r = img.getBoundingClientRect();
    stageW = Math.max(1, Math.round(r.width)); stageH = Math.max(1, Math.round(r.height));
    stage.width(stageW); stage.height(stageH);
    container.style.width = stageW + 'px'; container.style.height = stageH + 'px';
    container.style.transform = '';
    relayout();
  }

  // Remove every object (used when the overlay is flattened into the base — before a
  // geometry op, or on Reset). The stage itself stays mounted.
  function clear() {
    layer.find('.obj').forEach((n) => n.destroy());
    select(null); layer.draw(); refreshLayers(); markDirty();
  }

  return {
    addText,
    isEmpty: () => layer.find('.obj').length === 0,
    objectCount: () => layer.find('.obj').length,
    setInteractive(on) {
      interactive = on;
      tb.hidden = !on; tb.style.display = on ? 'flex' : 'none';
      panel.hidden = !on; panel.style.display = on ? 'block' : 'none';
      container.style.pointerEvents = on ? 'auto' : 'none';
      if (on) refreshLayers(); else select(null);
    },
    undo() { if (!undoStack.length) return; rebuild(undoStack.pop()); },
    flattenToCanvas,
    relayout,
    rebaseline,
    clear,
    destroy() { tr.destroy(); stage.destroy(); container.remove(); tb.remove(); panel.remove(); },
  };

  // Rebuild the layer from a saved JSON snapshot (re-wires events + transformer).
  function rebuild(json) {
    layer.destroyChildren();
    const tmp = Konva.Node.create(json);
    tmp.find('.obj').forEach((src) => {
      const node = src.clone();
      node.draggable(true);
      node.on('click tap', (e) => { e.cancelBubble = true; if (interactive) select(node); });
      node.on('transformend dragend', () => { snapshot(); markDirty(); });
      layer.add(node);
    });
    layer.add(tr);
    select(null);
    markDirty();
  }
}

// Konva returns colours as the string we set, but normalise to #rrggbb for inputs.
function rgbToHex(c) {
  if (typeof c !== 'string') return '#000000';
  if (c[0] === '#') return c.length === 7 ? c : c;
  const m = c.match(/\d+/g);
  if (!m) return '#000000';
  return '#' + m.slice(0, 3).map((n) => (+n).toString(16).padStart(2, '0')).join('');
}
