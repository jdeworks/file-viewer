import {
  classifyShiftedSections,
  describeShiftedComparison,
  diffAudioSummaries,
  diffVideoFrames,
  overlapSourceRanges,
  formatCompareSeconds,
  sampleVideoTimes,
  summarizeAudioWindow,
} from './compare-math.js';
import { readPcmWavFirstChannelRange } from './compare-audio.js';
import { buildSecondaryDropZone } from './editor-advanced.js';

const FALLBACK_DURATION = 60;
const PX_PER_SEC = 9;
const AUDIO_COMPARE_MAX_BYTES = 24 * 1024 * 1024;
const AUDIO_COMPARE_MAX_RANGE_SECONDS = 90;
const AUDIO_COMPARE_COLUMNS = 360;
const VIDEO_COMPARE_MAX_BYTES = 32 * 1024 * 1024;
const VIDEO_COMPARE_MAX_RANGE_SECONDS = 12;
const VIDEO_COMPARE_MAX_FRAMES = 8;
const VIDEO_COMPARE_WIDTH = 128;
const VIDEO_COMPARE_HEIGHT = 72;

function durationOf(mediaEl) {
  return Number.isFinite(mediaEl?.duration) && mediaEl.duration > 0 ? mediaEl.duration : FALLBACK_DURATION;
}

function labelOf(intake) {
  return intake?.filename || intake?.file?.name || 'Open media';
}

