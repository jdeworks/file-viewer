import { loadGlobal, vendor } from '../../core/script-loader.js';
import { loadXcf } from './decoders/xcf.js';
import { loadKra } from './decoders/kra.js';

function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// ── PSD ──────────────────────────────────────────────────────────────────────

async function loadPsd(intake) {
  const agPsd = await loadGlobal(vendor('ag-psd/ag-psd.bundle.js'), 'agPsd');
  const buf = intake.bytes.buffer.slice(intake.bytes.byteOffset, intake.bytes.byteOffset + intake.bytes.byteLength);
  const psd = agPsd.readPsd(buf, { useImageData: true, skipLayerImageData: false });

  const W = psd.width, H = psd.height;

  function extractLayers(children) {
    if (!children) return [];
    // ag-psd already exposes layers in bottom-to-top paint order. Reversing it paints an opaque
    // background over every foreground layer (the sample PSD makes this immediately visible).
    return children.map((l) => {
      if (l.children) {
        return { name: l.name || 'Group', type: 'group', visibility: !l.hidden, children: extractLayers(l.children) };
      }
      return {
        name: l.name || 'Layer',
        type: 'layer',
        visibility: !l.hidden,
        opacity: normalizePsdOpacity(l.opacity),
        imageData: l.imageData,
        x: l.left || 0,
        y: l.top || 0,
      };
    });
  }

  const layers = extractLayers(psd.children);
  return { W, H, layers, mergedImageData: psd.imageData };
}

// ag-psd uses 0..1 opacity, while older/alternate decoders may expose the PSD's byte range.
export function normalizePsdOpacity(value) {
  if (value == null) return 1;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return Math.max(0, Math.min(1, numeric > 1 ? numeric / 255 : numeric));
}

// ── Compositing ───────────────────────────────────────────────────────────────

function drawLayers(ctx2d, ls) {
  for (const l of ls) {
    if (!l.visibility) continue;
    if (l.type === 'group') { drawLayers(ctx2d, l.children || []); continue; }
    if (l.bitmap) {
      ctx2d.globalAlpha = l.opacity ?? 1;
      ctx2d.drawImage(l.bitmap, l.x, l.y);
      ctx2d.globalAlpha = 1;
    } else if (l.imageData) {
      const tmp = document.createElement('canvas');
      tmp.width = l.imageData.width; tmp.height = l.imageData.height;
      tmp.getContext('2d').putImageData(l.imageData, 0, 0);
      ctx2d.globalAlpha = l.opacity ?? 1;
      ctx2d.drawImage(tmp, l.x, l.y);
      ctx2d.globalAlpha = 1;
    }
  }
}

// ── Layer list UI ─────────────────────────────────────────────────────────────

function makeThumbnail(l) {
  if (!l.bitmap && !l.imageData) return null;
  const th = document.createElement('canvas');
  th.className = 'layered-thumb';
  th.width = 32; th.height = 32;
  const tctx = th.getContext('2d');
  if (l.bitmap) {
    tctx.drawImage(l.bitmap, 0, 0, l.bitmap.width, l.bitmap.height, 0, 0, 32, 32);
  } else if (l.imageData) {
    const tmp = document.createElement('canvas');
    tmp.width = l.imageData.width; tmp.height = l.imageData.height;
    tmp.getContext('2d').putImageData(l.imageData, 0, 0);
    tctx.drawImage(tmp, 0, 0, tmp.width, tmp.height, 0, 0, 32, 32);
  }
  return th;
}

