export function finiteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function clampRange(range = {}, duration = 0) {
  const max = Math.max(0, finiteNumber(duration, 0));
  const rawStart = finiteNumber(range.start, 0);
  const rawEnd = range.end == null ? max : finiteNumber(range.end, max);
  const start = Math.max(0, Math.min(max, rawStart));
  const end = Math.max(start, Math.min(max, rawEnd));
  return { start, end };
}

export function applyLaneOffset(range = {}, offset = 0) {
  const delta = finiteNumber(offset, 0);
  return {
    start: finiteNumber(range.start, 0) + delta,
    end: finiteNumber(range.end, 0) + delta,
  };
}

export function computeOverlapWindow(aRange = {}, bRange = {}) {
  const start = Math.max(finiteNumber(aRange.start, 0), finiteNumber(bRange.start, 0));
  const end = Math.min(finiteNumber(aRange.end, 0), finiteNumber(bRange.end, 0));
  const duration = Math.max(0, end - start);
  return { start, end: duration > 0 ? end : start, duration };
}

function pushSegment(out, lane, kind, start, end) {
  const s = finiteNumber(start, 0);
  const e = finiteNumber(end, 0);
  if (e <= s) return;
  out.push({ lane, kind, start: s, end: e, duration: e - s });
}

export function classifyShiftedSections({ a = {}, b = {}, durationA = 0, durationB = 0 } = {}) {
  const aSource = clampRange(a.range || a, durationA);
  const bSource = clampRange(b.range || b, durationB);
  const aOffset = finiteNumber(a.offset, 0);
  const bOffset = finiteNumber(b.offset, 0);
  const aShifted = applyLaneOffset(aSource, aOffset);
  const bShifted = applyLaneOffset(bSource, bOffset);
  const overlap = computeOverlapWindow(aShifted, bShifted);
  const sections = [];

  if (overlap.duration > 0) {
    pushSegment(sections, 'A', 'missing-in-b', aShifted.start, overlap.start);
    pushSegment(sections, 'A', 'overlap', overlap.start, overlap.end);
    pushSegment(sections, 'A', 'missing-in-b', overlap.end, aShifted.end);
    pushSegment(sections, 'B', 'missing-in-a', bShifted.start, overlap.start);
    pushSegment(sections, 'B', 'overlap', overlap.start, overlap.end);
    pushSegment(sections, 'B', 'missing-in-a', overlap.end, bShifted.end);
  } else {
    pushSegment(sections, 'A', 'missing-in-b', aShifted.start, aShifted.end);
    pushSegment(sections, 'B', 'missing-in-a', bShifted.start, bShifted.end);
  }

  const offsetDelta = bOffset - aOffset;
  return {
    a: { source: aSource, shifted: aShifted, offset: aOffset },
    b: { source: bSource, shifted: bShifted, offset: bOffset },
    overlap,
    sections,
    offsetDelta,
    hasShift: Math.abs(offsetDelta) > 0.0001,
    hasOverlap: overlap.duration > 0,
    hasMissing: sections.some((section) => section.kind !== 'overlap'),
  };
}

export function formatCompareSeconds(seconds) {
  const value = Math.max(0, finiteNumber(seconds, 0));
  if (value >= 60) {
    const minutes = Math.floor(value / 60);
    const secs = value - minutes * 60;
    return `${minutes}:${secs.toFixed(1).padStart(4, '0')}s`;
  }
  return `${value.toFixed(1)}s`;
}

export function describeShiftedComparison(result) {
  const r = result || classifyShiftedSections();
  const overlapText = r.hasOverlap
    ? `Overlap ${formatCompareSeconds(r.overlap.duration)} from ${formatCompareSeconds(r.overlap.start)} to ${formatCompareSeconds(r.overlap.end)}.`
    : 'No overlapping range at the current offsets.';
  const shiftText = r.hasShift
    ? `B is shifted ${r.offsetDelta >= 0 ? '+' : ''}${r.offsetDelta.toFixed(2)}s relative to A.`
    : 'A and B start at the same compare offset.';
  const missingA = r.sections
    .filter((section) => section.kind === 'missing-in-a')
    .reduce((sum, section) => sum + section.duration, 0);
  const missingB = r.sections
    .filter((section) => section.kind === 'missing-in-b')
    .reduce((sum, section) => sum + section.duration, 0);
  const missingText = (missingA > 0 || missingB > 0)
    ? `Missing/extra ranges: ${formatCompareSeconds(missingB)} from A outside B, ${formatCompareSeconds(missingA)} from B outside A.`
    : 'Selected ranges fully overlap.';
  return `${shiftText} ${overlapText} ${missingText}`;
}