function mediaSourceFromIntake(intake) {
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

export function mountMediaCompare(container, intake, mediaEl, kind = 'audio', options = {}) {
  const { enableFfmpeg = false } = typeof options === 'object' && options ? options : {};
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
      A: mediaSourceFromIntake(intake),
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
  analyzeButton.textContent = kind === 'video' ? 'Analyze selected video' : 'Analyze selected audio';
  const analysisStatus = document.createElement('span');
  analysisStatus.className = 'media-compare-analysis-status';
  analysisStatus.textContent = 'Not analyzed';
  const analysisControls = document.createElement('div');
  analysisControls.className = 'media-compare-analysis-controls';
  analysisControls.append(analyzeButton, analysisStatus);
  controls.append(analysisControls);

  const drop = buildSecondaryDropZone({
    accept: kind === 'video' ? 'video/*' : 'audio/*',
    hint: `Drop a second ${kind} file for compare`,
  }, (file) => {
    state.lanes.B.label = file.name || 'Second file';
    state.files.B = file;
    state.analysis = null;
    analysisStatus.textContent = 'Not analyzed';
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
      clearAudioRangeAnalysis();
      clearVideoAnalysis();
      render();
    };
    addListener(offset, 'input', () => {
      state.lanes[laneId].offset = Number(offset.value) || 0;
      clearAudioRangeAnalysis();
      clearVideoAnalysis();
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
      clearAudioRangeAnalysis();
      clearVideoAnalysis();
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
      clearAudioRangeAnalysis();
      clearVideoAnalysis();
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
  const overlayCanvas = document.createElement('canvas');
  overlayCanvas.className = 'media-compare-overlay-canvas';
  overlayCanvas.width = VIDEO_COMPARE_WIDTH;
  overlayCanvas.height = VIDEO_COMPARE_HEIGHT;
  overlayCanvas.hidden = true;
  const missingA = document.createElement('div');
  missingA.className = 'media-compare-missing media-compare-missing--a';
  const missingB = document.createElement('div');
  missingB.className = 'media-compare-missing media-compare-missing--b';
  visual.append(lanes, band, missingA, missingB, overlayCanvas, diffCanvas);

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
    const work = kind === 'video' ? analyzeSelectedVideo() : analyzeSelectedAudio();
    work.catch((err) => {
      state.analysis = null;
      analysisStatus.textContent = err?.message || `${kind === 'video' ? 'Video' : 'Audio'} analysis failed.`;
      render();
    });
  });

  function clearVideoAnalysis() {
    if (kind !== 'video' || !state.analysis) return;
    state.analysis = null;
    analysisStatus.textContent = 'Selection changed; analyze shifted overlap video again.';
  }

  function clearAudioRangeAnalysis() {
    if (kind !== 'audio' || state.analysis?.source !== 'wav-range') return;
    state.analysis = null;
    analysisStatus.textContent = 'Selection changed; analyze shifted overlap WAV range again.';
  }

  function canDecodeByBrowser(file) {
    return !file || file.size <= AUDIO_COMPARE_MAX_BYTES;
  }

  function readFirstChannel(buffer) {
    if (!buffer || buffer.numberOfChannels < 1) return new Float32Array();
    return buffer.getChannelData(0);
  }

  function audioCompareResult() {
    return classifyShiftedSections({
      a: { offset: state.lanes.A.offset, range: { start: state.lanes.A.in, end: state.lanes.A.out } },
      b: { offset: state.lanes.B.offset, range: { start: state.lanes.B.in, end: state.lanes.B.out } },
      durationA: state.durationA,
      durationB: state.durationB,
    });
  }

  async function readSelectedWavRange(file, sourceRange, label, maxBytes = AUDIO_COMPARE_MAX_BYTES) {
    if (!file) return null;
    return readPcmWavFirstChannelRange(file, sourceRange, {
      label,
      maxBytes,
    });
  }

  function toAudioAnalysisFromRange(rangeA, rangeB = null, overlapRanges = null) {
    return {
      channelA: rangeA.channel,
      rateA: rangeA.sampleRate,
      rangeStartA: rangeA.rangeStart,
      channelB: rangeB ? rangeB.channel : null,
      rateB: rangeB?.sampleRate || 0,
      rangeStartB: rangeB?.rangeStart || 0,
      hasB: !!rangeB,
      overlapRanges,
      source: 'wav-range',
      stale: false,
    };
  }

  function toAudioAnalysisFromBuffers(bufferA, bufferB = null, overlapRanges = null) {
    return {
      channelA: readFirstChannel(bufferA),
      rateA: bufferA.sampleRate,
      rangeStartA: 0,
      channelB: bufferB ? readFirstChannel(bufferB) : null,
      rateB: bufferB?.sampleRate || 0,
      rangeStartB: 0,
      hasB: !!bufferB,
      overlapRanges,
      source: 'browser-decode',
      stale: false,
    };
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
    const current = audioCompareResult();
    const overlapRanges = overlapSourceRanges(current);
    const hasSecond = !!state.files.B;
    const selected = hasSecond ? overlapRanges.overlap.duration : rangeA;
    if (!hasSecond && selected > AUDIO_COMPARE_MAX_RANGE_SECONDS) {
      analysisStatus.textContent = `Selected range is ${formatCompareSeconds(selected)}; choose ${formatCompareSeconds(AUDIO_COMPARE_MAX_RANGE_SECONDS)} or less.`;
      state.analysis = null;
      render();
      return;
    }
    if (hasSecond && !overlapRanges.hasOverlap) {
      state.analysis = null;
      analysisStatus.textContent = 'No shifted overlap to analyze; adjust offsets or ranges.';
      render();
      return;
    }
    if (hasSecond && overlapRanges.overlap.duration > AUDIO_COMPARE_MAX_RANGE_SECONDS) {
      state.analysis = null;
      analysisStatus.textContent = `Shifted overlap is ${formatCompareSeconds(overlapRanges.overlap.duration)}; choose ${formatCompareSeconds(AUDIO_COMPARE_MAX_RANGE_SECONDS)} or less.`;
      render();
      return;
    }

    analyzeButton.disabled = true;
    analysisStatus.textContent = 'Analyzing shifted overlap audio on demand...';
    const fileA = state.files.A || mediaSourceFromIntake(intake);
    if (!fileA) {
      analysisStatus.textContent = 'Open-file bytes are unavailable for audio analysis.';
      analyzeButton.disabled = false;
      return;
    }

    try {
      const sourceRangeA = overlapRanges.a;
      const sourceRangeB = overlapRanges.b;
      const sampleRangeA = hasSecond ? sourceRangeA : current.a.source;
      const fileB = state.files.B;

      const attemptA = readSelectedWavRange(fileA, sampleRangeA, 'Lane A shifted-overlap WAV range');
      const attemptB = hasSecond
        ? readSelectedWavRange(fileB, sourceRangeB, 'Lane B shifted-overlap WAV range')
        : Promise.resolve(null);
      const directReads = await Promise.allSettled([attemptA, attemptB]);

      let wavA = directReads[0]?.status === 'fulfilled' ? directReads[0].value : null;
      let wavB = hasSecond && directReads[1]?.status === 'fulfilled' ? directReads[1].value : null;
      const canUseDirectWavRange = !!wavA && (!hasSecond || !!wavB);
      let usedFfmpegExtract = false;

      const directWasIncomplete = hasSecond && !canUseDirectWavRange;
      if (!canUseDirectWavRange && hasSecond && enableFfmpeg) {
        const ffModule = await import('./compare-ffmpeg.js');
        const {
          extractAudioRangeToWav: extractAudioRangeToWavFromModule,
          AUDIO_COMPARE_MAX_EXTRACT_BYTES,
          formatMb,
        } = ffModule;
        const extractA = wavA ? Promise.resolve(wavA) : extractAudioRangeToWavFromModule(fileA, sourceRangeA, 'Lane A');
        const extractB = wavB ? Promise.resolve(wavB) : (hasSecond && fileB
          ? extractAudioRangeToWavFromModule(fileB, sourceRangeB, 'Lane B')
          : Promise.resolve(null));
        try {
          const extracted = await Promise.all([extractA, extractB]);
          wavA = wavA || (await readSelectedWavRange(
            extracted[0],
            { start: 0, end: Number.MAX_VALUE },
            'Lane A ffmpeg extracted WAV range',
            AUDIO_COMPARE_MAX_EXTRACT_BYTES,
          ));
          wavB = wavB || (hasSecond
            ? await readSelectedWavRange(
              extracted[1],
              { start: 0, end: Number.MAX_VALUE },
              'Lane B ffmpeg extracted WAV range',
              AUDIO_COMPARE_MAX_EXTRACT_BYTES,
            )
            : null);
          usedFfmpegExtract = directWasIncomplete && (wavA && (!hasSecond || wavB));
        } catch (err) {
          if (!canDecodeByBrowser(fileA) || !canDecodeByBrowser(fileB)) {
            const reason = (err && err.message) || '';
            const hint = 'Compressed audio needs ffmpeg extraction and is not analyzable under compare caps. '
              + `ffmpeg extract cap is ${formatMb(AUDIO_COMPARE_MAX_EXTRACT_BYTES)} and browser decode cap is ${formatMb(AUDIO_COMPARE_MAX_BYTES)}.`;
            throw new Error(reason ? `${reason} ${hint}` : hint);
          }
          const [bufferA, bufferB] = await Promise.all([decodeFile(fileA), decodeFile(fileB)]);
          state.durationA = bufferA.duration || state.durationA;
          state.lanes.A.out = Math.min(state.lanes.A.out, state.durationA);
          if (bufferB) {
            state.durationB = bufferB.duration || state.durationB;
            state.lanes.B.out = Math.min(state.lanes.B.out, state.durationB);
          }
          state.analysis = toAudioAnalysisFromBuffers(bufferA, bufferB);
          analysisStatus.textContent = hasSecond
            ? 'Analyzed shifted overlap audio range (browser decode).'
            : 'Analyzed A shifted-overlap audio range (browser decode). Add a second audio file.';
          return;
        }
      }

      if (wavA && (!hasSecond || wavB)) {
        state.durationA = wavA.duration || state.durationA;
        state.lanes.A.out = Math.min(state.lanes.A.out, state.durationA);
        if (hasSecond && wavB) {
          state.durationB = wavB.duration || state.durationB;
          state.lanes.B.out = Math.min(state.lanes.B.out, state.durationB);
        }
        const overlapForAnalysis = {
          hasOverlap: hasSecond ? overlapRanges.hasOverlap : true,
          overlap: hasSecond ? overlapRanges.overlap : current.a.source,
          a: hasSecond ? overlapRanges.a : current.a.source,
          b: hasSecond ? overlapRanges.b : { start: 0, end: 0 },
        };
        state.analysis = toAudioAnalysisFromRange(
          wavA,
          wavB,
          overlapForAnalysis,
        );
        analysisStatus.textContent = hasSecond
          ? (usedFfmpegExtract
            ? 'Analyzed shifted overlap audio range (ffmpeg extract).'
            : 'Analyzed shifted overlap WAV range.')
          : 'Analyzed A shifted-overlap WAV range. Add a second audio file.';
      } else {
        const [bufferA, bufferB] = await Promise.all([
          decodeFile(fileA),
          hasSecond ? decodeFile(state.files.B) : Promise.resolve(null),
        ]);
        state.durationA = bufferA.duration || state.durationA;
        state.lanes.A.out = Math.min(state.lanes.A.out, state.durationA);
        if (bufferB) {
          state.durationB = bufferB.duration || state.durationB;
          state.lanes.B.out = Math.min(state.lanes.B.out, state.durationB);
        }
        state.analysis = toAudioAnalysisFromBuffers(bufferA, bufferB);
        analysisStatus.textContent = hasSecond
          ? 'Analyzed shifted overlap audio range (browser decode).'
          : 'Analyzed A shifted-overlap audio range (browser decode). Add a second audio file.';
      }
      if (!state.analysis.hasB && hasSecond) {
        analysisStatus.textContent = state.analysis.source === 'wav-range'
          ? 'Analyzed shifted overlap WAV range. Add a second audio file.'
          : 'Analyzed shifted-overlap audio range (browser decode). Add a second audio file.';
      }
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

  function drawVideoDiff(canvas, diff) {
    if (!canvas) return;
    canvas.hidden = !diff?.columnDiffs?.length;
    if (!diff?.columnDiffs?.length) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = ensureCanvasSize(canvas);
    ctx.clearRect(0, 0, width, height);
    const cols = diff.columnDiffs.length;
    for (let i = 0; i < cols; i++) {
      const x = Math.floor((i / cols) * width);
      const nextX = Math.max(x + 1, Math.floor(((i + 1) / cols) * width));
      const v = Math.max(0, Math.min(1, diff.columnDiffs[i]));
      ctx.fillStyle = `rgba(215, 58, 73, ${0.12 + v * 0.82})`;
      ctx.fillRect(x, 0, nextX - x, height);
    }
  }

  function drawFrameStrip(canvas, frames) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = ensureCanvasSize(canvas);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--bg') || '#fff';
    ctx.fillRect(0, 0, width, height);
    if (!frames?.length) return;
    const scratch = document.createElement('canvas');
    const scratchCtx = scratch.getContext('2d');
    const gap = 2;
    const tileWidth = Math.max(1, Math.floor((width - gap * (frames.length - 1)) / frames.length));
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      scratch.width = frame.width;
      scratch.height = frame.height;
      scratchCtx.putImageData(new ImageData(frame.data, frame.width, frame.height), 0, 0);
      const x = i * (tileWidth + gap);
      ctx.drawImage(scratch, x, 0, tileWidth, height);
    }
  }

  function drawOverlayPreview(analysis) {
    overlayCanvas.hidden = !analysis?.framesA?.length || !analysis?.framesB?.length;
    if (overlayCanvas.hidden) return;
    const ctx = overlayCanvas.getContext('2d');
    const { width, height } = ensureCanvasSize(overlayCanvas);
    const a = analysis.framesA[0];
    const b = analysis.framesB[0];
    const scratch = document.createElement('canvas');
    const scratchCtx = scratch.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    scratch.width = a.width;
    scratch.height = a.height;
    scratchCtx.putImageData(new ImageData(a.data, a.width, a.height), 0, 0);
    ctx.drawImage(scratch, 0, 0, width, height);
    scratch.width = b.width;
    scratch.height = b.height;
    scratchCtx.putImageData(new ImageData(b.data, b.width, b.height), 0, 0);
    ctx.globalAlpha = state.opacity / 100;
    ctx.drawImage(scratch, 0, 0, width, height);
    ctx.globalAlpha = 1;
  }

  function loadVideoMetadata(file) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      const cleanup = () => {
        video.removeAttribute('src');
        video.load?.();
        URL.revokeObjectURL(url);
      };
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.addEventListener('loadedmetadata', () => {
        const duration = Number.isFinite(video.duration) ? video.duration : 0;
        cleanup();
        resolve(duration);
      }, { once: true });
      video.addEventListener('error', () => {
        cleanup();
        reject(new Error(`${file.name || 'Video file'} could not be opened for metadata.`));
      }, { once: true });
      video.src = url;
      video.load();
    });
  }

  async function sampleVideoFrames(file, times) {
    if (!file) return [];
    if (file.size > VIDEO_COMPARE_MAX_BYTES) {
      throw new Error(`${file.name || 'Video file'} is too large for compare analysis (${(file.size / 1048576).toFixed(1)} MB; limit 32 MB).`);
    }
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    const canvas = document.createElement('canvas');
    canvas.width = VIDEO_COMPARE_WIDTH;
    canvas.height = VIDEO_COMPARE_HEIGHT;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const waitFor = (event) => new Promise((resolve, reject) => {
      const onOk = () => { cleanup(); resolve(); };
      const onError = () => { cleanup(); reject(new Error(`${file.name || 'Video file'} could not be decoded.`)); };
      const cleanup = () => {
        video.removeEventListener(event, onOk);
        video.removeEventListener('error', onError);
      };
      video.addEventListener(event, onOk, { once: true });
      video.addEventListener('error', onError, { once: true });
    });
    try {
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      video.src = url;
      video.load();
      await waitFor('loadedmetadata');
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const frames = [];
      for (const rawTime of times.slice(0, VIDEO_COMPARE_MAX_FRAMES)) {
        const t = clamp(rawTime, 0, Math.max(0, duration - 0.02));
        video.currentTime = t;
        await waitFor('seeked');
        ctx.drawImage(video, 0, 0, VIDEO_COMPARE_WIDTH, VIDEO_COMPARE_HEIGHT);
        const image = ctx.getImageData(0, 0, VIDEO_COMPARE_WIDTH, VIDEO_COMPARE_HEIGHT);
        frames.push({
          data: new Uint8ClampedArray(image.data),
          width: VIDEO_COMPARE_WIDTH,
          height: VIDEO_COMPARE_HEIGHT,
          time: t,
        });
      }
      return frames;
    } finally {
      video.removeAttribute('src');
      video.load?.();
      URL.revokeObjectURL(url);
    }
  }

  async function analyzeSelectedVideo() {
    if (kind !== 'video') return;
    const fileA = state.files.A || mediaSourceFromIntake(intake);
    const fileB = state.files.B;
    if (!fileA) {
      analysisStatus.textContent = 'Open-file bytes are unavailable for video analysis.';
      return;
    }
    if (!fileB) {
      analysisStatus.textContent = 'Choose a second video file before analysis.';
      return;
    }
    if (fileA.size > VIDEO_COMPARE_MAX_BYTES || fileB.size > VIDEO_COMPARE_MAX_BYTES) {
      analysisStatus.textContent = `Video compare is capped at ${(VIDEO_COMPARE_MAX_BYTES / 1048576).toFixed(0)} MB per file.`;
      state.analysis = null;
      render();
      return;
    }

    analyzeButton.disabled = true;
    analysisStatus.textContent = 'Decoding shifted overlap video frames on demand...';
    try {
      const [durationA, durationB] = await Promise.all([loadVideoMetadata(fileA), loadVideoMetadata(fileB)]);
      if (durationA > 0) {
        state.durationA = durationA;
        state.lanes.A.out = Math.min(state.lanes.A.out, state.durationA);
      }
      if (durationB > 0) {
        state.durationB = durationB;
        state.lanes.B.out = Math.min(state.lanes.B.out, state.durationB);
      }
      const result = classifyShiftedSections({
        a: { offset: state.lanes.A.offset, range: { start: state.lanes.A.in, end: state.lanes.A.out } },
        b: { offset: state.lanes.B.offset, range: { start: state.lanes.B.in, end: state.lanes.B.out } },
        durationA: state.durationA,
        durationB: state.durationB,
      });
      const overlapRanges = overlapSourceRanges(result);
      if (!overlapRanges.hasOverlap) {
        state.analysis = null;
        analysisStatus.textContent = 'No shifted overlap to sample; adjust offsets or ranges.';
        render();
        return;
      }
      if (overlapRanges.overlap.duration > VIDEO_COMPARE_MAX_RANGE_SECONDS) {
        state.analysis = null;
        analysisStatus.textContent = `Shifted overlap is ${formatCompareSeconds(overlapRanges.overlap.duration)}; choose ${formatCompareSeconds(VIDEO_COMPARE_MAX_RANGE_SECONDS)} or less.`;
        render();
        return;
      }
      const compareTimesA = sampleVideoTimes(overlapRanges.a, VIDEO_COMPARE_MAX_FRAMES);
      const compareTimesB = sampleVideoTimes(overlapRanges.b, VIDEO_COMPARE_MAX_FRAMES);
      const [framesA, framesB] = await Promise.all([
        sampleVideoFrames(fileA, compareTimesA),
        sampleVideoFrames(fileB, compareTimesB),
      ]);
      const diff = diffVideoFrames(framesA, framesB);
      state.analysis = { kind: 'video', framesA, framesB, diff, compareTimes: compareTimesA, overlapRanges };
      analysisStatus.textContent = `Analyzed ${diff.frames} shifted-overlap video frame${diff.frames === 1 ? '' : 's'}.`;
    } catch (err) {
      state.analysis = null;
      analysisStatus.textContent = err?.message || 'Video decode failed; compare controls remain available.';
    } finally {
      analyzeButton.disabled = false;
      render();
    }
  }

  function renderAnalysis(result) {
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
      drawOverlayPreview(analysis);
      drawVideoDiff(diffCanvas, analysis.diff);
      foot.textContent = `${describeShiftedComparison(result)} Measured shifted overlap: average visual difference ${analysis.diff.averageDifference.toFixed(3)}, high-diff frames ${analysis.diff.highFrames}/${analysis.diff.frames}, high-diff pixels ${analysis.diff.highPixels}/${analysis.diff.totalPixels}, high-diff columns ${analysis.diff.highColumns}/${analysis.diff.totalColumns}. Overlay preview uses ${state.opacity}% B opacity; shifted/missing ranges are separate from content differences.`;
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

  layoutButtons[0].setAttribute('aria-pressed', 'true');
  render();

  return {
    destroy() {
      for (const remove of listeners.splice(0)) remove();
      wrap.remove();
    },
  };
}
