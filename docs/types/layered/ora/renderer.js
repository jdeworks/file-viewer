// ORA (OpenRaster) renderer.
// ORA is a ZIP archive with:
//   mimetype              — "image/openraster" (stored uncompressed, no compression)
//   stack.xml             — layer tree with <image w= h=> root and <stack>/<layer> children
//   mergedimage.png       — final composited image (always present)
//   Thumbnails/thumbnail.png — 256px preview
//   data/layerN.png       — individual layer PNGs
//
// Rendering strategy:
//   1. Show mergedimage.png as the primary composite view (fast path, no re-compositing)
//   2. Parse stack.xml to build the layer list
//   3. Each layer row is clickable → shows that layer's PNG
//   4. Metadata panel: canvas W×H, layer count, file size

import { loadGlobal, vendor } from '../../../core/script-loader.js';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function fmtSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function parseLayers(el) {
  return [...el.children].reverse().flatMap((c) => {
    if (c.tagName === 'layer') {
      return [{
        type: 'layer',
        name: c.getAttribute('name') || c.getAttribute('src') || 'Layer',
        src: c.getAttribute('src'),
        x: parseInt(c.getAttribute('x') || '0', 10),
        y: parseInt(c.getAttribute('y') || '0', 10),
        opacity: parseFloat(c.getAttribute('opacity') ?? '1'),
        visibility: c.getAttribute('visibility') !== 'hidden',
        blendMode: c.getAttribute('composite-op') || 'svg:src-over',
      }];
    }
    if (c.tagName === 'stack') {
      return [{
        type: 'group',
        name: c.getAttribute('name') || 'Group',
        visibility: c.getAttribute('visibility') !== 'hidden',
        blendMode: c.getAttribute('composite-op') || 'svg:src-over',
        children: parseLayers(c),
      }];
    }
    return [];
  });
}

function blendLabel(compositeOp) {
  const map = {
    'svg:src-over': 'Normal',
    'svg:multiply': 'Multiply',
    'svg:screen': 'Screen',
    'svg:overlay': 'Overlay',
    'svg:darken': 'Darken',
    'svg:lighten': 'Lighten',
    'svg:color-dodge': 'Color Dodge',
    'svg:color-burn': 'Color Burn',
    'svg:hard-light': 'Hard Light',
    'svg:soft-light': 'Soft Light',
    'svg:difference': 'Difference',
    'svg:color': 'Color',
    'svg:luminosity': 'Luminosity',
    'svg:hue': 'Hue',
    'svg:saturation': 'Saturation',
    'svg:plus': 'Plus',
    'svg:dst-in': 'Destination In',
    'svg:dst-out': 'Destination Out',
  };
  return map[compositeOp] || compositeOp || 'Normal';
}

function countLayers(layers) {
  return layers.reduce((n, l) => n + (l.type === 'group' ? countLayers(l.children || []) : 1), 0);
}

