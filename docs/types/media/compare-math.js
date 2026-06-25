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
