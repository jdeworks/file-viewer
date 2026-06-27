import { computeCompareOverlap } from './mixer-model.js';
import { overlayKind } from './mixer-compare-overlay.js';
import { diffAudioSummaries, diffVideoFrames } from '../compare-math.js';

export function analyzeCompareSelection(project, frames) {
  const overlap = computeCompareOverlap(project);
  const kind = overlayKind(project);
  const [a, b] = ['a', 'b'].map((side) => {
    const id = project.compare?.[side]?.elementId;
    return project.elements.find((element) => element.id === id) || null;
  });
  if (!overlap.hasOverlap) {
    return baseResult(kind, overlap, {
      status: 'no-overlap',
      message: 'No shifted overlap is selected.',
    });
  }
  if (kind === 'visual') return analyzeVisual(project, frames, overlap, a, b);
  return analyzeAudio(project, overlap, a, b);
}

function analyzeAudio(project, overlap, a, b) {
  const summaryA = a?.analysis?.waveformSummary;
  const summaryB = b?.analysis?.waveformSummary;
  if (!summaryA?.buckets || !summaryB?.buckets) {
    return baseResult('audio', overlap, {
      status: 'needs-analysis',
      message: 'Waveform summaries are still loading or unavailable.',
    });
  }
  const normalizeAudio = !!project.compare?.normalizeAudio;
  const scaleA = normalizeAudio ? maxPeak(summaryA) || 1 : 1;
  const scaleB = normalizeAudio ? maxPeak(summaryB) || 1 : 1;
  const samples = Math.min(96, summaryA.buckets, summaryB.buckets);
  let sum = 0;
  let maxDelta = 0;
  for (let i = 0; i < samples; i += 1) {
    const ia = Math.min(summaryA.buckets - 1, Math.floor((i / samples) * summaryA.buckets));
    const ib = Math.min(summaryB.buckets - 1, Math.floor((i / samples) * summaryB.buckets));
    const delta = Math.abs(((summaryA.peak?.[ia] || 0) / scaleA) - ((summaryB.peak?.[ib] || 0) / scaleB));
    sum += delta;
    maxDelta = Math.max(maxDelta, delta);
  }
  const average = samples ? sum / samples : 0;
  const rmsDiff = diffAudioSummaries(summaryA, summaryB, { normalize: normalizeAudio });
  return baseResult('audio', overlap, {
    status: 'analyzed',
    metric: 'average-peak-delta',
    value: Number(average.toFixed(4)),
    samples,
    normalized: normalizeAudio,
    maxDelta: Number(maxDelta.toFixed(4)),
    averageEnergy: Number((rmsDiff.averageEnergy || 0).toFixed(4)),
    highRatio: Number((rmsDiff.highRatio || 0).toFixed(4)),
    highColumns: rmsDiff.highColumns || 0,
    detailRows: [
      ['Average peak delta', average],
      ['Maximum peak delta', maxDelta],
      ['Average RMS energy delta', rmsDiff.averageEnergy || 0],
      ['High-difference columns', rmsDiff.highColumns || 0],
    ],
    message: `Analyzed selected overlap: average peak delta ${average.toFixed(4)}, max ${maxDelta.toFixed(4)}, high-difference ratio ${(rmsDiff.highRatio || 0).toFixed(3)} (${normalizeAudio ? 'peak normalized' : 'raw peaks'}).`,
  });
}

function maxPeak(summary) {
  let max = 0;
  const peak = summary.peak || [];
  const length = Number(peak.length) || 0;
  for (let i = 0; i < length; i += 1) max = Math.max(max, Math.abs(Number(peak[i]) || 0));
  return max;
}

