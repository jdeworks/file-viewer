/* global JSZip */

// Local-only raster packaging worker. The iframe owns Lottie's generated SVG;
// this worker sees only transferred bitmaps/PNG blobs and emits PNG, ZIP, or GIF.
// Terminating the worker is the hard cancellation boundary for expensive palette
// quantization and ZIP generation.

let state = null;
let gifModulePromise = null;
let zipLoaded = false;

function errorMessage(error) {
  return error?.message || String(error);
}

function postError(requestId, error) {
  self.postMessage({ type: 'error', requestId, message: errorMessage(error) });
}

function requireState(jobId) {
  if (!state || state.jobId !== jobId) throw new Error('The export job is no longer active.');
  return state;
}

function ensureCanvas(current) {
  if (typeof OffscreenCanvas === 'undefined') throw new Error('OffscreenCanvas is unavailable in this browser.');
  if (!current.canvas) {
    current.canvas = new OffscreenCanvas(current.width, current.height);
    current.context = current.canvas.getContext('2d', { willReadFrequently: current.mode === 'gif' });
    if (!current.context) throw new Error('The export canvas could not be initialized.');
  }
}

async function ensureGif(current) {
  if (current.gif) return;
  gifModulePromise ||= import('../../../../../vendor/gifenc/gifenc.esm.js');
  const { GIFEncoder, quantize, applyPalette } = await gifModulePromise;
  current.gif = GIFEncoder();
  current.quantize = quantize;
  current.applyPalette = applyPalette;
  current.format = current.transparent ? 'rgba4444' : 'rgb565';
}

function ensureZip() {
  if (zipLoaded) return;
  importScripts('../../../../../vendor/jszip/jszip.min.js');
  if (typeof JSZip !== 'function') throw new Error('The local ZIP library could not be initialized.');
  zipLoaded = true;
}

async function drawRaster(current, payload) {
  ensureCanvas(current);
  const bitmap = payload.bitmap || (payload.blob ? await createImageBitmap(payload.blob) : null);
  if (!bitmap) throw new Error('No raster frame was supplied.');
  try {
    if (bitmap.width !== current.width || bitmap.height !== current.height) {
      throw new Error(`Unexpected raster size ${bitmap.width} × ${bitmap.height}.`);
    }
    current.context.clearRect(0, 0, current.width, current.height);
    current.context.drawImage(bitmap, 0, 0);
  } finally {
    bitmap.close?.();
  }
}

async function encodePng(current, payload) {
  await drawRaster(current, payload);
  const blob = await current.canvas.convertToBlob({ type: 'image/png' });
  current.generatedBytes += blob.size;
  if (current.generatedBytes > current.byteLimit) {
    throw new Error(`Generated frames exceeded the ${Math.round(current.byteLimit / 1048576)} MiB safety limit.`);
  }
  return blob;
}

async function encodeGifFrame(current, payload) {
  await drawRaster(current, payload);
  await ensureGif(current);
  const { data } = current.context.getImageData(0, 0, current.width, current.height);
  const palette = current.quantize(data, 256, { format: current.format, oneBitAlpha: current.transparent });
  const index = current.applyPalette(data, palette, current.format);
  const options = {
    palette,
    delay: Math.max(current.minDelayMs, Math.round(Number(payload.delayMs) || 10)),
    repeat: current.repeat,
  };
  if (current.transparent) {
    options.transparent = true;
    options.dispose = 2;
  }
  current.gif.writeFrame(index, current.width, current.height, options);
  if (current.gif.bytesView().byteLength > current.byteLimit) {
    throw new Error(`The encoded GIF exceeded the ${Math.round(current.byteLimit / 1048576)} MiB safety limit.`);
  }
}

async function packageZip(frames, byteLimit) {
  ensureZip();
  let bytes = 0;
  const zip = new JSZip();
  for (const frame of frames || []) {
    if (!(frame?.blob instanceof Blob)) throw new Error('A ZIP frame is missing its PNG data.');
    bytes += frame.blob.size;
    if (bytes > byteLimit) throw new Error(`Generated frames exceeded the ${Math.round(byteLimit / 1048576)} MiB safety limit.`);
    zip.file(frame.name, frame.blob);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  if (blob.size > byteLimit) throw new Error(`The ZIP exceeded the ${Math.round(byteLimit / 1048576)} MiB safety limit.`);
  return blob;
}

self.onmessage = async (event) => {
  const message = event.data || {};
  const requestId = message.requestId;
  try {
    if (message.type === 'start') {
      if (!['png', 'gif'].includes(message.mode)) throw new Error('Unsupported export worker mode.');
      if (!Number.isInteger(message.width) || !Number.isInteger(message.height) || message.width < 1 || message.height < 1) {
        throw new Error('Invalid export dimensions.');
      }
      state = {
        jobId: message.jobId,
        mode: message.mode,
        width: message.width,
        height: message.height,
        transparent: !!message.transparent,
        repeat: Number(message.repeat) >= 0 ? Number(message.repeat) : -1,
        minDelayMs: Math.max(10, Number(message.minDelayMs) || 20),
        byteLimit: Math.max(1, Number(message.byteLimit) || 1),
        generatedBytes: 0,
        canvas: null,
        context: null,
        gif: null,
      };
      ensureCanvas(state);
      if (state.mode === 'gif') await ensureGif(state);
      self.postMessage({ type: 'started', requestId });
      return;
    }
    if (message.type === 'frame') {
      const current = requireState(message.jobId);
      if (current.mode === 'png') {
        const blob = await encodePng(current, message);
        self.postMessage({ type: 'frame', requestId, index: message.index, blob });
      } else {
        await encodeGifFrame(current, message);
        self.postMessage({ type: 'frame', requestId, index: message.index });
      }
      return;
    }
    if (message.type === 'finish') {
      const current = requireState(message.jobId);
      let blob = null;
      if (current.mode === 'gif') {
        await ensureGif(current);
        current.gif.finish();
        blob = new Blob([current.gif.bytes()], { type: 'image/gif' });
        if (blob.size > current.byteLimit) throw new Error(`The encoded GIF exceeded the ${Math.round(current.byteLimit / 1048576)} MiB safety limit.`);
      }
      state = null;
      self.postMessage({ type: 'done', requestId, blob });
      return;
    }
    if (message.type === 'zip') {
      const blob = await packageZip(message.frames, Math.max(1, Number(message.byteLimit) || 1));
      self.postMessage({ type: 'done', requestId, blob });
      return;
    }
    throw new Error('Unknown export worker request.');
  } catch (error) {
    postError(requestId, error);
  }
};
