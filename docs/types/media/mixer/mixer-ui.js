import {
  createProjectFromAssetMetadata,
  selectTarget,
  trimElement,
  updateElement,
} from './mixer-model.js';
import { createMixerSnapshot, renderMixerShell } from './mixer-renderer.js';
import { attachMixerInteractions } from './mixer-interactions.js';
import { updateVideoFilterEffect } from './mixer-audio-multi-helpers.js';

export function mountMediaMixerShell(root, options = {}) {
  ensureMixerStyles();
  let project = options.project || createFakeMixerProject();
  let viewport = {
    cursorMs: options.cursorMs || 0,
    scrollLeft: options.scrollLeft || 0,
    pxPerMs: options.pxPerMs || 0.08,
    width: root?.clientWidth || 960,
  };
  let snapshot = createMixerSnapshot(project);
  let currentRender = null;

  const render = () => {
    snapshot = createMixerSnapshot(project);
    currentRender = renderMixerShell(root, snapshot, viewport, options);
  };

  const dispatch = (action) => {
    if (action.type === 'seek') viewport = { ...viewport, cursorMs: action.cursorMs };
    if (action.type === 'zoom') viewport = { ...viewport, pxPerMs: clampZoom(action.pxPerMs) };
    if (action.type === 'zoom-relative') viewport = { ...viewport, pxPerMs: clampZoom(viewport.pxPerMs * action.factor) };
    if (action.type === 'pan') viewport = { ...viewport, scrollLeft: Math.max(0, Number(action.scrollLeft) || 0) };
    if (action.type === 'fit') viewport = { ...viewport, scrollLeft: 0, pxPerMs: 0.08 };
    if (action.type === 'select') project = selectTarget(project, action.target, [action.target]);
    if (action.type === 'update-element') project = updateProjectElementField(project, action);
    render();
    options.onChange?.({ action, project, viewport, snapshot });
  };

  render();
  const interactions = attachMixerInteractions(root, () => ({ project, snapshot, viewport }), dispatch);
  return {
    getProject: () => project,
    getViewport: () => viewport,
    getSnapshot: () => snapshot,
    dispatch,
    destroy() {
      interactions.destroy();
      root.replaceChildren();
      if (currentRender) currentRender = null;
    },
  };
}

export function createFakeMixerProject() {
  let project = createProjectFromAssetMetadata({
    id: 'asset-stage2-audio',
    name: 'Stage 2 audio source',
    mime: 'audio/wav',
    size: 2048,
    capabilities: { hasAudio: true },
    media: { durationMs: 9000, audioSampleRate: 48000, audioChannels: 2 },
  }, { name: 'Stage 2 modular mixer' });
  const waveformSummary = createFakeWaveformSummary(9);
  project = {
    ...project,
    lanes: [
      project.lanes[0],
      {
        id: 'lane-stage2-image',
        label: 'Image Overlay',
        role: 'image',
        order: 1,
        height: 78,
        locked: false,
        collapsed: false,
        muted: false,
        solo: false,
        visible: true,
        color: '#54a24b',
        audio: project.lanes[0].audio,
        video: { opacity: 1, blendMode: 'normal' },
      },
    ],
    elements: [
      {
        ...project.elements[0],
        analysis: {
          ...project.elements[0].analysis,
          waveformSummary,
        },
      },
      {
        id: 'element-stage2-image',
        laneId: 'lane-stage2-image',
        assetId: 'asset-stage2-image',
        type: 'image',
        capabilities: { hasAudio: false, hasVideo: false, hasImage: true },
        timeline: {
          startMs: 2200,
          durationMs: 3600,
          rawDurationMs: 0,
          placementDurationMs: 3600,
          sourceInMs: 0,
          sourceOutMs: 3600,
          speed: 1,
          reversed: false,
        },
        audio: { gain: 1, pan: 0, fadeInMs: 0, fadeOutMs: 0, roomTone: null, eq: project.elements[0].audio.eq },
        visual: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 0.85, crop: null, anchor: 'center' },
        analysis: {},
        keyframes: [],
        effects: [],
      },
    ],
  };
  project.project.durationMs = 9000;
  return project;
}

export function ensureMixerStyles() {
  if (document.querySelector('link[data-media-mixer-styles]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./mixer-styles.css', import.meta.url).href;
  link.dataset.mediaMixerStyles = 'true';
  document.head.append(link);
}

function clampZoom(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0.08;
  return Math.max(0.02, Math.min(0.4, n));
}

function updateProjectElementField(project, action) {
  const elementId = action.elementId;
  const value = Number(action.value);
  if (!elementId || !Number.isFinite(value)) return project;
  if (action.field === 'start') {
    return updateElement(project, elementId, (element) => ({
      ...element,
      timeline: { ...element.timeline, startMs: Math.max(0, value * 1000) },
    }));
  }
  if (action.field === 'source-in') return trimElement(project, elementId, { sourceInMs: value * 1000 });
  if (action.field === 'source-out') return trimElement(project, elementId, { sourceOutMs: value * 1000 });
  if (action.field === 'gain') {
    return updateElement(project, elementId, (element) => ({
      ...element,
      audio: { ...element.audio, gain: Math.max(0, Math.min(2, value)) },
    }));
  }
  if (action.field === 'fade-in') {
    return updateElement(project, elementId, (element) => ({
      ...element,
      audio: { ...element.audio, fadeInMs: Math.max(0, value) },
    }));
  }
  if (action.field === 'fade-out') {
    return updateElement(project, elementId, (element) => ({
      ...element,
      audio: { ...element.audio, fadeOutMs: Math.max(0, value) },
    }));
  }
  if (action.field?.startsWith('effect-')) {
    return updateElement(project, elementId, (element) => updateVideoFilterEffect(element, action.field, value));
  }
  if (action.field?.startsWith('visual-')) {
    const visualField = {
      'visual-x': 'x',
      'visual-y': 'y',
      'visual-scale-x': 'scaleX',
      'visual-scale-y': 'scaleY',
      'visual-rotation': 'rotation',
      'visual-opacity': 'opacity',
      'visual-fade-in': 'fadeInMs',
      'visual-fade-out': 'fadeOutMs',
    }[action.field];
    if (!visualField) return project;
    const nextValue = visualField === 'opacity'
      ? Math.max(0, Math.min(1, value))
      : visualField === 'fadeInMs' || visualField === 'fadeOutMs'
        ? Math.max(0, value)
        : value;
    return updateElement(project, elementId, (element) => ({
      ...element,
      visual: {
        ...element.visual,
        [visualField]: nextValue,
      },
    }));
  }
  return project;
}

function createFakeWaveformSummary(durationSec) {
  const peaksPerSecond = 20;
  const buckets = durationSec * peaksPerSecond;
  const min = new Float32Array(buckets);
  const max = new Float32Array(buckets);
  const rms = new Float32Array(buckets);
  const peak = new Float32Array(buckets);
  for (let i = 0; i < buckets; i += 1) {
    const t = i / peaksPerSecond;
    const level = 0.15 + Math.abs(Math.sin(t * 3.2)) * 0.65;
    min[i] = -level * (0.75 + Math.sin(t * 1.7) * 0.15);
    max[i] = level * (0.75 + Math.cos(t * 1.3) * 0.15);
    rms[i] = level * 0.42;
    peak[i] = Math.max(Math.abs(min[i]), Math.abs(max[i]));
  }
  return {
    min,
    max,
    rms,
    peak,
    buckets,
    peaksPerSecond,
    duration: durationSec,
    sampleRate: 48000,
  };
}