export function summarizeAudioWindow(channelData, sampleRate, range = {}, columnCount = 320) {
  const data = channelData || new Float32Array();
  const rate = Math.max(1, finiteNumber(sampleRate, 1));
  const cols = Math.max(1, Math.floor(finiteNumber(columnCount, 320)));
  const startFrame = Math.max(0, Math.min(data.length, Math.floor(finiteNumber(range.start, 0) * rate)));
  const endFrame = Math.max(startFrame, Math.min(data.length, Math.ceil(finiteNumber(range.end, data.length / rate) * rate)));
  const frameSpan = Math.max(1, endFrame - startFrame);
  const peaks = new Float32Array(cols);
  const rms = new Float32Array(cols);
  let peak = 0;

  for (let col = 0; col < cols; col++) {
    const from = startFrame + Math.floor((col / cols) * frameSpan);
    const to = startFrame + Math.max(1, Math.floor(((col + 1) / cols) * frameSpan));
    let localPeak = 0;
    let sumSq = 0;
    let count = 0;
    for (let i = from; i < to && i < endFrame; i++) {
      const amp = Math.abs(finiteNumber(data[i], 0));
      localPeak = Math.max(localPeak, amp);
      sumSq += amp * amp;
      count++;
    }
    peaks[col] = localPeak;
    rms[col] = count ? Math.sqrt(sumSq / count) : 0;
    peak = Math.max(peak, localPeak);
  }

  return { peaks, rms, peak, columns: cols, duration: frameSpan / rate };
}

export function diffAudioSummaries(a, b, { normalize = false, highThreshold = 0.28 } = {}) {
  const count = Math.max(0, Math.min(a?.rms?.length || 0, b?.rms?.length || 0));
  const diff = new Float32Array(count);
  const scaleA = normalize && a?.peak > 0 ? 1 / a.peak : 1;
  const scaleB = normalize && b?.peak > 0 ? 1 / b.peak : 1;
  let energy = 0;
  let highColumns = 0;

  for (let i = 0; i < count; i++) {
    const d = Math.abs(finiteNumber(a.rms[i], 0) * scaleA - finiteNumber(b.rms[i], 0) * scaleB);
    diff[i] = d;
    energy += d;
    if (d >= highThreshold) highColumns++;
  }

  return {
    diff,
    columns: count,
    averageEnergy: count ? energy / count : 0,
    highColumns,
    highRatio: count ? highColumns / count : 0,
    normalized: !!normalize,
  };
}

export function sampleVideoTimes(range = {}, maxFrames = 8) {
  const start = Math.max(0, finiteNumber(range.start, 0));
  const end = Math.max(start, finiteNumber(range.end, start));
  const duration = Math.max(0, end - start);
  if (duration <= 0) return [];
  const cap = Math.max(1, Math.floor(finiteNumber(maxFrames, 8)));
  const count = Math.min(cap, Math.max(1, Math.ceil(duration * 3)));
  const step = duration / count;
  return Array.from({ length: count }, (_, i) => start + step * (i + 0.5));
}

export function diffVideoFrames(aFrames = [], bFrames = [], {
  highPixelThreshold = 0.22,
  highFrameThreshold = 0.12,
  highColumnThreshold = 0.16,
} = {}) {
  const frameCount = Math.max(0, Math.min(aFrames.length || 0, bFrames.length || 0));
  const frameDiffs = new Float32Array(frameCount);
  let totalDiff = 0;
  let totalPixels = 0;
  let highPixels = 0;
  let highFrames = 0;
  let totalColumns = 0;
  let highColumns = 0;
  const columns = [];

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
    const a = aFrames[frameIndex]?.data;
    const b = bFrames[frameIndex]?.data;
    const width = Math.max(0, Math.min(aFrames[frameIndex]?.width || 0, bFrames[frameIndex]?.width || 0));
    const height = Math.max(0, Math.min(aFrames[frameIndex]?.height || 0, bFrames[frameIndex]?.height || 0));
    if (!a || !b || !width || !height) continue;
    let frameTotal = 0;
    const columnTotals = new Float32Array(width);
    const columnCounts = new Uint32Array(width);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const d = (
          Math.abs(finiteNumber(a[i], 0) - finiteNumber(b[i], 0)) +
          Math.abs(finiteNumber(a[i + 1], 0) - finiteNumber(b[i + 1], 0)) +
          Math.abs(finiteNumber(a[i + 2], 0) - finiteNumber(b[i + 2], 0))
        ) / (255 * 3);
        frameTotal += d;
        totalDiff += d;
        totalPixels++;
        if (d >= highPixelThreshold) highPixels++;
        columnTotals[x] += d;
        columnCounts[x]++;
      }
    }

    const frameAverage = frameTotal / (width * height);
    frameDiffs[frameIndex] = frameAverage;
    if (frameAverage >= highFrameThreshold) highFrames++;
    for (let x = 0; x < width; x++) {
      const value = columnCounts[x] ? columnTotals[x] / columnCounts[x] : 0;
      columns.push(value);
      totalColumns++;
      if (value >= highColumnThreshold) highColumns++;
    }
  }

  return {
    frameDiffs,
    columnDiffs: Float32Array.from(columns),
    frames: frameCount,
    averageDifference: totalPixels ? totalDiff / totalPixels : 0,
    highFrames,
    highPixels,
    totalPixels,
    highColumns,
    totalColumns,
  };
}
