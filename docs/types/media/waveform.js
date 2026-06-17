// Audio waveform renderer + Web Audio gain helper.
// Module-level AudioContext singleton (created lazily, reused across renders).
let _ac = null;
const _elNodes = new WeakMap(); // audio element → { source, gainNode }

function getAC() {
  if (!_ac || _ac.state === 'closed') {
    try { _ac = new AudioContext(); } catch { return null; }
  }
  return _ac;
}

// Connect el through a GainNode → AudioContext.destination. Idempotent: safe to call
// repeatedly on the same element (createMediaElementSource can only be called once per el).
export function connectGain(el) {
  if (_elNodes.has(el)) return _elNodes.get(el).gainNode;
  const ac = getAC();
  if (!ac) return null;
  try {
    const source = ac.createMediaElementSource(el);
    const gainNode = ac.createGain();
    source.connect(gainNode);
    gainNode.connect(ac.destination);
    _elNodes.set(el, { source, gainNode });
    return gainNode;
  } catch { return null; }
}

// Draw a waveform on canvas from intake audio bytes, return a controller with
// update(el) (starts RAF position-line loop) and destroy() (cancels it).
export async function renderWaveform(canvas, intake) {
  const ctx2d = canvas.getContext('2d');
  if (!ctx2d) return null;
  const W = canvas.width;
  const H = canvas.height;

  // Slice first ~60s (60s × 256kbps ≈ 1.8 MB) to avoid decoding entire large files.
  const SLICE = 60 * 256 * 128;
  let buf;
  try {
    const src = intake.file
      ? intake.file.slice(0, SLICE)
      : new Blob([intake.bytes?.slice(0, SLICE) ?? new Uint8Array()]);
    buf = await src.arrayBuffer();
  } catch { return null; }

  const ac = getAC();
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
  }

  return { update, destroy };
}
