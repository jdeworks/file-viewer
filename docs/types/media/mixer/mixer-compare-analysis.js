import { computeCompareOverlap } from './mixer-model.js';
import { overlayKind } from './mixer-compare-overlay.js';

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
  for (let i = 0; i < samples; i += 1) {
    const ia = Math.min(summaryA.buckets - 1, Math.floor((i / samples) * summaryA.buckets));
    const ib = Math.min(summaryB.buckets - 1, Math.floor((i / samples) * summaryB.buckets));
    sum += Math.abs(((summaryA.peak?.[ia] || 0) / scaleA) - ((summaryB.peak?.[ib] || 0) / scaleB));
  }
  const average = samples ? sum / samples : 0;
  return baseResult('audio', overlap, {
    status: 'analyzed',
    metric: 'average-peak-delta',
    value: Number(average.toFixed(4)),
    samples,
    normalized: normalizeAudio,
    message: `Analyzed selected overlap: average peak delta ${average.toFixed(4)} (${normalizeAudio ? 'peak normalized' : 'raw peaks'}).`,
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
  return baseResult('visual', overlap, {
    status: 'analyzed',
    metric: 'frame-source-coverage',
    value: sources,
    samples: transforms.length,
    frameSources: sources,
    transforms,
    message: `Analyzed selected visual overlap: ${sources}/2 frame source(s), ${transforms.length} transform set(s).`,
  });
}

function baseResult(kind, overlap, extra) {
  return {
    kind,
    overlapMs: overlap.overlap.durationMs,
    offsetDeltaMs: overlap.offsetDeltaMs || 0,
    ...extra,
  };
}

function frameFor(frames, element) {
  if (!frames || !element) return null;
  if (typeof frames.get === 'function') return frames.get(element.id) || frames.get(element.assetId) || null;
  return frames[element.id] || frames[element.assetId] || null;
}
