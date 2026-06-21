// The shared ASCII engine. Owns reusable canvases (no per-frame allocation),
// the option state, dirty flags and a rAF-coalesced scheduler. Consumed by the
// file-viewer toggle, the studio page and the webcam easter egg alike.
//
// Pipeline (only the dirty stages run):
//   source canvas → processImage (native filters + JS passes) → processed canvas
//                 → imageToAscii → result {columns,rows,cells,text,html}
//                 → render to <pre> and/or <canvas>
//
// DOM use is limited to creating offscreen canvases; nothing here touches the
// page, so the engine is testable with canvas/option input.

import { defaultOptions, newDirty } from './state.js';
import { buildFilterString, applyThreshold, applySharpen, applyEdgeDetect } from './filters.js';
import { imageToAscii } from './convert.js';
import { renderAsciiToPre, renderAsciiToCanvas } from './render.js';

// Cap the working resolution so the JS passes (threshold/sharpen/edge) and
// full-res sampling stay bounded — vital for live webcam frames.
const MAX_WORK_DIM = 1024;

function makeCanvas(w = 1, h = 1) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export function createAsciiEngine(initialOptions) {
  const options = { ...defaultOptions(), ...(initialOptions || {}) };
  const sourceCanvas = makeCanvas();
  const processedCanvas = makeCanvas();
  const scratch = makeCanvas();
  let dirty = newDirty();
  let result = null;
  let source = null;          // last image/canvas/video drawn from
  let pending = false;
  let onResult = null;

  function intrinsicSize(src) {
    if (src instanceof HTMLVideoElement) return [src.videoWidth, src.videoHeight];
    if (src instanceof HTMLImageElement) return [src.naturalWidth, src.naturalHeight];
    return [src.width, src.height];
  }

  // Draw a frame from the current source into the (resolution-capped) source
  // canvas. Cheap enough to call every webcam frame.
  function grabFrame() {
    if (!source) return false;
    const [iw, ih] = intrinsicSize(source);
    if (!iw || !ih) return false;
    const scale = Math.min(1, MAX_WORK_DIM / Math.max(iw, ih));
    const w = Math.max(1, Math.round(iw * scale));
    const h = Math.max(1, Math.round(ih * scale));
    // Geometric transforms (rotate 0/90/180/270 + flips) apply to image AND video.
    const rot = ((options.rotate || 0) % 360 + 360) % 360;
    const swap = rot === 90 || rot === 270;
    const cw = swap ? h : w, ch = swap ? w : h;
    if (sourceCanvas.width !== cw || sourceCanvas.height !== ch) { sourceCanvas.width = cw; sourceCanvas.height = ch; }
    const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
    ctx.save();
    ctx.clearRect(0, 0, cw, ch);
    ctx.translate(cw / 2, ch / 2);
    if (rot) ctx.rotate(rot * Math.PI / 180);
    ctx.scale(options.flipH ? -1 : 1, options.flipV ? -1 : 1);
    ctx.drawImage(source, -w / 2, -h / 2, w, h);
    ctx.restore();
    dirty.processedImage = true;
    return true;
  }

  function setSource(src) {
    source = src;
    if (grabFrame()) markDirty('processedImage');
  }

  function setOptions(partial, dirtyKeys) {
    Object.assign(options, partial);
    if (dirtyKeys) dirtyKeys.forEach((k) => { dirty[k] = true; });
  }

  function markDirty(...keys) {
    if (!keys.length) { dirty = newDirty(); return; }
    for (const k of keys) {
      dirty[k] = true;
      // cascade: processed change invalidates ascii+render; ascii invalidates render
      if (k === 'processedImage') { dirty.ascii = true; dirty.render = true; }
      if (k === 'ascii') dirty.render = true;
    }
  }

  function processImage() {
    const w = sourceCanvas.width, h = sourceCanvas.height;
    if (processedCanvas.width !== w || processedCanvas.height !== h) { processedCanvas.width = w; processedCanvas.height = h; }
    const ctx = processedCanvas.getContext('2d', { willReadFrequently: true });
    ctx.filter = buildFilterString(options);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(sourceCanvas, 0, 0);
    ctx.filter = 'none';
    // JS-only passes — each no-ops at neutral, so the fast path stays fast.
    const needJs = options.thresholdEnabled || options.sharpness || options.edgeDetection;
    if (needJs) {
      const img = ctx.getImageData(0, 0, w, h);
      if (options.sharpness) applySharpen(img, options.sharpness);
      if (options.edgeDetection) applyEdgeDetect(img, options.edgeDetection);
      if (options.thresholdEnabled) applyThreshold(img, options.threshold);
      ctx.putImageData(img, 0, 0);
    }
  }

  // Run only the dirty stages. Returns the current ASCII result (or null).
  function update() {
    if (!source || !sourceCanvas.width) return null;
    if (dirty.processedImage) { processImage(); dirty.processedImage = false; dirty.ascii = true; }
    if (dirty.ascii) {
      result = imageToAscii(processedCanvas, sourceCanvas, options, scratch);
      dirty.ascii = false; dirty.render = true;
    }
    if (dirty.render && onResult) { onResult(result); dirty.render = false; }
    return result;
  }

  // rAF-coalesced update; multiple scheduleUpdate() in one frame run once.
  function scheduleUpdate() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; update(); });
  }

  return {
    options,
    get result() { return result; },
    get processedCanvas() { return processedCanvas; },
    get sourceCanvas() { return sourceCanvas; },
    setSource, grabFrame, setOptions, markDirty, update, scheduleUpdate,
    // Re-draw the source (e.g. after a rotate/flip change) then schedule a convert.
    regrab() { if (grabFrame()) { markDirty('processedImage'); scheduleUpdate(); } },
    onResult(fn) { onResult = fn; },
    renderToPre: (pre) => result && renderAsciiToPre(result, pre, options),
    renderToCanvas: (canvas) => result && renderAsciiToCanvas(result, canvas, options),
  };
}
