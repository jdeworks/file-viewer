// Streaming output encoders for the ASCII converter. Each is a SINK: feed rendered
// frames one at a time via addFrame(), then finish() → Blob. Streaming means the
// converter never buffers all frames, so long clips encode with flat memory.
//  • createGifSink  — vendored gifenc (per-frame palette), preserves each frame's delay.
//  • createWebmSink — MediaRecorder over a canvas captureStream (the webcam pattern);
//    real-time (output duration ≈ sum of frame delays). No heavy dependency.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// `transparent` keeps the alpha channel: quantize to an rgba4444 palette + write each
// frame with a transparent index and dispose:2 (restore to background) so transparent
// regions stay transparent and frames don't composite in the player.
export async function createGifSink({ transparent = false } = {}) {
  const { GIFEncoder, quantize, applyPalette } = await import('../../../vendor/gifenc/gifenc.esm.js');
  const gif = GIFEncoder();
  const fmt = transparent ? 'rgba4444' : 'rgb565';
  let w = 0, h = 0, ctx = null;
  return {
    addFrame(canvas, delayMs) {
      if (!ctx) {
        w = canvas.width; h = canvas.height;
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        ctx = c.getContext('2d', { willReadFrequently: true });
      }
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(canvas, 0, 0, w, h);
      const { data } = ctx.getImageData(0, 0, w, h);
      const palette = quantize(data, 256, { format: fmt, oneBitAlpha: transparent });
      const index = applyPalette(data, palette, fmt);
      const opts = { palette, delay: Math.max(20, Math.round(delayMs || 100)) };
      if (transparent) { opts.transparent = true; opts.dispose = 2; }
      gif.writeFrame(index, w, h, opts);
    },
    finish() { gif.finish(); return new Blob([gif.bytes()], { type: 'image/gif' }); },
  };
}

export function createWebmSink({ fps = 12 } = {}) {
  let out = null, ctx = null, w = 0, h = 0, rec = null, stopped = null, mime = 'video/webm';
  const chunks = [];
  return {
    async addFrame(canvas, delayMs) {
      if (!rec) {
        w = canvas.width; h = canvas.height;
        out = document.createElement('canvas'); out.width = w; out.height = h; ctx = out.getContext('2d');
        mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
          .find((t) => MediaRecorder.isTypeSupported(t)) || 'video/webm';
        rec = new MediaRecorder(out.captureStream(fps), { mimeType: mime });
        rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
        stopped = new Promise((res) => { rec.onstop = res; });
        rec.start();
      }
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(canvas, 0, 0, w, h);
      await sleep(Math.max(20, Math.round(delayMs || 1000 / fps)));
    },
    async finish() { if (rec) { rec.stop(); await stopped; } return new Blob(chunks, { type: mime }); },
  };
}
