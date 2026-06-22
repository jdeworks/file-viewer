// Background-removal tool — click a colour on the image to sample it, preview the
// transparency flood live (tolerance slider), then Apply to commit as a PNG. The
// pure flood lives in ./fill.js (bgFloodFill); this wires it to the canvas + UI.
//
// Returns { isActive, teardown }: isActive() keeps the renderer's pan logic off
// while picking; teardown() frees the live preview blob URL.

import { bgFloodFill } from './fill.js';

export function mountBg({ img, url, core, els }) {
  const { bgBtn, bgTol, bgOk, bgX, exportFmt } = els;
  // Toggle the whole "Extract tolerance" label, not just the slider, so the tab
  // doesn't show a bare label before a colour has been sampled.
  const bgTolWrap = bgTol && (bgTol.closest('.imgv-bg-tol-wrap') || bgTol);
  let bgPickMode = false, bgSrcData = null, bgSrcW = 0, bgSrcH = 0, bgPickX = -1, bgPickY = -1, bgPreviewUrl = null;

  function bgFilledImageData() {
    const dst = bgFloodFill(bgSrcData, bgSrcW, bgSrcH, bgPickX, bgPickY, parseInt(bgTol.value, 10));
    return new ImageData(dst, bgSrcW, bgSrcH);
  }

  function bgExitMode() {
    bgPickMode = false;
    bgPickX = bgPickY = -1;
    bgSrcData = null;
    if (bgPreviewUrl) { URL.revokeObjectURL(bgPreviewUrl); bgPreviewUrl = null; }
    bgBtn?.classList.remove('active');
    img.style.cursor = '';
    if (bgTolWrap) bgTolWrap.hidden = true;
    if (bgOk) bgOk.hidden = true;
    if (bgX) bgX.hidden = true;
  }

  function bgRunPreview() {
    if (!bgSrcData || bgPickX < 0) return;
    const filled = bgFilledImageData();
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
      if (bgPickMode) { bgExitMode(); if (core.editedUrl) img.src = core.editedUrl; else img.src = url; return; }
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
      const base = await core.loadBase();
      const c = document.createElement('canvas');
      c.width = base.naturalWidth; c.height = base.naturalHeight;
      const g = c.getContext('2d'); g.drawImage(base, 0, 0);
      bgSrcData = g.getImageData(0, 0, c.width, c.height);
      bgSrcW = c.width; bgSrcH = c.height;
      const r = img.getBoundingClientRect();
      bgPickX = Math.max(0, Math.min(bgSrcW - 1, Math.round((e.clientX - r.left) * bgSrcW / r.width)));
      bgPickY = Math.max(0, Math.min(bgSrcH - 1, Math.round((e.clientY - r.top) * bgSrcH / r.height)));
      if (bgTolWrap) bgTolWrap.hidden = false;
      if (bgOk) bgOk.hidden = false;
      if (bgX) bgX.hidden = false;
      bgRunPreview();
    });

    bgTol?.addEventListener('input', bgRunPreview);

    bgOk?.addEventListener('click', () => {
      if (!bgSrcData || bgPickX < 0) return;
      const filled = bgFilledImageData();
      const c = document.createElement('canvas'); c.width = bgSrcW; c.height = bgSrcH;
      c.getContext('2d').putImageData(filled, 0, 0);
      c.toBlob((blob) => {
        if (!blob) return;
        core.pushUndo();
        if (exportFmt) exportFmt.value = 'image/png';
        core.commitBlob(blob, { mime: 'image/png' });
        bgExitMode();
      }, 'image/png');
    });

    bgX?.addEventListener('click', () => {
      bgExitMode();
      if (core.editedUrl) img.src = core.editedUrl; else img.src = url;
    });
  }

  return { isActive: () => bgPickMode, teardown: () => { if (bgPreviewUrl) URL.revokeObjectURL(bgPreviewUrl); } };
}
