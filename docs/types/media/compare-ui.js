import {
  classifyShiftedSections,
  describeShiftedComparison,
  formatCompareSeconds,
} from './compare-math.js';
import { buildSecondaryDropZone } from './editor-advanced.js';

const FALLBACK_DURATION = 60;
const PX_PER_SEC = 9;

function durationOf(mediaEl) {
  return Number.isFinite(mediaEl?.duration) && mediaEl.duration > 0 ? mediaEl.duration : FALLBACK_DURATION;
}

function labelOf(intake) {
  return intake?.filename || intake?.file?.name || 'Open media';
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

  const drop = buildSecondaryDropZone({
    accept: kind === 'video' ? 'video/*' : 'audio/*',
    hint: `Drop a second ${kind} file for compare`,
  }, (file) => {
    state.lanes.B.label = file.name || 'Second file';
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
    track.append(body, selection, markerIn, markerOut, handle);

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

    laneEls.set(laneId, { lane, label, offset, inInput, outInput, selection, handle, markerIn, markerOut });
    return lane;
  }

  const lanes = document.createElement('div');
  lanes.className = 'media-compare-lanes';
  lanes.append(buildLane('A'), buildLane('B'));

  const band = document.createElement('div');
  band.className = 'media-compare-overlap-band';
  const missingA = document.createElement('div');
  missingA.className = 'media-compare-missing media-compare-missing--a';
  const missingB = document.createElement('div');
  missingB.className = 'media-compare-missing media-compare-missing--b';
  visual.append(lanes, band, missingA, missingB);

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
    render();
  });

  layoutButtons[0].setAttribute('aria-pressed', 'true');
  render();

  return {
    destroy() {
      for (const remove of listeners.splice(0)) remove();
      wrap.remove();
    },
  };
}
