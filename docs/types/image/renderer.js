// Image preview. Raster images render in the PARENT pane from a blob: URL (efficient, no base64
// inflation) with fit-to-screen + zoom controls — zoom changes the real pixel size, not a CSS
// transform, so it stays crisp. SVG is text that can carry scripts, so it is DOMPurify-sanitized
// (SVG profile) and shown inside the sandboxed iframe.
import { loadGlobal, vendor } from '../../core/script-loader.js';
import { isSvg, mimeFor, dimensions } from './imglib.js';
import { recordStage3AsciiActivation } from '../../games/metagame/viewer-actions.js';

const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const EDITABLE_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);

export async function render(intake, ctx = {}) {
  if (isSvg(intake)) {
    const DOMPurify = await loadGlobal(vendor('dompurify/purify.min.js'), 'DOMPurify');
    DOMPurify.removed = [];
    const clean = DOMPurify.sanitize(intake.text || '', { USE_PROFILES: { svg: true, svgFilters: true } });
    return { bodyHtml: '<div class="img-doc">' + clean + '</div>', hadUnsafe: DOMPurify.removed.length > 0 };
  }

  // Raster: parent pane + blob URL + fit/zoom controls + ASCII toggle.
  const mime = mimeFor(intake);
  const url = URL.createObjectURL(new Blob([intake.bytes], { type: mime }));
  const canEdit = EDITABLE_MIME.has(mime);
  const host = document.createElement('div');
  host.className = 'imgv-doc';
  host.innerHTML =
    '<div class="imgv-bar">'
    + '<button class="imgv-fit active" title="Fit to screen">Fit</button>'
    + '<button class="imgv-100" title="Actual size">100%</button>'
    + '<button class="imgv-dn" title="Zoom out">−</button>'
    + '<button class="imgv-up" title="Zoom in">+</button>'
    + '<span class="imgv-zoom"></span>'
    + '<span class="imgv-sep"></span>'
    + '<button class="imgv-ascii-btn" title="Toggle ASCII art view">ASCII</button>'
    + '<select class="imgv-ascii-cols" title="Width (columns)" hidden>'
    + '<option value="40">40 cols</option><option value="80" selected>80 cols</option><option value="160">160 cols</option>'
    + '</select>'
    + '<select class="imgv-ascii-color" title="Color mode" hidden>'
    + '<option value="mono" selected>Mono</option><option value="ansi">Color</option>'
    + '</select>'
    + '<select class="imgv-ascii-charset" title="Character set" hidden>'
    + '<option value="blocks" selected>Blocks</option><option value="classic">Classic</option><option value="braille">Braille</option>'
    + '</select>'
    + '<button class="imgv-ascii-copy" title="Copy ASCII text" hidden>Copy</button>'
    + (canEdit ? '<span class="imgv-sep"></span>'
      + '<input class="imgv-text-input" type="text" placeholder="Text overlay" aria-label="Image text">'
      + '<input class="imgv-text-size" type="number" min="8" max="240" value="32" title="Font size">'
      + '<select class="imgv-text-font" title="Font family">'
      + '<option value="system-ui,sans-serif">Sans-serif</option>'
      + '<option value="Georgia,serif">Serif</option>'
      + '<option value="monospace">Mono</option>'
      + '<option value="Impact,sans-serif">Impact</option>'
      + '<option value="cursive">Cursive</option>'
      + '</select>'
      + '<input class="imgv-text-color" type="color" value="#ffffff" title="Text color">'
      + '<button class="imgv-text-apply" title="Draw text on image">Add text</button>'
      + '<span class="imgv-sep"></span>'
      + '<button class="imgv-pencil" title="Pencil / brush draw mode">✏</button>'
      + '<button class="imgv-eraser" title="Eraser mode">◻</button>'
      + '<input class="imgv-draw-color" type="color" value="#ff0000" title="Brush color">'
      + '<select class="imgv-draw-size" title="Brush size">'
      + '<option value="3">3px</option><option value="8" selected>8px</option>'
      + '<option value="20">20px</option><option value="40">40px</option>'
      + '</select>'
      + '<button class="imgv-undo" title="Undo last stroke" hidden>↩</button>'
      + '<span class="imgv-sep"></span>'
      + '<select class="imgv-export-fmt" title="Export format"><option value="">Original format</option>'
      + '<option value="image/png">PNG</option><option value="image/jpeg">JPEG</option><option value="image/webp">WebP</option>'
      + '<option value="image/avif">AVIF</option>'
      + '</select>'
      + '<span class="imgv-sep"></span>'
      + '<button class="imgv-bg-btn" title="Remove background — click to sample a color, then flood-fill to transparent">✂ BG</button>'
      + '<input class="imgv-bg-tol" type="range" min="0" max="80" value="20" title="Tolerance" hidden style="width:72px">'
      + '<button class="imgv-bg-ok" hidden title="Apply background removal (saves as PNG)">Apply</button>'
      + '<button class="imgv-bg-x" hidden title="Cancel background removal">✕</button>'
      + '<button class="imgv-text-reset" title="Reset all edits" hidden>Reset</button>' : '')
    + '</div>'
    + '<div class="imgv-stage"><img class="imgv-img" alt="' + esc(intake.filename) + '"><div class="imgv-note" hidden></div></div>'
    + '<div class="imgv-ascii-out" hidden></div>';

  const img = host.querySelector('.imgv-img');
  const note = host.querySelector('.imgv-note');
  const zoomLabel = host.querySelector('.imgv-zoom');
  const asciiBtn = host.querySelector('.imgv-ascii-btn');
  const asciiCols = host.querySelector('.imgv-ascii-cols');
  const asciiColor = host.querySelector('.imgv-ascii-color');
  const asciiCharset = host.querySelector('.imgv-ascii-charset');
  const asciiCopy = host.querySelector('.imgv-ascii-copy');
  const asciiOut = host.querySelector('.imgv-ascii-out');
  const editInput = host.querySelector('.imgv-text-input');
  const editSize = host.querySelector('.imgv-text-size');
  const editColor = host.querySelector('.imgv-text-color');
  const editApply = host.querySelector('.imgv-text-apply');
  const editReset = host.querySelector('.imgv-text-reset');
  const pencilBtn = canEdit ? host.querySelector('.imgv-pencil') : null;
  const eraserBtn = canEdit ? host.querySelector('.imgv-eraser') : null;
  const drawColorPicker = canEdit ? host.querySelector('.imgv-draw-color') : null;
  const drawSizePicker = canEdit ? host.querySelector('.imgv-draw-size') : null;
  const undoBtn = canEdit ? host.querySelector('.imgv-undo') : null;
  const exportFmt = canEdit ? host.querySelector('.imgv-export-fmt') : null;
  const editFont = canEdit ? host.querySelector('.imgv-text-font') : null;
  const bgBtn = canEdit ? host.querySelector('.imgv-bg-btn') : null;
  const bgTol = canEdit ? host.querySelector('.imgv-bg-tol') : null;
  const bgOk = canEdit ? host.querySelector('.imgv-bg-ok') : null;
  const bgX = canEdit ? host.querySelector('.imgv-bg-x') : null;
  let natural = 0, fit = true, zoom = 1, asciiMode = false, asciiText = '';
  let editedUrl = null, editedBlob = null;
  let drawMode = null, isEraserStroke = false;
  let bgPickMode = false, bgSrcData = null, bgSrcW = 0, bgSrcH = 0, bgPickX = -1, bgPickY = -1, bgPreviewUrl = null;
  const undoStack = [];
  let drawOverlay = null, drawOCtx = null, isPointerDown = false, lastPt = null;

  function getExportMime() { return (exportFmt?.value) || mime; }

  function pushUndo() {
    undoStack.push({ blob: editedBlob || null, url: editedUrl || null });
    if (undoBtn) undoBtn.hidden = false;
  }

  function apply() {
    host.querySelector('.imgv-fit').classList.toggle('active', fit);
    if (fit || !natural) { img.style.width = ''; img.style.maxWidth = ''; img.style.maxHeight = ''; zoomLabel.textContent = 'fit'; }
    else { img.style.maxWidth = 'none'; img.style.maxHeight = 'none'; img.style.width = Math.round(natural * zoom) + 'px'; zoomLabel.textContent = Math.round(zoom * 100) + '%'; }
  }
  host.querySelector('.imgv-fit').addEventListener('click', () => { fit = true; apply(); });
  host.querySelector('.imgv-100').addEventListener('click', () => { fit = false; zoom = 1; apply(); });
  host.querySelector('.imgv-up').addEventListener('click', () => { fit = false; zoom = Math.min(16, zoom * 1.25); apply(); });
  host.querySelector('.imgv-dn').addEventListener('click', () => { fit = false; zoom = Math.max(0.1, zoom / 1.25); apply(); });

  img.addEventListener('error', () => {
    const ext = (intake.filename || '').split('.').pop()?.toLowerCase();
    if (ext === 'jxl' || mime === 'image/jxl') {
      note.hidden = false;
      note.textContent = 'JPEG XL was detected, but this browser cannot decode image/jxl yet. Metadata and download still work; try Safari or a desktop viewer with JPEG XL support.';
      img.hidden = true;
    }
  });
  img.src = url;
  apply();
  dimensions(url).then((d) => { if (d) { natural = d.w; apply(); } });

  // ASCII controls — lazy import to not block initial render
  async function renderAscii() {
    asciiBtn.textContent = 'Loading…';
    asciiBtn.disabled = true;
    try {
      const { imageToAscii } = await import('./ascii-converter.js');
      const cols = parseInt(asciiCols.value, 10) || 80;
      const colorMode = asciiColor.value || 'mono';
      const charset = asciiCharset.value || 'blocks';
      const result = await imageToAscii(intake.bytes, mime, { cols, colorMode, charset });
      asciiText = result.lines.map((l) => (result.isHtml ? l.replace(/<[^>]+>/g, '') : l)).join('\n');
      if (result.isHtml) {
        asciiOut.innerHTML = '<pre class="imgv-ascii-pre">' + result.lines.join('\n') + '</pre>';
      } else {
        asciiOut.textContent = '';
        const pre = document.createElement('pre');
        pre.className = 'imgv-ascii-pre';
        pre.textContent = result.lines.join('\n');
        asciiOut.appendChild(pre);
      }
    } catch (e) {
      asciiOut.textContent = 'ASCII conversion failed: ' + (e.message || e);
    }
    asciiBtn.textContent = 'Image';
    asciiBtn.disabled = false;
  }

  function toggleAscii() {
    asciiMode = !asciiMode;
    asciiBtn.textContent = asciiMode ? 'Image' : 'ASCII';
    asciiBtn.classList.toggle('active', asciiMode);
    host.querySelector('.imgv-stage').hidden = asciiMode;
    asciiOut.hidden = !asciiMode;
    [asciiCols, asciiColor, asciiCharset, asciiCopy].forEach((el) => { el.hidden = !asciiMode; });
    if (asciiMode) {
      renderAscii();
      // Metagame hook
      recordStage3AsciiActivation({ file: intake.filename });

      // Screensaver
      import('./ascii-screensaver.js').then(({ installScreensaver }) => {
        if (!host._ss) {
          host._ss = installScreensaver(host, () => asciiMode);
        }
        host._ss.start();
      });
    } else {
      host._ss?.stop();
    }
  }

  asciiBtn.addEventListener('click', toggleAscii);

  const rerender = () => { if (asciiMode) renderAscii(); };
  asciiCols.addEventListener('change', rerender);
  asciiColor.addEventListener('change', rerender);
  asciiCharset.addEventListener('change', rerender);

  asciiCopy.addEventListener('click', () => {
    if (asciiText) navigator.clipboard?.writeText(asciiText);
  });

  async function drawText() {
    const text = (editInput?.value || '').trim();
    if (!text) return;
    const base = new Image();
    base.decoding = 'async';
    base.src = editedUrl || url;
    await base.decode();
    const canvas = document.createElement('canvas');
    canvas.width = base.naturalWidth;
    canvas.height = base.naturalHeight;
    const g = canvas.getContext('2d');
    if (mime === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, canvas.width, canvas.height); }
    g.drawImage(base, 0, 0);
    const size = Math.max(8, Math.min(240, parseInt(editSize?.value, 10) || 32));
    const pad = Math.max(12, Math.round(size * 0.6));
    const fontFamily = editFont?.value || 'system-ui,sans-serif';
    g.font = `700 ${size}px ${fontFamily}`;
    g.textBaseline = 'bottom';
    g.lineJoin = 'round';
    g.strokeStyle = 'rgba(0,0,0,.72)';
    g.lineWidth = Math.max(3, Math.round(size / 8));
    g.fillStyle = editColor?.value || '#ffffff';
    wrapText(g, text, pad, canvas.height - pad, canvas.width - pad * 2, size * 1.2);
    const targetMime = getExportMime();
    pushUndo();
    editedBlob = await new Promise((resolve) => canvas.toBlob(resolve, targetMime, targetMime === 'image/jpeg' ? 0.92 : undefined));
    if (!editedBlob) return;
    if (editedUrl) URL.revokeObjectURL(editedUrl);
    editedUrl = URL.createObjectURL(editedBlob);
    img.src = editedUrl;
    editReset.hidden = false;
    ctx.onBinaryEdit?.({
      dirty: true,
      mimeType: targetMime,
      getBytes: async () => new Uint8Array(await editedBlob.arrayBuffer()),
    });
  }

  function wrapText(g, text, x, y, maxWidth, lineHeight) {
    const words = text.split(/\s+/);
    const lines = [];
    let line = '';
    for (const word of words) {
      const next = line ? line + ' ' + word : word;
      if (line && g.measureText(next).width > maxWidth) { lines.push(line); line = word; }
      else line = next;
    }
    if (line) lines.push(line);
    const startY = y - Math.max(0, lines.length - 1) * lineHeight;
    lines.forEach((l, i) => {
      const yy = startY + i * lineHeight;
      g.strokeText(l, x, yy, maxWidth);
      g.fillText(l, x, yy, maxWidth);
    });
  }

  editApply?.addEventListener('click', () => { drawText().catch((e) => { editApply.title = e.message || String(e); }); });
  editReset?.addEventListener('click', () => {
    undoStack.forEach((s) => { if (s.url) URL.revokeObjectURL(s.url); });
    undoStack.length = 0;
    if (undoBtn) undoBtn.hidden = true;
    if (editedUrl) URL.revokeObjectURL(editedUrl);
    editedUrl = null;
    editedBlob = null;
    img.src = url;
    editReset.hidden = true;
    ctx.onBinaryEdit?.(null);
  });

  // Pencil / eraser drawing tools
  function buildOverlay() {
    const stage = host.querySelector('.imgv-stage');
    stage.style.position = 'relative';
    drawOverlay = document.createElement('canvas');
    drawOverlay.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;touch-action:none;';
    stage.appendChild(drawOverlay);
    drawOCtx = drawOverlay.getContext('2d');
    img.addEventListener('load', () => {
      if (drawOverlay && !isEraserStroke) { drawOverlay.width = img.naturalWidth || 1; drawOverlay.height = img.naturalHeight || 1; }
    });
    if (img.naturalWidth) { drawOverlay.width = img.naturalWidth; drawOverlay.height = img.naturalHeight; }
    drawOverlay.addEventListener('mousedown', onPDown);
    drawOverlay.addEventListener('mousemove', onPMove);
    drawOverlay.addEventListener('mouseup', onPUp);
    drawOverlay.addEventListener('mouseleave', () => { if (isPointerDown) { isPointerDown = false; commitDraw(); } });
    drawOverlay.addEventListener('touchstart', onPDown, { passive: false });
    drawOverlay.addEventListener('touchmove', onPMove, { passive: false });
    drawOverlay.addEventListener('touchend', onPUp);
  }

  function setDrawMode(mode) {
    drawMode = drawMode === mode ? null : mode;
    pencilBtn?.classList.toggle('active', drawMode === 'pencil');
    eraserBtn?.classList.toggle('active', drawMode === 'eraser');
    if (!drawOverlay && drawMode) buildOverlay();
    if (drawOverlay) {
      drawOverlay.style.pointerEvents = drawMode ? 'auto' : 'none';
      drawOverlay.style.cursor = drawMode === 'eraser' ? 'cell' : drawMode === 'pencil' ? 'crosshair' : '';
    }
  }

  function ptToCanvas(e) {
    const r = drawOverlay.getBoundingClientRect();
    const sx = drawOverlay.width / r.width, sy = drawOverlay.height / r.height;
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - r.left) * sx, y: (src.clientY - r.top) * sy };
  }

  function applyStrokeStyle(sz) {
    drawOCtx.globalCompositeOperation = isEraserStroke ? 'destination-out' : 'source-over';
    drawOCtx.strokeStyle = drawColorPicker?.value || '#ff0000';
    drawOCtx.fillStyle = drawColorPicker?.value || '#ff0000';
    drawOCtx.lineWidth = sz; drawOCtx.lineCap = 'round'; drawOCtx.lineJoin = 'round';
  }

  async function onPDown(e) {
    if (!drawMode || !drawOverlay) return;
    e.preventDefault();
    isPointerDown = true;
    isEraserStroke = drawMode === 'eraser';
    pushUndo();
    if (isEraserStroke) {
      // preload overlay with committed image so destination-out punches real pixels
      const base = new Image(); base.decoding = 'async'; base.src = editedUrl || url;
      await base.decode();
      drawOverlay.width = base.naturalWidth; drawOverlay.height = base.naturalHeight;
      if (mime === 'image/jpeg') { drawOCtx.fillStyle = '#fff'; drawOCtx.fillRect(0, 0, drawOverlay.width, drawOverlay.height); }
      drawOCtx.drawImage(base, 0, 0);
    } else if (!drawOverlay.width || !img.naturalWidth) {
      drawOverlay.width = img.naturalWidth || 1; drawOverlay.height = img.naturalHeight || 1;
    }
    lastPt = ptToCanvas(e);
    const sz = parseInt(drawSizePicker?.value || '8', 10);
    applyStrokeStyle(sz);
    drawOCtx.beginPath(); drawOCtx.arc(lastPt.x, lastPt.y, sz / 2, 0, Math.PI * 2); drawOCtx.fill();
  }

  function onPMove(e) {
    if (!isPointerDown || !drawOCtx) return;
    e.preventDefault();
    const pt = ptToCanvas(e);
    const sz = parseInt(drawSizePicker?.value || '8', 10);
    applyStrokeStyle(sz);
    drawOCtx.beginPath(); drawOCtx.moveTo(lastPt.x, lastPt.y); drawOCtx.lineTo(pt.x, pt.y); drawOCtx.stroke();
    lastPt = pt;
  }

  async function commitDraw() {
    if (!drawOverlay || !drawOverlay.width) return;
    const targetMime = getExportMime();
    let blob;
    if (isEraserStroke) {
      blob = await new Promise((r) => drawOverlay.toBlob(r, targetMime, targetMime === 'image/jpeg' ? 0.92 : undefined));
    } else {
      const base = new Image(); base.decoding = 'async'; base.src = editedUrl || url;
      await base.decode();
      const c = document.createElement('canvas'); c.width = base.naturalWidth; c.height = base.naturalHeight;
      const g = c.getContext('2d');
      if (mime === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
      g.drawImage(base, 0, 0); g.drawImage(drawOverlay, 0, 0);
      blob = await new Promise((r) => c.toBlob(r, targetMime, targetMime === 'image/jpeg' ? 0.92 : undefined));
    }
    drawOCtx.clearRect(0, 0, drawOverlay.width, drawOverlay.height);
    if (!blob) return;
    if (editedUrl) URL.revokeObjectURL(editedUrl);
    editedBlob = blob; editedUrl = URL.createObjectURL(blob);
    img.src = editedUrl;
    if (editReset) editReset.hidden = false;
    ctx.onBinaryEdit?.({ dirty: true, mimeType: targetMime, getBytes: async () => new Uint8Array(await blob.arrayBuffer()) });
  }

  async function onPUp(e) { if (isPointerDown) { isPointerDown = false; await commitDraw(); } }

  if (pencilBtn) {
    pencilBtn.addEventListener('click', () => setDrawMode('pencil'));
    eraserBtn.addEventListener('click', () => setDrawMode('eraser'));
    undoBtn?.addEventListener('click', async () => {
      const prev = undoStack.pop();
      if (!prev) return;
      if (editedUrl && editedUrl !== prev.url) URL.revokeObjectURL(editedUrl);
      editedBlob = prev.blob; editedUrl = prev.url;
      if (editedUrl) {
        img.src = editedUrl;
        ctx.onBinaryEdit?.({ dirty: true, mimeType: getExportMime(), getBytes: async () => new Uint8Array(await editedBlob.arrayBuffer()) });
      } else {
        img.src = url;
        if (editReset) editReset.hidden = true;
        ctx.onBinaryEdit?.(null);
      }
      if (undoBtn) undoBtn.hidden = undoStack.length === 0;
    });
  }

  // BG removal — flood-fill from a clicked pixel, making matched region transparent (PNG only)
  function bgFloodFill(srcData, w, h, sx, sy, tol) {
    const threshold = tol * 4.42;
    const dst = new Uint8ClampedArray(srcData.data);
    const si = (sy * w + sx) * 4;
    const r0 = dst[si], g0 = dst[si + 1], b0 = dst[si + 2];
    const visited = new Uint8Array(w * h);
    const stack = [sy * w + sx];
    while (stack.length) {
      const pos = stack.pop();
      if (visited[pos]) continue;
      visited[pos] = 1;
      const pi = pos * 4;
      const dr = dst[pi] - r0, dg = dst[pi + 1] - g0, db = dst[pi + 2] - b0;
      if (Math.sqrt(dr * dr + dg * dg + db * db) > threshold) continue;
      dst[pi + 3] = 0;
      const x = pos % w, y = (pos / w) | 0;
      if (x > 0) stack.push(pos - 1);
      if (x < w - 1) stack.push(pos + 1);
      if (y > 0) stack.push(pos - w);
      if (y < h - 1) stack.push(pos + w);
    }
    return new ImageData(dst, w, h);
  }

  function bgExitMode() {
    bgPickMode = false;
    bgPickX = bgPickY = -1;
    bgSrcData = null;
    if (bgPreviewUrl) { URL.revokeObjectURL(bgPreviewUrl); bgPreviewUrl = null; }
    bgBtn?.classList.remove('active');
    img.style.cursor = '';
    if (bgTol) bgTol.hidden = true;
    if (bgOk) bgOk.hidden = true;
    if (bgX) bgX.hidden = true;
  }

  function bgRunPreview() {
    if (!bgSrcData || bgPickX < 0) return;
    const filled = bgFloodFill(bgSrcData, bgSrcW, bgSrcH, bgPickX, bgPickY, parseInt(bgTol.value, 10));
    const c = document.createElement('canvas'); c.width = bgSrcW; c.height = bgSrcH;
    c.getContext('2d').putImageData(filled, 0, 0);
    c.toBlob((blob) => {
      if (!blob) return;
      if (bgPreviewUrl) URL.revokeObjectURL(bgPreviewUrl);
      bgPreviewUrl = URL.createObjectURL(blob);
      img.src = bgPreviewUrl;
    }, 'image/png');
  }

  if (bgBtn) {
    bgBtn.addEventListener('click', () => {
      if (bgPickMode) { bgExitMode(); if (editedUrl) img.src = editedUrl; else img.src = url; return; }
      bgPickMode = true;
      bgPickX = bgPickY = -1;
      bgSrcData = null;
      bgBtn.classList.add('active');
      img.style.cursor = 'crosshair';
      bgBtn.title = 'Click the background color on the image';
    });

    img.addEventListener('click', async (e) => {
      if (!bgPickMode) return;
      if (bgPickX >= 0) return; // already picked, re-pick not allowed until cancel
      const base = new Image(); base.decoding = 'async';
      base.src = editedUrl || url;
      await base.decode();
      const c = document.createElement('canvas');
      c.width = base.naturalWidth; c.height = base.naturalHeight;
      const g = c.getContext('2d'); g.drawImage(base, 0, 0);
      bgSrcData = g.getImageData(0, 0, c.width, c.height);
      bgSrcW = c.width; bgSrcH = c.height;
      const r = img.getBoundingClientRect();
      bgPickX = Math.max(0, Math.min(bgSrcW - 1, Math.round((e.clientX - r.left) * bgSrcW / r.width)));
      bgPickY = Math.max(0, Math.min(bgSrcH - 1, Math.round((e.clientY - r.top) * bgSrcH / r.height)));
      if (bgTol) bgTol.hidden = false;
      if (bgOk) bgOk.hidden = false;
      if (bgX) bgX.hidden = false;
      bgRunPreview();
    });

    bgTol?.addEventListener('input', bgRunPreview);

    bgOk?.addEventListener('click', () => {
      if (!bgSrcData || bgPickX < 0) return;
      const filled = bgFloodFill(bgSrcData, bgSrcW, bgSrcH, bgPickX, bgPickY, parseInt(bgTol.value, 10));
      const c = document.createElement('canvas'); c.width = bgSrcW; c.height = bgSrcH;
      c.getContext('2d').putImageData(filled, 0, 0);
      c.toBlob((blob) => {
        if (!blob) return;
        pushUndo();
        if (editedUrl) URL.revokeObjectURL(editedUrl);
        editedBlob = blob; editedUrl = URL.createObjectURL(blob);
        img.src = editedUrl;
        if (editReset) editReset.hidden = false;
        if (exportFmt) exportFmt.value = 'image/png';
        ctx.onBinaryEdit?.({ dirty: true, mimeType: 'image/png', getBytes: async () => new Uint8Array(await blob.arrayBuffer()) });
        bgExitMode();
      }, 'image/png');
    });

    bgX?.addEventListener('click', () => {
      bgExitMode();
      if (editedUrl) img.src = editedUrl; else img.src = url;
    });
  }

  return { parentNode: host, revoke: () => { URL.revokeObjectURL(url); if (editedUrl) URL.revokeObjectURL(editedUrl); if (bgPreviewUrl) URL.revokeObjectURL(bgPreviewUrl); undoStack.forEach((s) => { if (s.url) URL.revokeObjectURL(s.url); }); host._ss?.stop(); } };
}
