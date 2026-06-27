// Shared clip-lane primitive for the bespoke auto-audiobook-style audio surfaces (Listen, Compare,
// Mix). Renders ONE lane: a label gutter + a canvas waveform track + a draggable, positioned clip
// with edge trim handles and top-corner fade knobs. It is model-agnostic — callers map their own
// project model to a flat "clip view" and receive drag callbacks (in seconds). This keeps the
// waveform look and the move/trim/fade interaction identical across all three surfaces.
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

// opts: { label, kind, height, color, interactive (default true), callbacks }
// callbacks: { onMove(deltaSec, view), onTrim(side, deltaSec, view), onFade(side, deltaSec, view),
//              onSeek(sec), onSelect(), onScroll(px) }
// clip view: may include pxPerSec (pixels per second) to enable zoomed / scrollable rendering.
export function createClipLane(opts = {}) {
  const cbs = opts.callbacks || {};
  const interactive = opts.interactive !== false;

  const canvas = h('canvas', 'al-canvas');
  const cursorLine = h('div', 'al-cursor', {}, [h('span', 'al-cursor-bubble', {}, '0:00')]);
  const handleLeft = h('div', 'al-handle al-handle-left', { 'data-drag': 'trim-in', title: 'Trim start' });
  const handleRight = h('div', 'al-handle al-handle-right', { 'data-drag': 'trim-out', title: 'Trim end' });
  const fadeKnobIn = h('div', 'al-fadeknob al-fadeknob-in', { 'data-drag': 'fade-in', title: 'Fade in' });
  const fadeKnobOut = h('div', 'al-fadeknob al-fadeknob-out', { 'data-drag': 'fade-out', title: 'Fade out' });
  const clip = h('div', 'al-clip', { 'data-drag': 'move', title: 'Drag to move; edges trim; knobs fade' },
    interactive ? [handleLeft, handleRight, fadeKnobIn, fadeKnobOut] : []);
  const canvasWrap = h('div', 'al-canvas-wrap', {}, [canvas, clip, cursorLine]);
  const label = h('div', 'al-track-label', {}, [
    h('span', 'al-track-name', {}, opts.label || 'Lane'),
    h('span', 'al-track-kind', {}, opts.kind || ''),
  ]);
  const row = h('div', 'al-track', {}, [label, canvasWrap]);
  if (opts.height) { row.style.height = `${opts.height}px`; canvasWrap.style.minHeight = `${opts.height}px`; }
  if (!interactive) clip.classList.add('al-clip--readonly');

  let view = null;        // current clip view
  let drag = null;
  let surfaceEl = row;    // for CSS-var colour reads

  function setSurface(el) { surfaceEl = el || row; }

  function update(next) {
    view = next || view;
    if (!view) return;
    const wrapW = canvasWrap.clientWidth || 600;
    const pxPerSec = view.pxPerSec || 0;
    const tl = Math.max(0.001, view.timelineSec);
    // contentWidth: when pxPerSec is set, size the canvas to the content. It may be WIDER than the
    // wrap (zoom in → scroll) or NARROWER (zoom out past fit → empty space to the right). Only a
    // small absolute floor so it can never collapse to nothing.
    const contentWidth = pxPerSec > 0 ? Math.max(40, tl * pxPerSec) : wrapW;
    if (pxPerSec > 0) {
      canvas.style.width = `${contentWidth}px`;
      canvasWrap.classList.add('al-zoomable');
    } else {
      canvas.style.width = '';
      canvasWrap.classList.remove('al-zoomable');
    }
    drawListenWaveform(canvas, surfaceEl, {
      summary: view.summary,
      timelineSec: tl,
      clipStartSec: view.startSec,
      clipLenSec: view.lenSec,
      sourceInFrac: view.sourceInFrac ?? 0,
      sourceOutFrac: view.sourceOutFrac ?? 1,
      cursorTimelineSec: view.cursorSec ?? 0,
      fadeInSec: view.fadeInSec || 0,
      fadeOutSec: view.fadeOutSec || 0,
    });
    const clipX = (view.startSec / tl) * contentWidth;
    const clipW = Math.max(6, (view.lenSec / tl) * contentWidth);
    clip.style.left = `${clipX}px`;
    clip.style.width = `${clipW}px`;
    if (view.selected) clip.classList.add('is-selected'); else clip.classList.remove('is-selected');
    if (interactive) {
      fadeKnobIn.style.left = `${Math.min(clipW, ((view.fadeInSec || 0) / tl) * contentWidth)}px`;
      fadeKnobOut.style.right = `${Math.min(clipW, ((view.fadeOutSec || 0) / tl) * contentWidth)}px`;
    }
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
      drag = { mode: e.target?.dataset?.drag || 'seek', startX: e.clientX, moved: false };
      cbs.onSelect?.();
      e.stopPropagation();
    });
    canvasWrap.addEventListener('pointermove', (e) => {
      if (!drag || !view) return;
      const rect = canvas.getBoundingClientRect();
      const deltaSec = ((e.clientX - drag.startX) / Math.max(1, rect.width)) * view.timelineSec;
      if (Math.abs(e.clientX - drag.startX) > 3) drag.moved = true;
      if (!drag.moved) return;
      drag.startX = e.clientX; // incremental deltas
      if (drag.mode === 'move') cbs.onMove?.(deltaSec, view);
      else if (drag.mode === 'trim-in') cbs.onTrim?.('in', deltaSec, view);
      else if (drag.mode === 'trim-out') cbs.onTrim?.('out', deltaSec, view);
      else if (drag.mode === 'fade-in') cbs.onFade?.('in', deltaSec, view);
      else if (drag.mode === 'fade-out') cbs.onFade?.('out', deltaSec, view);
    });
    canvasWrap.addEventListener('pointerup', (e) => {
      if (!drag) return;
      if (!drag.moved && (drag.mode === 'seek' || drag.mode === 'move')) cbs.onSeek?.(xToSec(e.clientX));
      drag = null;
    });
  }

  return {
    el: row, canvas, canvasWrap, clip, update, setSurface,
    // setScroll: programmatic scroll-sync so the surface can keep all lanes + ruler aligned.
    setScroll: (px) => { canvasWrap.scrollLeft = px; },
  };
}
