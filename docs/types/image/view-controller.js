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
  // Back to the default framing (fit, no zoom, no pan) — used by editor Reset so the
  // image realigns with its overlays instead of staying where it was panned/zoomed.
  function fitView() { fit = true; zoom = 1; resetView(); apply(); }
  function setNatural(n) { natural = n; apply(); }

  host.querySelector('.imgv-fit').addEventListener('click', () => { fit = true; resetView(); apply(); });
  host.querySelector('.imgv-100').addEventListener('click', () => { fit = false; zoom = 1; resetView(); apply(); });
  host.querySelector('.imgv-up').addEventListener('click', () => { fit = false; zoom = Math.min(16, zoom * 1.25); apply(); });
  host.querySelector('.imgv-dn').addEventListener('click', () => { fit = false; zoom = Math.max(0.1, zoom / 1.25); apply(); });

  // ── Pan & zoom ── pointer-driven so it works with mouse, pen, and touch. One pointer drags
  // (pans) the whole canvas; two touch pointers pinch-zoom toward their midpoint. A single touch
  // only pans in VIEW mode — in edit mode the draw/crop/text overlay owns the finger. The wheel /
  // Ctrl-drag / Ctrl-+/- desktop paths are unchanged; middle-drag still pans even mid-edit.
  const stageEl = host.querySelector('.imgv-stage');
  stageEl.style.overflow = 'hidden';
  stageEl.style.touchAction = 'none';   // we own pan/pinch over the image; don't let the page scroll/zoom
  const pointers = new Map();            // active pointerId → { x, y }
  let panMode = false, pinchPrev = 0, dragLastX = 0, dragLastY = 0;
  const pinchDist = () => { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  const pinchMid = () => { const [a, b] = [...pointers.values()]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
  const onPanMove = (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX; p.y = e.clientY;
    if (pointers.size >= 2) {                       // pinch: zoom by the change in finger spread
      const d = pinchDist();
      if (pinchPrev > 0 && d > 0) { const m = pinchMid(); zoomAt(d / pinchPrev, m.x, m.y); }
      pinchPrev = d;
    } else if (panMode) {
      panX += e.clientX - dragLastX; panY += e.clientY - dragLastY;
      dragLastX = e.clientX; dragLastY = e.clientY;
      applyPan();
    }
  };
  const onPanUp = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchPrev = 0;
    if (pointers.size === 0) { panMode = false; stageEl.style.cursor = ''; }
    else if (pointers.size === 1) {                 // a finger lifted after a pinch — resume panning
      const [only] = [...pointers.values()]; dragLastX = only.x; dragLastY = only.y; panMode = true;
    }
  };
  stageEl.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button === 0 && (e.ctrlKey || e.metaKey)) { e.preventDefault(); startCtrlZoom(e); return; }
    const touch = e.pointerType !== 'mouse';
    if (touch && ctx.isEditModeActive?.()) return;  // edit-mode touches belong to the drawing overlay
    // Only the bare image / stage background / draw overlay drives pan & zoom. In-stage UI
    // (compare bar, layers panel, eye toggles…) must keep its own clicks — capturing the pointer
    // to the stage here would otherwise swallow them.
    if (e.target !== stageEl && e.target !== img && e.target !== ctx.getOverlayEl?.()) return;
    const leftPan = e.button === 0 && !ctx.isEditModeActive?.();
    const midPan = e.button === 1;
    if (!touch && !leftPan && !midPan) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) { panMode = true; dragLastX = e.clientX; dragLastY = e.clientY; stageEl.style.cursor = 'grabbing'; }
    else if (pointers.size === 2) { panMode = false; pinchPrev = pinchDist(); }
    e.preventDefault();
    try { stageEl.setPointerCapture(e.pointerId); } catch { /* synthetic / already-released pointer */ }
  });
  stageEl.addEventListener('pointermove', onPanMove);
  stageEl.addEventListener('pointerup', onPanUp);
  stageEl.addEventListener('pointercancel', onPanUp);
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
    // Scrollable UI layered over the stage (OCR result panel, the text tool's
    // textarea, any form control) must consume its own wheel — otherwise the
    // event bubbles here, we preventDefault its native scroll, and the image
    // zooms instead of the panel scrolling. Let those targets handle it.
    if (e.target?.closest?.('.imgv-ocr-panel, textarea, input, select')) return;
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
    fitView,
    zoomAt,
    setNatural,
    teardown() { document.removeEventListener('keydown', onZoomKey); },
  };
}
