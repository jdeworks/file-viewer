// Canvas waveform renderer for the audio Listen lane. Ported from auto-audiobook's
// MixerTrack.drawSpeakerTrack: mirrored peak bars around the vertical midline, the played
// portion (left of the cursor) drawn in the accent colour and the rest muted, trimmed-out
// source ranges dimmed, plus an optional fade-envelope shaping. Colours are read from the
// surface's CSS custom properties so light/dark theming is automatic.

function readVar(el, name, fallback) {
  const value = getComputedStyle(el).getPropertyValue(name).trim();
  return value || fallback;
}

// Draw the waveform for one audio element across the full canvas width.
// opts: { summary, durationSec, cursorSec, inSec, outSec, fadeInSec, fadeOutSec }
export function drawListenWaveform(canvas, surface, opts = {}) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || canvas.width;
  const h = canvas.clientHeight || canvas.height;
  if (w <= 0 || h <= 0) return;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const waveColor = readVar(surface, '--al-wave', '#0369a1');
  const mutedColor = readVar(surface, '--al-wave-unplayed', 'rgba(100,116,139,0.35)');
  const trimColor = readVar(surface, '--al-wave-trimmed', 'rgba(100,116,139,0.12)');

  const summary = opts.summary;
  const peaks = summary && (summary.peak || summary.peaks);
  const duration = Math.max(0.001, Number(opts.durationSec) || (summary && summary.duration) || 1);
  const mid = h / 2;

  // No decoded peaks yet — draw a flat baseline so the lane reads as "loading", not broken.
  if (!peaks || !peaks.length) {
    ctx.strokeStyle = mutedColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(w, mid);
    ctx.stroke();
    return;
  }

  const count = peaks.length;
  const barW = w / count;
  const inFrac = clamp01((Number(opts.inSec) || 0) / duration);
  const outFrac = clamp01((Number(opts.outSec) || duration) / duration);
  const cursorFrac = clamp01((Number(opts.cursorSec) || 0) / duration);
  const fadeInFrac = (Number(opts.fadeInSec) || 0) / duration;
  const fadeOutFrac = (Number(opts.fadeOutSec) || 0) / duration;

  // Dim the trimmed-out regions (before in / after out) as a soft background band.
  if (inFrac > 0) { ctx.fillStyle = trimColor; ctx.fillRect(0, 0, inFrac * w, h); }
  if (outFrac < 1) { ctx.fillStyle = trimColor; ctx.fillRect(outFrac * w, 0, (1 - outFrac) * w, h); }

  let maxPeak = 0;
  for (let i = 0; i < count; i += 1) if (peaks[i] > maxPeak) maxPeak = peaks[i];
  const norm = maxPeak > 0 ? 1 / maxPeak : 1;

  for (let i = 0; i < count; i += 1) {
    const frac = i / count;
    let amp = peaks[i] * norm;
    // Apply fade envelopes visually (matches the export filter shape).
    if (fadeInFrac > 0 && frac < inFrac + fadeInFrac && frac >= inFrac) {
      amp *= clamp01((frac - inFrac) / fadeInFrac);
    }
    if (fadeOutFrac > 0 && frac > outFrac - fadeOutFrac && frac <= outFrac) {
      amp *= clamp01((outFrac - frac) / fadeOutFrac);
    }
    const barH = Math.max(0.5, amp * mid * 0.9);
    const trimmed = frac < inFrac || frac > outFrac;
    const played = frac <= cursorFrac;
    ctx.fillStyle = trimmed ? mutedColor : (played ? waveColor : mutedColor);
    ctx.globalAlpha = trimmed ? 0.5 : 1;
    ctx.fillRect(i * barW, mid - barH, Math.max(barW - 0.5, 0.5), barH * 2);
  }
  ctx.globalAlpha = 1;
}

function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
