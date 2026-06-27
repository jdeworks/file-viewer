// Shared clip-lane primitive for the bespoke auto-audiobook-style audio surfaces (Listen, Compare,
// Mix) and the video Timeline. Renders ONE lane: a label gutter + a canvas waveform track + ONE OR
// MORE draggable, positioned clips with edge trim handles and top-corner fade knobs. It is
// model-agnostic — callers map their own project model to a flat "clip view" and receive drag
// callbacks (in seconds). This keeps the waveform look and the move/trim/fade interaction identical
// across all surfaces, and lets a single lane show multiple clips after a Cut/split.
import { drawListenWaveform } from './audio-listen-waveform.js';

function h(tag, className, attrs = {}, children) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (Array.isArray(children)) node.append(...children.filter(Boolean));
  else if (children != null) node.textContent = children;
  return node;
}

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, Number(n) || 0)); }

// Build one positioned clip block (move body + trim handles + fade knobs).
function makeClipEl(interactive) {
  const handleLeft = h('div', 'al-handle al-handle-left', { 'data-drag': 'trim-in', title: 'Trim start' });
  const handleRight = h('div', 'al-handle al-handle-right', { 'data-drag': 'trim-out', title: 'Trim end' });
  const fadeIn = h('div', 'al-fadeknob al-fadeknob-in', { 'data-drag': 'fade-in', title: 'Fade in' });
  const fadeOut = h('div', 'al-fadeknob al-fadeknob-out', { 'data-drag': 'fade-out', title: 'Fade out' });
  const el = h('div', 'al-clip', { 'data-drag': 'move', title: 'Drag to move; edges trim; knobs fade' },
    interactive ? [handleLeft, handleRight, fadeIn, fadeOut] : []);
  if (!interactive) el.classList.add('al-clip--readonly');
  return { el, fadeIn, fadeOut };
}

// Normalize a clip view to an array of per-clip descriptors. Legacy callers (Listen, Compare) pass
// a single clip via top-level fields; multi-clip callers pass `view.clips`.
function normalizeClips(view) {
  if (Array.isArray(view.clips)) return view.clips;
  return [{
    id: view.id || 'primary',
    startSec: view.startSec, lenSec: view.lenSec,
    sourceInFrac: view.sourceInFrac, sourceOutFrac: view.sourceOutFrac,
    fadeInSec: view.fadeInSec, fadeOutSec: view.fadeOutSec,
    summary: view.summary, selected: view.selected,
  }];
}