function buildLayerList(container, layers, onToggle, collapsedGroups = new Set()) {
  container.innerHTML = '';

  function renderLayer(l, depth) {
    const row = document.createElement('div');
    row.className = 'layered-layer' + (l.type === 'group' ? ' layered-group' : '');
    row.style.paddingLeft = (8 + depth * 14) + 'px';

    const eye = document.createElement('button');
    eye.className = 'layered-eye' + (l.visibility ? '' : ' layered-eye-off');
    eye.title = l.visibility ? 'Hide layer' : 'Show layer';
    eye.textContent = l.visibility ? '👁' : '🚫';
    eye.addEventListener('click', () => {
      l.visibility = !l.visibility;
      eye.className = 'layered-eye' + (l.visibility ? '' : ' layered-eye-off');
      eye.textContent = l.visibility ? '👁' : '🚫';
      eye.title = l.visibility ? 'Hide layer' : 'Show layer';
      onToggle();
    });

    const name = document.createElement('span');
    name.className = 'layered-name';
    name.textContent = l.name;

    if (l.type === 'group') {
      const arrow = document.createElement('button');
      arrow.className = 'layered-arrow';
      arrow.textContent = collapsedGroups.has(l) ? '▸' : '▾';
      arrow.title = collapsedGroups.has(l) ? 'Expand group' : 'Collapse group';
      arrow.addEventListener('click', () => {
        if (collapsedGroups.has(l)) collapsedGroups.delete(l);
        else collapsedGroups.add(l);
        buildLayerList(container, layers, onToggle, collapsedGroups);
      });
      row.appendChild(eye); row.appendChild(arrow); row.appendChild(name);
    } else {
      const thumb = makeThumbnail(l);
      row.appendChild(eye);
      if (thumb) row.appendChild(thumb);
      row.appendChild(name);

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '0'; slider.max = '100';
      slider.value = String(Math.round((l.opacity ?? 1) * 100));
      slider.className = 'layered-opacity';
      slider.title = 'Opacity';
      slider.addEventListener('input', () => {
        l.opacity = slider.valueAsNumber / 100;
        onToggle();
      });
      row.appendChild(slider);
    }

    container.appendChild(row);
    if (l.children && !collapsedGroups.has(l)) {
      l.children.forEach((c) => renderLayer(c, depth + 1));
    }
  }

  layers.forEach((l) => renderLayer(l, 0));
}

// ── XCF placeholder canvas ────────────────────────────────────────────────────

function drawXcfPlaceholder(canvas, W, H, layers) {
  canvas.width = W || 400; canvas.height = H || 300;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#8888aa';
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('XCF — layer structure shown in panel', canvas.width / 2, canvas.height / 2 - 10);
  ctx.fillStyle = '#666688';
  ctx.font = '12px monospace';
  ctx.fillText(`${layers.length} layer${layers.length !== 1 ? 's' : ''} · ${W}×${H}px`, canvas.width / 2, canvas.height / 2 + 14);
  ctx.textAlign = 'start';
}

// ── Main render ───────────────────────────────────────────────────────────────

function detectFormat(intake) {
  const b = intake.bytes;
  if (b[0] === 0x38 && b[1] === 0x42) return 'psd';
  if (b[0] === 0x67 && b[1] === 0x69 && b[2] === 0x6d && b[3] === 0x70) return 'xcf';
  if (b[0] === 0x50 && b[1] === 0x4b) {
    const name = intake.filename || intake.name || '';
    if (name.endsWith('.kra')) return 'kra';
  }
  return 'ora';
}

