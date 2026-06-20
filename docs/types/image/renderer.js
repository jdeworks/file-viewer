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
      + '<button class="imgv-pencil" title="Pencil / brush draw mode">Pencil</button>'
      + '<button class="imgv-eraser" title="Eraser mode">Eraser</button>'
      + '<input class="imgv-draw-color" type="color" value="#ff0000" title="Brush color">'
      + '<select class="imgv-draw-size" title="Brush size">'
      + '<option value="3">3px</option><option value="8" selected>8px</option>'
      + '<option value="20">20px</option><option value="40">40px</option>'
      + '</select>'
      + '<button class="imgv-undo" title="Undo last stroke" hidden>↩</button>'
      + '<span class="imgv-sep"></span>'
      + '<button class="imgv-rot-l" title="Rotate 90° counter-clockwise">↺ 90°</button>'
      + '<button class="imgv-rot-r" title="Rotate 90° clockwise">↻ 90°</button>'
      + '<button class="imgv-flip-h" title="Flip horizontally">↔ Flip H</button>'
      + '<button class="imgv-flip-v" title="Flip vertically">↕ Flip V</button>'
      + '<span class="imgv-sep"></span>'
      + '<button class="imgv-filters-btn" title="Show brightness/contrast/saturation controls">⚙ Filters</button>'
      + '<span class="imgv-filters-panel" hidden style="display:inline-flex;gap:4px;align-items:center;flex-wrap:wrap;">'
      + '<label style="font-size:0.8em">Brightness <input class="imgv-f-brightness" type="range" min="0" max="200" value="100" style="width:70px"></label>'
      + '<label style="font-size:0.8em">Contrast <input class="imgv-f-contrast" type="range" min="0" max="200" value="100" style="width:70px"></label>'
      + '<label style="font-size:0.8em">Saturation <input class="imgv-f-saturation" type="range" min="0" max="200" value="100" style="width:70px"></label>'
      + '<button class="imgv-f-apply">Apply Filters</button>'
      + '<button class="imgv-f-reset">Reset</button>'
      + '</span>'
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
      + '<span class="imgv-sep"></span>'
      + '<button class="imgv-crop-btn" title="Crop image — drag a rectangle to select the region to keep">✂ Crop</button>'
      + '<button class="imgv-crop-apply" hidden title="Apply the selected crop region">Apply Crop</button>'
      + '<button class="imgv-crop-cancel" hidden title="Cancel crop">Cancel</button>'
      + '<span class="imgv-sep"></span>'
      + '<button class="imgv-resize-btn" title="Resize image to specific dimensions">⊡ Resize</button>'
      + '<span class="imgv-resize-panel" hidden style="display:inline-flex;gap:4px;align-items:center;flex-wrap:wrap;">'
      + '<label style="font-size:0.8em">W <input class="imgv-resize-w" type="number" min="1" max="16000" style="width:60px"> px</label>'
      + '<label style="font-size:0.8em">H <input class="imgv-resize-h" type="number" min="1" max="16000" style="width:60px"> px</label>'
      + '<label style="font-size:0.8em"><input class="imgv-resize-lock" type="checkbox" checked> Lock ratio</label>'
      + '<button class="imgv-resize-apply">Apply Resize</button>'
      + '<button class="imgv-resize-cancel">Cancel</button>'
      + '</span>'
      + '<button class="imgv-text-reset" title="Reset all edits" hidden>Reset</button>'
      + '<span class="imgv-dirty-indicator" hidden style="color:var(--accent,#f59e0b);font-size:0.75em;align-self:center;">● Modified</span>' : '')
    + '</div>'
    + '<div class="imgv-stage"><img class="imgv-img" draggable="false" alt="' + esc(intake.filename) + '"><div class="imgv-note" hidden></div></div>'
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
  const cropBtn = canEdit ? host.querySelector('.imgv-crop-btn') : null;
  const cropApplyBtn = canEdit ? host.querySelector('.imgv-crop-apply') : null;
  const cropCancelBtn = canEdit ? host.querySelector('.imgv-crop-cancel') : null;
  const resizeBtn = canEdit ? host.querySelector('.imgv-resize-btn') : null;
  const resizePanel = canEdit ? host.querySelector('.imgv-resize-panel') : null;
  const resizeW = canEdit ? host.querySelector('.imgv-resize-w') : null;
  const resizeH = canEdit ? host.querySelector('.imgv-resize-h') : null;
  const resizeLock = canEdit ? host.querySelector('.imgv-resize-lock') : null;
  const resizeApplyBtn = canEdit ? host.querySelector('.imgv-resize-apply') : null;
  const resizeCancelBtn = canEdit ? host.querySelector('.imgv-resize-cancel') : null;
  const rotLBtn = canEdit ? host.querySelector('.imgv-rot-l') : null;
  const rotRBtn = canEdit ? host.querySelector('.imgv-rot-r') : null;
  const flipHBtn = canEdit ? host.querySelector('.imgv-flip-h') : null;
  const flipVBtn = canEdit ? host.querySelector('.imgv-flip-v') : null;
  const filtersBtn = canEdit ? host.querySelector('.imgv-filters-btn') : null;
  const filtersPanel = canEdit ? host.querySelector('.imgv-filters-panel') : null;
  const fBrightness = canEdit ? host.querySelector('.imgv-f-brightness') : null;
  const fContrast = canEdit ? host.querySelector('.imgv-f-contrast') : null;
  const fSaturation = canEdit ? host.querySelector('.imgv-f-saturation') : null;
  const fApplyBtn = canEdit ? host.querySelector('.imgv-f-apply') : null;
  const fResetBtn = canEdit ? host.querySelector('.imgv-f-reset') : null;
  let natural = 0, fit = true, zoom = 1, asciiMode = false, asciiText = '';
  let editedUrl = null, editedBlob = null;
  let drawMode = null, isEraserStroke = false;
  let textPlaceMode = false, textPlaceX = 0.5, textPlaceY = 0.5;
  let bgPickMode = false, bgSrcData = null, bgSrcW = 0, bgSrcH = 0, bgPickX = -1, bgPickY = -1, bgPreviewUrl = null;
  const undoStack = [];
  let drawOverlay = null, drawOCtx = null, isPointerDown = false, lastPt = null;
  // Crop state
  let cropMode = false, cropOverlay = null, cropSelBox = null;
  let cropStartX = 0, cropStartY = 0, cropEndX = 0, cropEndY = 0, cropDragging = false, cropHasRegion = false;

  function getExportMime() { return (exportFmt?.value) || mime; }

  function pushUndo() {
    undoStack.push({ blob: editedBlob || null, url: editedUrl || null });
    if (undoBtn) undoBtn.hidden = false;
    host.querySelector('.imgv-dirty-indicator')?.removeAttribute('hidden');
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

  async function commitText(nx, ny) {
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
    const fontFamily = editFont?.value || 'system-ui,sans-serif';
    g.font = `700 ${size}px ${fontFamily}`;
    g.textBaseline = 'alphabetic';
    g.lineJoin = 'round';
    g.strokeStyle = 'rgba(0,0,0,.72)';
    g.lineWidth = Math.max(3, Math.round(size / 8));
    g.fillStyle = editColor?.value || '#ffffff';
    const px = Math.round((nx ?? 0.5) * canvas.width);
    const py = Math.round((ny ?? 0.5) * canvas.height);
    const maxW = Math.round(canvas.width * 0.8);
    g.strokeText(text, px, py, maxW);
    g.fillText(text, px, py, maxW);
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

  let textDragDiv = null, textCommitBtn = null, textCancelBtn = null;

  function exitTextPlaceMode() {
    textPlaceMode = false;
    if (textDragDiv) { textDragDiv.remove(); textDragDiv = null; }
    if (textCommitBtn) { textCommitBtn.remove(); textCommitBtn = null; }
    if (textCancelBtn) { textCancelBtn.remove(); textCancelBtn = null; }
    if (editApply) { editApply.textContent = 'Add text'; editApply.classList.remove('active'); }
  }

  function enterTextPlaceMode() {
    const text = (editInput?.value || '').trim();
    if (!text) { editInput?.focus(); return; }
    if (textPlaceMode) { exitTextPlaceMode(); return; }
    textPlaceMode = true;
    if (editApply) { editApply.textContent = 'Cancel'; editApply.classList.add('active'); }

    // Create draggable text overlay div
    const stage = host.querySelector('.imgv-stage');
    stage.style.position = 'relative';
    const fontSize = Math.max(8, Math.min(240, parseInt(editSize?.value, 10) || 32));
    const fontFamily = editFont?.value || 'system-ui,sans-serif';
    const color = editColor?.value || '#ffffff';

    textDragDiv = document.createElement('div');
    textDragDiv.textContent = text;
    textDragDiv.style.cssText = [
      'position:absolute',
      'z-index:10',
      'cursor:move',
      'user-select:none',
      `font-size:${fontSize}px`,
      `font-family:${fontFamily}`,
      `color:${color}`,
      'font-weight:700',
      'background:rgba(255,255,255,0.15)',
      'padding:2px 4px',
      'border-radius:3px',
      'white-space:nowrap',
      'touch-action:none',
    ].join(';');
    // Start at 10%, 10% of stage
    textDragDiv.style.left = '10%';
    textDragDiv.style.top = '10%';
    stage.appendChild(textDragDiv);

    // Drag logic
    let dragOffX = 0, dragOffY = 0, dragging = false;
    textDragDiv.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      textDragDiv.setPointerCapture(e.pointerId);
      const r = textDragDiv.getBoundingClientRect();
      dragOffX = e.clientX - r.left;
      dragOffY = e.clientY - r.top;
      dragging = true;
    });
    textDragDiv.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      e.preventDefault();
      const stageR = stage.getBoundingClientRect();
      const x = e.clientX - stageR.left - dragOffX;
      const y = e.clientY - stageR.top - dragOffY;
      textDragDiv.style.left = x + 'px';
      textDragDiv.style.top = y + 'px';
    });
    textDragDiv.addEventListener('pointerup', () => { dragging = false; });

    // Commit and Cancel buttons injected into the bar
    const bar = host.querySelector('.imgv-bar');
    textCommitBtn = document.createElement('button');
    textCommitBtn.textContent = 'Commit text';
    textCommitBtn.className = 'imgv-text-commit';
    textCommitBtn.title = 'Place the text at its current position';
    bar.appendChild(textCommitBtn);

    textCancelBtn = document.createElement('button');
    textCancelBtn.textContent = 'Cancel';
    textCancelBtn.className = 'imgv-text-cancel-place';
    textCancelBtn.title = 'Cancel text placement';
    bar.appendChild(textCancelBtn);

    textCommitBtn.addEventListener('click', () => {
      // Compute position as fraction of img display rect
      const imgR = img.getBoundingClientRect();
      const divR = textDragDiv.getBoundingClientRect();
      const nx = (divR.left - imgR.left) / imgR.width;
      const ny = (divR.bottom - imgR.top) / imgR.height; // bottom = baseline
      exitTextPlaceMode();
      commitText(nx, ny).catch((err) => { if (editApply) editApply.title = err.message || String(err); });
    });

    textCancelBtn.addEventListener('click', () => {
      exitTextPlaceMode();
    });
  }

  editApply?.addEventListener('click', () => {
    enterTextPlaceMode();
  });
  editReset?.addEventListener('click', () => {
    exitTextPlaceMode();
    undoStack.forEach((s) => { if (s.url) URL.revokeObjectURL(s.url); });
    undoStack.length = 0;
    if (undoBtn) undoBtn.hidden = true;
    if (editedUrl) URL.revokeObjectURL(editedUrl);
    editedUrl = null;
    editedBlob = null;
    img.src = url;
    img.style.filter = '';
    editReset.hidden = true;
    const dirtyIndicator = host.querySelector('.imgv-dirty-indicator');
    if (dirtyIndicator) dirtyIndicator.hidden = true;
    ctx.onBinaryEdit?.(null);
  });

  // Helper: draw the current image onto a canvas with a transform, then commit it as the new edit.
  async function applyTransform(transformFn, newW, newH) {
    const base = new Image();
    base.decoding = 'async';
    base.src = editedUrl || url;
    await base.decode();
    const srcW = base.naturalWidth, srcH = base.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = newW(srcW, srcH);
    canvas.height = newH(srcW, srcH);
    const g = canvas.getContext('2d');
    if (mime === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, canvas.width, canvas.height); }
    transformFn(g, srcW, srcH, canvas.width, canvas.height);
    g.drawImage(base, 0, 0);
    const targetMime = getExportMime();
    pushUndo();
    editedBlob = await new Promise((resolve) => canvas.toBlob(resolve, targetMime, targetMime === 'image/jpeg' ? 0.92 : undefined));
    if (!editedBlob) return;
    if (editedUrl) URL.revokeObjectURL(editedUrl);
    editedUrl = URL.createObjectURL(editedBlob);
    img.src = editedUrl;
    editReset.hidden = false;
    ctx.onBinaryEdit?.({ dirty: true, mimeType: targetMime, getBytes: async () => new Uint8Array(await editedBlob.arrayBuffer()) });
  }

  // Rotate left (CCW 90°): new canvas is h×w, pivot at center, rotate -90°
  rotLBtn?.addEventListener('click', () => applyTransform(
    (g, sw, sh, cw, ch) => { g.translate(cw / 2, ch / 2); g.rotate(-Math.PI / 2); g.translate(-sh / 2, -sw / 2); },
    (sw, sh) => sh, (sw, sh) => sw,
  ));

  // Rotate right (CW 90°): new canvas is h×w, pivot at center, rotate +90°
  rotRBtn?.addEventListener('click', () => applyTransform(
    (g, sw, sh, cw, ch) => { g.translate(cw / 2, ch / 2); g.rotate(Math.PI / 2); g.translate(-sh / 2, -sw / 2); },
    (sw, sh) => sh, (sw, sh) => sw,
  ));

  // Flip horizontal: scale(-1,1) around center
  flipHBtn?.addEventListener('click', () => applyTransform(
    (g, sw, sh, cw, ch) => { g.translate(cw, 0); g.scale(-1, 1); },
    (sw) => sw, (sw, sh) => sh,
  ));

  // Flip vertical: scale(1,-1) around center
  flipVBtn?.addEventListener('click', () => applyTransform(
    (g, sw, sh, cw, ch) => { g.translate(0, ch); g.scale(1, -1); },
    (sw) => sw, (sw, sh) => sh,
  ));

  // Filters panel toggle
  filtersBtn?.addEventListener('click', () => {
    if (filtersPanel) filtersPanel.hidden = !filtersPanel.hidden;
  });

  // Live filter preview — apply as CSS filter on img while sliding
  function updateFilterPreview() {
    img.style.filter = `brightness(${fBrightness.value}%) contrast(${fContrast.value}%) saturate(${fSaturation.value}%)`;
  }
  fBrightness?.addEventListener('input', updateFilterPreview);
  fContrast?.addEventListener('input', updateFilterPreview);
  fSaturation?.addEventListener('input', updateFilterPreview);

  // Apply filters — bake current CSS filter into the canvas, then clear the live preview
  fApplyBtn?.addEventListener('click', async () => {
    const brightness = fBrightness?.value || '100';
    const contrast = fContrast?.value || '100';
    const saturation = fSaturation?.value || '100';
    img.style.filter = ''; // clear live preview before baking
    const base = new Image();
    base.decoding = 'async';
    base.src = editedUrl || url;
    await base.decode();
    const canvas = document.createElement('canvas');
    canvas.width = base.naturalWidth;
    canvas.height = base.naturalHeight;
    const g = canvas.getContext('2d');
    if (mime === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, canvas.width, canvas.height); }
    g.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    g.drawImage(base, 0, 0);
    g.filter = 'none';
    const targetMime = getExportMime();
    pushUndo();
    editedBlob = await new Promise((resolve) => canvas.toBlob(resolve, targetMime, targetMime === 'image/jpeg' ? 0.92 : undefined));
    if (!editedBlob) return;
    if (editedUrl) URL.revokeObjectURL(editedUrl);
    editedUrl = URL.createObjectURL(editedBlob);
    img.src = editedUrl;
    editReset.hidden = false;
    ctx.onBinaryEdit?.({ dirty: true, mimeType: targetMime, getBytes: async () => new Uint8Array(await editedBlob.arrayBuffer()) });
  });

  // Reset filter sliders to default and clear any live preview
  fResetBtn?.addEventListener('click', () => {
    if (fBrightness) fBrightness.value = '100';
    if (fContrast) fContrast.value = '100';
    if (fSaturation) fSaturation.value = '100';
    img.style.filter = '';
  });

  // Pencil / eraser drawing tools
  function buildOverlay() {
    const stage = host.querySelector('.imgv-stage');
    stage.style.position = 'relative';
    drawOverlay = document.createElement('canvas');
    drawOverlay.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;touch-action:none;z-index:2;';
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
    img.style.pointerEvents = drawMode ? 'none' : '';
  }

  function ptToCanvas(e) {
    const r = drawOverlay.getBoundingClientRect();
    const sx = drawOverlay.width / r.width, sy = drawOverlay.height / r.height;
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - r.left) * sx, y: (src.clientY - r.top) * sy };
  }

  function getCanvasBrushSize() {
    const displayPx = parseInt(drawSizePicker?.value || '8', 10);
    if (!drawOverlay) return displayPx;
    const r = drawOverlay.getBoundingClientRect();
    const scale = r.width > 0 ? drawOverlay.width / r.width : 1;
    return Math.max(1, Math.round(displayPx * scale));
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
    if (!isEraserStroke && img.naturalWidth && drawOverlay.width !== img.naturalWidth) {
      drawOverlay.width = img.naturalWidth;
      drawOverlay.height = img.naturalHeight;
    }
    lastPt = ptToCanvas(e);
    const sz = getCanvasBrushSize();
    applyStrokeStyle(sz);
    drawOCtx.beginPath(); drawOCtx.arc(lastPt.x, lastPt.y, sz / 2, 0, Math.PI * 2); drawOCtx.fill();
  }

  function onPMove(e) {
    if (!isPointerDown || !drawOCtx) return;
    e.preventDefault();
    const pt = ptToCanvas(e);
    const sz = getCanvasBrushSize();
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

  // Crop tool — drag a rectangle on the image to select a region, then apply to commit
  function cropExitMode() {
    cropMode = false;
    cropHasRegion = false;
    cropDragging = false;
    if (cropOverlay) { cropOverlay.remove(); cropOverlay = null; cropSelBox = null; }
    if (cropBtn) { cropBtn.classList.remove('active'); }
    if (cropApplyBtn) cropApplyBtn.hidden = true;
    if (cropCancelBtn) cropCancelBtn.hidden = true;
  }

  function cropEnterMode() {
    cropMode = true;
    cropHasRegion = false;
    const stage = host.querySelector('.imgv-stage');
    stage.style.position = 'relative';
    cropOverlay = document.createElement('div');
    cropOverlay.style.cssText = 'position:absolute;inset:0;cursor:crosshair;z-index:5;';
    cropSelBox = document.createElement('div');
    cropSelBox.style.cssText = 'position:absolute;border:2px dashed #0af;box-sizing:border-box;background:rgba(0,170,255,0.08);pointer-events:none;display:none;';
    cropOverlay.appendChild(cropSelBox);
    stage.appendChild(cropOverlay);
    if (cropBtn) cropBtn.classList.add('active');
    if (cropCancelBtn) cropCancelBtn.hidden = false;

    cropOverlay.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      cropOverlay.setPointerCapture(e.pointerId);
      const r = img.getBoundingClientRect();
      cropStartX = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      cropStartY = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
      cropEndX = cropStartX; cropEndY = cropStartY;
      cropDragging = true; cropHasRegion = false;
      cropSelBox.style.display = 'none';
      if (cropApplyBtn) cropApplyBtn.hidden = true;
    });

    cropOverlay.addEventListener('pointermove', (e) => {
      if (!cropDragging) return;
      e.preventDefault();
      const r = img.getBoundingClientRect();
      cropEndX = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      cropEndY = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
      // Update the selection box overlay using img bounding rect relative to stage
      const stageR = host.querySelector('.imgv-stage').getBoundingClientRect();
      const imgR = img.getBoundingClientRect();
      const ox = imgR.left - stageR.left;
      const oy = imgR.top - stageR.top;
      const x1 = Math.min(cropStartX, cropEndX) * imgR.width + ox;
      const y1 = Math.min(cropStartY, cropEndY) * imgR.height + oy;
      const x2 = Math.max(cropStartX, cropEndX) * imgR.width + ox;
      const y2 = Math.max(cropStartY, cropEndY) * imgR.height + oy;
      cropSelBox.style.left = x1 + 'px'; cropSelBox.style.top = y1 + 'px';
      cropSelBox.style.width = (x2 - x1) + 'px'; cropSelBox.style.height = (y2 - y1) + 'px';
      cropSelBox.style.display = 'block';
    });

    cropOverlay.addEventListener('pointerup', (e) => {
      if (!cropDragging) return;
      cropDragging = false;
      const r = img.getBoundingClientRect();
      cropEndX = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      cropEndY = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
      // Check minimum size (10×10 natural px)
      const nw = img.naturalWidth || 1, nh = img.naturalHeight || 1;
      const selW = Math.abs(cropEndX - cropStartX) * nw;
      const selH = Math.abs(cropEndY - cropStartY) * nh;
      if (selW >= 10 && selH >= 10) {
        cropHasRegion = true;
        if (cropApplyBtn) cropApplyBtn.hidden = false;
      }
    });
  }

  async function applyCrop() {
    if (!cropHasRegion) return;
    const nw = img.naturalWidth, nh = img.naturalHeight;
    const x1 = Math.round(Math.min(cropStartX, cropEndX) * nw);
    const y1 = Math.round(Math.min(cropStartY, cropEndY) * nh);
    const x2 = Math.round(Math.max(cropStartX, cropEndX) * nw);
    const y2 = Math.round(Math.max(cropStartY, cropEndY) * nh);
    const cw = Math.max(1, x2 - x1), ch = Math.max(1, y2 - y1);
    const base = new Image(); base.decoding = 'async';
    base.src = editedUrl || url;
    await base.decode();
    const canvas = document.createElement('canvas');
    canvas.width = cw; canvas.height = ch;
    const g = canvas.getContext('2d');
    if (mime === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, cw, ch); }
    g.drawImage(base, -x1, -y1);
    const targetMime = getExportMime();
    pushUndo();
    editedBlob = await new Promise((resolve) => canvas.toBlob(resolve, targetMime, targetMime === 'image/jpeg' ? 0.92 : undefined));
    if (!editedBlob) return;
    if (editedUrl) URL.revokeObjectURL(editedUrl);
    editedUrl = URL.createObjectURL(editedBlob);
    img.src = editedUrl;
    if (editReset) editReset.hidden = false;
    ctx.onBinaryEdit?.({ dirty: true, mimeType: targetMime, getBytes: async () => new Uint8Array(await editedBlob.arrayBuffer()) });
    cropExitMode();
  }

  if (cropBtn) {
    cropBtn.addEventListener('click', () => {
      if (cropMode) { cropExitMode(); } else { cropEnterMode(); }
    });
    cropApplyBtn?.addEventListener('click', () => {
      applyCrop().catch((e) => { if (cropApplyBtn) cropApplyBtn.title = e.message || String(e); });
    });
    cropCancelBtn?.addEventListener('click', cropExitMode);
  }

  // Resize tool — show a panel with width/height inputs, apply draws to a new canvas at that size
  function resizePopulate() {
    if (!resizeW || !resizeH) return;
    resizeW.value = String(img.naturalWidth || '');
    resizeH.value = String(img.naturalHeight || '');
  }

  if (resizeBtn) {
    resizeBtn.addEventListener('click', () => {
      if (!resizePanel) return;
      const open = resizePanel.hidden === false;
      resizePanel.hidden = open;
      if (!open) resizePopulate();
    });

    resizeW?.addEventListener('input', () => {
      if (!resizeLock?.checked) return;
      const nw = img.naturalWidth || 1, nh = img.naturalHeight || 1;
      const w = parseInt(resizeW.value, 10);
      if (w > 0 && resizeH) resizeH.value = String(Math.round(w * nh / nw));
    });

    resizeH?.addEventListener('input', () => {
      if (!resizeLock?.checked) return;
      const nw = img.naturalWidth || 1, nh = img.naturalHeight || 1;
      const h = parseInt(resizeH.value, 10);
      if (h > 0 && resizeW) resizeW.value = String(Math.round(h * nw / nh));
    });

    resizeApplyBtn?.addEventListener('click', async () => {
      const tw = parseInt(resizeW?.value, 10);
      const th = parseInt(resizeH?.value, 10);
      if (!tw || !th || tw < 1 || th < 1) return;
      const base = new Image(); base.decoding = 'async';
      base.src = editedUrl || url;
      await base.decode();
      const canvas = document.createElement('canvas');
      canvas.width = tw; canvas.height = th;
      const g = canvas.getContext('2d');
      if (mime === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, tw, th); }
      g.drawImage(base, 0, 0, tw, th);
      const targetMime = getExportMime();
      pushUndo();
      editedBlob = await new Promise((resolve) => canvas.toBlob(resolve, targetMime, targetMime === 'image/jpeg' ? 0.92 : undefined));
      if (!editedBlob) return;
      if (editedUrl) URL.revokeObjectURL(editedUrl);
      editedUrl = URL.createObjectURL(editedBlob);
      img.src = editedUrl;
      if (editReset) editReset.hidden = false;
      ctx.onBinaryEdit?.({ dirty: true, mimeType: targetMime, getBytes: async () => new Uint8Array(await editedBlob.arrayBuffer()) });
      if (resizePanel) resizePanel.hidden = true;
    });

    resizeCancelBtn?.addEventListener('click', () => {
      if (resizePanel) resizePanel.hidden = true;
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
