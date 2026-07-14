export const LOTTIE_EXPORT_LIMITS = Object.freeze({
  minScale: 10,
  maxScale: 2000,
  minFps: 1,
  maxFps: 100,
  maxFrames: 2000,
  maxSide: 4096,
  maxPixelsPerFrame: 16_777_216,
  maxPixelFrames: 500_000_000,
  maxGeneratedBytes: 256 * 1024 * 1024,
});

const FLOAT_EPSILON = 1e-9;

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Lottie frame counts frequently come from decimal JSON values. Values such as
// 59.99999999999999 describe 60 frames, not 61; subtracting a scale-aware epsilon
// before ceil keeps authored/GIF scheduling stable without hiding real fractions.
export function stableCeil(value) {
  const number = Math.max(0, finiteNumber(value, 0));
  const epsilon = Math.max(FLOAT_EPSILON, Math.abs(number) * Number.EPSILON * 16);
  return Math.ceil(number - epsilon);
}

export function normalizeScale(value) {
  return clamp(Math.round(finiteNumber(value, 100)), LOTTIE_EXPORT_LIMITS.minScale, LOTTIE_EXPORT_LIMITS.maxScale);
}

export function normalizeFps(value, fallback = 30) {
  const number = finiteNumber(value, fallback);
  return clamp(Math.round(number * 100) / 100, LOTTIE_EXPORT_LIMITS.minFps, LOTTIE_EXPORT_LIMITS.maxFps);
}

export function normalizeColor(value) {
  const match = String(value || '').trim().match(/^#?([0-9a-f]{6})$/i);
  return match ? `#${match[1].toLowerCase()}` : '#ffffff';
}

export function outputDimensions(summary, scale) {
  const factor = normalizeScale(scale) / 100;
  return {
    width: Math.max(1, Math.round(Number(summary.width) * factor)),
    height: Math.max(1, Math.round(Number(summary.height) * factor)),
  };
}

export function authoredFrameCount(summary) {
  return Math.max(1, stableCeil(Number(summary.outFrame) - Number(summary.inFrame)));
}

export function authoredFramePositions(summary) {
  return Array.from({ length: authoredFrameCount(summary) }, (_, relativeFrame) => ({ relativeFrame }));
}

// GIF delays are stored in centiseconds. Quantizing each requested delay on its
// own makes 24/30 fps clips drift; cumulative boundaries keep total duration to
// the nearest centisecond while ensuring every encoded frame receives >= 1 tick.
export function gifFrameSchedule(summary, fpsValue) {
  const sourceFrames = Number(summary.outFrame) - Number(summary.inFrame);
  const sourceFps = Number(summary.fps);
  const duration = sourceFrames / sourceFps;
  const fps = normalizeFps(fpsValue, sourceFps);
  const count = gifFrameCount(summary, fps);
  const totalTicks = Math.max(count, Math.round(duration * 100));
  const frames = [];
  let previousTick = 0;
  for (let index = 0; index < count; index += 1) {
    const remaining = count - index - 1;
    const requestedEnd = index === count - 1
      ? totalTicks
      : Math.round(Math.min(duration, (index + 1) / fps) * 100);
    const endTick = clamp(requestedEnd, previousTick + 1, totalTicks - remaining);
    frames.push({
      relativeFrame: Math.min(Math.max(0, sourceFrames - FLOAT_EPSILON), index * sourceFps / fps),
      delayMs: (endTick - previousTick) * 10,
    });
    previousTick = endTick;
  }
  return frames;
}

export function gifFrameCount(summary, fpsValue) {
  const sourceFrames = Number(summary.outFrame) - Number(summary.inFrame);
  const sourceFps = Number(summary.fps);
  const fps = normalizeFps(fpsValue, sourceFps);
  return Math.max(1, stableCeil((sourceFrames / sourceFps) * fps));
}

export function frameFilename(index, count) {
  const digits = Math.max(3, String(Math.max(1, count)).length);
  return `frame-${String(index + 1).padStart(digits, '0')}.png`;
}

export function rasterCacheKey({ scale, backgroundMode, color }) {
  const mode = backgroundMode === 'solid' ? 'solid' : 'transparent';
  return `${normalizeScale(scale)}:${mode}:${mode === 'solid' ? normalizeColor(color) : '-'}`;
}

export function exportJobMetrics(summary, { action, scale, fps }) {
  const { width, height } = outputDimensions(summary, scale);
  const frameCount = action === 'gif'
    ? gifFrameCount(summary, fps)
    : authoredFrameCount(summary);
  const pixelsPerFrame = width * height;
  return { width, height, frameCount, pixelsPerFrame, pixelFrames: pixelsPerFrame * frameCount };
}

export function validateExportJob(summary, options) {
  const metrics = exportJobMetrics(summary, options);
  const limits = LOTTIE_EXPORT_LIMITS;
  let reason = '';
  if (metrics.frameCount > limits.maxFrames) {
    reason = `This job needs ${metrics.frameCount.toLocaleString()} frames; the safe limit is ${limits.maxFrames.toLocaleString()}. ${options.action === 'gif' ? 'Reduce GIF FPS or shorten the animation.' : 'This animation has too many authored frames to split safely.'}`;
  } else if (metrics.width > limits.maxSide || metrics.height > limits.maxSide) {
    reason = `The ${metrics.width.toLocaleString()} × ${metrics.height.toLocaleString()} output exceeds the ${limits.maxSide.toLocaleString()} px side limit. Reduce Scale.`;
  } else if (metrics.pixelsPerFrame > limits.maxPixelsPerFrame) {
    reason = `Each frame would contain ${metrics.pixelsPerFrame.toLocaleString()} pixels; the safe limit is ${limits.maxPixelsPerFrame.toLocaleString()}. Reduce Scale.`;
  } else if (metrics.pixelFrames > limits.maxPixelFrames) {
    reason = `This job would rasterize ${metrics.pixelFrames.toLocaleString()} pixel-frames; the safe limit is ${limits.maxPixelFrames.toLocaleString()}. ${options.action === 'gif' ? 'Reduce Scale or GIF FPS.' : 'Reduce Scale.'}`;
  }
  return { ok: !reason, reason, ...metrics };
}
