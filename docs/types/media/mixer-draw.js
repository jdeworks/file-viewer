// P5 — per-lane waveform/region drawing for the mixer. Pulled out of mixer-ui.js
// to keep both under the LOC cap. Draws peaks for clip lanes (downsampled from the
// decoded AudioBuffer — no re-decode), a flat band for generator lanes, and shades
// the fade-in / fade-out triangles so the envelope is visible.

export function drawLaneWaveform(canvas, lane, options = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width, H = canvas.height, mid = H / 2;
  ctx.clearRect(0, 0, W, H);

  const style = getComputedStyle(document.documentElement);
  const accent = style.getPropertyValue('--accent').trim() || '#4c9aff';

  const audibleGain = Math.max(0, Number.isFinite(options.effectiveGain) ? options.effectiveGain : lane.gain || 0);

  if (lane.kind === 'clip' && lane.waveform) {
    const summary = lane.waveform;
    ctx.fillStyle = accent + (audibleGain <= 0 ? '22' : '66');
    for (let i = 0; i < W; i++) {
      const a = Math.floor((i / W) * summary.buckets);
      const b = Math.max(a + 1, Math.floor(((i + 1) / W) * summary.buckets));
      let lo = 0;
      let hi = 0;
      let rms = 0;
      let n = 0;
      for (let j = a; j < Math.min(summary.buckets, b); j += 1) {
        lo = Math.min(lo, summary.min[j] || 0);
        hi = Math.max(hi, summary.max[j] || 0);
        rms += summary.rms[j] || 0;
        n += 1;
      }
      const amp = Math.min(2, audibleGain);
      const top = mid - Math.max(1, hi * mid * 0.9 * amp);
      const bottom = mid - Math.min(-1, lo * mid * 0.9 * amp);
      ctx.fillRect(i, top, 1, Math.max(1, bottom - top));
      const rh = Math.max(1, (n ? rms / n : 0) * mid * 0.9 * amp);
      ctx.fillStyle = accent + (audibleGain <= 0 ? '33' : 'aa');
      ctx.fillRect(i, mid - rh, 1, rh * 2);
      ctx.fillStyle = accent + (audibleGain <= 0 ? '22' : '66');
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
