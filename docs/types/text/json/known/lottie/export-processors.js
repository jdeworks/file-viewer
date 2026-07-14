import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
import { createGifSink } from '../../../../image/ascii/encode.js';

const REQUEST_TIMEOUT_MS = 120_000;

export function exportAbortError() {
  return new DOMException('Lottie export was cancelled.', 'AbortError');
}

function rasterPayload(raster) {
  if (raster?.bitmap) return { bitmap: raster.bitmap, transfer: [raster.bitmap] };
  if (raster?.blob instanceof Blob) return { blob: raster.blob, transfer: [] };
  throw new Error('The Lottie sandbox returned no raster frame.');
}

async function decodeRasterBlob(blob) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(blob); }
    catch { /* fall through to the browser image decoder */ }
  }
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    if (typeof image.decode === 'function') await image.decode();
    else await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('The PNG raster frame could not be decoded.'));
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

class WorkerProcessor {
  constructor(options) {
    this.options = options;
    this.worker = new Worker(new URL('./export-worker.js', import.meta.url));
    this.pending = new Map();
    this.nextRequestId = 0;
    this.closed = false;
    this.worker.onmessage = (event) => this.#handleMessage(event.data || {});
    this.worker.onerror = (event) => this.#failAll(new Error(event.message || 'The Lottie export worker failed.'));
  }

  #handleMessage(message) {
    const pending = this.pending.get(message.requestId);
    if (!pending) return;
    this.pending.delete(message.requestId);
    clearTimeout(pending.timer);
    if (message.type === 'error') pending.reject(new Error(message.message || 'The Lottie export worker failed.'));
    else pending.resolve(message);
  }

  #failAll(error) {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
    this.close();
  }

  request(message, transfer = []) {
    if (this.closed) return Promise.reject(exportAbortError());
    const requestId = ++this.nextRequestId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error('The Lottie export worker timed out.'));
        this.close();
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(requestId, { resolve, reject, timer });
      try { this.worker.postMessage({ ...message, requestId }, transfer); }
      catch (error) {
        clearTimeout(timer);
        this.pending.delete(requestId);
        reject(error);
      }
    });
  }

  async start() {
    await this.request({ type: 'start', ...this.options });
    return this;
  }

  async addFrame(raster, { index, delayMs } = {}) {
    const payload = rasterPayload(raster);
    const { transfer, ...data } = payload;
    try {
      const reply = await this.request({
        type: 'frame', jobId: this.options.jobId, index, delayMs, ...data,
      }, transfer);
      return reply.blob || null;
    } catch (error) {
      raster?.bitmap?.close?.();
      throw error;
    }
  }

  async finish() {
    try {
      const reply = await this.request({ type: 'finish', jobId: this.options.jobId });
      return reply.blob || null;
    } finally {
      this.close();
    }
  }

  cancel() {
    this.#failAll(exportAbortError());
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.worker.terminate();
  }
}

class MainThreadProcessor {
  constructor(options) {
    this.options = options;
    this.canvas = document.createElement('canvas');
    this.canvas.width = options.width;
    this.canvas.height = options.height;
    this.context = this.canvas.getContext('2d', { willReadFrequently: options.mode === 'gif' });
    this.closed = false;
    this.generatedBytes = 0;
    this.gif = null;
  }

  async start() {
    if (!this.context) throw new Error('The fallback export canvas could not be initialized.');
    if (this.options.mode === 'gif') {
      this.gif = await createGifSink({
        transparent: this.options.transparent,
        repeat: this.options.repeat,
        minDelayMs: this.options.minDelayMs,
      });
    }
    return this;
  }

  async #draw(raster) {
    if (this.closed) throw exportAbortError();
    const source = raster?.bitmap || (raster?.blob instanceof Blob ? await decodeRasterBlob(raster.blob) : null);
    if (!source) throw new Error('The Lottie sandbox returned no raster frame.');
    try {
      const width = Number(source.naturalWidth || source.width);
      const height = Number(source.naturalHeight || source.height);
      if (width !== this.canvas.width || height !== this.canvas.height) {
        throw new Error(`Unexpected raster size ${width} × ${height}.`);
      }
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.context.drawImage(source, 0, 0);
    } finally {
      source.close?.();
    }
  }

  async addFrame(raster, { delayMs } = {}) {
    await this.#draw(raster);
    if (this.options.mode === 'gif') {
      this.gif.addFrame(this.canvas, delayMs);
      if (this.gif.byteLength > this.options.byteLimit) {
        throw new Error(`The encoded GIF exceeded the ${Math.round(this.options.byteLimit / 1048576)} MiB safety limit.`);
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
      return null;
    }
    const blob = await new Promise((resolve, reject) => this.canvas.toBlob(
      (value) => value ? resolve(value) : reject(new Error('PNG encoding failed.')),
      'image/png',
    ));
    this.generatedBytes += blob.size;
    if (this.generatedBytes > this.options.byteLimit) {
      throw new Error(`Generated frames exceeded the ${Math.round(this.options.byteLimit / 1048576)} MiB safety limit.`);
    }
    return blob;
  }

  async finish() {
    if (this.closed) throw exportAbortError();
    const blob = this.options.mode === 'gif' ? this.gif.finish() : null;
    if (blob && blob.size > this.options.byteLimit) {
      throw new Error(`The encoded GIF exceeded the ${Math.round(this.options.byteLimit / 1048576)} MiB safety limit.`);
    }
    this.close();
    return blob;
  }

  cancel() { this.close(); }
  close() { this.closed = true; }
}

export async function createRasterProcessor(options) {
  if (typeof Worker !== 'undefined') {
    const worker = new WorkerProcessor(options);
    try { return await worker.start(); }
    catch { worker.close(); }
  }
  return new MainThreadProcessor(options).start();
}

async function zipInWorker(frames, byteLimit, signal) {
  const processor = new WorkerProcessor({
    jobId: 'zip', mode: 'png', width: 1, height: 1,
    transparent: true, repeat: -1, minDelayMs: 10, byteLimit,
  });
  const onAbort = () => processor.cancel();
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    if (signal?.aborted) throw exportAbortError();
    const reply = await processor.request({ type: 'zip', frames, byteLimit });
    return reply.blob;
  } finally {
    signal?.removeEventListener('abort', onAbort);
    processor.close();
  }
}

async function zipOnMainThread(frames, byteLimit, signal) {
  if (signal?.aborted) throw exportAbortError();
  const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
  let bytes = 0;
  const zip = new JSZip();
  for (const frame of frames) {
    bytes += frame.blob.size;
    if (bytes > byteLimit) throw new Error(`Generated frames exceeded the ${Math.round(byteLimit / 1048576)} MiB safety limit.`);
    zip.file(frame.name, frame.blob);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  if (signal?.aborted) throw exportAbortError();
  if (blob.size > byteLimit) throw new Error(`The ZIP exceeded the ${Math.round(byteLimit / 1048576)} MiB safety limit.`);
  return blob;
}

export async function packagePngZip(frames, byteLimit, { signal } = {}) {
  if (typeof Worker !== 'undefined') {
    try { return await zipInWorker(frames, byteLimit, signal); }
    catch (error) {
      if (error?.name === 'AbortError') throw error;
    }
  }
  return zipOnMainThread(frames, byteLimit, signal);
}
