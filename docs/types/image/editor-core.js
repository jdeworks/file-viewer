// Shared edit state + commit pipeline for the image editor.
//
// The image renderer owns the VIEW (fit/zoom/pan, ASCII, JXL decode); every
// editing tool (text, filters, geometry, background-removal, draw) shares ONE
// edit state and ONE commit path through this core, so undo/redo and the host's
// onBinaryEdit hook stay consistent no matter which tool made the change.
//
// Lifecycle per commit: a tool builds a canvas/blob, calls pushUndo() to snapshot
// the current edit, then commitBlob()/commitCanvas() to install the new one. The
// previous editedUrl is intentionally NOT revoked on commit — pushUndo() retains
// it as the undo target; reset()/revoke() free everything.

const CANVAS_ENCODABLE = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/avif']);

export function createEditCore({ img, url, mime, ctx, els }) {
  const { editReset, exportFmt, undoBtn, redoBtn, dirtyIndicator } = els;
  let editedUrl = null, editedBlob = null;
  const undoStack = [];
  const redoStack = [];

  // BMP/GIF can't be re-encoded by canvas.toBlob — fall back to PNG when the
  // chosen format isn't canvas-encodable.
  function getExportMime() { const m = (exportFmt?.value) || mime; return CANVAS_ENCODABLE.has(m) ? m : 'image/png'; }

  function pushUndo() {
    undoStack.push({ blob: editedBlob || null, url: editedUrl || null });
    // A fresh edit forks history — discard any redo branch (and its blob URLs).
    redoStack.forEach((s) => { if (s.url) URL.revokeObjectURL(s.url); });
    redoStack.length = 0;
    if (undoBtn) undoBtn.hidden = false;
    if (redoBtn) redoBtn.hidden = true;
    dirtyIndicator?.removeAttribute('hidden');
  }

  // Apply a saved {blob,url} edit state to the canvas + binary-edit hook.
  function applyEditState(state) {
    editedBlob = state.blob; editedUrl = state.url;
    if (editedUrl) {
      img.src = editedUrl;
      ctx.onBinaryEdit?.({ dirty: true, mimeType: getExportMime(), getBytes: async () => new Uint8Array(await editedBlob.arrayBuffer()) });
    } else {
      img.src = url;
      if (editReset) editReset.hidden = true;
      ctx.onBinaryEdit?.(null);
    }
    if (undoBtn) undoBtn.hidden = undoStack.length === 0;
    if (redoBtn) redoBtn.hidden = redoStack.length === 0;
  }
  function doUndo() { const prev = undoStack.pop(); if (!prev) return; redoStack.push({ blob: editedBlob || null, url: editedUrl || null }); applyEditState(prev); }
  function doRedo() { const next = redoStack.pop(); if (!next) return; undoStack.push({ blob: editedBlob || null, url: editedUrl || null }); applyEditState(next); }

  // Decode the CURRENT image (latest edit, else the pristine original) so a tool
  // can draw from it onto a fresh canvas.
  async function loadBase() {
    const base = new Image(); base.decoding = 'async';
    base.src = editedUrl || url;
    await base.decode();
    return base;
  }

  // Install a finished blob as the new edit. Caller calls pushUndo() first; the
  // old editedUrl is NOT revoked here (it's the retained undo target).
  function commitBlob(blob, { mime: mt } = {}) {
    if (!blob) return false;
    editedBlob = blob;
    editedUrl = URL.createObjectURL(blob);
    img.src = editedUrl;
    if (editReset) editReset.hidden = false;
    const finalMime = mt || getExportMime();
    ctx.onBinaryEdit?.({ dirty: true, mimeType: finalMime, getBytes: async () => new Uint8Array(await blob.arrayBuffer()) });
    return true;
  }

  // Encode a canvas at the export mime (the caller is responsible for any JPEG
  // white matte before drawing) and commit it. Caller calls pushUndo() first.
  async function commitCanvas(canvas) {
    const mt = getExportMime();
    const blob = await new Promise((r) => canvas.toBlob(r, mt, mt === 'image/jpeg' ? 0.92 : undefined));
    return commitBlob(blob, { mime: mt });
  }

  // Full reset to the pristine original (clears history + live CSS filter).
  function reset() {
    [...undoStack, ...redoStack].forEach((s) => { if (s.url) URL.revokeObjectURL(s.url); });
    undoStack.length = 0; redoStack.length = 0;
    if (undoBtn) undoBtn.hidden = true;
    if (redoBtn) redoBtn.hidden = true;
    if (editedUrl) URL.revokeObjectURL(editedUrl);
    editedUrl = null; editedBlob = null;
    img.src = url;
    img.style.filter = '';
    if (editReset) editReset.hidden = true;
    if (dirtyIndicator) dirtyIndicator.hidden = true;
    ctx.onBinaryEdit?.(null);
  }

  // Free every blob URL this core created (teardown).
  function revoke() {
    if (editedUrl) URL.revokeObjectURL(editedUrl);
    [...undoStack, ...redoStack].forEach((s) => { if (s.url) URL.revokeObjectURL(s.url); });
  }

  return {
    getExportMime, pushUndo, applyEditState, doUndo, doRedo, loadBase,
    commitBlob, commitCanvas, reset, revoke,
    get editedUrl() { return editedUrl; },
    get editedBlob() { return editedBlob; },
  };
}
