import {
  classifyShiftedSections,
  describeShiftedComparison,
  diffAudioSummaries,
  formatCompareSeconds,
  summarizeAudioWindow,
} from './compare-math.js';
import { buildSecondaryDropZone } from './editor-advanced.js';

const FALLBACK_DURATION = 60;
const PX_PER_SEC = 9;
const AUDIO_COMPARE_MAX_BYTES = 24 * 1024 * 1024;
const AUDIO_COMPARE_MAX_RANGE_SECONDS = 90;
const AUDIO_COMPARE_COLUMNS = 360;

function durationOf(mediaEl) {
  return Number.isFinite(mediaEl?.duration) && mediaEl.duration > 0 ? mediaEl.duration : FALLBACK_DURATION;
}

function labelOf(intake) {
  return intake?.filename || intake?.file?.name || 'Open media';
}

function audioSourceFromIntake(intake) {
  if (intake?.file) return intake.file;
  if (intake?.bytes) {
    const type = intake?.mime || intake?.type || '';
    return new Blob([intake.bytes], { type });
  }
  return null;
}

function makeButton(label, value, groupName) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'media-compare-layout-btn';
  btn.dataset.layout = value;
  btn.textContent = label;
  btn.setAttribute('aria-pressed', 'false');
  btn.title = `${groupName}: ${label}`;
  return btn;
}

