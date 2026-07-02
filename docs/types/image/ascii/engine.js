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
import { processImage } from './process-image.js';
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
  let lastConvertMs = 0;      // duration of the last ASCII conversion (drives the busy badge)

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

  // Run only the dirty stages. Returns the current ASCII result (or null).
  function update() {
    if (!source || !sourceCanvas.width) return null;
    if (dirty.processedImage) { processImage(sourceCanvas, processedCanvas, options); dirty.processedImage = false; dirty.ascii = true; }
    if (dirty.ascii) {
      const t0 = performance.now();
      result = imageToAscii(processedCanvas, sourceCanvas, options, scratch);
      lastConvertMs = performance.now() - t0;
      dirty.ascii = false; dirty.render = true;
    }
    if (dirty.render && onResult) { onResult(result); dirty.render = false; }
    return result;
  }

  // ── Off-main-thread conversion (optional, feature-detected) ────────────────
  // If a module Worker + OffscreenCanvas + createImageBitmap are available we convert in
  // a Web Worker so the main thread never blocks; otherwise the synchronous update()
  // path above runs unchanged (also what the headless unit tests use).
  let renderMode = 'cells';                 // 'cells' (→ <pre>) | 'bitmap' (→ canvas)
  let useWorker = typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined'
    && typeof createImageBitmap === 'function';
  let worker = null, jobId = 0, syncOut = null;
  const jobs = new Map();

  function ensureWorker() {
    if (worker || !useWorker) return worker;
    try {
      worker = new Worker(new URL('./convert-worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = (e) => { const j = jobs.get(e.data.id); if (j) { jobs.delete(e.data.id); j(e.data); } };
      worker.onerror = () => { useWorker = false; failJobs('ASCII worker failed.'); };
    } catch { useWorker = false; worker = null; }
    return worker;
  }
  function failJobs(message) {
    for (const resolve of jobs.values()) resolve({ error: message });
    jobs.clear();
  }
  const postJob = (msg, transfer) => new Promise((resolve) => { jobs.set(msg.id, resolve); worker.postMessage(msg, transfer); });
  function buildResult(reply) {
    const cells = reply.cells; let cache;
    return { columns: reply.columns, rows: reply.rows, cells, gap: '', braille: false,
      get text() { return cache ??= cells.map((r) => r.map((c) => c.ch).join('')).join('\n') + '\n'; } };
  }

  // Convert the current source frame. 'bitmap' returns a DRAWABLE (ImageBitmap or canvas)
  // for canvas consumers (webcam, file converter); 'cells' updates `result` for the <pre>.
  // Always refreshes lastConvertMs + fires onResult; falls back to sync on any worker error.
  // Convert an already-created source ImageBitmap (transferred to the worker). Exposed so
  // the file converter can PIPELINE: post the next frame's job (synchronously, before its
  // first await) so the worker converts it WHILE the main thread encodes the current frame.
  async function convertBitmap(bitmap, want = renderMode) {
    if (useWorker) {
      try {
        ensureWorker();
        if (worker) {
          const id = ++jobId;
          const reply = await postJob({ id, bitmap, options: { ...options }, want }, [bitmap]);
          if (reply.error) throw new Error(reply.error);
          lastConvertMs = reply.ms;
          if (want !== 'bitmap') { result = buildResult(reply); if (onResult) onResult(result); return result; }
          if (onResult) onResult(result, reply.bitmap);
          return reply.bitmap;
        }
      } catch { useWorker = false; }
    }
    // Sync fallback: draw the bitmap back into sourceCanvas and run the normal pipeline.
    if (sourceCanvas.width !== bitmap.width || sourceCanvas.height !== bitmap.height) { sourceCanvas.width = bitmap.width; sourceCanvas.height = bitmap.height; }
    const sctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
    sctx.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);   // transparent frames must not retain the previous one
    sctx.drawImage(bitmap, 0, 0); bitmap.close?.();
    markDirty('processedImage'); update();
    if (want === 'bitmap') { if (!syncOut) syncOut = makeCanvas(); renderAsciiToCanvas(result, syncOut, options); return syncOut; }
    return result;
  }

  async function convertNow(want = renderMode) {
    if (!source || !sourceCanvas.width) return null;
    if (useWorker) {
      try { ensureWorker(); if (worker) return await convertBitmap(await createImageBitmap(sourceCanvas), want); }
      catch { useWorker = false; }
    }
    update();   // synchronous fallback (also fires onResult internally for 'cells')
    if (want === 'bitmap') { if (!syncOut) syncOut = makeCanvas(); renderAsciiToCanvas(result, syncOut, options); return syncOut; }
    return result;
  }

  // rAF-coalesced + CONFLATED convert. The convert is async (worker), so while one is in
  // flight, extra requests (e.g. dragging the Detail slider) must NOT each queue a job —
  // they just mark that another refresh is needed, and exactly ONE more runs with the
  // latest options when the current one finishes. Intermediate values are dropped.
  let again = false;
  function scheduleUpdate() {
    if (pending) { again = true; return; }
    pending = true;
    requestAnimationFrame(async () => {
      try { do { again = false; await convertNow(renderMode); } while (again); }
      finally { pending = false; }
    });
  }

  return {
    options,
    get result() { return result; },
    get lastConvertMs() { return lastConvertMs; },
    get processedCanvas() { return processedCanvas; },
    get sourceCanvas() { return sourceCanvas; },
    setSource, grabFrame, setOptions, markDirty, update, scheduleUpdate,
    setRenderMode(m) { renderMode = m; },
    get workerAvailable() { return useWorker; },
    get workerActive() { return useWorker && !!worker; },
    convertFrame: (want) => convertNow(want),          // async; returns drawable ('bitmap') or result ('cells')
    convertBitmap,                                      // async; pipeline a pre-made source bitmap (file converter)
    // Re-draw the source (e.g. after a rotate/flip change) then schedule a convert.
    regrab() { if (grabFrame()) { markDirty('processedImage'); scheduleUpdate(); } },
    onResult(fn) { onResult = fn; },
    renderToPre: (pre) => result && renderAsciiToPre(result, pre, options),
    renderToCanvas: (canvas) => result && renderAsciiToCanvas(result, canvas, options),
    terminate() { failJobs('ASCII worker terminated.'); if (worker) { worker.terminate(); worker = null; } },
  };
}
