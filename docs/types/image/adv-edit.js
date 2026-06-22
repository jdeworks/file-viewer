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
  const naturalW = img.naturalWidth || 1, naturalH = img.naturalHeight || 1;
  // Stage matches the DISPLAYED image box; flatten scales back up to natural res.
  const rect = img.getBoundingClientRect();
  const stageW = Math.max(1, Math.round(rect.width)), stageH = Math.max(1, Math.round(rect.height));

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
    <span class="imgv-sep"></span>
    <input class="imgv-adv-text" type="text" placeholder="Selected text" style="min-width:120px">
    <label style="font-size:.8em">Size <input class="imgv-adv-size" type="number" min="6" max="400" value="${DEFAULTS.fontSize}" style="width:56px"></label>
    <select class="imgv-adv-font" title="Font"><option value="system-ui, sans-serif">Sans</option><option value="Georgia, serif">Serif</option><option value="monospace">Mono</option><option value="Impact, sans-serif">Impact</option><option value="cursive">Cursive</option></select>
    <label style="font-size:.8em">Colour <input class="imgv-adv-fill" type="color" value="${DEFAULTS.fill}"></label>
    <label style="font-size:.8em">BG <input class="imgv-adv-bg" type="color" value="${DEFAULTS.bg}"></label>
    <label style="font-size:.8em">BG opacity <input class="imgv-adv-bgop" type="range" min="0" max="100" value="${DEFAULTS.bgOpacity * 100}" style="width:70px"></label>
    <button class="imgv-adv-del" title="Delete selected">🗑 Delete</button>`;
  bar.appendChild(tb);
  const $ = (s) => tb.querySelector(s);

  function textNodeOf(label) { return label.findOne('Text'); }
  function tagNodeOf(label) { return label.findOne('Tag'); }

  function syncToolbar() {
    const has = !!selected;
    [$('.imgv-adv-text'), $('.imgv-adv-size'), $('.imgv-adv-font'), $('.imgv-adv-fill'), $('.imgv-adv-bg'), $('.imgv-adv-bgop'), $('.imgv-adv-del')]
      .forEach((el) => { el.disabled = !has; });
    if (!has) return;
    const t = textNodeOf(selected), tag = tagNodeOf(selected);
    $('.imgv-adv-text').value = t.text();
    $('.imgv-adv-size').value = Math.round(t.fontSize());
    $('.imgv-adv-font').value = t.fontFamily();
    $('.imgv-adv-fill').value = rgbToHex(t.fill());
    $('.imgv-adv-bg').value = rgbToHex(tag.fill());
    $('.imgv-adv-bgop').value = Math.round((tag.opacity() ?? 1) * 100);
  }

  function select(label) {
    selected = label;
    tr.nodes(label ? [label] : []);
    layer.draw();
    syncToolbar();
  }

  function addText() {
    snapshot();
    const label = new Konva.Label({ x: stageW / 2 - 60, y: stageH / 2 - 24, draggable: true });
    label.add(new Konva.Tag({ fill: DEFAULTS.bg, opacity: DEFAULTS.bgOpacity, cornerRadius: 4 }));
    label.add(new Konva.Text({ text: DEFAULTS.text, fontFamily: DEFAULTS.fontFamily, fontSize: DEFAULTS.fontSize, fill: DEFAULTS.fill, padding: 6 }));
    label.on('click tap', (e) => { e.cancelBubble = true; if (interactive) select(label); });
    label.on('transformend dragend', () => { snapshot(); markDirty(); });
    layer.add(label);
    select(label);
    markDirty();
  }

  // Click empty stage → deselect.
  stage.on('click tap', (e) => { if (e.target === stage && interactive) select(null); });

  $('.imgv-adv-add').addEventListener('click', addText);
  $('.imgv-adv-del').addEventListener('click', () => { if (!selected) return; snapshot(); selected.destroy(); select(null); markDirty(); });
  $('.imgv-adv-text').addEventListener('input', () => { if (selected) { textNodeOf(selected).text($('.imgv-adv-text').value); layer.draw(); markDirty(); } });
  $('.imgv-adv-size').addEventListener('input', () => { if (selected) { textNodeOf(selected).fontSize(parseInt($('.imgv-adv-size').value, 10) || DEFAULTS.fontSize); layer.draw(); markDirty(); } });
  $('.imgv-adv-font').addEventListener('change', () => { if (selected) { textNodeOf(selected).fontFamily($('.imgv-adv-font').value); layer.draw(); markDirty(); } });
  $('.imgv-adv-fill').addEventListener('input', () => { if (selected) { textNodeOf(selected).fill($('.imgv-adv-fill').value); layer.draw(); markDirty(); } });
  $('.imgv-adv-bg').addEventListener('input', () => { if (selected) { tagNodeOf(selected).fill($('.imgv-adv-bg').value); layer.draw(); markDirty(); } });
  $('.imgv-adv-bgop').addEventListener('input', () => { if (selected) { tagNodeOf(selected).opacity((parseInt($('.imgv-adv-bgop').value, 10) || 0) / 100); layer.draw(); markDirty(); } });
  syncToolbar();

  // Flatten the base image + the vector overlay into a fresh natural-res canvas.
  // Transformer handles are hidden first so they don't bake in.
  function flattenToCanvas() {
    const wasSel = selected; select(null);
    const canvas = document.createElement('canvas');
    canvas.width = naturalW; canvas.height = naturalH;
    const g = canvas.getContext('2d');
    g.drawImage(img, 0, 0, naturalW, naturalH);
    const overlay = stage.toCanvas({ pixelRatio: naturalW / stageW });
    g.drawImage(overlay, 0, 0, naturalW, naturalH);
    if (wasSel) select(wasSel);
    return canvas;
  }

  return {
    addText,
    isEmpty: () => layer.find('Label').length === 0,
    objectCount: () => layer.find('Label').length,
    setInteractive(on) {
      interactive = on;
      tb.hidden = !on; tb.style.display = on ? 'flex' : 'none';
      container.style.pointerEvents = on ? 'auto' : 'none';
      if (!on) select(null);
    },
    undo() { if (!undoStack.length) return; rebuild(undoStack.pop()); },
    flattenToCanvas,
    destroy() { tr.destroy(); stage.destroy(); container.remove(); tb.remove(); },
  };

  // Rebuild the layer from a saved JSON snapshot (re-wires events + transformer).
  function rebuild(json) {
    layer.destroyChildren();
    const tmp = Konva.Node.create(json);
    tmp.find('Label').forEach((src) => {
      const label = src.clone();
      label.draggable(true);
      label.on('click tap', (e) => { e.cancelBubble = true; if (interactive) select(label); });
      label.on('transformend dragend', () => { snapshot(); markDirty(); });
      layer.add(label);
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
