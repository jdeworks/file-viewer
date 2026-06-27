// Off-main-thread ASCII conversion. Receives a source frame as a (transferred)
// ImageBitmap + options, runs the SAME processImage + imageToAscii pipeline on
// OffscreenCanvases, and returns either a rendered bitmap (canvas consumers: webcam +
// the file converter) or the cell grid (the studio <pre>). One job at a time; the
// engine coalesces. Falls back to the main-thread sync path if this worker can't load.
import { processImage } from './process-image.js';
import { imageToAscii } from './convert.js';
import { renderAsciiToCanvas } from './render.js';

const srcCanvas = new OffscreenCanvas(1, 1);
const processed = new OffscreenCanvas(1, 1);
const scratch = new OffscreenCanvas(1, 1);
const outCanvas = new OffscreenCanvas(1, 1);

// A worker's OffscreenCanvas has its OWN font set — the document's @font-face isn't visible
// here — so load the vendored mono into self.fonts, else block glyphs render as tofu
// in the worker-rendered ('bitmap') output (webcam + file converter).
const fontReady = (async () => {
  try {
    const url = new URL('../../../vendor/fonts/dejavu-sans-mono.woff2', import.meta.url).href;
    const f = new FontFace('FV ASCII Mono', `url(${url}) format('woff2')`);
    await f.load();
    self.fonts.add(f);
  } catch { /* fallback metrics; the per-glyph fit still prevents overflow */ }
})();

self.onmessage = async (e) => {
  const { id, bitmap, options, want } = e.data;
  try {
    if (want === 'bitmap') await fontReady;   // ensure the mono font before measuring/drawing glyphs
    if (srcCanvas.width !== bitmap.width || srcCanvas.height !== bitmap.height) {
      srcCanvas.width = bitmap.width; srcCanvas.height = bitmap.height;
    }
    const sctx = srcCanvas.getContext('2d', { willReadFrequently: true });
    sctx.clearRect(0, 0, srcCanvas.width, srcCanvas.height);   // reused canvas: a transparent frame must NOT keep the previous one
    sctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const t0 = performance.now();
    processImage(srcCanvas, processed, options);
    const result = imageToAscii(processed, srcCanvas, options, scratch);
    const ms = performance.now() - t0;
    if (want === 'bitmap') {
      renderAsciiToCanvas(result, outCanvas, options);
      const out = outCanvas.transferToImageBitmap();
      self.postMessage({ id, ms, columns: result.columns, rows: result.rows, bitmap: out }, [out]);
    } else {
      self.postMessage({ id, ms, columns: result.columns, rows: result.rows, cells: result.cells });
    }
  } catch (err) {
    self.postMessage({ id, error: String((err && err.message) || err) });
  }
};
