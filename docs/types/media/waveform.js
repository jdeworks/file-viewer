// Audio waveform renderer + Web Audio gain helper.
import { getGraph } from './audio-graph.js';
// Module-level AudioContext singleton (created lazily, reused across renders).
let _ac = null;
const _gainProxies = new WeakMap(); // audio element → { gain: { value } } proxy

function getAC() {
  if (!_ac || _ac.state === 'closed') {
    try { _ac = new AudioContext(); } catch { return null; }
  }
  return _ac;
}

// Connect el through the shared media graph's mixer gain. createMediaElementSource
// can only be called ONCE per element, so the mixer gain must live in the same graph
// as the Spectrum & EQ panel (audio-graph.js owns the single source). This returns a
// small proxy whose `.gain.value` setter drives that graph's mixer gain — keeping the
// old `connectGain(el).gain.value = x` call sites working without a second source.
export function connectGain(el) {
  if (_gainProxies.has(el)) return _gainProxies.get(el);
  const graph = getGraph(el);
  if (!graph) return null;
  const proxy = { gain: { get value() { return graph.getUserGain(); }, set value(v) { graph.setUserGain(v); } } };
  _gainProxies.set(el, proxy);
  return proxy;
}

async function drawWaveform(canvas, file, { ownContext = false } = {}) {
  const ctx2d = canvas.getContext('2d');
  if (!ctx2d) return null;
  const W = canvas.width;
  const H = canvas.height;

  // Slice first ~60s (60s × 256kbps ≈ 1.8 MB) to avoid decoding entire large files.
  const SLICE = 60 * 256 * 128;
  let buf;
  try {
    buf = await file.slice(0, SLICE).arrayBuffer();
  } catch { return null; }

  let ac = null;
  try { ac = ownContext ? new AudioContext() : getAC(); } catch {}
  if (!ac) return null;

  let audioBuffer;
  try {
    // decodeAudioData consumes the buffer; pass a copy so the original stays usable.
    audioBuffer = await ac.decodeAudioData(buf.slice(0));
  } catch { return null; }

  // Downsample to one peak per pixel column.
  const ch = audioBuffer.getChannelData(0);
  const step = Math.max(1, Math.floor(ch.length / W));
  const peaks = new Float32Array(W);
  for (let i = 0; i < W; i++) {
    let max = 0;
    for (let j = 0; j < step; j++) {
      const v = Math.abs(ch[i * step + j] || 0);
      if (v > max) max = v;
    }
    peaks[i] = max;
  }

  const style = getComputedStyle(document.documentElement);
  const accent = style.getPropertyValue('--accent').trim() || '#4c9aff';

  function draw(currentTime = 0, duration = 0) {
    ctx2d.clearRect(0, 0, W, H);
    const mid = H / 2;
    ctx2d.fillStyle = accent + '55';
    for (let i = 0; i < W; i++) {
      const h = Math.max(1, peaks[i] * mid * 0.9);
      ctx2d.fillRect(i, mid - h, 1, h * 2);
    }
    if (duration > 0) {
      const x = Math.min(W - 2, Math.round((currentTime / duration) * W));
      ctx2d.fillStyle = '#e5534b';
      ctx2d.fillRect(x, 0, 2, H);
    }
  }

  draw();

  let rafId = null;
  let audioEl = null;

  function update(el) {
    audioEl = el;
    if (!rafId) {
      (function loop() {
        if (audioEl) draw(audioEl.currentTime, audioEl.duration || 0);
        rafId = requestAnimationFrame(loop);
      })();
    }
  }

  function destroy() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (ownContext) ac.close().catch(() => {});
  }

  return { update, destroy };
}

export async function mountWaveform(container, file) {
  container.textContent = '';
  const canvas = document.createElement('canvas');
  canvas.className = 'media-wv-canvas';
  canvas.height = 120;
  canvas.width = Math.max(320, Math.round(container.clientWidth || container.getBoundingClientRect().width || 400));
  container.appendChild(canvas);
  const controller = await drawWaveform(canvas, file, { ownContext: true });
  const audioEl = container.closest('.media-doc')?.querySelector('audio.media-view');
  if (controller && audioEl) controller.update(audioEl);
  return {
    destroy() {
      controller?.destroy();
      canvas.remove();
    },
  };
}

export async function renderWaveform(canvas, intake) {
  const file = intake.file || new File([intake.bytes || new Uint8Array()], intake.filename || 'audio');
  return drawWaveform(canvas, file);
}
