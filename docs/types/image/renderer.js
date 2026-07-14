// Image preview. Raster images render in the PARENT pane from a blob: URL (efficient, no base64
// inflation) with fit-to-screen + zoom controls — zoom changes the real pixel size, not a CSS
// transform, so it stays crisp. SVG is text that can carry scripts, so it is DOMPurify-sanitized
// (SVG profile) and shown inside the sandboxed iframe.
import { loadGlobal, vendor } from '../../core/script-loader.js';
import { loadTemplate, fill } from '../../core/template.js';
import { isSvg, mimeFor, dimensions } from './imglib.js';
import { recordStage3AsciiActivation } from '../../games/metagame/viewer-actions.js';
import { queryEls } from './edit-els.js';
import { createView } from './view-controller.js';
import { createDrawTools } from './draw-overlay.js';
import { createEditCore } from './editor-core.js';
import { mountFilters } from './edit-filters.js';
import { mountCurves } from './edit-curves.js';
import { mountConvolve } from './edit-convolve.js';
import { mountTextTool } from './edit-text.js';
import { mountGeometry } from './edit-geometry.js';
import { mountBg } from './edit-bg.js';
import { registerUndoKeys } from './edit-undo-key.js';
import { mountTabs } from './edit-tabs.js';
import { mountHelpTab } from './help-tab.js';
import { setClip, getClip, copyToSystem, readFromSystem } from './pixel-clipboard.js';
import { openImageOcrPanel } from './ocr-ui.js';
import { mountSelection } from './edit-select.js';
import { mountAdvEdit } from './adv-edit.js';
import { mountGifPlayer } from './gif-anim.js';
import { decodeGifFrames } from './gif-decode.js';
import { sanitizeSvg } from './svg-sanitize.js';

// Toolbar markup lives in sibling .html templates (real HTML, easy to extend).
// doc.html is the shell (fit/zoom/ascii bar + stage + ascii-out) with an
// {{editTools}} slot; edit-tools.html is the full editing toolbar, inlined only
// for canvas-encodable formats.
const DOC_TPL = new URL('./doc.html', import.meta.url);
const EDIT_TOOLS_TPL = new URL('./edit-tools.html', import.meta.url);
// Every raster format the browser can decode into a <canvas> is editable — the
// editor pipeline re-encodes via canvas.toBlob (PNG/JPEG/WebP/AVIF, falling back
// to PNG for non-encodable sources like BMP/GIF), so the source format doesn't
// matter as long as it decodes. AVIF belongs here for parity with PNG/JPEG/WebP.
const EDITABLE_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/bmp', 'image/gif']);

export function imageInputDiagnostics(intake) {
  const loaded = Number(intake?.loadedBytes || intake?.bytes?.length || 0);
  const size = Number(intake?.size || loaded);
  if (intake?.truncated || loaded < size) {
    return [
      `Only ${loaded.toLocaleString()} of ${size.toLocaleString()} bytes were loaded.`,
      'Image decoders require the complete payload; a partial preview could look valid while omitting data, so rendering and editing are disabled.',
      'The original file handle remains available for download.',
    ];
  }
  return [];
}

