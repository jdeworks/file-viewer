// P5 — per-lane waveform/region drawing for the mixer. Pulled out of mixer-ui.js
// to keep both under the LOC cap. Draws peaks for clip lanes (downsampled from the
// decoded AudioBuffer — no re-decode), a flat band for generator lanes, and shades
// the fade-in / fade-out triangles so the envelope is visible.

export function drawLaneWaveform(canvas, lane) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width, H = canvas.height, mid = H / 2;
  ctx.clearRect(0, 0, W, H);

  const style = getComputedStyle(document.documentElement);
  const accent = style.getPropertyValue('--accent').trim() || '#4c9aff';

  if (lane.kind === 'clip' && lane.buffer) {
    const ch = lane.buffer.getChannelData(0);
    const step = Math.max(1, Math.floor(ch.length / W));
    ctx.fillStyle = accent + '66';
    for (let i = 0; i < W; i++) {
      let max = 0;
      const base = i * step;
      for (let j = 0; j < step; j++) {
        const v = Math.abs(ch[base + j] || 0);
        if (v > max) max = v;
      }
      const h = Math.max(1, max * mid * 0.9);
      ctx.fillRect(i, mid - h, 1, h * 2);
    }
  } else {
    // Generator lane: a flat band (tone) or a noisy band (noise).
    ctx.fillStyle = accent + '44';
    if (lane.kind === 'noise') {
      for (let i = 0; i < W; i++) {
        const h = (0.3 + Math.random() * 0.5) * mid;
        ctx.fillRect(i, mid - h, 1, h * 2);
      }
    } else {
      ctx.fillRect(0, mid - mid * 0.55, W, mid * 1.1);
    }
  }

  // Fade overlays (darken the parts attenuated by the envelope).
  if (W > 1 && lane.duration > 0) {
    const px = W / lane.duration;   // px per second within this region
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    const fi = (lane.fadeIn || 0) * px;
    if (fi > 0) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(fi, 0); ctx.lineTo(0, H); ctx.closePath(); ctx.fill(); }
    const fo = (lane.fadeOut || 0) * px;
    if (fo > 0) { ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(W - fo, 0); ctx.lineTo(W, H); ctx.closePath(); ctx.fill(); }
  }
}