export async function render(intake) {
  const wrap = document.createElement('div');
  wrap.className = 'layered-wrap';

  const canvasCol = document.createElement('div');
  canvasCol.className = 'layered-canvas-col';

  const toolbar = document.createElement('div');
  toolbar.className = 'layered-toolbar';

  const canvasWrap = document.createElement('div');
  canvasWrap.className = 'layered-canvas-wrap';

  const panel = document.createElement('div');
  panel.className = 'layered-panel';

  const panelHead = document.createElement('div');
  panelHead.className = 'layered-panel-head layered-panel-actions';
  const headLabel = document.createElement('span');
  headLabel.textContent = 'Layers';
  panelHead.appendChild(headLabel);

  const layerList = document.createElement('div');
  layerList.className = 'layered-list';

  panel.appendChild(panelHead);
  panel.appendChild(layerList);
  canvasCol.appendChild(toolbar);
  canvasCol.appendChild(canvasWrap);
  wrap.appendChild(canvasCol);
  wrap.appendChild(panel);

  const objectUrls = [];
  function createUrl(data, type = 'image/png') {
    const url = URL.createObjectURL(new Blob([data], { type }));
    objectUrls.push(url);
    return url;
  }

  let loadedZip = null;

  try {
    const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
    const zip = await JSZip.loadAsync(intake.bytes);
    loadedZip = zip;

    // Validate mimetype entry
    const mimeEntry = zip.file('mimetype');
    if (mimeEntry) {
      const mimeText = (await mimeEntry.async('string')).trim();
      if (mimeText !== 'image/openraster') {
        throw new Error(`Unexpected ORA mimetype: ${mimeText}`);
      }
    }

    // Parse stack.xml
    const xmlText = await zip.file('stack.xml')?.async('string');
    if (!xmlText) throw new Error('Missing stack.xml in ORA archive');

    const xmlDoc = new DOMParser().parseFromString(xmlText, 'text/xml');
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) throw new Error('stack.xml parse error: ' + parseError.textContent.slice(0, 120));

    const imageEl = xmlDoc.querySelector('image');
    const W = parseInt(imageEl?.getAttribute('w') || '0', 10);
    const H = parseInt(imageEl?.getAttribute('h') || '0', 10);
    const stackEl = xmlDoc.querySelector('image > stack');
    const layers = stackEl ? parseLayers(stackEl) : [];
    const layerCount = countLayers(layers);

    // ── Metadata bar ─────────────────────────────────────────────────────────────
    const metaBar = document.createElement('div');
    metaBar.className = 'layered-toolbar';
    metaBar.style.fontSize = '12px';
    metaBar.style.color = 'var(--fg-muted, #888)';
    metaBar.style.gap = '12px';
    metaBar.style.flexWrap = 'wrap';

    const addMeta = (label, value) => {
      const sp = document.createElement('span');
      sp.innerHTML = `<strong>${esc(label)}:</strong> ${esc(String(value))}`;
      metaBar.appendChild(sp);
    };
    if (W && H) addMeta('Canvas', `${W} × ${H} px`);
    addMeta('Layers', String(layerCount));
    addMeta('File size', fmtSize(intake.size || intake.bytes?.length || 0));

    canvasCol.insertBefore(metaBar, canvasWrap);

    // ── Main composite image ──────────────────────────────────────────────────────
    const mergedData = await zip.file('mergedimage.png')?.async('arraybuffer');
    const mainImg = document.createElement('img');
    mainImg.className = 'layered-canvas';
    mainImg.style.maxWidth = '100%';
    mainImg.style.display = 'block';
    mainImg.alt = 'Merged composite';

    if (mergedData) {
      mainImg.src = createUrl(mergedData);
    } else {
      // Fallback: try thumbnail
      const thumbData = await zip.file('Thumbnails/thumbnail.png')?.async('arraybuffer');
      if (thumbData) {
        mainImg.src = createUrl(thumbData);
        mainImg.title = 'Thumbnail (mergedimage.png missing)';
      }
    }

    canvasWrap.appendChild(mainImg);

    // ── Zoom controls ─────────────────────────────────────────────────────────────
    let currentZoom = 0; // 0 = fit
    const zoomLabel = document.createElement('span');
    zoomLabel.className = 'layered-zoom-label';

    function getEffectiveZoom() {
      if (currentZoom !== 0) return currentZoom;
      const avail = canvasWrap.clientWidth > 0 ? canvasWrap.clientWidth - 32 : 0;
      if (avail <= 0 || !W) return 1;
      return Math.min(1, avail / W);
    }

    function applyZoom() {
      const z = getEffectiveZoom();
      if (W) mainImg.style.width = (W * z) + 'px';
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

    // Export button
    const exportBtn = document.createElement('button');
    exportBtn.className = 'layered-zoom-btn';
    exportBtn.textContent = '⬇ PNG';
    exportBtn.title = 'Download merged image as PNG';
    exportBtn.addEventListener('click', () => {
      if (!mergedData) return;
      const a = document.createElement('a');
      a.href = createUrl(mergedData);
      a.download = (intake.name || 'image').replace(/\.[^.]+$/, '') + '.png';
      a.click();
    });
    toolbar.appendChild(exportBtn);

    // Apply initial zoom once image loads (off-DOM safe)
    mainImg.addEventListener('load', applyZoom);
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => {
        if (canvasWrap.clientWidth > 0 && currentZoom === 0) { applyZoom(); ro.disconnect(); }
      });
      ro.observe(canvasWrap);
    }

    // ── Layer panel ───────────────────────────────────────────────────────────────
    let selectedSrc = null;

    async function showLayerImage(src) {
      if (!src || src === selectedSrc) return;
      selectedSrc = src;
      const data = await zip.file(src)?.async('arraybuffer');
      if (!data) return;
      mainImg.src = createUrl(data);
    }

    function buildLayerRows(container, ls, depth) {
      for (const l of ls) {
        const row = document.createElement('div');
        row.className = 'layered-layer' + (l.type === 'group' ? ' layered-group' : '');
        row.style.paddingLeft = (8 + depth * 14) + 'px';

        const eye = document.createElement('span');
        eye.style.marginRight = '6px';
        eye.textContent = l.visibility ? '👁' : '🚫';
        eye.title = l.visibility ? 'Visible' : 'Hidden';
        eye.style.opacity = l.visibility ? '1' : '0.5';

        const name = document.createElement('span');
        name.className = 'layered-name';
        name.textContent = l.name;

        row.appendChild(eye);
        row.appendChild(name);

        if (l.type === 'layer') {
          const opPct = Math.round(l.opacity * 100);
          const meta = document.createElement('span');
          meta.style.marginLeft = 'auto';
          meta.style.fontSize = '11px';
          meta.style.color = 'var(--fg-muted, #888)';
          meta.style.whiteSpace = 'nowrap';
          meta.title = 'Blend: ' + blendLabel(l.blendMode);
          meta.textContent = opPct + '%';
          row.appendChild(meta);

          if (l.src) {
            row.style.cursor = 'pointer';
            row.title = `View layer: ${l.name} (${l.src})`;
            row.addEventListener('click', () => {
              // Deselect all
              container.querySelectorAll('.layered-layer.ora-selected').forEach((r) => r.classList.remove('ora-selected'));
              row.classList.add('ora-selected');
              showLayerImage(l.src);
            });
          }
        }

        container.appendChild(row);

        if (l.type === 'group' && l.children) {
          buildLayerRows(container, l.children, depth + 1);
        }
      }
    }

    // "Back to composite" button at top of layer list
    const compositeRow = document.createElement('div');
    compositeRow.className = 'layered-layer';
    compositeRow.style.cursor = 'pointer';
    compositeRow.style.fontStyle = 'italic';
    compositeRow.style.paddingLeft = '8px';
    compositeRow.textContent = '↩ Merged composite';
    compositeRow.title = 'Show merged composite image';
    compositeRow.addEventListener('click', () => {
      selectedSrc = null;
      if (mergedData) mainImg.src = createUrl(mergedData);
      layerList.querySelectorAll('.ora-selected').forEach((r) => r.classList.remove('ora-selected'));
    });
    layerList.appendChild(compositeRow);

    buildLayerRows(layerList, layers, 0);

    if (layers.length === 0) {
      const empty = document.createElement('div');
      empty.style.padding = '8px';
      empty.style.color = 'var(--fg-muted, #888)';
      empty.textContent = 'No layers found in stack.xml';
      layerList.appendChild(empty);
    }

  } catch (e) {
    wrap.innerHTML = '<div class="layered-error"><strong>Could not read ORA file:</strong><br>' + esc(e.message) + '</div>';
  }

  return {
    parentNode: wrap,
    revoke() {
      for (const url of objectUrls) URL.revokeObjectURL(url);
      objectUrls.length = 0;
    },
  };
}