// opts: { label, kind, height, color, interactive (default true), callbacks }
// callbacks: { onMove(deltaSec, view, clipId), onTrim(side, deltaSec, view, clipId),
//              onFade(side, deltaSec, view, clipId), onSeek(sec), onSelect(clipId), onScroll(px) }
// clip view: top-level { timelineSec, cursorSec, cursorLabel, pxPerSec } + either single-clip fields
// or `clips: [...]`. pxPerSec (pixels per second) enables zoomed / scrollable rendering.
export function createClipLane(opts = {}) {
  const cbs = opts.callbacks || {};
  const interactive = opts.interactive !== false;

  const canvas = h('canvas', 'al-canvas');
  const cursorLine = h('div', 'al-cursor', {}, [h('span', 'al-cursor-bubble', {}, '0:00')]);
  const canvasWrap = h('div', 'al-canvas-wrap', {}, [canvas, cursorLine]);
  const label = h('div', 'al-track-label', {}, [
    h('span', 'al-track-name', {}, opts.label || 'Lane'),
    h('span', 'al-track-kind', {}, opts.kind || ''),
  ]);
  const row = h('div', 'al-track', {}, [label, canvasWrap]);
  if (opts.height) { row.style.height = `${opts.height}px`; canvasWrap.style.minHeight = `${opts.height}px`; }

  let view = null;          // current clip view
  let drag = null;
  let surfaceEl = row;      // for CSS-var colour reads
  const clipEls = new Map(); // clip id -> { el, fadeIn, fadeOut }

  function setSurface(el) { surfaceEl = el || row; }

  function update(next) {
    view = next || view;
    if (!view) return;
    const wrapW = canvasWrap.clientWidth || 600;
    const pxPerSec = view.pxPerSec || 0;
    const tl = Math.max(0.001, view.timelineSec);
    // contentWidth: when pxPerSec is set, size the canvas to the content. Floor at the wrap width so
    // a short timeline (or zoom-out past fit) still FILLS the lane instead of collapsing to a sliver
    // on the left — and so it stays aligned with the shared ruler, which floors at the same width.
    // Zoom IN past fit makes it wider than the wrap → horizontal scroll.
    const contentWidth = pxPerSec > 0 ? Math.max(wrapW, tl * pxPerSec) : wrapW;
    if (pxPerSec > 0) {
      canvas.style.width = `${contentWidth}px`;
      canvasWrap.classList.add('al-zoomable');
    } else {
      canvas.style.width = '';
      canvasWrap.classList.remove('al-zoomable');
    }

    const clips = normalizeClips(view);
    drawListenWaveform(canvas, surfaceEl, {
      timelineSec: tl,
      cursorTimelineSec: view.cursorSec ?? 0,
      clips: clips.map((c) => ({
        clipStartSec: c.startSec, clipLenSec: c.lenSec,
        sourceInFrac: c.sourceInFrac ?? 0, sourceOutFrac: c.sourceOutFrac ?? 1,
        fadeInSec: c.fadeInSec || 0, fadeOutSec: c.fadeOutSec || 0, summary: c.summary,
      })),
    });

    // Reconcile the positioned clip DOM blocks (one per clip id).
    const seen = new Set();
    for (const c of clips) {
      seen.add(c.id);
      let entry = clipEls.get(c.id);
      if (!entry) {
        entry = makeClipEl(interactive);
        entry.el.dataset.clipId = c.id;
        canvasWrap.insertBefore(entry.el, cursorLine);
        clipEls.set(c.id, entry);
      }
      const clipX = (c.startSec / tl) * contentWidth;
      const clipW = Math.max(6, (c.lenSec / tl) * contentWidth);
      entry.el.style.left = `${clipX}px`;
      entry.el.style.width = `${clipW}px`;
      entry.el.classList.toggle('is-selected', !!c.selected);
      if (interactive) {
        entry.fadeIn.style.left = `${Math.min(clipW, ((c.fadeInSec || 0) / tl) * contentWidth)}px`;
        entry.fadeOut.style.right = `${Math.min(clipW, ((c.fadeOutSec || 0) / tl) * contentWidth)}px`;
      }
    }
    for (const [id, entry] of clipEls) if (!seen.has(id)) { entry.el.remove(); clipEls.delete(id); }

    const cx = ((view.cursorSec ?? 0) / tl) * contentWidth;
    cursorLine.style.left = `${cx}px`;
    const bubble = cursorLine.querySelector('.al-cursor-bubble');
    if (bubble && view.cursorLabel != null) bubble.textContent = view.cursorLabel;
  }

  // Scroll sync: notify the surface when the user scrolls this lane so it can keep all lanes aligned.
  canvasWrap.addEventListener('scroll', () => { cbs.onScroll?.(canvasWrap.scrollLeft); });

  if (interactive) {
    const xToSec = (clientX) => {
      const rect = canvas.getBoundingClientRect();
      return clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1) * (view?.timelineSec || 1);
    };
    canvasWrap.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || !view) return;
      canvasWrap.setPointerCapture?.(e.pointerId);
      const clipEl = e.target?.closest?.('.al-clip');
      const clipId = clipEl?.dataset?.clipId || null;
      drag = { mode: e.target?.dataset?.drag || (clipEl ? 'move' : 'seek'), clipId, startX: e.clientX, moved: false };
      cbs.onSelect?.(clipId);
      e.stopPropagation();
    });
    canvasWrap.addEventListener('pointermove', (e) => {
      if (!drag || !view) return;
      const rect = canvas.getBoundingClientRect();
      const deltaSec = ((e.clientX - drag.startX) / Math.max(1, rect.width)) * view.timelineSec;
      if (Math.abs(e.clientX - drag.startX) > 3) drag.moved = true;
      if (!drag.moved) return;
      drag.startX = e.clientX; // incremental deltas
      if (drag.mode === 'move') cbs.onMove?.(deltaSec, view, drag.clipId);
      else if (drag.mode === 'trim-in') cbs.onTrim?.('in', deltaSec, view, drag.clipId);
      else if (drag.mode === 'trim-out') cbs.onTrim?.('out', deltaSec, view, drag.clipId);
      else if (drag.mode === 'fade-in') cbs.onFade?.('in', deltaSec, view, drag.clipId);
      else if (drag.mode === 'fade-out') cbs.onFade?.('out', deltaSec, view, drag.clipId);
    });
    canvasWrap.addEventListener('pointerup', (e) => {
      if (!drag) return;
      if (!drag.moved && (drag.mode === 'seek' || drag.mode === 'move')) cbs.onSeek?.(xToSec(e.clientX));
      drag = null;
    });
  }

  return {
    el: row, canvas, canvasWrap, update, setSurface,
    // First positioned clip element (back-compat for decorations). Null until first update().
    get clip() { return clipEls.values().next().value?.el || null; },
    // setScroll: programmatic scroll-sync so the surface can keep all lanes + ruler aligned.
    setScroll: (px) => { canvasWrap.scrollLeft = px; },
  };
}
