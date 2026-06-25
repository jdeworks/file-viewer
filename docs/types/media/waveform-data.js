// Shared waveform summary helpers for audio editor surfaces.
// Summaries are fixed-rate in time, so zooming changes the view scale without
// changing the sampled shape.

export const DEFAULT_PEAKS_PER_SECOND = 80;

export function computeWaveformSummary(audioBuffer, { peaksPerSecond = DEFAULT_PEAKS_PER_SECOND } = {}) {
  if (!audioBuffer || !audioBuffer.length || !audioBuffer.duration) return null;
  const buckets = Math.max(20, Math.ceil(audioBuffer.duration * peaksPerSecond));
  const channels = [];
  for (let ch = 0; ch < audioBuffer.numberOfChannels; ch += 1) {
    channels.push(audioBuffer.getChannelData(ch));
  }
  const min = new Float32Array(buckets);
  const max = new Float32Array(buckets);
  const rms = new Float32Array(buckets);
  const peak = new Float32Array(buckets);
  const framesPerBucket = audioBuffer.length / buckets;

  for (let i = 0; i < buckets; i += 1) {
    const start = Math.floor(i * framesPerBucket);
    const end = Math.max(start + 1, Math.min(audioBuffer.length, Math.floor((i + 1) * framesPerBucket)));
    let lo = 1;
    let hi = -1;
    let sumSq = 0;
    let count = 0;
    for (let frame = start; frame < end; frame += 1) {
      let mixed = 0;
      for (const data of channels) mixed += data[frame] || 0;
      mixed /= Math.max(1, channels.length);
      if (mixed < lo) lo = mixed;
      if (mixed > hi) hi = mixed;
      sumSq += mixed * mixed;
      count += 1;
    }
    min[i] = count ? lo : 0;
    max[i] = count ? hi : 0;
    rms[i] = count ? Math.sqrt(sumSq / count) : 0;
    peak[i] = Math.max(Math.abs(min[i]), Math.abs(max[i]));
  }

  return {
    min,
    max,
    rms,
    peak,
    buckets,
    peaksPerSecond,
    duration: audioBuffer.duration,
    sampleRate: audioBuffer.sampleRate,
  };
}

export function drawWaveformSummary(canvas, summary, options = {}) {
  if (!canvas || !summary) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(1, Math.round(canvas.clientWidth || canvas.width || 1));
  const h = Math.max(1, Math.round(canvas.clientHeight || canvas.height || 1));
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const style = getComputedStyle(document.documentElement);
  const accent = options.color || style.getPropertyValue('--accent').trim() || '#4c9aff';
  const rmsColor = options.rmsColor || `${accent}aa`;
  const peakColor = options.peakColor || `${accent}55`;
  const mid = h / 2;
  const startTime = Math.max(0, Number(options.startTime) || 0);
  const endTime = Math.max(startTime + 0.001, Number(options.endTime) || summary.duration || 1);
  const bucketStart = Math.max(0, Math.floor(startTime * summary.peaksPerSecond));
  const bucketEnd = Math.min(summary.buckets, Math.ceil(endTime * summary.peaksPerSecond));
  const visibleBuckets = Math.max(1, bucketEnd - bucketStart);

  ctx.fillStyle = peakColor;
  for (let x = 0; x < w; x += 1) {
    const a = bucketStart + Math.floor((x / w) * visibleBuckets);
    const b = bucketStart + Math.max(a + 1 - bucketStart, Math.floor(((x + 1) / w) * visibleBuckets));
    let lo = 0;
    let hi = 0;
    let r = 0;
    let n = 0;
    for (let i = a; i < Math.min(bucketEnd, b); i += 1) {
      lo = Math.min(lo, summary.min[i] || 0);
      hi = Math.max(hi, summary.max[i] || 0);
      r += summary.rms[i] || 0;
      n += 1;
    }
    const top = mid - Math.max(1, hi * mid * 0.9);
    const bottom = mid - Math.min(-1, lo * mid * 0.9);
    ctx.fillRect(x, top, 1, Math.max(1, bottom - top));
    const rh = Math.max(1, (n ? r / n : 0) * mid * 0.9);
    ctx.fillStyle = rmsColor;
    ctx.fillRect(x, mid - rh, 1, rh * 2);
    ctx.fillStyle = peakColor;
  }

  if (Number.isFinite(options.currentTime) && Number.isFinite(options.duration) && options.duration > 0) {
    const x = Math.round((Math.max(0, Math.min(options.currentTime, options.duration)) / options.duration) * w);
    ctx.fillStyle = '#e5534b';
    ctx.fillRect(Math.max(0, Math.min(w - 2, x)), 0, 2, h);
  }
}
