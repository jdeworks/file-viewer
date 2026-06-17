import { loadGlobal, vendor } from '../../core/script-loader.js';
import { loadXcf } from './decoders/xcf.js';
import { loadKra } from './decoders/kra.js';

function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// ── ORA (OpenRaster) ─────────────────────────────────────────────────────────

async function loadOra(intake) {
  const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
  const zip = await JSZip.loadAsync(intake.bytes);
  const xmlText = await zip.file('stack.xml')?.async('string');
  if (!xmlText) throw new Error('Missing stack.xml in ORA');
  const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
  const stackEl = doc.querySelector('image');
  const W = parseInt(stackEl?.getAttribute('w') || '0', 10);
  const H = parseInt(stackEl?.getAttribute('h') || '0', 10);

  function parseLayers(el) {
    return [...el.children].reverse().flatMap((c) => {
      if (c.tagName === 'layer') {
        return [{
          name: c.getAttribute('name') || c.getAttribute('src') || 'Layer',
          src: c.getAttribute('src'),
          x: parseInt(c.getAttribute('x') || '0', 10),
          y: parseInt(c.getAttribute('y') || '0', 10),
          opacity: parseFloat(c.getAttribute('opacity') ?? '1'),
          visibility: c.getAttribute('visibility') !== 'hidden',
          type: 'layer',
        }];
      }
      if (c.tagName === 'stack') {
        return [{ name: c.getAttribute('name') || 'Group', type: 'group', children: parseLayers(c), visibility: c.getAttribute('visibility') !== 'hidden' }];
      }
      return [];
    });
  }

  const stackNode = doc.querySelector('stack');
  const layers = stackNode ? parseLayers(stackNode) : [];

  async function loadBitmaps(ls) {
    await Promise.all(ls.map(async (l) => {
      if (l.type === 'group') { await loadBitmaps(l.children); return; }
      try {
        const data = await zip.file(l.src)?.async('arraybuffer');
        if (data) l.bitmap = await createImageBitmap(new Blob([data], { type: 'image/png' }));
      } catch { /* skip unreadable layer */ }
    }));
  }
  await loadBitmaps(layers);
  return { W, H, layers };
}

// ── PSD ──────────────────────────────────────────────────────────────────────

async function loadPsd(intake) {
  const agPsd = await loadGlobal(vendor('ag-psd/ag-psd.bundle.js'), 'agPsd');
  const buf = intake.bytes.buffer.slice(intake.bytes.byteOffset, intake.bytes.byteOffset + intake.bytes.byteLength);
  const psd = agPsd.readPsd(buf, { useImageData: true, skipLayerImageData: false });

  const W = psd.width, H = psd.height;

  function extractLayers(children) {
    if (!children) return [];
    return children.slice().reverse().map((l) => {
      if (l.children) {
        return { name: l.name || 'Group', type: 'group', visibility: !l.hidden, children: extractLayers(l.children) };
      }
      return {
        name: l.name || 'Layer',
        type: 'layer',
        visibility: !l.hidden,
        opacity: (l.opacity ?? 255) / 255,
        imageData: l.imageData,
        x: l.left || 0,
        y: l.top || 0,
      };
    });
  }

  const layers = extractLayers(psd.children);
  return { W, H, layers, mergedImageData: psd.imageData };
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

function buildLayerList(container, layers, onToggle) {
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
      const arrow = document.createElement('span');
      arrow.className = 'layered-arrow';
      arrow.textContent = '▾ ';
      row.appendChild(eye); row.appendChild(arrow); row.appendChild(name);
    } else {
      row.appendChild(eye); row.appendChild(name);
    }
    container.appendChild(row);
    if (l.children) l.children.forEach((c) => renderLayer(c, depth + 1));
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
    const name = intake.name || '';
    if (name.endsWith('.kra')) return 'kra';
  }
  return 'ora';
}

export async function render(intake, _ctx) {
  const wrap = document.createElement('div');
  wrap.className = 'layered-wrap';

  const format = detectFormat(intake);

  const canvasWrap = document.createElement('div');
  canvasWrap.className = 'layered-canvas-wrap';
  const canvas = document.createElement('canvas');
  canvas.className = 'layered-canvas';
  canvasWrap.appendChild(canvas);

  const panel = document.createElement('div');
  panel.className = 'layered-panel';
  const panelHead = document.createElement('div');
  panelHead.className = 'layered-panel-head';
  panelHead.textContent = 'Layers';
  const layerList = document.createElement('div');
  layerList.className = 'layered-list';
  panel.appendChild(panelHead);
  panel.appendChild(layerList);

  wrap.appendChild(canvasWrap);
  wrap.appendChild(panel);

  let layerData = null;

  try {
    if (format === 'psd') {
      layerData = await loadPsd(intake);
    } else if (format === 'xcf') {
      layerData = await Promise.resolve(loadXcf(intake.bytes));
    } else if (format === 'kra') {
      layerData = await loadKra(intake);
    } else {
      layerData = await loadOra(intake);
    }

    const { W, H, layers, mergedImageData, mergedBitmap } = layerData;

    const recomposite = () => {
      canvas.width = W; canvas.height = H;
      const ctx2d = canvas.getContext('2d');
      ctx2d.clearRect(0, 0, W, H);

      if (format === 'xcf') {
        drawXcfPlaceholder(canvas, W, H, layers);
        return;
      }

      if (format === 'kra' && mergedBitmap) {
        // Use merged image as base, then redraw visible layers on top
        ctx2d.drawImage(mergedBitmap, 0, 0);
        // Redraw only visible layers to reflect toggles
        canvas.width = W; canvas.height = H;
        ctx2d.clearRect(0, 0, W, H);
        drawLayers(ctx2d, layers);
        return;
      }

      if (format === 'psd' && mergedImageData) {
        drawLayers(ctx2d, layers);
        return;
      }

      // ORA and KRA without merged — composite from scratch
      drawLayers(ctx2d, layers);
    };

    recomposite();
    buildLayerList(layerList, layers, recomposite);
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