export async function render(intake, ctx = {}) {
  const inputDiagnostics = imageInputDiagnostics(intake);
  if (inputDiagnostics.length) {
    return {
      bodyHtml: '<div class="json-error"><strong>Incomplete image input</strong><ul>'
        + inputDiagnostics.map((message) => '<li>' + String(message).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])) + '</li>').join('')
        + '</ul></div>',
      hadUnsafe: false,
    };
  }
  if (isSvg(intake)) {
    const DOMPurify = await loadGlobal(vendor('dompurify/purify.min.js'), 'DOMPurify');
    DOMPurify.removed = [];
    const clean = sanitizeSvg(DOMPurify.sanitize(intake.text || '', {
      USE_PROFILES: { svg: true, svgFilters: true },
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|blob):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    }));
    return { bodyHtml: '<div class="img-doc">' + clean + '</div>', hadUnsafe: DOMPurify.removed.length > 0 };
  }

  // Animated GIF: the static raster path only shows the first frame. Decode up
  // front; if it's truly multi-frame, hand the pane to the GIF player (play/pause +
  // scrubber + opt-in Split-into-frames). Single-frame GIFs fall through to the
  // normal editable raster path. The decoder + vendored gifuct bundle load only
  // here, only for a .gif — other images pay nothing on first paint.
  if (mimeFor(intake) === 'image/gif') {
    try {
      const decoded = await decodeGifFrames(intake.bytes);
      if (decoded.frames.length > 1) {
        const gifHost = document.createElement('div');
        gifHost.className = 'imgv-doc';
        const player = mountGifPlayer({ host: gifHost, bytes: intake.bytes, name: intake.filename, openBlob: window.__fv?.openBlobFile?.bind(window.__fv) });
        return { parentNode: gifHost, revoke: () => player.destroy() };
      }
    } catch { /* fall through to the static raster path */ }
  }

  // Raster: parent pane + blob URL + fit/zoom controls + ASCII toggle.
  const mime = mimeFor(intake);
  const url = URL.createObjectURL(new Blob([intake.bytes], { type: mime }));
  const canEdit = EDITABLE_MIME.has(mime);
  const host = document.createElement('div');
  host.className = 'imgv-doc';
  const [docTpl, editToolsTpl] = await Promise.all([
    loadTemplate(DOC_TPL),
    canEdit ? loadTemplate(EDIT_TOOLS_TPL) : Promise.resolve(''),
  ]);
  host.innerHTML = fill(docTpl, { filename: intake.filename, editTools: editToolsTpl });

  // All ~75 `.imgv-*` toolbar lookups live in edit-els.js; destructure them into the same local
  // names the body below uses (edit-only controls are null when !canEdit). Separately-queried
  // controls (bgChecker/compareBtn/toolsBtn/advBtn) stay inline near their wiring.
  const {
    img, note, zoomLabel, asciiBtn, asciiOut,
    editInput, editSize, editColor, editApply, editReset,
    pencilBtn, eraserBtn, fillBtn, cloneBtn, healBtn, fillTol, fillTolV, fillMode, fillPercep, fillFeather, fillOpts,
    selectBtn, marqueeBtn, ellipseBtn, lassoBtn, deselectBtn, selInvertBtn, selCutBtn, moveBtn,
    drawColorPicker, drawSizePicker, undoBtn, redoBtn, exportFmt, exportScale, editFont,
    bgBtn, bgTol, bgOk, bgX,
    cropBtn, cropApplyBtn, cropCancelBtn,
    resizeBtn, resizePanel, resizeW, resizeH, resizeLock, resizeApplyBtn, resizeCancelBtn,
    expandBtn, expandPanel, expandPad, expandTransparent, expandColor, expandApplyBtn, expandCancelBtn,
    rotLBtn, rotRBtn, flipHBtn, flipVBtn,
    filtersBtn, filtersPanel, fBrightness, fContrast, fSaturation, fHue, fApplyBtn, fResetBtn,
    levelsBtn, levelsPanel, lvBlack, lvWhite, lvGamma, lvApply, lvCancel,
    curvesBtn, curvesPanel, curveCanvas, curveChannel, curveApply, curveReset, curveCancel,
    convolveBtn, convolvePanel, convType, convStrength, convApply, convCancel,
    presetGrey, presetSepia, presetInvert,
  } = queryEls(host, canEdit);
  let asciiMode = false;
  let jxlPngBytes = null;   // decoded PNG bytes for JXL (display + ASCII source)
  // Pencil/eraser/fill state + handlers live in draw-overlay.js (createDrawTools); the controller
  // is created below, after the magic-wand selection it clips against exists.
  let drawCtl = null;

  // Adv Edit (vector overlay) state. Declared up here so the onBinaryEdit wrapper
  // and applyPan() (both defined below but run after these are initialised) can see
  // it without tripping the temporal-dead-zone.
  let advController = null, advActive = false;
  const overlayActive = () => !!(advController && !advController.isEmpty());
  // Magic-wand selection controller (mounted below; declared here so apply()/syncOverlay,
  // which run during initial load, can reference it without a temporal-dead-zone error).
  let selection = null;
  // A geometry op (rotate/flip/crop/resize/expand) with a live overlay stashes its
  // natural-space affine here; the overlay is transformed by it on the NEXT img load
  // (once the re-encoded base has decoded at its new size). See ADV_EDIT.md.
  let pendingGeom = null;

  // Shared edit state + commit pipeline — undo/redo, blob commits, the
  // onBinaryEdit hook, and full reset all live in editor-core so every tool
  // shares one consistent edit history. The view (fit/zoom/pan, ASCII, JXL)
  // stays here in the renderer shell.
  //
  // The vector overlay is PERSISTENT + non-destructive: the raster base and the
  // overlay stay separately editable, and the doc is flattened (base+overlay) only
  // for OUTPUT. So we wrap the host's onBinaryEdit — when the overlay is non-empty
  // every getBytes returns the flattened composite; otherwise the raster payload
  // passes through untouched.
  const hostOnBinaryEdit = ctx.onBinaryEdit;
  let lastRasterEdit = null;
  const outputScale = () => Math.max(0.5, Math.min(3, Number(exportScale?.value) || 1));
  function emitBinaryEdit() {
    if (!hostOnBinaryEdit) return;
    if (overlayActive()) {
      hostOnBinaryEdit({
        dirty: true,
        mimeType: core.getExportMime(),
        getBytes: async () => {
          const canvas = advController.flattenToCanvas({ pixelRatio: outputScale() });
          const mt = core.getExportMime();
          const blob = await new Promise((r) => canvas.toBlob(r, mt, mt === 'image/jpeg' ? 0.92 : undefined));
          return new Uint8Array(await blob.arrayBuffer());
        },
      });
    } else {
      hostOnBinaryEdit(lastRasterEdit);
    }
  }
  const core = createEditCore({
    img, url, mime,
    ctx: { ...ctx, onBinaryEdit: (payload) => { lastRasterEdit = payload; emitBinaryEdit(); } },
    els: { editReset, exportFmt, undoBtn, redoBtn, dirtyIndicator: host.querySelector('.imgv-dirty-indicator') },
  });

  // The editing tools (text, filters, geometry, background-removal) are mounted
  // from sibling modules; they share this `els` bag of toolbar controls plus the
  // edit core. (All null when !canEdit — the modules are null-safe.)
  const els = {
    editInput, editSize, editColor, editFont, editApply, editReset,
    filtersBtn, filtersPanel, fBrightness, fContrast, fSaturation, fHue, fApplyBtn, fResetBtn,
    levelsBtn, levelsPanel, lvBlack, lvWhite, lvGamma, lvApply, lvCancel,
    curvesBtn, curvesPanel, curveCanvas, curveChannel, curveApply, curveReset, curveCancel,
    convolveBtn, convolvePanel, convType, convStrength, convApply, convCancel,
    presetGrey, presetSepia, presetInvert,
    bgBtn, bgTol, bgOk, bgX, exportFmt,
    rotLBtn, rotRBtn, flipHBtn, flipVBtn,
    cropBtn, cropApplyBtn, cropCancelBtn,
    resizeBtn, resizePanel, resizeW, resizeH, resizeLock, resizeApplyBtn, resizeCancelBtn,
    expandBtn, expandPanel, expandPad, expandTransparent, expandColor, expandApplyBtn, expandCancelBtn,
  };
  // Group the editing controls into tabs (Common / Draw / Text / Adjust / Size /
  // Background) so the toolbar isn't a wall of buttons; non-active tabs hint once.
  if (canEdit) { mountTabs(host); mountHelpTab(host); }

  // OCR is its own top-level action (next to Edit/Adv) — works on any image, whether or
  // not the editor is open. Reads a canvas of what's currently shown (flattened overlay
  // if Adv objects exist, else the displayed image).
  const ocrCanvas = () => {
    if (overlayActive()) return advController.flattenToCanvas();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth || 1; c.height = img.naturalHeight || 1;
    c.getContext('2d').drawImage(img, 0, 0);
    return c;
  };
  const ocrBtn = host.querySelector('.imgv-ocr-btn');
  if (ocrBtn) { ocrBtn.hidden = false; ocrBtn.addEventListener('click', () => openImageOcrPanel({ host: host.querySelector('.imgv-stage'), getCanvas: ocrCanvas })); }

  // Download the current image in the selected format (next to the format picker). The
  // app's export menu still exists; this is the in-editor shortcut users expect to find.
  const downloadBtn = canEdit ? host.querySelector('.imgv-download') : null;
  downloadBtn?.addEventListener('click', async () => {
    if (downloadBtn.dataset.busy) return;                 // ignore re-taps while encoding
    const mt = (exportFmt?.value || '') || core.getExportMime() || mime;
    // Encoding a large image can take a moment on a phone — show a busy state and yield a
    // frame so it paints before the work, then restore the button no matter what.
    const label = downloadBtn.textContent;
    downloadBtn.dataset.busy = '1'; downloadBtn.disabled = true; downloadBtn.textContent = '⏳ Saving…';
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    try {
      let canvas;
      if (overlayActive()) { canvas = advController.flattenToCanvas({ pixelRatio: outputScale() }); }
      else {
        const base = await core.loadBase();
        canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round((base.naturalWidth || img.naturalWidth) * outputScale()));
        canvas.height = Math.max(1, Math.round((base.naturalHeight || img.naturalHeight) * outputScale()));
        const g = canvas.getContext('2d');
        if (mt === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, canvas.width, canvas.height); }
        g.drawImage(base, 0, 0);
      }
      const blob = await new Promise((r) => canvas.toBlob(r, mt, mt === 'image/jpeg' ? 0.92 : undefined));
      if (!blob) return;
      const ext = ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/avif': 'avif' })[mt] || ((intake.filename || '').split('.').pop() || 'png');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (intake.filename || 'image').replace(/\.[^.]+$/, '') + '.' + ext;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } finally {
      downloadBtn.disabled = false; downloadBtn.textContent = label; delete downloadBtn.dataset.busy;
    }
  });
  exportScale?.addEventListener('change', () => { if (overlayActive()) emitBinaryEdit(); });

  // Interactive tools (text placement, crop, BG pick) register here so the pan
  // logic stands down while a tool owns the pointer; each exposes isActive().
  const editTools = [];

  // Fit/zoom/pan over the raster <img> lives in view-controller.js. It reads the draw overlay +
  // vector overlay through late-bound getters (both are created after the view) so it keeps them
  // transform-aligned, and asks the renderer whether an edit mode owns the pointer / ASCII is on.
  const viewCtl = createView({
    host, img, zoomLabel,
    syncOverlay: () => drawCtl?.syncOverlay(),
    getOverlayEl: () => drawCtl?.getOverlayEl(),
    getAdv: () => advController,
    isEditModeActive: () => advActive || (drawCtl?.isDrawMode()) || editTools.some((t) => t.isActive && t.isActive()),
    isAscii: () => asciiMode,
  });
  // Local aliases so the rest of render() reads unchanged.
  const apply = viewCtl.apply;
  const applyPan = viewCtl.applyPan;
  // View hook handed to geometry tools so a dimension-changing edit (rotate/resize) updates the
  // stored natural width + relayout; a resize/crop/rotate also invalidates the pixel selection.
  const view = { setNatural: (n) => { viewCtl.setNatural(n); selection?.clear(); } };
  // After a geometry op re-encodes + reloads the base at its new size, transform the vector overlay
  // objects by the same matrix so they stay registered + editable.
  img.addEventListener('load', () => {
    if (!pendingGeom) return;
    const A = pendingGeom; pendingGeom = null;
    advController?.applyGeometry(A);
  });

  const isJxl = ((intake.filename || '').split('.').pop()?.toLowerCase() === 'jxl') || mime === 'image/jxl';
  img.addEventListener('error', () => {
    if (isJxl) return; // jxl is decoded in JS below, never via img.src
    img.hidden = true;
    note.hidden = false;
    note.textContent = 'This image could not be decoded. It may be malformed, truncated before intake, or unsupported by this browser; the original file still downloads.';
  });
  if (isJxl) {
    // Browsers can't decode JPEG XL — decode it in JS (lazy, heavy wasm) into a
    // canvas → PNG blob and show that. The original .jxl `url` stays the download.
    img.hidden = true;
    note.hidden = false; note.textContent = 'Decoding JPEG XL…';
    (async () => {
      try {
        const { decodeJxl } = await import('./jxl-decode.js');
        const id = await decodeJxl(intake.bytes);
        const c = document.createElement('canvas'); c.width = id.width; c.height = id.height;
        c.getContext('2d').putImageData(id, 0, 0);
        const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
        jxlPngBytes = new Uint8Array(await blob.arrayBuffer());
        note.hidden = true; img.hidden = false;
        img.src = URL.createObjectURL(blob); viewCtl.setNatural(c.width);
      } catch (e) {
        note.hidden = false; img.hidden = true;
        note.textContent = 'JPEG XL could not be decoded here: ' + (e.message || e) + '. Download still works.';
      }
    })();
  } else {
    img.src = url;
    apply();
    dimensions(url).then((d) => { if (d) viewCtl.setNatural(d.w); });
  }

  // ASCII art — the button toggles the self-contained ASCII Studio, lazy-mounted
  // into the ASCII pane. All conversion UI + logic lives under ./ascii/ so this
  // renderer stays thin.
  let asciiStudio = null;
  async function toggleAscii() {
    // Entering ASCII: stop Adv interaction but KEEP the overlay (non-destructive). The
    // ASCII source is a flattened COPY (base+overlay) computed below — the overlay
    // survives and is still editable when you return to the image.
    if (!asciiMode && advActive) leaveAdv();
    asciiMode = !asciiMode;
    asciiBtn.textContent = asciiMode ? 'Image' : 'ASCII';
    asciiBtn.classList.toggle('active', asciiMode);
    // In ASCII mode the studio owns everything; hide the image-editor toolbar
    // (only the ASCII toggle stays, as "back to image").
    host.querySelector('.imgv-bar').classList.toggle('imgv-ascii-on', asciiMode);
    host.querySelector('.imgv-stage').hidden = asciiMode;
    asciiOut.hidden = !asciiMode;
    if (asciiMode) {
      // Feed the CURRENT image — including any edits (crop, rotate, BG removal,
      // filters…) — not the untouched original. With a live vector overlay, flatten a
      // COPY (base+overlay) so ASCII sees the composite; otherwise editedBlob holds the
      // latest raster edit. JXL can't be decoded by createImageBitmap, so feed the PNG.
      let curBytes, curMime;
      if (overlayActive()) {
        const mt = core.getExportMime();
        const canvas = advController.flattenToCanvas();
        const blob = await new Promise((r) => canvas.toBlob(r, mt, mt === 'image/jpeg' ? 0.92 : undefined));
        curBytes = new Uint8Array(await blob.arrayBuffer()); curMime = mt;
      } else {
        const eb = core.editedBlob;
        curBytes = eb ? new Uint8Array(await eb.arrayBuffer()) : (jxlPngBytes || intake.bytes);
        curMime = eb ? (eb.type || mime) : (jxlPngBytes ? 'image/png' : mime);
      }
      try {
        if (!asciiStudio) {
          asciiBtn.disabled = true;
          asciiOut.style.padding = '0';
          const { mountAsciiStudio } = await import('./ascii/studio.js');
          asciiStudio = mountAsciiStudio(asciiOut, {
            bytes: curBytes, mime: curMime, filename: intake.filename,
            onActivate: () => recordStage3AsciiActivation({ file: intake.filename }),
            onBack: toggleAscii,   // 🖼 Image button in the studio toolbar returns here
          });
          asciiBtn.disabled = false;
        } else {
          asciiStudio.setImage({ bytes: curBytes, mime: curMime });
          recordStage3AsciiActivation({ file: intake.filename });
        }
      } catch (e) {
        asciiOut.textContent = 'ASCII studio failed to load: ' + (e.message || e);
        asciiBtn.disabled = false;
      }
      // The idle boot-screen screensaver is now app-wide (docs/core/global-screensaver.js),
      // not ASCII-only — nothing to install here.
    } else {
      asciiStudio?.stopCamera?.();   // leaving ASCII view → release the webcam
      advController?.relayout();      // the stage was hidden with .imgv-stage — re-register it to the image
    }
  }

  asciiBtn.addEventListener('click', toggleAscii);

  // Editing toolbar is a lot of buttons; on phones collapse it behind a 🛠 toggle
  // (like the top bar's overflow) so it doesn't clutter. Expanded by default on
  // wide screens. The button classes are unchanged, so all wiring still resolves.
  const toolsBtn = canEdit ? host.querySelector('.imgv-tools-btn') : null;
  if (toolsBtn) {
    const bar = host.querySelector('.imgv-bar');
    toolsBtn.hidden = false;                      // editable image → reveal the Edit toggle
    bar.classList.add('imgv-tools-collapsed');    // open in plain VIEW mode; Edit reveals the toolbar
    toolsBtn.classList.remove('active');
    toolsBtn.addEventListener('click', () => {
      const open = !bar.classList.toggle('imgv-tools-collapsed');
      toolsBtn.classList.toggle('active', open);
      // Edit (pixel) and Adv (vector) are mutually exclusive INTERACTIVE modes; the
      // overlay stays mounted + visible, just non-interactive, while you edit pixels.
      if (open && advActive) leaveAdv();
    });
  }

  // ── Adv Edit (vector) mode ── lazy-loads Konva (adv-edit.js) and overlays the
  // image with re-editable text/vector objects. The overlay is PERSISTENT and
  // non-destructive: leaving Adv just makes it non-interactive (it stays mounted +
  // visible across View/Edit); it's flattened onto the base only for OUTPUT
  // (emitBinaryEdit/ASCII). A geometry op transforms the objects by the same matrix
  // (onGeometry → advController.applyGeometry) instead of baking. See ADV_EDIT.md.
  const advBtn = canEdit ? host.querySelector('.imgv-adv-btn') : null;
  // Enter Adv Edit (mount on first use). seedText adds a starter text label only when
  // the user opens Adv directly — paste passes false so it just drops the pasted pane.
  async function enterAdv({ seedText = true } = {}) {
    if (!advBtn || advActive) return;
    host.querySelector('.imgv-bar').classList.add('imgv-tools-collapsed');   // mutually exclusive with pixel Edit
    toolsBtn?.classList.remove('active');
    advBtn.disabled = true;
    try {
      if (!advController) {
        advController = await mountAdvEdit({
          host, img, pushUndo: core.pushUndo,
          onDirty: () => { host.querySelector('.imgv-dirty-indicator')?.removeAttribute('hidden'); emitBinaryEdit(); },
          onFlatten: async (canvas) => { core.pushUndo(); await core.commitCanvas(canvas); },   // bake overlay → base pixels
        });
        // Fold the overlay into editor-core's history → one unified Ctrl+Z spanning
        // pixel + vector. Each entry now also carries the overlay JSON snapshot.
        core.setOverlayHooks({ snapshot: () => advController.serialize(), restore: (j) => advController.restore(j) });
      }
      advActive = true;
      advController.setInteractive(true);
      // Re-align the (empty) stage to the current base — picks up any geometry done
      // while the overlay was away. Only safe with no objects (it resets the frame).
      if (advController.isEmpty()) advController.rebaseline();
      advBtn.classList.add('active');
      if (seedText && advController.objectCount() === 0) advController.addText();   // start with one editable label
    } catch (e) { advBtn.title = 'Advanced editing failed: ' + (e.message || e); }
    advBtn.disabled = false;
  }
  if (advBtn) {
    advBtn.hidden = false;
    advBtn.addEventListener('click', () => { if (advActive) leaveAdv(); else enterAdv(); });   // leave = non-interactive, overlay STAYS
  }
  function leaveAdv() { advActive = false; advController?.setInteractive(false); advBtn?.classList.remove('active'); }
  // Geometry ops (rotate/flip/crop/resize/expand) report their natural-space affine here;
  // when an overlay exists we stash it so its objects get transformed by the same matrix
  // on the next img load — keeping the vector layers editable instead of baking them in.
  function onGeometry(affine) { if (advController) pendingGeom = affine; }

  // Text overlay — drag a label onto the image, then bake it in (edit-text.js).
  const textTool = mountTextTool({ host, img, mime, core, els });
  editTools.push(textTool);
  editReset?.addEventListener('click', () => {
    textTool.exitPlaceMode();
    if (advActive) leaveAdv();
    advController?.clear();   // Reset clears the vector overlay too (ADV_EDIT.md)
    core.reset();             // …and core.reset() has the final say on dirty/onBinaryEdit
    selection?.clear();       // drop any selection mask (its overlay would otherwise dangle)
    viewCtl.fitView();        // realign the image to fit so overlays aren't left displaced
  });

  // The toolbar grows/shrinks as modes change (Edit ↔ Adv, tab switches), which moves the
  // image within the stage. Re-align every overlay (view + draw + selection + vector) on any
  // bar resize so selections/objects never drift out of register with the pixels they mark.
  let barRO = null;
  const barEl = host.querySelector('.imgv-bar');
  if (barEl && typeof ResizeObserver === 'function') {
    barRO = new ResizeObserver(() => apply());   // apply() syncs draw/selection overlays + (via applyPan) the vector overlay
    barRO.observe(barEl);
  }

  // Geometry — rotate / flip / crop / resize (edit-geometry.js). Crop registers
  // in editTools so panning stands down during a crop drag.
  const geometryTool = mountGeometry({ host, img, url, mime, core, view, els, onGeometry });
  editTools.push(geometryTool);

  // Magic-wand selection — click a region to build a pixel mask; while it's active
  // the pixel tools (fill/pencil/eraser) only "take" inside the selection. Reuses the
  // shared fill tolerance/mode/perceptual options (edit-select.js → fill.js).
  selection = mountSelection({
    host, img, mime,
    els: { selectBtn, marqueeBtn, ellipseBtn, lassoBtn, moveBtn, deselectBtn },
    getFillOpts: () => ({ tol: parseInt(fillTol?.value || '12', 10), mode: fillMode?.value || 'seed', perceptual: !!fillPercep?.checked }),
    onActivate: () => drawCtl?.setDrawMode(null),   // selection is mutually exclusive with pencil/eraser/fill input
    onCommit: async (canvas) => { core.pushUndo(); const blob = await new Promise((r) => canvas.toBlob(r, 'image/png')); core.commitBlob(blob, { mime: 'image/png' }); },
  });
  editTools.push({ isActive: () => selection.isActive() });

  // Selection OPS (act on the current mask): Invert flips it; Cut deletes the selected
  // pixels (→ transparent PNG) through the shared edit core.
  selInvertBtn?.addEventListener('click', () => selection.invert());
  selCutBtn?.addEventListener('click', async () => {
    const sel = selection.getMask();
    if (!sel) return;
    const c = document.createElement('canvas'); c.width = sel.w; c.height = sel.h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, sel.w, sel.h);
    const id = g.getImageData(0, 0, sel.w, sel.h);
    for (let p = 0; p < sel.data.length; p++) if (sel.data[p]) id.data[(p << 2) + 3] = 0;
    g.putImageData(id, 0, 0);
    core.pushUndo();
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));   // PNG keeps the punched-out transparency
    core.commitBlob(blob, { mime: 'image/png' });
  });

  // Filters — live CSS preview + bake on Apply (edit-filters.js).
  mountFilters({ img, mime, core, els });

  // Curves — drag a tone curve; LUT remap baked on Apply (edit-curves.js).
  mountCurves({ img, mime, core, els });
  mountConvolve({ img, mime, core, els });

  // Compare — original vs current (edited): split / overlay / diff. The view is a
  // self-contained lazy module so this renderer stays thin. Original always uses
  // the pristine `url`; current uses the latest edit.
  const compareBtn = canEdit ? host.querySelector('.imgv-compare') : null;
  let compareView = null;
  function exitCompare() {
    if (!compareView) return;
    compareView.destroy(); compareView = null;
    img.style.display = '';
    const ov = drawCtl?.getOverlayEl(); if (ov) ov.style.display = '';
    host.querySelector('.imgv-bar').classList.remove('imgv-compare-on');
    compareBtn?.classList.remove('active');
    apply();   // restore layout/pan so the image is interactive again
  }
  compareBtn?.addEventListener('click', async () => {
    if (compareView) { exitCompare(); return; }
    const stage = host.querySelector('.imgv-stage');
    img.style.display = 'none';
    const ov = drawCtl?.getOverlayEl(); if (ov) ov.style.display = 'none';
    // Hide the edit toolbar while comparing — those tools don't apply here; the
    // compare overlay has its own Close button.
    host.querySelector('.imgv-bar').classList.add('imgv-compare-on');
    compareBtn.classList.add('active');
    const { mountCompare } = await import('./compare-view.js');
    compareView = mountCompare(stage, { originalUrl: url, currentUrl: core.editedUrl || url, onClose: exitCompare });
  });

  // Pencil / eraser / flood-fill overlay lives in draw-overlay.js (createDrawTools). It owns the
  // overlay canvas + pointer handlers, clips strokes/fills to the live magic-wand selection, and is
  // kept transform-aligned via the view's applyPan. Created here — after `selection` exists — and
  // assigned to the `drawCtl` declared near the top so the view/compare/selection wiring above can
  // reference it lazily.
  drawCtl = createDrawTools({
    host, img, mime, core,
    getSelection: () => selection,
    applyPan,
    els: { pencilBtn, eraserBtn, fillBtn, cloneBtn, healBtn, fillTol, fillTolV, fillMode, fillPercep, fillFeather, fillOpts, drawColorPicker, drawSizePicker, undoBtn, redoBtn },
  });

  // Ctrl/Cmd+Z = undo, Ctrl+Y or Ctrl/Cmd+Shift+Z = redo. A shared global router
  // (edit-undo-key.js) routes the shortcut to this editor while it's the active
  // one and not in ASCII mode — including when focus is on a slider/colour/number
  // control inside the toolbar. Text fields keep their native undo.
  const unregisterUndoKeys = canEdit
    ? registerUndoKeys({
      host, isEnabled: () => !asciiMode, doUndo: core.doUndo, doRedo: core.doRedo,
      // Arrow keys nudge a live pixel selection (Shift = move just the outline); the
      // adv (vector) editor has its own arrow handling, so defer while it's active.
      onArrow: (dx, dy, shift) => { if (advActive || !selection?.hasSelection()) return false; selection.nudge(dx, dy, shift); return true; },
      // Ctrl+C copies the selected pixels (internal + best-effort OS clipboard); Ctrl+V
      // drops them into Adv Edit as a free move/rotate/resize pane (also accepts an
      // external image from the OS clipboard when nothing was copied internally).
      onCopy: () => { const cv = selection?.copySelection?.(); if (!cv) return false; setClip(cv); copyToSystem(cv); return true; },
      onPaste: async () => { const cv = getClip() || await readFromSystem(); if (!cv) return; await enterAdv({ seedText: false }); advController?.addImage(cv); },
    })
    : null;

  // Background removal — sample a colour, flood to transparent, commit as PNG
  // (edit-bg.js). Registers in editTools so panning stands down while picking.
  const bgTool = mountBg({ img, url, core, els });
  editTools.push(bgTool);

  // Transparency display: show transparent pixels as a checkerboard (the editor
  // convention) instead of the plain page background. Purely a view toggle.
  const bgChecker = canEdit ? host.querySelector('.imgv-bg-checker') : null;
  bgChecker?.addEventListener('change', () => img.classList.toggle('imgv-checker', bgChecker.checked));

  return { parentNode: host, revoke: () => { barRO?.disconnect(); advController?.destroy(); selection?.teardown(); unregisterUndoKeys?.(); viewCtl.teardown(); compareView?.destroy?.(); asciiStudio?.destroy?.(); URL.revokeObjectURL(url); core.revoke(); bgTool.teardown(); } };
}