function makeNumberInput(className, value, step = '0.1') {
  const input = document.createElement('input');
  input.type = 'number';
  input.step = step;
  input.className = className;
  input.value = String(value);
  return input;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function mountMediaCompare(container, intake, mediaEl, kind = 'audio') {
  const state = {
    layout: 'side-by-side',
    opacity: 55,
    normalize: false,
    durationA: durationOf(mediaEl),
    durationB: durationOf(mediaEl),
    lanes: {
      A: { label: labelOf(intake), offset: 0, in: 0, out: durationOf(mediaEl) },
      B: { label: 'Choose a second file', offset: 1.5, in: 0, out: durationOf(mediaEl) },
    },
    files: {
      A: audioSourceFromIntake(intake),
      B: null,
    },
    analysis: null,
  };
  const listeners = [];
  const addListener = (el, type, fn, options) => {
    el.addEventListener(type, fn, options);
    listeners.push(() => el.removeEventListener(type, fn, options));
  };

  const wrap = document.createElement('div');
  wrap.className = `media-compare media-compare--${kind}`;
  wrap.dataset.layout = state.layout;
  wrap.dataset.kind = kind;

  const head = document.createElement('div');
  head.className = 'media-compare-head';
  const title = document.createElement('div');
  title.className = 'media-compare-title';
  title.textContent = kind === 'video' ? 'Video Compare' : 'Audio Compare';
  const readout = document.createElement('div');
  readout.className = 'media-compare-readout';
  head.append(title, readout);

  const controls = document.createElement('div');
  controls.className = 'media-compare-controls';

  const layoutGroup = document.createElement('div');
  layoutGroup.className = 'media-compare-layouts';
  layoutGroup.setAttribute('aria-label', 'Compare layout');
  const layoutButtons = [
    makeButton('Side-by-side', 'side-by-side', 'Layout'),
    makeButton('Top-bottom', 'top-bottom', 'Layout'),
    makeButton('Overlay', 'overlay', 'Layout'),
  ];
  layoutGroup.append(...layoutButtons);

  const opacityLabel = document.createElement('label');
  opacityLabel.className = 'media-compare-opacity';
  const opacityValue = document.createElement('span');
  opacityValue.className = 'media-compare-opacity-value';
  const opacityInput = document.createElement('input');
  opacityInput.type = 'range';
  opacityInput.min = '0';
  opacityInput.max = '100';
  opacityInput.step = '1';
  opacityInput.value = String(state.opacity);
  opacityInput.className = 'media-compare-opacity-input';
  opacityLabel.append(document.createTextNode('Overlay opacity '), opacityInput, opacityValue);

  const normalizeLabel = document.createElement('label');
  normalizeLabel.className = 'media-compare-normalize';
  const normalizeInput = document.createElement('input');
  normalizeInput.type = 'checkbox';
  normalizeInput.className = 'media-compare-normalize-input';
  const normalizeMode = document.createElement('span');
  normalizeMode.className = 'media-compare-normalize-label';
  normalizeLabel.append(normalizeInput, normalizeMode);
  controls.append(layoutGroup, opacityLabel, normalizeLabel);

  const analyzeButton = document.createElement('button');
  analyzeButton.type = 'button';
  analyzeButton.className = 'media-compare-analyze';
  analyzeButton.textContent = 'Analyze selected audio';
  const analysisStatus = document.createElement('span');
  analysisStatus.className = 'media-compare-analysis-status';
  analysisStatus.textContent = 'Not analyzed';
  const analysisControls = document.createElement('div');
  analysisControls.className = 'media-compare-analysis-controls';
  analysisControls.append(analyzeButton, analysisStatus);
  if (kind === 'audio') controls.append(analysisControls);

  const drop = buildSecondaryDropZone({
    accept: kind === 'video' ? 'video/*' : 'audio/*',
    hint: `Drop a second ${kind} file for compare`,
  }, (file) => {
    state.lanes.B.label = file.name || 'Second file';
    state.files.B = file;
    state.analysis = null;
    state.durationB = Number.isFinite(file.duration) ? file.duration : state.durationB;
    state.lanes.B.out = Math.max(state.lanes.B.in, Math.min(state.lanes.B.out, state.durationB));
    render();
  });
  drop.el.classList.add('media-compare-drop');

  const visual = document.createElement('div');
  visual.className = 'media-compare-visual';
  visual.style.setProperty('--compare-opacity', String(state.opacity / 100));

  const laneEls = new Map();
  function buildLane(laneId) {
    const lane = document.createElement('div');
    lane.className = `media-compare-lane media-compare-lane--${laneId.toLowerCase()}`;
    lane.dataset.lane = laneId;

    const label = document.createElement('div');
    label.className = 'media-compare-lane-label';

    const offset = makeNumberInput('media-compare-offset-input', state.lanes[laneId].offset);
    offset.dataset.lane = laneId;
    offset.setAttribute('aria-label', `Lane ${laneId} offset seconds`);

    const range = document.createElement('div');
    range.className = 'media-compare-range-controls';
    const inInput = makeNumberInput('media-compare-in-input', state.lanes[laneId].in);
    inInput.dataset.lane = laneId;
    inInput.setAttribute('aria-label', `Lane ${laneId} in seconds`);
    const outInput = makeNumberInput('media-compare-out-input', state.lanes[laneId].out);
    outInput.dataset.lane = laneId;
    outInput.setAttribute('aria-label', `Lane ${laneId} out seconds`);
    range.append(document.createTextNode('In '), inInput, document.createTextNode(' Out '), outInput);

    const track = document.createElement('div');
    track.className = 'media-compare-track';
    const body = document.createElement('div');
    body.className = 'media-compare-lane-body';
    body.dataset.lane = laneId;
    const canvas = document.createElement('canvas');
    canvas.className = 'media-compare-waveform-canvas';
    canvas.dataset.lane = laneId;
    canvas.width = AUDIO_COMPARE_COLUMNS;
    canvas.height = 72;
    const selection = document.createElement('div');
    selection.className = 'media-compare-selection';
    const handle = document.createElement('div');
    handle.className = 'media-compare-offset-handle';
    handle.setAttribute('role', 'slider');
    handle.tabIndex = 0;
    handle.dataset.lane = laneId;
    handle.setAttribute('aria-label', `Drag lane ${laneId} offset`);
    const markerIn = document.createElement('div');
    markerIn.className = 'media-compare-range-handle media-compare-range-in';
    const markerOut = document.createElement('div');
    markerOut.className = 'media-compare-range-handle media-compare-range-out';
    track.append(body, canvas, selection, markerIn, markerOut, handle);

    lane.append(label, track, range, offset);

    const syncRangeInput = () => {
      const laneState = state.lanes[laneId];
      const duration = laneId === 'A' ? state.durationA : state.durationB;
      laneState.in = clamp(Number(inInput.value) || 0, 0, duration);
      laneState.out = clamp(Number(outInput.value) || duration, laneState.in, duration);
      render();
    };
    addListener(offset, 'input', () => {
      state.lanes[laneId].offset = Number(offset.value) || 0;
      render();
    });
    addListener(inInput, 'input', syncRangeInput);
    addListener(outInput, 'input', syncRangeInput);

    let dragging = false;
    let startX = 0;
    let startOffset = 0;
    const beginDrag = (e) => {
      dragging = true;
      startX = e.clientX;
      startOffset = state.lanes[laneId].offset;
      handle.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    };
    const moveDrag = (e) => {
      if (!dragging) return;
      state.lanes[laneId].offset = startOffset + ((e.clientX - startX) / PX_PER_SEC);
      render();
    };
    const endDrag = () => { dragging = false; };
    addListener(handle, 'pointerdown', beginDrag);
    addListener(handle, 'pointermove', moveDrag);
    addListener(handle, 'pointerup', endDrag);
    addListener(handle, 'pointercancel', endDrag);
    addListener(handle, 'keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const step = e.shiftKey ? 1 : 0.1;
      state.lanes[laneId].offset += e.key === 'ArrowLeft' ? -step : step;
      render();
      e.preventDefault();
    });

    laneEls.set(laneId, { lane, label, offset, inInput, outInput, selection, handle, markerIn, markerOut, canvas });
    return lane;
  }

  const lanes = document.createElement('div');
  lanes.className = 'media-compare-lanes';
  lanes.append(buildLane('A'), buildLane('B'));

  const band = document.createElement('div');
  band.className = 'media-compare-overlap-band';
  const diffCanvas = document.createElement('canvas');
  diffCanvas.className = 'media-compare-diff-canvas';
  diffCanvas.width = AUDIO_COMPARE_COLUMNS;
  diffCanvas.height = 36;
  const missingA = document.createElement('div');
  missingA.className = 'media-compare-missing media-compare-missing--a';
  const missingB = document.createElement('div');
  missingB.className = 'media-compare-missing media-compare-missing--b';
  visual.append(lanes, band, missingA, missingB, diffCanvas);

  const placeholder = document.createElement('div');
  placeholder.className = `media-compare-placeholder media-compare-placeholder--${kind}`;
  placeholder.textContent = kind === 'video'
    ? 'Frame strips and overlay preview are placeholders until the user requests decode.'
    : 'Waveform energy and difference bands are placeholders until the user requests analysis.';

  const foot = document.createElement('div');
  foot.className = 'media-compare-copy';

  wrap.append(head, controls, drop.el, visual, placeholder, foot);
  container.append(wrap);

  function render() {
    state.lanes.A.in = clamp(state.lanes.A.in, 0, state.durationA);
    state.lanes.B.in = clamp(state.lanes.B.in, 0, state.durationB);
    state.lanes.A.out = clamp(state.lanes.A.out, state.lanes.A.in, state.durationA);
    state.lanes.B.out = clamp(state.lanes.B.out, state.lanes.B.in, state.durationB);
    const result = classifyShiftedSections({
      a: { offset: state.lanes.A.offset, range: { start: state.lanes.A.in, end: state.lanes.A.out } },
      b: { offset: state.lanes.B.offset, range: { start: state.lanes.B.in, end: state.lanes.B.out } },
      durationA: state.durationA,
      durationB: state.durationB,
    });
    const timelineStart = Math.min(result.a.shifted.start, result.b.shifted.start, 0);
    const timelineEnd = Math.max(result.a.shifted.end, result.b.shifted.end, 1);
    const span = Math.max(1, timelineEnd - timelineStart);
    const pct = (value) => `${((value - timelineStart) / span) * 100}%`;

    wrap.dataset.layout = state.layout;
    wrap.dataset.normalize = state.normalize ? 'on' : 'off';
    wrap.dataset.overlayOpacity = String(state.opacity);
    visual.style.setProperty('--compare-opacity', String(state.opacity / 100));
    opacityValue.textContent = `${state.opacity}%`;
    normalizeMode.textContent = state.normalize
      ? 'Audio normalize: on (user chosen)'
      : 'Audio normalize: off';
    normalizeLabel.hidden = kind !== 'audio';
    readout.textContent = `${state.layout.replace('-', ' ')} · ${formatCompareSeconds(result.overlap.duration)} overlap`;
    foot.textContent = describeShiftedComparison(result);
    analysisControls.hidden = kind !== 'audio';
    analyzeButton.disabled = kind !== 'audio';
    renderAnalysis(result);

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
  }

  for (const btn of layoutButtons) {
    addListener(btn, 'click', () => {
      state.layout = btn.dataset.layout;
      for (const other of layoutButtons) other.setAttribute('aria-pressed', other === btn ? 'true' : 'false');
      render();
    });
  }
  addListener(opacityInput, 'input', () => {
    state.opacity = Number(opacityInput.value) || 0;
    render();
  });
  addListener(normalizeInput, 'change', () => {
    state.normalize = normalizeInput.checked;
    if (state.analysis) state.analysis.stale = true;
    render();
  });

  addListener(analyzeButton, 'click', () => {
    analyzeSelectedAudio().catch((err) => {
      state.analysis = null;
      analysisStatus.textContent = err?.message || 'Audio analysis failed.';
      render();
    });
  });

  function readFirstChannel(buffer) {
    if (!buffer || buffer.numberOfChannels < 1) return new Float32Array();
    return buffer.getChannelData(0);
  }

  async function decodeFile(file) {
    if (!file) return null;
    if (file.size > AUDIO_COMPARE_MAX_BYTES) {
      throw new Error(`${file.name || 'Audio file'} is too large for compare analysis (${(file.size / 1048576).toFixed(1)} MB; limit 24 MB).`);
    }
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) throw new Error('Audio analysis is not available in this browser.');
    const ctx = new AudioContextCtor();
    try {
      const bytes = await file.arrayBuffer();
      return await ctx.decodeAudioData(bytes.slice(0));
    } finally {
      ctx.close?.();
    }
  }

  async function analyzeSelectedAudio() {
    if (kind !== 'audio') return;
    const rangeA = state.lanes.A.out - state.lanes.A.in;
    const rangeB = state.lanes.B.out - state.lanes.B.in;
    const selected = Math.max(rangeA, state.files.B ? rangeB : 0);
    if (selected > AUDIO_COMPARE_MAX_RANGE_SECONDS) {
      analysisStatus.textContent = `Selected range is ${formatCompareSeconds(selected)}; choose ${formatCompareSeconds(AUDIO_COMPARE_MAX_RANGE_SECONDS)} or less.`;
      state.analysis = null;
      render();
      return;
    }

    analyzeButton.disabled = true;
    analysisStatus.textContent = 'Decoding selected audio on demand...';
    const fileA = state.files.A || audioSourceFromIntake(intake);
    if (!fileA) {
      analysisStatus.textContent = 'Open-file bytes are unavailable for audio analysis.';
      analyzeButton.disabled = false;
      return;
    }

    try {
      const [bufferA, bufferB] = await Promise.all([
        decodeFile(fileA),
        state.files.B ? decodeFile(state.files.B) : Promise.resolve(null),
      ]);
      state.durationA = bufferA.duration || state.durationA;
      state.lanes.A.out = Math.min(state.lanes.A.out, state.durationA);
      if (bufferB) {
        state.durationB = bufferB.duration || state.durationB;
        state.lanes.B.out = Math.min(state.lanes.B.out, state.durationB);
      }
      state.analysis = {
        channelA: readFirstChannel(bufferA),
        rateA: bufferA.sampleRate,
        channelB: bufferB ? readFirstChannel(bufferB) : null,
        rateB: bufferB?.sampleRate || 0,
        hasB: !!bufferB,
        stale: false,
      };
      analysisStatus.textContent = bufferB
        ? 'Analyzed selected audio range.'
        : 'Analyzed A. Add a second audio file for difference.';
    } catch (err) {
      state.analysis = null;
      analysisStatus.textContent = err?.message || 'Audio decode failed; compare controls remain available.';
    } finally {
      analyzeButton.disabled = false;
      render();
    }
  }

  function ensureCanvasSize(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    return { width, height, dpr };
  }

  function drawWave(canvas, summary, accent = '#2f7de1') {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = ensureCanvasSize(canvas);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--bg') || '#fff';
    ctx.fillRect(0, 0, width, height);
    if (!summary?.peaks?.length) return;
    const cols = summary.peaks.length;
    const mid = height / 2;
    ctx.fillStyle = accent;
    for (let i = 0; i < cols; i++) {
      const x = Math.floor((i / cols) * width);
      const nextX = Math.max(x + 1, Math.floor(((i + 1) / cols) * width));
      const peak = Math.min(1, summary.peaks[i]);
      const rms = Math.min(1, summary.rms[i]);
      ctx.globalAlpha = 0.28;
      ctx.fillRect(x, mid - peak * mid, nextX - x, Math.max(1, peak * height));
      ctx.globalAlpha = 0.78;
      ctx.fillRect(x, mid - rms * mid, nextX - x, Math.max(1, rms * height));
    }
    ctx.globalAlpha = 1;
  }

  function drawDiff(canvas, diff) {
    if (!canvas) return;
    canvas.hidden = !diff?.diff?.length;
    if (!diff?.diff?.length) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = ensureCanvasSize(canvas);
    ctx.clearRect(0, 0, width, height);
    const cols = diff.diff.length;
    for (let i = 0; i < cols; i++) {
      const x = Math.floor((i / cols) * width);
      const nextX = Math.max(x + 1, Math.floor(((i + 1) / cols) * width));
      const v = Math.max(0, Math.min(1, diff.diff[i]));
      ctx.fillStyle = `rgba(215, 58, 73, ${0.12 + v * 0.78})`;
      ctx.fillRect(x, 0, nextX - x, height);
    }
  }

  function renderAnalysis(result) {
    if (kind !== 'audio') {
      diffCanvas.hidden = true;
      return;
    }
    const analysis = state.analysis;
    const aCanvas = laneEls.get('A')?.canvas;
    const bCanvas = laneEls.get('B')?.canvas;
    if (!analysis) {
      drawWave(aCanvas, null);
      drawWave(bCanvas, null);
      drawDiff(diffCanvas, null);
      return;
    }

    const summaryA = summarizeAudioWindow(analysis.channelA, analysis.rateA, result.a.source, AUDIO_COMPARE_COLUMNS);
    const summaryB = analysis.hasB
      ? summarizeAudioWindow(analysis.channelB, analysis.rateB, result.b.source, AUDIO_COMPARE_COLUMNS)
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
    const overlapRangeA = {
      start: result.overlap.start - result.a.offset,
      end: result.overlap.end - result.a.offset,
    };
    const overlapRangeB = {
      start: result.overlap.start - result.b.offset,
      end: result.overlap.end - result.b.offset,
    };
    const overlapA = summarizeAudioWindow(analysis.channelA, analysis.rateA, overlapRangeA, AUDIO_COMPARE_COLUMNS);
    const overlapB = summarizeAudioWindow(analysis.channelB, analysis.rateB, overlapRangeB, AUDIO_COMPARE_COLUMNS);
    const diff = diffAudioSummaries(overlapA, overlapB, { normalize: state.normalize });
    drawDiff(diffCanvas, diff);
    const normText = state.normalize
      ? 'Per-lane peak normalization is on for compare only.'
      : 'Raw amplitude compare; normalization is off.';
    foot.textContent = `${describeShiftedComparison(result)} Measured overlap: average diff energy ${diff.averageEnergy.toFixed(3)}, high-diff columns ${diff.highColumns}/${diff.columns}. ${normText}`;
  }

  layoutButtons[0].setAttribute('aria-pressed', 'true');
  render();

  return {
    destroy() {
      for (const remove of listeners.splice(0)) remove();
      wrap.remove();
    },
  };
}
