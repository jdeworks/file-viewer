// Encode a list of rendered ASCII frames ({ canvas, delayMs }) back into a file.
//  • encodeGif  — vendored gifenc (per-frame palette), preserves each frame's delay.
//  • encodeWebm — browser MediaRecorder over a canvas captureStream (the webcam pattern);
//    real-time (output duration ≈ sum of frame delays). No heavy dependency.
// Both report progress and honour an AbortSignal.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Fix the output size to the first frame; draw each frame onto a working canvas (so a
// stray differently-sized frame is scaled rather than corrupting the stream).
function workCanvas(frames) {
  const w = frames[0]?.canvas.width || 1, h = frames[0]?.canvas.height || 1;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return { c, ctx: c.getContext('2d', { willReadFrequently: true }), w, h };
}

export async function encodeGif(frames, { onProgress, signal } = {}) {
  const { GIFEncoder, quantize, applyPalette } = await import('../../../vendor/gifenc/gifenc.esm.js');
  const { ctx, w, h } = workCanvas(frames);
  const gif = GIFEncoder();
  for (let i = 0; i < frames.length; i++) {
    if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(frames[i].canvas, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, w, h, { palette, delay: Math.max(20, Math.round(frames[i].delayMs || 100)) });
    onProgress?.({ done: i + 1, total: frames.length, phase: 'encode' });
    await Promise.resolve();   // yield so the progress bar repaints
  }
  gif.finish();
  return new Blob([gif.bytes()], { type: 'image/gif' });
}

export async function encodeWebm(frames, { fps = 12, onProgress, signal } = {}) {
  const { c: out, ctx, w, h } = workCanvas(frames);
  const stream = out.captureStream(fps);
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
    .find((t) => MediaRecorder.isTypeSupported(t)) || 'video/webm';
  const rec = new MediaRecorder(stream, { mimeType: mime });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  const stopped = new Promise((res) => { rec.onstop = res; });
  rec.start();
  try {
    for (let i = 0; i < frames.length; i++) {
      if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(frames[i].canvas, 0, 0, w, h);
      onProgress?.({ done: i + 1, total: frames.length, phase: 'encode' });
      await sleep(Math.max(20, Math.round(frames[i].delayMs || 1000 / fps)));
    }
  } finally {
    rec.stop();
    await stopped;
  }
  return new Blob(chunks, { type: mime });
}
