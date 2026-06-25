import { buildSecondaryDropZone } from './editor-advanced.js';
import {
  AUDIO_COMPARE_COLUMNS,
  PX_PER_SEC,
  VIDEO_COMPARE_HEIGHT,
  VIDEO_COMPARE_WIDTH,
  clamp,
  durationOf,
  labelOf,
  mediaSourceFromIntake,
} from './compare-ui-constants.js';
import { makeButton, makeNumberInput } from './compare-ui-controls.js';
import {
  analyzeSelectedAudio,
  analyzeSelectedVideo,
  clearAudioRangeAnalysis,
  clearVideoAnalysis,
} from './compare-ui-analysis.js';
import {
  renderCompareAnalysis,
  renderCompareLayout,
} from './compare-ui-render.js';
import { createVideoCompareController } from './compare-ui-video.js';

export function mountMediaCompare(container, intake, mediaEl, kind = 'audio', options = {}) {
  const { enableFfmpeg = false } = typeof options === 'object' && options ? options : {};
  const state = {
    layout: 'side-by-side',
    opacity: 55,
    videoOpacityA: 100,
    videoOpacityB: 55,
    videoForeground: 'B',
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
    playhead: 0,
    playing: false,
    analysis: null,
  };
  const listeners = [];
  const objectUrls = new Set();
  const addListener = (el, type, fn, options) => {
    el.addEventListener(type, fn, options);
    listeners.push(() => el.removeEventListener(type, fn, options));
  };
  const makeObjectUrl = (file) => {
    if (!file) return '';
    const url = URL.createObjectURL(file);
    objectUrls.add(url);
    return url;
  };
  const releaseObjectUrl = (url) => {
    if (!url) return;
    URL.revokeObjectURL(url);
    objectUrls.delete(url);
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

  const videoLayerControls = document.createElement('div');
  videoLayerControls.className = 'media-compare-video-layers';
  videoLayerControls.hidden = kind !== 'video';
  const foregroundLabel = document.createElement('label');
  foregroundLabel.className = 'media-compare-layer-field';
  const foregroundSelect = document.createElement('select');
  foregroundSelect.className = 'media-compare-foreground-select';
  for (const [value, label] of [['B', 'B over A'], ['A', 'A over B']]) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    foregroundSelect.append(option);
  }
  foregroundSelect.value = state.videoForeground;
  foregroundLabel.append(document.createTextNode('Foreground '), foregroundSelect);
  const makeVideoOpacity = (laneId, value) => {
    const label = document.createElement('label');
    label.className = 'media-compare-layer-field';
    const input = document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = '100';
    input.step = '1';
    input.value = String(value);
    input.className = `media-compare-video-opacity media-compare-video-opacity-${laneId.toLowerCase()}`;
    const readoutEl = document.createElement('span');
    readoutEl.className = `media-compare-video-opacity-value media-compare-video-opacity-value-${laneId.toLowerCase()}`;
    label.append(document.createTextNode(`${laneId} opacity `), input, readoutEl);
    return { label, input, readout: readoutEl };
  };
  const videoOpacityA = makeVideoOpacity('A', state.videoOpacityA);
  const videoOpacityB = makeVideoOpacity('B', state.videoOpacityB);
  videoLayerControls.append(foregroundLabel, videoOpacityA.label, videoOpacityB.label);

  const normalizeLabel = document.createElement('label');
  normalizeLabel.className = 'media-compare-normalize';
  const normalizeInput = document.createElement('input');
  normalizeInput.type = 'checkbox';
  normalizeInput.className = 'media-compare-normalize-input';
  const normalizeMode = document.createElement('span');
  normalizeMode.className = 'media-compare-normalize-label';
  normalizeLabel.append(normalizeInput, normalizeMode);
  controls.append(layoutGroup, opacityLabel, videoLayerControls, normalizeLabel);

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

  let render = () => {};
  const videoController = createVideoCompareController({
    kind,
    state,
    addListener,
    makeObjectUrl,
    releaseObjectUrl,
    render: () => render(),
  });

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
    videoController.updateVideoPreviewSource('B');
    videoController.syncVideoPreviewToPlayhead();
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
    const clipLabel = document.createElement('div');
    clipLabel.className = 'media-compare-clip-label';
    selection.append(clipLabel);
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
      clearAudioRangeAnalysis(state, kind, analysisStatus);
      clearVideoAnalysis(state, kind, analysisStatus);
      videoController.syncVideoPreviewToPlayhead();
      render();
    };
    addListener(offset, 'input', () => {
      state.lanes[laneId].offset = Number(offset.value) || 0;
      clearAudioRangeAnalysis(state, kind, analysisStatus);
      clearVideoAnalysis(state, kind, analysisStatus);
      videoController.syncVideoPreviewToPlayhead();
      render();
    });
    addListener(inInput, 'input', syncRangeInput);
    addListener(outInput, 'input', syncRangeInput);

    let dragging = false;
    let startX = 0;
    let startOffset = 0;
    const endDrag = () => {
      dragging = false;
      window.removeEventListener('pointermove', moveDrag);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
    };
    const moveDrag = (e) => {
      if (!dragging) return;
      state.lanes[laneId].offset = Math.max(0, startOffset + ((e.clientX - startX) / PX_PER_SEC));
      clearAudioRangeAnalysis(state, kind, analysisStatus);
      clearVideoAnalysis(state, kind, analysisStatus);
      videoController.syncVideoPreviewToPlayhead();
      render();
    };
    const beginDrag = (e) => {
      dragging = true;
      startX = e.clientX;
      startOffset = state.lanes[laneId].offset;
      e.currentTarget?.setPointerCapture?.(e.pointerId);
      window.addEventListener('pointermove', moveDrag);
      window.addEventListener('pointerup', endDrag);
      window.addEventListener('pointercancel', endDrag);
      e.preventDefault();
    };
    const endMouseDrag = () => {
      dragging = false;
      window.removeEventListener('mousemove', moveDrag);
      window.removeEventListener('mouseup', endMouseDrag);
    };
    const beginMouseDrag = (e) => {
      dragging = true;
      startX = e.clientX;
      startOffset = state.lanes[laneId].offset;
      window.addEventListener('mousemove', moveDrag);
      window.addEventListener('mouseup', endMouseDrag);
      e.preventDefault();
    };
    addListener(handle, 'pointerdown', beginDrag);
    addListener(selection, 'pointerdown', beginDrag);
    addListener(handle, 'mousedown', beginMouseDrag);
    addListener(selection, 'mousedown', beginMouseDrag);
    addListener(handle, 'keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const step = e.shiftKey ? 1 : 0.1;
      state.lanes[laneId].offset = Math.max(0, state.lanes[laneId].offset + (e.key === 'ArrowLeft' ? -step : step));
      clearAudioRangeAnalysis(state, kind, analysisStatus);
      clearVideoAnalysis(state, kind, analysisStatus);
      videoController.syncVideoPreviewToPlayhead();
      render();
      e.preventDefault();
    });

    laneEls.set(laneId, { lane, label, offset, inInput, outInput, selection, clipLabel, handle, markerIn, markerOut, canvas });
    return lane;
  }

  const lanes = document.createElement('div');
  lanes.className = 'media-compare-lanes';
  lanes.append(buildLane('A'), buildLane('B'));

  const band = document.createElement('div');
  band.className = 'media-compare-overlap-band';
  const playhead = document.createElement('div');
  playhead.className = 'media-compare-playhead';
  const playheadLabel = document.createElement('span');
  playheadLabel.className = 'media-compare-playhead-time';
  playhead.append(playheadLabel);
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
  visual.append(videoController.videoPreview, lanes, band, missingA, missingB, playhead, overlayCanvas, diffCanvas);

  const placeholder = document.createElement('div');
  placeholder.className = `media-compare-placeholder media-compare-placeholder--${kind}`;
  placeholder.textContent = kind === 'video'
    ? 'Frame strips and overlay preview are placeholders until the user requests decode.'
    : 'Waveform energy and difference bands are placeholders until the user requests analysis.';

  const foot = document.createElement('div');
  foot.className = 'media-compare-copy';

  wrap.append(head, controls, videoController.transport, drop.el, visual, placeholder, foot);
  container.append(wrap);

  const renderRefs = {
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
    playhead,
    playheadLabel,
    visual,
    videoPreview: videoController.videoPreview,
    videoPreviewEls: videoController.videoPreviewEls,
    compareTimelineEnd: videoController.compareTimelineEnd,
    fmt: videoController.fmt,
    playButton: videoController.playButton,
    timeReadout: videoController.timeReadout,
    overlayCanvas,
    diffCanvas,
  };
  render = () => {
    const result = renderCompareLayout(state, renderRefs);
    renderCompareAnalysis(state, result, renderRefs);
  };

  for (const btn of layoutButtons) {
    addListener(btn, 'click', () => {
      state.layout = btn.dataset.layout;
      for (const other of layoutButtons) other.setAttribute('aria-pressed', other === btn ? 'true' : 'false');
      videoController.syncVideoPreviewToPlayhead();
      render();
    });
  }
  addListener(opacityInput, 'input', () => {
    state.opacity = Number(opacityInput.value) || 0;
    render();
  });
  addListener(foregroundSelect, 'change', () => {
    state.videoForeground = foregroundSelect.value === 'A' ? 'A' : 'B';
    videoController.syncVideoPreviewToPlayhead();
    render();
  });
  addListener(videoOpacityA.input, 'input', () => {
    state.videoOpacityA = Number(videoOpacityA.input.value) || 0;
    videoController.syncVideoPreviewToPlayhead();
    render();
  });
  addListener(videoOpacityB.input, 'input', () => {
    state.videoOpacityB = Number(videoOpacityB.input.value) || 0;
    videoController.syncVideoPreviewToPlayhead();
    render();
  });
  addListener(normalizeInput, 'change', () => {
    state.normalize = normalizeInput.checked;
    if (state.analysis) state.analysis.stale = true;
    render();
  });

  addListener(analyzeButton, 'click', () => {
    const work = kind === 'video'
      ? analyzeSelectedVideo({
        state,
        kind,
        intake,
        analysisStatus,
        analyzeButton,
        render,
      })
      : analyzeSelectedAudio({
        state,
        kind,
        intake,
        enableFfmpeg,
        analysisStatus,
        analyzeButton,
        render,
      });
    work.catch((err) => {
      state.analysis = null;
      analysisStatus.textContent = err?.message || `${kind === 'video' ? 'Video' : 'Audio'} analysis failed.`;
      render();
    });
  });

  layoutButtons[0].setAttribute('aria-pressed', 'true');
  videoController.updateVideoPreviewSource('A');
  videoController.syncVideoPreviewToPlayhead();
  render();

  return {
    destroy() {
      for (const remove of listeners.splice(0)) remove();
      videoController.stopComparePlayback();
      for (const url of objectUrls) URL.revokeObjectURL(url);
      objectUrls.clear();
      wrap.remove();
    },
  };
}