function analyzeVisual(project, frames, overlap, a, b) {
  const frameA = frameFor(frames, a);
  const frameB = frameFor(frames, b);
  const sources = [frameA, frameB].filter((frame) => frame?.source).length;
  const transforms = [a, b].filter(Boolean).map((element) => ({
    elementId: element.id,
    assetId: element.assetId,
    visual: element.visual || {},
  }));
  const frameDiff = frameA?.source && frameB?.source
    ? diffVideoFrames([frameDataFor(frameA.source)], [frameDataFor(frameB.source)])
    : null;
  const transformDelta = visualTransformDelta(a?.visual || {}, b?.visual || {});
  const averageDifference = frameDiff ? Number((frameDiff.averageDifference || 0).toFixed(4)) : null;
  return baseResult('visual', overlap, {
    status: 'analyzed',
    metric: frameDiff ? 'average-frame-difference' : 'frame-source-coverage',
    value: frameDiff ? averageDifference : sources,
    samples: transforms.length,
    frameSources: sources,
    transforms,
    transformDelta,
    averageDifference,
    highFrames: frameDiff?.highFrames || 0,
    highPixels: frameDiff?.highPixels || 0,
    highColumns: frameDiff?.highColumns || 0,
    detailRows: [
      ['Frame sources', `${sources}/2`],
      ['Average visual difference', frameDiff ? averageDifference : 'n/a'],
      ['High-difference pixels', frameDiff?.highPixels || 0],
      ['Transform delta', transformDelta.summary],
    ],
    message: frameDiff
      ? `Analyzed selected visual overlap: average frame difference ${averageDifference}, ${frameDiff.highPixels || 0} high-difference pixel(s), ${transformDelta.summary}.`
      : `Analyzed selected visual overlap: ${sources}/2 frame source(s), ${transforms.length} transform set(s), ${transformDelta.summary}.`,
  });
}

function baseResult(kind, overlap, extra) {
  const timing = timingSummary(overlap);
  return {
    kind,
    overlapMs: overlap.overlap.durationMs,
    offsetDeltaMs: overlap.offsetDeltaMs || 0,
    timing,
    ...extra,
  };
}

function timingSummary(overlap) {
  const aStart = (overlap.a?.rangeStartMs || 0) + (overlap.a?.offsetMs || 0);
  const aEnd = (overlap.a?.rangeEndMs || 0) + (overlap.a?.offsetMs || 0);
  const bStart = (overlap.b?.rangeStartMs || 0) + (overlap.b?.offsetMs || 0);
  const bEnd = (overlap.b?.rangeEndMs || 0) + (overlap.b?.offsetMs || 0);
  const startMs = Math.min(aStart, bStart);
  const endMs = Math.max(aEnd, bEnd);
  const overlapMs = overlap.overlap.durationMs || 0;
  const aOnlyMs = Math.max(0, aEnd - aStart - overlapMs);
  const bOnlyMs = Math.max(0, bEnd - bStart - overlapMs);
  const unionMs = Math.max(0, endMs - startMs);
  return {
    aStartMs: aStart,
    aEndMs: aEnd,
    bStartMs: bStart,
    bEndMs: bEnd,
    aRangeMs: Math.max(0, aEnd - aStart),
    bRangeMs: Math.max(0, bEnd - bStart),
    overlapMs,
    aOnlyMs,
    bOnlyMs,
    unionMs,
    overlapRatio: unionMs ? Number((overlapMs / unionMs).toFixed(4)) : 0,
  };
}

function frameFor(frames, element) {
  if (!frames || !element) return null;
  if (typeof frames.get === 'function') return frames.get(element.id) || frames.get(element.assetId) || null;
  return frames[element.id] || frames[element.assetId] || null;
}

function frameDataFor(source) {
  const canvas = document.createElement('canvas');
  const sourceWidth = source.naturalWidth || source.videoWidth || source.width || 64;
  const sourceHeight = source.naturalHeight || source.videoHeight || source.height || 36;
  const scale = Math.min(1, 64 / Math.max(1, sourceWidth), 36 / Math.max(1, sourceHeight));
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const ctx = canvas.getContext('2d');
  ctx?.drawImage(source, 0, 0, canvas.width, canvas.height);
  return {
    width: canvas.width,
    height: canvas.height,
    data: ctx ? ctx.getImageData(0, 0, canvas.width, canvas.height).data : new Uint8ClampedArray(),
  };
}

function visualTransformDelta(a = {}, b = {}) {
  const dx = finite(b.x, 0) - finite(a.x, 0);
  const dy = finite(b.y, 0) - finite(a.y, 0);
  const dsx = finite(b.scaleX, 1) - finite(a.scaleX, 1);
  const dsy = finite(b.scaleY, 1) - finite(a.scaleY, 1);
  const drot = finite(b.rotation, 0) - finite(a.rotation, 0);
  const dopacity = finite(b.opacity, 1) - finite(a.opacity, 1);
  return {
    x: Number(dx.toFixed(3)),
    y: Number(dy.toFixed(3)),
    scaleX: Number(dsx.toFixed(4)),
    scaleY: Number(dsy.toFixed(4)),
    rotation: Number(drot.toFixed(3)),
    opacity: Number(dopacity.toFixed(4)),
    summary: `Δpos ${Math.round(dx)},${Math.round(dy)} · Δscale ${dsx.toFixed(2)}/${dsy.toFixed(2)} · Δopacity ${dopacity.toFixed(2)}`,
  };
}

function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
