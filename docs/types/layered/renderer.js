import { loadGlobal, vendor } from '../../core/script-loader.js';

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

  // Load bitmaps for leaf layers
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
  // useImageData avoids creating canvases internally, giving us ImageData objects we composite ourselves.
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
        imageData: l.imageData,
        x: l.left || 0,
        y: l.top || 0,
      };
    });
  }

  const layers = extractLayers(psd.children);
  // merged composite from psd.canvas (ImageData on the document level)
  const mergedImageData = psd.imageData;
  return { W, H, layers, mergedImageData };
}

// ── Compositing ───────────────────────────────────────────────────────────────

function composite(canvas, W, H, layers, mergedImageData) {
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  function drawLayers(ls) {
    for (const l of ls) {
      if (!l.visibility) continue;
      if (l.type === 'group') { drawLayers(l.children); continue; }
      if (l.bitmap) {
        ctx.globalAlpha = l.opacity ?? 1;
        ctx.drawImage(l.bitmap, l.x, l.y);
        ctx.globalAlpha = 1;
      } else if (l.imageData) {
        const tmp = document.createElement('canvas');
        tmp.width = l.imageData.width; tmp.height = l.imageData.height;
        tmp.getContext('2d').putImageData(l.imageData, 0, 0);
        ctx.drawImage(tmp, l.x, l.y);
      }
    }
  }

  // If we have a merged composite (PSD), use it as fallback base, then draw toggled layers on top.
  // For ORA we composite from scratch.
  if (mergedImageData) {
    // Use merged image (it reflects all layers as originally saved)
    const tmp = document.createElement('canvas');
    tmp.width = W; tmp.height = H;
    tmp.getContext('2d').putImageData(mergedImageData, 0, 0);
    ctx.drawImage(tmp, 0, 0);
  } else {
    drawLayers(ls => ls, layers);
    drawLayers(layers);
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

// ── Main render ───────────────────────────────────────────────────────────────

export async function render(intake, _ctx) {
  const wrap = document.createElement('div');
  wrap.className = 'layered-wrap';

  const isPsd = intake.bytes[0] === 0x38 && intake.bytes[1] === 0x42;

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
    if (isPsd) {
      layerData = await loadPsd(intake);
    } else {
      layerData = await loadOra(intake);
    }

    const { W, H, layers, mergedImageData } = layerData;

    const recomposite = () => {
      if (isPsd && mergedImageData) {
        // PSD: redraw from scratch when layers are toggled
        canvas.width = W; canvas.height = H;
        const ctx2d = canvas.getContext('2d');
        ctx2d.clearRect(0, 0, W, H);
        function drawPsdLayers(ls) {
          for (const l of ls) {
            if (!l.visibility) continue;
            if (l.type === 'group') { drawPsdLayers(l.children || []); continue; }
            if (l.imageData) {
              const tmp = document.createElement('canvas');
              tmp.width = l.imageData.width; tmp.height = l.imageData.height;
              tmp.getContext('2d').putImageData(l.imageData, 0, 0);
              ctx2d.drawImage(tmp, l.x, l.y);
            }
          }
        }
        drawPsdLayers(layers);
      } else {
        // ORA: composite visible layers
        canvas.width = W; canvas.height = H;
        const ctx2d = canvas.getContext('2d');
        ctx2d.clearRect(0, 0, W, H);
        function drawOraLayers(ls) {
          for (const l of ls) {
            if (!l.visibility) continue;
            if (l.type === 'group') { drawOraLayers(l.children || []); continue; }
            if (l.bitmap) {
              ctx2d.globalAlpha = l.opacity ?? 1;
              ctx2d.drawImage(l.bitmap, l.x, l.y);
              ctx2d.globalAlpha = 1;
            }
          }
        }
        drawOraLayers(layers);
      }
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
    },
  };
}
