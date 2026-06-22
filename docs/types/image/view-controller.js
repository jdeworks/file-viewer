// Image view controller — fit/zoom/pan over the raster <img>. Zoom changes the real pixel width
// (stays crisp), pan is a translate3d transform on a stable compositing layer (mobile stale-paint
// guard via nudgeRepaint). Extracted from renderer.js so the renderer orchestrates rather than
// owning all the pointer math. Cross-references the draw overlay (kept transform-aligned) and the
// vector overlay via late-bound getters, since those are created after the view.
//
// ctx: { host, img, zoomLabel, syncOverlay(), getOverlayEl(), getAdv(), isEditModeActive(), isAscii() }
export function createView(ctx) {
  const { host, img, zoomLabel } = ctx;
  let natural = 0, fit = true, zoom = 1;
  // Pan offset (px), applied as a transform so the WHOLE canvas can be dragged freely — even when
  // the image is smaller than the stage. The draw overlay gets the same transform.
  let panX = 0, panY = 0;

  function applyPan() {
    // Always keep a 3D transform so the <img> stays on a stable compositing layer (some mobile
    // WebViews don't repaint a transformed <img> on src-change unless the layer is stable + nudged).
    const t = `translate3d(${panX}px, ${panY}px, 0)`;
    img.style.transform = t;
    const overlay = ctx.getOverlayEl?.();
    if (overlay) overlay.style.transform = t;
    ctx.getAdv?.()?.relayout();   // keep the persistent vector overlay registered to the image
  }
  // Force a recomposite after an edit swaps img.src (mobile stale-paint guard).
  function nudgeRepaint() {
    requestAnimationFrame(() => { void img.offsetWidth; img.style.transform = `translate3d(${panX}px, ${panY}px, 0.001px)`; requestAnimationFrame(applyPan); });
  }
  img.addEventListener('load', nudgeRepaint);

  function apply() {
    host.querySelector('.imgv-fit').classList.toggle('active', fit);
    if (fit || !natural) { img.style.width = ''; img.style.maxWidth = ''; img.style.maxHeight = ''; zoomLabel.textContent = 'fit'; }
    else { img.style.maxWidth = 'none'; img.style.maxHeight = 'none'; img.style.width = Math.round(natural * zoom) + 'px'; zoomLabel.textContent = Math.round(zoom * 100) + '%'; }
    ctx.syncOverlay?.();
    applyPan();
  }
  function resetView() { panX = 0; panY = 0; }
  function setNatural(n) { natural = n; apply(); }

  host.querySelector('.imgv-fit').addEventListener('click', () => { fit = true; resetView(); apply(); });
  host.querySelector('.imgv-100').addEventListener('click', () => { fit = false; zoom = 1; resetView(); apply(); });
  host.querySelector('.imgv-up').addEventListener('click', () => { fit = false; zoom = Math.min(16, zoom * 1.25); apply(); });
  host.querySelector('.imgv-dn').addEventListener('click', () => { fit = false; zoom = Math.max(0.1, zoom / 1.25); apply(); });

  // ── Pan & wheel-zoom ── click-drag moves the whole canvas; wheel zooms toward the cursor. Left-
  // drag pans only when no edit mode owns the pointer; middle drag pans even mid-draw.
  const stageEl = host.querySelector('.imgv-stage');
  stageEl.style.overflow = 'hidden';
  let dragLastX = 0, dragLastY = 0;
  const onPanMove = (e) => {
    panX += e.clientX - dragLastX; panY += e.clientY - dragLastY;
    dragLastX = e.clientX; dragLastY = e.clientY;
    applyPan();
  };
  const onPanUp = () => {
    stageEl.style.cursor = '';
    window.removeEventListener('mousemove', onPanMove);
    window.removeEventListener('mouseup', onPanUp);
  };
  stageEl.addEventListener('mousedown', (e) => {
    if (e.button === 0 && (e.ctrlKey || e.metaKey)) { e.preventDefault(); startCtrlZoom(e); return; }
    const leftPan = e.button === 0 && !ctx.isEditModeActive?.();
    const midPan = e.button === 1;
    if (!leftPan && !midPan) return;
    dragLastX = e.clientX; dragLastY = e.clientY;
    stageEl.style.cursor = 'grabbing';
    e.preventDefault();
    window.addEventListener('mousemove', onPanMove);
    window.addEventListener('mouseup', onPanUp);
  });
  // Zoom by `factor`, keeping the image point under (clientX,clientY) fixed; defaults to centre.
  function zoomAt(factor, clientX, clientY) {
    const r = stageEl.getBoundingClientRect();
    const prev = fit ? (img.offsetWidth / (natural || img.offsetWidth)) : zoom;
    fit = false;
    zoom = Math.max(0.1, Math.min(16, prev * factor));
    const k = zoom / prev;
    const cx = clientX == null ? r.left + r.width / 2 : clientX;
    const cy = clientY == null ? r.top + r.height / 2 : clientY;
    const relX = (cx - r.left) - (r.width / 2 + panX);
    const relY = (cy - r.top) - (r.height / 2 + panY);
    panX += relX * (1 - k); panY += relY * (1 - k);
    apply();
  }
  stageEl.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY);
  }, { passive: false });
  // Ctrl/Cmd + drag = scrubby zoom: drag up to zoom in, down to zoom out, anchored at the press.
  function startCtrlZoom(e) {
    const ax = e.clientX, ay = e.clientY; let lastY = e.clientY;
    stageEl.style.cursor = 'ns-resize';
    const move = (ev) => { const dy = lastY - ev.clientY; lastY = ev.clientY; if (dy) zoomAt(Math.exp(dy * 0.006), ax, ay); };
    const up = () => { stageEl.style.cursor = ''; window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
  }
  // Ctrl/Cmd with +/- (or =) zooms toward the stage centre.
  function onZoomKey(e) {
    if (ctx.isAscii?.() || !host.isConnected || !(e.ctrlKey || e.metaKey)) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomAt(1.25); }
    else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomAt(1 / 1.25); }
  }
  document.addEventListener('keydown', onZoomKey);

  return {
    apply,
    applyPan,
    resetView,
    zoomAt,
    setNatural,
    teardown() { document.removeEventListener('keydown', onZoomKey); },
  };
}
