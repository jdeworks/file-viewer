// Canvas waveform renderer for the audio Listen lane. Ported from auto-audiobook's
// MixerTrack: a positioned CLIP block within a timeline — mirrored peak bars around the midline,
// the played portion (left of the cursor) in the accent colour and the rest muted, with visible
// fade-in/out gradient overlays at the clip edges. Colours come from the surface's CSS custom
// properties so light/dark theming is automatic.

function readVar(el, name, fallback) {
  const value = getComputedStyle(el).getPropertyValue(name).trim();
  return value || fallback;
}

function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

// Draw the clip waveform. opts (all in SECONDS unless noted):
//   timelineSec, cursorTimelineSec, and EITHER a single clip (legacy: clipStartSec, clipLenSec,
//   summary, sourceInFrac, sourceOutFrac, fadeInSec, fadeOutSec) OR `clips: [ ...same per-clip
//   fields ]` to draw N positioned clips on one lane (after a Cut/split). Each clip past the lane
//   start gets a divider line so the cut is visible.
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

  const colors = {
    wave: readVar(surface, '--al-wave', '#0369a1'),
    muted: readVar(surface, '--al-wave-unplayed', 'rgba(100,116,139,0.35)'),
    clipBg: readVar(surface, '--al-clip-bg', 'rgba(3,105,161,0.08)'),
    fade: readVar(surface, '--al-wave-fade', 'rgba(220,38,38,0.22)'),
    divider: readVar(surface, '--al-clip-divider', 'rgba(15,23,42,0.45)'),
  };
  const timeline = Math.max(0.001, Number(opts.timelineSec) || 1);
  const pxPerSec = w / timeline;
  const cursorX = (Number(opts.cursorTimelineSec) || 0) * pxPerSec;
  const clips = Array.isArray(opts.clips) ? opts.clips : [opts];
  for (const clip of clips) drawClip(ctx, { h, timeline, pxPerSec }, colors, clip, cursorX);
}

function drawClip(ctx, geom, colors, clip, cursorX) {
  const { h, timeline, pxPerSec } = geom;
  const mid = h / 2;
  const clipX = (Number(clip.clipStartSec) || 0) * pxPerSec;
  const clipW = Math.max(2, (Number(clip.clipLenSec) || timeline) * pxPerSec);

  // Clip background band.
  ctx.fillStyle = colors.clipBg;
  ctx.fillRect(clipX, 0, clipW, h);

  const summary = clip.summary;
  const peaks = summary && (summary.peak || summary.peaks);
  if (!peaks || !peaks.length) {
    ctx.strokeStyle = colors.muted;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(clipX, mid);
    ctx.lineTo(clipX + clipW, mid);
    ctx.stroke();
    drawDivider(ctx, h, clipX, colors.divider);
    return;
  }

  // Only the trimmed source slice of the summary is shown, stretched across the clip width.
  const total = peaks.length;
  const inIdx = Math.floor(clamp01(clip.sourceInFrac) * total);
  const outIdx = Math.max(inIdx + 1, Math.ceil(clamp01(clip.sourceOutFrac ?? 1) * total));
  const slice = outIdx - inIdx;
  // Peaks are absolute amplitude (0..1). Draw the ACTUAL level — do NOT normalize each clip to its
  // own max, which made every file (quiet or loud) fill the full lane height.

  const fadeInPx = Math.max(0, (Number(clip.fadeInSec) || 0) * pxPerSec);
  const fadeOutPx = Math.max(0, (Number(clip.fadeOutSec) || 0) * pxPerSec);

  const barW = clipW / slice;
  for (let i = 0; i < slice; i += 1) {
    const peak = peaks[inIdx + i];
    const x = clipX + i * barW;
    let amp = peak;
    // Fade envelopes shape the bar height (matches export filter shape).
    if (fadeInPx > 0 && x - clipX < fadeInPx) amp *= clamp01((x - clipX) / fadeInPx);
    if (fadeOutPx > 0 && clipX + clipW - x < fadeOutPx) amp *= clamp01((clipX + clipW - x) / fadeOutPx);
    const barH = Math.max(0.5, amp * mid * 0.9);
    ctx.fillStyle = x <= cursorX ? colors.wave : colors.muted;
    ctx.fillRect(x, mid - barH, Math.max(barW - 0.5, 0.5), barH * 2);
  }

  // Visible fade overlays — red-tinted gradient triangles at the clip edges.
  if (fadeInPx > 1) {
    const grad = ctx.createLinearGradient(clipX, 0, clipX + fadeInPx, 0);
    grad.addColorStop(0, colors.fade);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(clipX, 0, fadeInPx, h);
  }
  if (fadeOutPx > 1) {
    const x0 = clipX + clipW - fadeOutPx;
    const grad = ctx.createLinearGradient(x0, 0, clipX + clipW, 0);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(1, colors.fade);
    ctx.fillStyle = grad;
    ctx.fillRect(x0, 0, fadeOutPx, h);
  }
  drawDivider(ctx, h, clipX, colors.divider);
}

// A thin vertical line at a clip's left edge so cuts/splits read as separate blocks.
function drawDivider(ctx, h, clipX, color) {
  if (clipX <= 0.5) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(Math.round(clipX) + 0.5, 0);
  ctx.lineTo(Math.round(clipX) + 0.5, h);
  ctx.stroke();
}
