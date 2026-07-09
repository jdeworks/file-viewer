// Shared OCR engine — a thin, UI-free wrapper over tesseract.js (vendored, fully offline). Source-
// agnostic: recognize() accepts anything tesseract takes (canvas | ImageData | Blob | HTMLImageElement
// | url), so the image lane (open image / editor canvas) and the media lane (sampled video frame) plug
// into the SAME engine. Heavy: the lib + wasm core + language data (~11 MB) are lazy-loaded only on the
// first recognize() call and flagged heavy so the offline precache leaves them unchecked — lanes show a
// one-time download hint (use `bundleInfo`) before invoking. A single worker is reused across calls.
import { vendor, loadGlobal } from '../script-loader.js';

// Pick the SIMD core where supported (all modern browsers), else the plain fallback — both are
// self-contained (.wasm.js embeds its wasm), so loading one file keeps us same-origin/offline.
const SIMD = (() => {
  try {
    return WebAssembly.validate(new Uint8Array(
      [0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]));
  } catch { return false; }
})();

// Shown by lanes in the opt-in hint before the first (heavy) load.
export const bundleInfo = { id: 'vendor:tesseract', approxMB: 11, lang: 'eng' };
// Digits-optimized preset (timestamps, scoreboards, counters): pass { digits: true } to recognize().
export const DIGITS_WHITELIST = '0123456789:.,%+-/$€£ ';

let workerPromise = null;
export function isLoaded() { return !!workerPromise; }

function getWorker(onProgress) {
  if (workerPromise) return workerPromise;
  workerPromise = (async () => {
    const Tesseract = await loadGlobal(vendor('tesseract/tesseract.min.js'), 'Tesseract');
    const worker = await Tesseract.createWorker('eng', 1 /* OEM.LSTM_ONLY */, {
      workerPath: vendor('tesseract/worker.min.js'),
      corePath: vendor('tesseract/tesseract-core-' + (SIMD ? 'simd-' : '') + 'lstm.wasm.js'),
      langPath: vendor('tesseract').replace(/\/$/, ''),     // dir holding eng.traineddata.gz
      // Only pass `logger` when we actually have a callback. Passing `logger: undefined`
      // clobbers tesseract's default no-op logger (via _objectSpread), and the worker then
      // calls it on the first "progress" message → "TypeError: m is not a function".
      ...(onProgress ? { logger: (m) => onProgress(m) } : {}),
    });
    return worker;
  })();
  return workerPromise;
}

// Recognize text from any image source. opts: { digits?:bool, whitelist?:string, onProgress?:fn }.
export async function recognize(source, opts = {}) {
  const worker = await getWorker(opts.onProgress);
  const whitelist = opts.whitelist != null ? opts.whitelist : (opts.digits ? DIGITS_WHITELIST : '');
  await worker.setParameters({ tessedit_char_whitelist: whitelist });   // '' = full charset; reset each call
  const { data } = await worker.recognize(source);
  return {
    text: (data.text || '').trim(),
    confidence: data.confidence,
    words: (data.words || []).map((w) => ({ text: w.text, confidence: w.confidence, bbox: w.bbox })),
  };
}

// Free the worker (and its wasm). Lanes may call this when their viewer closes.
export async function terminate() {
  if (!workerPromise) return;
  const w = await workerPromise.catch(() => null);
  workerPromise = null;
  if (w) await w.terminate();
}
