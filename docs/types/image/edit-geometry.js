// Geometry tools — rotate / flip / crop / resize. Each redraws the current image
// onto a fresh canvas at new dimensions and commits via the shared edit core.
// Rotate/resize change the pixel size, so they call view.setNatural() to keep the
// zoom math correct; crop returns { isActive } so the renderer's pan logic stands
// down while a crop rectangle is being dragged.

export function mountGeometry({ host, img, url, mime, core, view, els }) {
  const {
    rotLBtn, rotRBtn, flipHBtn, flipVBtn,
    cropBtn, cropApplyBtn, cropCancelBtn,
    resizeBtn, resizePanel, resizeW, resizeH, resizeLock, resizeApplyBtn, resizeCancelBtn,
  } = els;
  const resizeUnit = host.querySelector('.imgv-resize-unit');
  const resizeResample = host.querySelector('.imgv-resize-resample');

  // ── Rotate / flip ── draw the current image onto a transformed canvas + commit.
  async function applyTransform(transformFn, newW, newH) {
    const base = await core.loadBase();
    const srcW = base.naturalWidth, srcH = base.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = newW(srcW, srcH);
    canvas.height = newH(srcW, srcH);
    const g = canvas.getContext('2d');
    if (mime === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, canvas.width, canvas.height); }
    transformFn(g, srcW, srcH, canvas.width, canvas.height);
    g.drawImage(base, 0, 0);
    core.pushUndo();
    if (!await core.commitCanvas(canvas)) return;
    // The edited image has new dimensions (rotate swaps W/H) — keep zoom correct.
    view.setNatural(canvas.width);
  }

  // Rotate left (CCW 90°): new canvas is h×w, pivot at center, rotate -90°.
  rotLBtn?.addEventListener('click', () => applyTransform(
    (g, sw, sh, cw, ch) => { g.translate(cw / 2, ch / 2); g.rotate(-Math.PI / 2); g.translate(-sw / 2, -sh / 2); },
    (sw, sh) => sh, (sw, sh) => sw,
  ));
  rotRBtn?.addEventListener('click', () => applyTransform(
    (g, sw, sh, cw, ch) => { g.translate(cw / 2, ch / 2); g.rotate(Math.PI / 2); g.translate(-sw / 2, -sh / 2); },
    (sw, sh) => sh, (sw, sh) => sw,
  ));
  flipHBtn?.addEventListener('click', () => applyTransform(
    (g, sw, sh, cw, ch) => { g.translate(cw, 0); g.scale(-1, 1); },
    (sw) => sw, (sw, sh) => sh,
  ));
  flipVBtn?.addEventListener('click', () => applyTransform(
    (g, sw, sh, cw, ch) => { g.translate(0, ch); g.scale(1, -1); },
    (sw) => sw, (sw, sh) => sh,
  ));

  // ── Crop ── drag a rectangle on the image, then Apply to keep that region.
  let cropMode = false, cropOverlay = null, cropSelBox = null;
  let cropStartX = 0, cropStartY = 0, cropEndX = 0, cropEndY = 0, cropDragging = false, cropHasRegion = false;

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
      // Position the selection box using the img rect relative to the stage.
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
      // Require a minimum 10×10 natural-px region.
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
    const base = await core.loadBase();
    const canvas = document.createElement('canvas');
    canvas.width = cw; canvas.height = ch;
    const g = canvas.getContext('2d');
    if (mime === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, cw, ch); }
    g.drawImage(base, -x1, -y1);
    core.pushUndo();
    if (!await core.commitCanvas(canvas)) return;
    cropExitMode();
  }

  if (cropBtn) {
    cropBtn.addEventListener('click', () => { if (cropMode) { cropExitMode(); } else { cropEnterMode(); } });
    cropApplyBtn?.addEventListener('click', () => {
      applyCrop().catch((e) => { if (cropApplyBtn) cropApplyBtn.title = e.message || String(e); });
    });
    cropCancelBtn?.addEventListener('click', cropExitMode);
  }

  // ── Resize ── width/height panel (px or % of natural), redraw at the new size.
  const pctMode = () => resizeUnit?.value === 'pct';
  function resizePopulate() {
    if (!resizeW || !resizeH) return;
    if (pctMode()) { resizeW.value = '100'; resizeH.value = '100'; }
    else { resizeW.value = String(img.naturalWidth || ''); resizeH.value = String(img.naturalHeight || ''); }
  }
  // Resolve the W/H inputs to absolute target pixels (percent is of the natural size).
  function resizeTargetPx() {
    const w = parseFloat(resizeW?.value), h = parseFloat(resizeH?.value);
    if (pctMode()) return { tw: Math.round((img.naturalWidth || 0) * w / 100), th: Math.round((img.naturalHeight || 0) * h / 100) };
    return { tw: Math.round(w), th: Math.round(h) };
  }

  if (resizeBtn) {
    resizeBtn.addEventListener('click', () => {
      if (!resizePanel) return;
      const open = resizePanel.hidden === false;
      resizePanel.hidden = open;
      if (!open) resizePopulate();
    });
    resizeUnit?.addEventListener('change', resizePopulate);

    resizeW?.addEventListener('input', () => {
      if (!resizeLock?.checked) return;
      // In % mode aspect is preserved by matching percentages; in px mode by ratio.
      if (pctMode()) { if (resizeH) resizeH.value = resizeW.value; return; }
      const nw = img.naturalWidth || 1, nh = img.naturalHeight || 1;
      const w = parseInt(resizeW.value, 10);
      if (w > 0 && resizeH) resizeH.value = String(Math.round(w * nh / nw));
    });

    resizeH?.addEventListener('input', () => {
      if (!resizeLock?.checked) return;
      if (pctMode()) { if (resizeW) resizeW.value = resizeH.value; return; }
      const nw = img.naturalWidth || 1, nh = img.naturalHeight || 1;
      const h = parseInt(resizeH.value, 10);
      if (h > 0 && resizeW) resizeW.value = String(Math.round(h * nw / nh));
    });

    resizeApplyBtn?.addEventListener('click', async () => {
      const { tw, th } = resizeTargetPx();
      if (!tw || !th || tw < 1 || th < 1) return;
      const base = await core.loadBase();
      const canvas = document.createElement('canvas');
      canvas.width = tw; canvas.height = th;
      const g = canvas.getContext('2d');
      // Resampling: pixelated = nearest-neighbour (crisp pixel art / hard downscale);
      // smooth = bilinear-ish at the chosen quality.
      const rs = resizeResample?.value || 'high';
      g.imageSmoothingEnabled = rs !== 'pixelated';
      if (g.imageSmoothingEnabled) g.imageSmoothingQuality = rs === 'medium' ? 'medium' : 'high';
      if (mime === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, tw, th); }
      g.drawImage(base, 0, 0, tw, th);
      core.pushUndo();
      if (!await core.commitCanvas(canvas)) return;
      if (resizePanel) resizePanel.hidden = true;
    });

    resizeCancelBtn?.addEventListener('click', () => {
      if (resizePanel) resizePanel.hidden = true;
    });
  }

  return { isActive: () => cropMode };
}
