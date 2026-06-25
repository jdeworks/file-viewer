import {
  classifyShiftedSections,
  diffAudioSummaries,
  describeShiftedComparison,
  overlapSourceRanges,
  summarizeAudioWindow,
  formatCompareSeconds,
} from './compare-math.js';
import {
  AUDIO_COMPARE_COLUMNS,
} from './compare-ui-constants.js';
import {
  drawDiff,
  drawFrameStrip,
  drawOverlayPreview,
  drawVideoDiff,
  drawWave,
} from './compare-ui-draw.js';

export function getCurrentCompareResult(state) {
  return classifyShiftedSections({
    a: {
      offset: state.lanes.A.offset,
      range: { start: state.lanes.A.in, end: state.lanes.A.out },
    },
    b: {
      offset: state.lanes.B.offset,
      range: { start: state.lanes.B.in, end: state.lanes.B.out },
    },
    durationA: state.durationA,
    durationB: state.durationB,
  });
}

export function renderCompareLayout(state, ui) {
  const {
    kind,
    wrap,
    readout,
    foot,
    opacityValue,
    opacityLabel,
    videoLayerControls,
    foregroundSelect,
    videoOpacityA,
    videoOpacityB,
    normalizeMode,
    normalizeLabel,
    laneEls,
    band,
    missingA,
    missingB,
    visual,
  } = ui;

  const result = getCurrentCompareResult(state);
  state.lanes.A.in = Math.max(0, Math.min(state.lanes.A.in, state.durationA));
  state.lanes.B.in = Math.max(0, Math.min(state.lanes.B.in, state.durationB));
  state.lanes.A.out = Math.max(state.lanes.A.in, Math.min(state.lanes.A.out, state.durationA));
  state.lanes.B.out = Math.max(state.lanes.B.in, Math.min(state.lanes.B.out, state.durationB));

  const timelineStart = Math.min(result.a.shifted.start, result.b.shifted.start, 0);
  const timelineEnd = Math.max(result.a.shifted.end, result.b.shifted.end, 1);
  const span = Math.max(1, timelineEnd - timelineStart);
  const pct = (value) => `${((value - timelineStart) / span) * 100}%`;

  wrap.dataset.layout = state.layout;
  wrap.dataset.normalize = state.normalize ? 'on' : 'off';
  wrap.dataset.overlayOpacity = String(kind === 'video' ? state.videoOpacityB : state.opacity);
  wrap.dataset.videoForeground = state.videoForeground || 'B';
  wrap.dataset.videoOpacityA = String(state.videoOpacityA);
  wrap.dataset.videoOpacityB = String(state.videoOpacityB);
  visual.style.setProperty('--compare-opacity', String(state.opacity / 100));
  visual.style.setProperty('--compare-video-opacity-a', String(state.videoOpacityA / 100));
  visual.style.setProperty('--compare-video-opacity-b', String(state.videoOpacityB / 100));
  opacityValue.textContent = `${state.opacity}%`;
  opacityLabel.hidden = kind === 'video';
  if (videoLayerControls) {
    videoLayerControls.hidden = kind !== 'video';
    foregroundSelect.value = state.videoForeground || 'B';
    videoOpacityA.input.value = String(state.videoOpacityA);
    videoOpacityA.readout.textContent = `${state.videoOpacityA}%`;
    videoOpacityB.input.value = String(state.videoOpacityB);
    videoOpacityB.readout.textContent = `${state.videoOpacityB}%`;
  }
  normalizeMode.textContent = state.normalize
    ? 'Audio normalize: on (user chosen)'
    : 'Audio normalize: off';
  normalizeLabel.hidden = kind !== 'audio';
  readout.textContent = `${state.layout.replace('-', ' ')} · ${formatCompareSeconds(result.overlap.duration)} overlap`;
  foot.textContent = describeShiftedComparison(result);

  for (const laneId of ['A', 'B']) {
    const laneState = state.lanes[laneId];
    const els = laneEls.get(laneId);
    const shifted = laneId === 'A' ? result.a.shifted : result.b.shifted;
    els.label.textContent = `Lane ${laneId}: ${laneState.label} · offset ${laneState.offset.toFixed(2)}s`;
    els.offset.value = laneState.offset.toFixed(2);
    els.inInput.value = laneState.in.toFixed(1);
    els.outInput.value = laneState.out.toFixed(1);
    els.selection.style.left = pct(shifted.start);
    els.selection.style.width = `${Math.max(0.75, ((shifted.end - shifted.start) / span) * 100)}%`;
    els.handle.style.left = pct(shifted.start);
    els.handle.setAttribute('aria-valuenow', laneState.offset.toFixed(2));
    els.markerIn.style.left = pct(shifted.start);
    els.markerOut.style.left = pct(shifted.end);
  }

  if (result.hasOverlap) {
    band.hidden = false;
    band.style.left = pct(result.overlap.start);
    band.style.width = `${Math.max(0.75, (result.overlap.duration / span) * 100)}%`;
  } else {
    band.hidden = true;
  }

  const missingInA = result.sections.filter((section) => section.kind === 'missing-in-a');
  const missingInB = result.sections.filter((section) => section.kind === 'missing-in-b');
  const paintMissing = (el, sections) => {
    if (!sections.length) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    const first = sections[0];
    const total = sections.reduce((sum, section) => sum + section.duration, 0);
    el.style.left = pct(first.start);
    el.style.width = `${Math.max(0.75, (total / span) * 100)}%`;
  };
  paintMissing(missingA, missingInA);
  paintMissing(missingB, missingInB);

  return result;
}

