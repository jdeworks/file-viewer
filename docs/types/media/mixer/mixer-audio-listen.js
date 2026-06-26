import { buildAudioListenSurface } from '../audio-listen-surface.js';
import {
  createProjectFromAssetMetadata,
  updateElement,
} from './mixer-model.js';
import {
  exportProjectSettingsJson,
  importProjectSettings,
} from './mixer-import-export.js';
import { ensureMixerStyles } from './mixer-ui.js';

export function buildMixerAudioListenSurface(mediaEl, intake, options = {}) {
  ensureMixerStyles();
  const base = buildAudioListenSurface(mediaEl, intake, {
    ...options,
    onWaveformSummary(summary) {
      attachWaveformSummary(summary);
      options.onWaveformSummary?.(summary);
    },
    onWaveformSummaryStatus(status) {
      setWaveformStatus(status);
      options.onWaveformSummaryStatus?.(status);
    },
  });
  const root = base.el;
  root.classList.add('mmx-audio-listen');
  root.dataset.mixerContext = 'listen';

  let project = buildProject(mediaEl, intake);
  let zoom = 1;
  let pan = 0;
  let waveformStatus = 'pending';
  const firstElementId = () => project.elements[0]?.id;

  const capabilityNote = document.createElement('div');
  capabilityNote.className = 'mmx-capability-note';
  capabilityNote.textContent = 'You can edit timing, fades, gain, room tone, and project settings now. Enable Media Transcoding for render paths that need ffmpeg.';

  const viewportTools = document.createElement('div');
  viewportTools.className = 'mmx-listen-viewport-tools';
  const zoomOutBtn = smallButton('Zoom out', '-');
  zoomOutBtn.classList.add('mmx-listen-zoom-out');
  const zoomInBtn = smallButton('Zoom in', '+');
  zoomInBtn.classList.add('mmx-listen-zoom-in');
  const zoomInput = document.createElement('input');
  zoomInput.type = 'range';
  zoomInput.className = 'mmx-listen-zoom';
  zoomInput.min = '1';
  zoomInput.max = '4';
  zoomInput.step = '0.1';
  zoomInput.value = '1';
  zoomInput.setAttribute('aria-label', 'Listen lane zoom');
  const panInput = document.createElement('input');
  panInput.type = 'range';
  panInput.className = 'mmx-listen-pan';
  panInput.min = '0';
  panInput.max = '100';
  panInput.step = '1';
  panInput.value = '0';
  panInput.setAttribute('aria-label', 'Listen lane pan');
  viewportTools.append(zoomOutBtn, zoomInput, zoomInBtn, panInput);

  const projectTools = document.createElement('div');
  projectTools.className = 'mmx-listen-project-tools';
  const exportBtn = document.createElement('button');
  exportBtn.type = 'button';
  exportBtn.className = 'mmx-settings-export';
  exportBtn.textContent = 'Export settings';
  const importBtn = document.createElement('button');
  importBtn.type = 'button';
  importBtn.className = 'mmx-settings-import';
  importBtn.textContent = 'Import settings';
  importBtn.hidden = true;
  projectTools.append(exportBtn, importBtn);
  root.prepend(capabilityNote);
  root.append(viewportTools, projectTools);

  function syncProjectFromControls() {
    const id = firstElementId();
    if (!id) return;
    const offsetSec = readNumber(root, '.media-lane-offset', 0);
    const inSec = readNumber(root, '.media-lane-in', 0);
    const outSec = readNumber(root, '.media-lane-out', mediaDuration(mediaEl));
    const gain = readNumber(root, '.media-lane-gain', 1);
    const fadeInMs = readNumber(root, '.media-lane-fade-in', 0);
    const fadeOutMs = readNumber(root, '.media-lane-fade-out', 0);
    const roomTone = !!root.querySelector('.media-lane-room-toggle')?.checked;
    project = updateElement(project, id, (element) => ({
      ...element,
      timeline: {
        ...element.timeline,
        startMs: Math.max(0, offsetSec * 1000),
        sourceInMs: Math.max(0, inSec * 1000),
        sourceOutMs: Math.max(inSec * 1000, outSec * 1000),
        durationMs: Math.max(0, (outSec - inSec) * 1000),
        placementDurationMs: Math.max(0, (outSec - inSec) * 1000),
      },
      audio: {
        ...element.audio,
        gain,
        fadeInMs,
        fadeOutMs,
        roomTone: roomTone ? { kind: 'room-tone', source: 'derived-gap-bed', levelDb: -52 } : null,
      },
    }));
    reflectProjectState();
  }

  function reflectProjectState() {
    const element = project.elements[0];
    root.dataset.mixerProjectId = project.project.id;
    root.dataset.mixerElementId = element?.id || '';
    root.dataset.mixerOffsetMs = String(Math.round(element?.timeline?.startMs || 0));
    root.dataset.mixerGain = String(element?.audio?.gain ?? 1);
    root.dataset.mixerRoomTone = element?.audio?.roomTone ? 'true' : 'false';
    root.dataset.mixerZoom = String(Math.round(zoom * 100) / 100);
    root.dataset.mixerPan = String(Math.round(pan));
    root.dataset.mixerWaveformStatus = waveformStatus;
    root.dataset.mixerWaveformBuckets = String(element?.analysis?.waveformSummary?.buckets || 0);
  }

  function attachWaveformSummary(summary) {
    const id = firstElementId();
    if (!id || !summary) return;
    project = updateElement(project, id, (element) => ({
      ...element,
      analysis: {
        ...element.analysis,
        waveformSummary: summary,
      },
    }));
    reflectProjectState();
  }

  function setWaveformStatus(status) {
    waveformStatus = status || 'unavailable';
    reflectProjectState();
  }

  function applyViewport() {
    const surface = root.querySelector('.media-waveform-surface');
    const canvas = root.querySelector('.media-wv-canvas');
    if (surface) {
      surface.style.setProperty('--mmx-listen-zoom', String(zoom));
      surface.scrollLeft = Math.max(0, pan);
    }
    if (canvas) {
      canvas.style.width = `${Math.round(zoom * 100)}%`;
      canvas.style.minWidth = `${Math.round(zoom * 100)}%`;
    }
    reflectProjectState();
  }

  function setZoom(value) {
    zoom = clampNumber(value, 1, 4, 1);
    zoomInput.value = String(zoom);
    const surface = root.querySelector('.media-waveform-surface');
    const maxPan = surface ? Math.max(0, surface.scrollWidth - surface.clientWidth) : 0;
    panInput.max = String(Math.max(100, Math.ceil(maxPan)));
    applyViewport();
  }

  function setPan(value) {
    pan = Math.max(0, Number(value) || 0);
    panInput.value = String(Math.round(pan));
    applyViewport();
  }

  function exportSettings() {
    syncProjectFromControls();
    const json = exportProjectSettingsJson(project);
    root.dataset.projectSettings = json;
    return json;
  }

  function importSettings(json) {
    const imported = importProjectSettings(json);
    project = imported.project;
    const element = project.elements[0];
    if (element) {
      setValue(root, '.media-lane-offset', (element.timeline.startMs || 0) / 1000);
      setValue(root, '.media-lane-in', (element.timeline.sourceInMs || 0) / 1000);
      setValue(root, '.media-lane-out', (element.timeline.sourceOutMs || element.timeline.durationMs || 0) / 1000);
      setValue(root, '.media-lane-gain', element.audio?.gain ?? 1);
      setValue(root, '.media-lane-fade-in', element.audio?.fadeInMs ?? 0);
      setValue(root, '.media-lane-fade-out', element.audio?.fadeOutMs ?? 0);
      const room = root.querySelector('.media-lane-room-toggle');
      if (room) {
        room.checked = !!element.audio?.roomTone;
        room.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    reflectProjectState();
    return imported;
  }

  const onInput = (event) => {
    if (event.target?.matches?.('.media-lane-offset, .media-lane-in, .media-lane-out, .media-lane-gain, .media-lane-fade-in, .media-lane-fade-out')) {
      syncProjectFromControls();
    }
  };
  const onChange = (event) => {
    if (event.target?.matches?.('.media-lane-room-toggle')) syncProjectFromControls();
  };
  const onZoomInput = () => setZoom(Number(zoomInput.value));
  const onPanInput = () => setPan(Number(panInput.value));
  const onZoomOut = () => setZoom(zoom - 0.25);
  const onZoomIn = () => setZoom(zoom + 0.25);
  const onLoadedMetadata = () => {
    project = buildProject(mediaEl, intake);
    attachWaveformSummary(base.getWaveformSummary?.());
    syncProjectFromControls();
    setZoom(zoom);
  };
  root.addEventListener('input', onInput);
  root.addEventListener('change', onChange);
  mediaEl.addEventListener('loadedmetadata', onLoadedMetadata);
  exportBtn.addEventListener('click', exportSettings);
  zoomInput.addEventListener('input', onZoomInput);
  panInput.addEventListener('input', onPanInput);
  zoomOutBtn.addEventListener('click', onZoomOut);
  zoomInBtn.addEventListener('click', onZoomIn);
  const detachDrag = attachSourceMoveDrag(root, (deltaSec) => {
    const offset = root.querySelector('.media-lane-offset');
    if (!offset) return;
    offset.value = String(Math.max(0, Math.round((readNumber(root, '.media-lane-offset', 0) + deltaSec) * 1000) / 1000));
    offset.dispatchEvent(new Event('input', { bubbles: true }));
  });

  root.__mediaMixerListen = {
    getProject: () => project,
    exportSettings,
    importSettings,
    getWaveformSummary: () => base.getWaveformSummary?.() || project.elements[0]?.analysis?.waveformSummary || null,
    setZoom,
    setPan,
  };
  reflectProjectState();
  applyViewport();

  return {
    ...base,
    el: root,
    getProject: () => project,
    exportSettings,
    importSettings,
    destroy() {
      root.removeEventListener('input', onInput);
      root.removeEventListener('change', onChange);
      mediaEl.removeEventListener('loadedmetadata', onLoadedMetadata);
      zoomInput.removeEventListener('input', onZoomInput);
      panInput.removeEventListener('input', onPanInput);
      zoomOutBtn.removeEventListener('click', onZoomOut);
      zoomInBtn.removeEventListener('click', onZoomIn);
      detachDrag();
      delete root.__mediaMixerListen;
      base.destroy?.();
    },
  };
}

function smallButton(label, text) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'mmx-listen-tool';
  button.textContent = text;
  button.setAttribute('aria-label', label);
  return button;
}

function attachSourceMoveDrag(root, onMoveDelta) {
  const region = root.querySelector('.media-lane-trim');
  const surface = root.querySelector('.media-waveform-surface');
  if (!region || !surface) return () => {};
  let active = null;
  const onPointerDown = (event) => {
    if (event.button !== 0) return;
    active = {
      pointerId: event.pointerId,
      startX: event.clientX,
      width: Math.max(1, surface.getBoundingClientRect().width),
      duration: readTimelineDuration(root),
      lastDeltaSec: 0,
    };
    region.classList.add('mmx-source-moving');
    try {
      region.setPointerCapture?.(event.pointerId);
    } catch {
      // Synthetic smoke-test pointer events may not have an active pointer capture target.
    }
    event.preventDefault();
    event.stopPropagation();
  };
  const onPointerMove = (event) => {
    if (!active || event.pointerId !== active.pointerId) return;
    const deltaSec = ((event.clientX - active.startX) / active.width) * active.duration;
    const incremental = deltaSec - active.lastDeltaSec;
    active.lastDeltaSec = deltaSec;
    onMoveDelta(incremental);
    event.preventDefault();
    event.stopPropagation();
  };
  const finish = (event) => {
    if (!active || event.pointerId !== active.pointerId) return;
    region.classList.remove('mmx-source-moving');
    active = null;
    event.stopPropagation();
  };
  region.addEventListener('pointerdown', onPointerDown);
  region.addEventListener('pointermove', onPointerMove);
  region.addEventListener('pointerup', finish);
  region.addEventListener('pointercancel', finish);
  return () => {
    region.removeEventListener('pointerdown', onPointerDown);
    region.removeEventListener('pointermove', onPointerMove);
    region.removeEventListener('pointerup', finish);
    region.removeEventListener('pointercancel', finish);
  };
}

function readTimelineDuration(root) {
  const offset = readNumber(root, '.media-lane-offset', 0);
  const out = readNumber(root, '.media-lane-out', 0);
  return Math.max(0.001, offset + out);
}

function buildProject(mediaEl, intake) {
  const durationMs = Math.max(0, mediaDuration(mediaEl) * 1000);
  return createProjectFromAssetMetadata({
    id: 'asset-listen-source',
    name: intake.filename || intake.file?.name || 'Audio source',
    mime: intake.mime || intake.file?.type || '',
    size: intake.size || intake.file?.size || 0,
    lastModified: intake.file?.lastModified || null,
    capabilities: { hasAudio: true, hasVideo: false, hasImage: false },
    media: {
      durationMs,
      audioSampleRate: 0,
      audioChannels: 0,
    },
  }, {
    name: intake.filename || 'Audio listen',
    laneLabel: 'Source',
  });
}

function mediaDuration(mediaEl) {
  const value = Number(mediaEl.duration);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function readNumber(root, selector, fallback) {
  const value = Number(root.querySelector(selector)?.value);
  return Number.isFinite(value) ? value : fallback;
}

function setValue(root, selector, value) {
  const input = root.querySelector(selector);
  if (!input) return;
  input.value = String(Math.round(Number(value) * 1000) / 1000);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
