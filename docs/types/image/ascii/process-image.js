// Image pre-processing for the ASCII pipeline: native CSS filters + the JS-only
// passes (sharpen / edge-detect / threshold). Pure and DOM-light — works on any 2D
// canvas (HTMLCanvasElement OR OffscreenCanvas), so the engine (main thread) and the
// convert worker share one implementation. Each pass no-ops at its neutral value, so
// the fast path stays fast.
import { buildFilterString, applyThreshold, applySharpen, applyEdgeDetect } from './filters.js';

// Draw `src` into `dest` (resized to match) with filters + JS passes applied.
export function processImage(src, dest, options) {
  const w = src.width, h = src.height;
  if (dest.width !== w || dest.height !== h) { dest.width = w; dest.height = h; }
  const ctx = dest.getContext('2d', { willReadFrequently: true });
  ctx.filter = buildFilterString(options);
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(src, 0, 0);
  ctx.filter = 'none';
  const needJs = options.thresholdEnabled || options.sharpness || options.edgeDetection;
  if (needJs) {
    const img = ctx.getImageData(0, 0, w, h);
    if (options.sharpness) applySharpen(img, options.sharpness);
    if (options.edgeDetection) applyEdgeDetect(img, options.edgeDetection);
    if (options.thresholdEnabled) applyThreshold(img, options.threshold);
    ctx.putImageData(img, 0, 0);
  }
}