export function renderCompareAnalysis(state, result, ui) {
  const { kind, laneEls, overlayCanvas, diffCanvas, foot, wrap } = ui;
  if (kind !== 'audio') {
    const analysis = state.analysis;
    const aCanvas = laneEls.get('A')?.canvas;
    const bCanvas = laneEls.get('B')?.canvas;
    if (!analysis) {
      drawFrameStrip(aCanvas, null);
      drawFrameStrip(bCanvas, null);
      overlayCanvas.hidden = true;
      drawVideoDiff(diffCanvas, null);
      return;
    }
    drawFrameStrip(aCanvas, analysis.framesA);
    drawFrameStrip(bCanvas, analysis.framesB);
    drawOverlayPreview(analysis, overlayCanvas, {
      opacityA: state.videoOpacityA,
      opacityB: state.videoOpacityB,
      foreground: state.videoForeground || 'B',
    });
    drawVideoDiff(diffCanvas, analysis.diff);
    const foreground = state.videoForeground === 'A' ? 'A over B' : 'B over A';
    foot.textContent = `${describeShiftedComparison(result)} Measured shifted overlap: average visual difference ${analysis.diff.averageDifference.toFixed(3)}, high-diff frames ${analysis.diff.highFrames}/${analysis.diff.frames}, high-diff pixels ${analysis.diff.highPixels}/${analysis.diff.totalPixels}, high-diff columns ${analysis.diff.highColumns}/${analysis.diff.totalColumns}. Overlay preview uses ${foreground}, A opacity ${state.videoOpacityA}%, B opacity ${state.videoOpacityB}%; shifted/missing ranges are separate from content differences.`;
    return;
  }

  overlayCanvas.hidden = true;
  const analysis = state.analysis;
  const aCanvas = laneEls.get('A')?.canvas;
  const bCanvas = laneEls.get('B')?.canvas;
  if (!analysis) {
    drawWave(aCanvas, null);
    drawWave(bCanvas, null);
    drawDiff(diffCanvas, null);
    return;
  }

  const localRangeA = (range) => ({
    start: Math.max(0, range.start - (analysis.rangeStartA || 0)),
    end: Math.max(0, range.end - (analysis.rangeStartA || 0)),
  });
  const localRangeB = (range) => ({
    start: Math.max(0, range.start - (analysis.rangeStartB || 0)),
    end: Math.max(0, range.end - (analysis.rangeStartB || 0)),
  });
  const overlapRanges = analysis.source === 'browser-decode'
    ? (analysis.hasB
      ? overlapSourceRanges(result)
      : { hasOverlap: false, overlap: result.a.source, a: result.a.source, b: { start: 0, end: 0 } })
    : (analysis.overlapRanges || overlapSourceRanges(result));
  const summaryA = summarizeAudioWindow(
    analysis.channelA,
    analysis.rateA,
    localRangeA(overlapRanges.a),
    AUDIO_COMPARE_COLUMNS,
  );
  const summaryB = analysis.hasB
    ? summarizeAudioWindow(
      analysis.channelB,
      analysis.rateB,
      localRangeB(overlapRanges.b),
      AUDIO_COMPARE_COLUMNS,
    )
    : null;
  const accent = getComputedStyle(wrap).getPropertyValue('--accent').trim() || '#2f7de1';
  drawWave(aCanvas, summaryA, accent);
  drawWave(bCanvas, summaryB, '#9a6700');
  if (!summaryB) {
    drawDiff(diffCanvas, null);
    foot.textContent = `${describeShiftedComparison(result)} Measured waveform for A only; choose a second audio file for difference.`;
    return;
  }
  if (!result.hasOverlap) {
    drawDiff(diffCanvas, null);
    foot.textContent = `${describeShiftedComparison(result)} No measured difference because the shifted selections do not overlap.`;
    return;
  }
  const overlapA = summarizeAudioWindow(
    analysis.channelA,
    analysis.rateA,
    localRangeA(overlapRanges.a),
    AUDIO_COMPARE_COLUMNS,
  );
  const overlapB = summarizeAudioWindow(
    analysis.channelB,
    analysis.rateB,
    localRangeB(overlapRanges.b),
    AUDIO_COMPARE_COLUMNS,
  );
  const diff = diffAudioSummaries(overlapA, overlapB, { normalize: state.normalize });
  drawDiff(diffCanvas, diff);
  const normText = state.normalize
    ? 'Per-lane peak normalization is on for compare only.'
    : 'Raw amplitude compare; normalization is off.';
  foot.textContent = `${describeShiftedComparison(result)} Measured shifted overlap: average diff energy ${diff.averageEnergy.toFixed(3)}, high-diff columns ${diff.highColumns}/${diff.columns}. ${normText}`;
}