export async function render(intake, _ctx) {
  const format = detectFormat(intake);

  // Delegate ORA to its dedicated sub-module renderer
  if (format === 'ora') {
    const { render: renderOra } = await import('./ora/renderer.js');
    return renderOra(intake);
  }

  const wrap = document.createElement('div');
  wrap.className = 'layered-wrap';

  // ── Canvas column (toolbar + scrollable canvas area) ──
  const canvasCol = document.createElement('div');
  canvasCol.className = 'layered-canvas-col';

  const toolbar = document.createElement('div');
  toolbar.className = 'layered-toolbar';

  const canvasWrap = document.createElement('div');
  canvasWrap.className = 'layered-canvas-wrap';
  const canvas = document.createElement('canvas');
  canvas.className = 'layered-canvas';
  canvasWrap.appendChild(canvas);

  canvasCol.appendChild(toolbar);
  canvasCol.appendChild(canvasWrap);

  // ── Zoom controls ──
  let currentZoom = 0; // 0 = fit

  const zoomLabel = document.createElement('span');
  zoomLabel.className = 'layered-zoom-label';

  function getEffectiveZoom() {
    if (currentZoom === 0) {
      // canvasWrap.clientWidth is 0 when the element is not yet in the DOM;
      // fall back to 1 (100%) in that case so the canvas has a valid size.
      const avail = canvasWrap.clientWidth > 0 ? canvasWrap.clientWidth - 32 : 0;
      if (avail <= 0 || canvas.width <= 0) return 1;
      return Math.min(1, avail / canvas.width);
    }
    return currentZoom;
  }

  function applyZoom() {
    const z = getEffectiveZoom();
    canvas.style.width = (canvas.width * z) + 'px';
    canvas.style.height = (canvas.height * z) + 'px';
    zoomLabel.textContent = Math.round(z * 100) + '%';
  }

  function addZoomBtn(text, fn) {
    const btn = document.createElement('button');
    btn.className = 'layered-zoom-btn';
    btn.textContent = text;
    btn.addEventListener('click', fn);
    toolbar.appendChild(btn);
  }

  addZoomBtn('Fit', () => { currentZoom = 0; applyZoom(); });
  addZoomBtn('100%', () => { currentZoom = 1; applyZoom(); });
  addZoomBtn('−', () => { currentZoom = Math.max(0.125, getEffectiveZoom() / Math.SQRT2); applyZoom(); });
  addZoomBtn('+', () => { currentZoom = Math.min(8, getEffectiveZoom() * Math.SQRT2); applyZoom(); });
  toolbar.appendChild(zoomLabel);

  // ── Panel ──
  const panel = document.createElement('div');
  panel.className = 'layered-panel';

  const panelHead = document.createElement('div');
  panelHead.className = 'layered-panel-head layered-panel-actions';
  const headLabel = document.createElement('span');
  headLabel.textContent = 'Layers';
  const exportBtn = document.createElement('button');
  exportBtn.className = 'layered-zoom-btn';
  exportBtn.textContent = '⬇ PNG';
  exportBtn.title = 'Export as PNG';
  exportBtn.addEventListener('click', () => {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (intake.name || 'image').replace(/\.[^.]+$/, '') + '.png';
      a.click();
      URL.revokeObjectURL(a.href);
    }, 'image/png');
  });
  panelHead.appendChild(headLabel);
  panelHead.appendChild(exportBtn);

  const layerList = document.createElement('div');
  layerList.className = 'layered-list';
  panel.appendChild(panelHead);
  panel.appendChild(layerList);

  wrap.appendChild(canvasCol);
  wrap.appendChild(panel);

  let layerData = null;

  try {
    if (format === 'psd') {
      layerData = await loadPsd(intake);
    } else if (format === 'xcf') {
      layerData = await Promise.resolve(loadXcf(intake.bytes));
    } else if (format === 'kra') {
      layerData = await loadKra(intake);
    }

    const { W, H, layers, mergedImageData, mergedBitmap } = layerData;

    const recomposite = () => {
      canvas.width = W; canvas.height = H;
      const ctx2d = canvas.getContext('2d');
      ctx2d.clearRect(0, 0, W, H);

      if (format === 'xcf') {
        drawXcfPlaceholder(canvas, W, H, layers);
      } else if (format === 'kra' && mergedBitmap) {
        canvas.width = W; canvas.height = H;
        ctx2d.clearRect(0, 0, W, H);
        drawLayers(ctx2d, layers);
      } else if (format === 'psd' && mergedImageData) {
        drawLayers(ctx2d, layers);
      } else {
        drawLayers(ctx2d, layers);
      }

      applyZoom();
    };

    recomposite();
    buildLayerList(layerList, layers, recomposite);

    // Re-apply fit zoom once the element is actually in the DOM and has a measured width.
    // This handles the case where applyZoom() above ran off-DOM (clientWidth = 0).
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        if (canvasWrap.clientWidth > 0 && currentZoom === 0) {
          applyZoom();
          ro.disconnect();
          ro = null;
        }
      });
      ro.observe(canvasWrap);
    }
  } catch (e) {
    wrap.innerHTML = '<div class="layered-error"><strong>Could not read file:</strong><br>' + esc(e.message) + '</div>';
  }

  return {
    parentNode: wrap,
    revoke() {
      if (layerData?.layers) {
        const freeBitmaps = (ls) => ls?.forEach((l) => { l.bitmap?.close?.(); if (l.children) freeBitmaps(l.children); });
        freeBitmaps(layerData.layers);
      }
      if (layerData?.mergedBitmap) layerData.mergedBitmap.close?.();
    },
  };
}
