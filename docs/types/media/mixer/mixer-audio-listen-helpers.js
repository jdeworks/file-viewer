import { computeWaveformSummary } from '../waveform-data.js';
import {
  createProjectFromAssetMetadata,
  selectTarget,
  updateElement,
} from './mixer-model.js';
import { MIXER_LAYOUT } from './mixer-hit-test.js';

export function attachSourceMoveDrag(root, onMoveDelta) {
  let active = null;
  const onPointerDown = (event) => {
    const region = event.target?.closest?.('.media-lane-trim');
    const surface = root.querySelector('.media-waveform-surface');
    if (!region || !surface || event.button !== 0) return;
    active = {
      pointerId: event.pointerId,
      startX: event.clientX,
      width: Math.max(1, surface.getBoundingClientRect().width - MIXER_LAYOUT.gutterWidth),
      duration: Number(root.dataset.mixerDurationSec) || 1,
      lastDeltaSec: 0,
    };
    region.classList.add('mmx-source-moving');
    try { region.setPointerCapture?.(event.pointerId); } catch { /* synthetic events may not capture */ }
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
    root.querySelector('.media-lane-trim')?.classList.remove('mmx-source-moving');
    active = null;
    event.stopPropagation();
  };
  root.addEventListener('pointerdown', onPointerDown);
  root.addEventListener('pointermove', onPointerMove);
  root.addEventListener('pointerup', finish);
  root.addEventListener('pointercancel', finish);
  return () => {
    root.removeEventListener('pointerdown', onPointerDown);
    root.removeEventListener('pointermove', onPointerMove);
    root.removeEventListener('pointerup', finish);
    root.removeEventListener('pointercancel', finish);
  };
}

export async function decodeSummary(intake) {
  const file = intake.file || (intake.bytes ? new File([intake.bytes], intake.filename || 'audio') : null);
  if (!file) return null;
  const maxDecode = 96 * 1024 * 1024;
  const sliceBytes = 60 * 256 * 128;
  const source = file.size && file.size <= maxDecode ? file : file.slice(0, sliceBytes);
  const bytes = await source.arrayBuffer();
  const ac = new AudioContext();
  try {
    const buffer = await ac.decodeAudioData(bytes.slice(0));
    return plainSummary(computeWaveformSummary(buffer));
  } finally {
    ac.close().catch(() => {});
  }
}

// computeWaveformSummary returns Float32Arrays. When a summary is stored on the shared project
// model it gets JSON-cloned (cloneProject), which turns a Float32Array into a plain object with no
// `.length` — so any surface reading it back from the model (Mix/Compare) draws zero bars. Convert
// the typed arrays to plain arrays up front so they survive the clone.
function plainSummary(summary) {
  if (!summary) return summary;
  const toArr = (v) => (v && typeof v.length === 'number' ? Array.from(v) : v);
  return { ...summary, min: toArr(summary.min), max: toArr(summary.max), rms: toArr(summary.rms), peak: toArr(summary.peak) };
}

export function buildProject(mediaEl, intake) {
  const durationMs = Math.max(0, mediaDuration(mediaEl) * 1000);
  return createProjectFromAssetMetadata({
    id: 'asset-listen-source',
    name: intake.filename || intake.file?.name || 'Audio source',
    mime: intake.mime || intake.mimeType || intake.file?.type || '',
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

export function mergeDuration(project, durationMs) {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return project;
  const id = project.elements[0]?.id;
  const next = {
    ...project,
    project: { ...project.project, durationMs },
  };
  return id ? updateElement(next, id, (element) => ({
    ...element,
    durationMs,
    rawDurationMs: durationMs,
    timeline: {
      ...element.timeline,
      durationMs,
      rawDurationMs: durationMs,
      placementDurationMs: durationMs,
      sourceOutMs: durationMs,
    },
  })) : next;
}

export function selectFirstElement(project) {
  const id = project.elements[0]?.id;
  return id ? selectTarget(project, { type: 'element', id }, [{ type: 'element', id }]) : project;
}

export function mediaDuration(mediaEl) {
  const value = Number(mediaEl.duration);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function fmtTime(value) {
  const total = Math.max(0, Math.floor(Number(value) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export function clampZoom(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0.08;
  return Math.max(0.02, Math.min(0.8, n));
}

export function createButton(text, label, className) {
  const node = document.createElement('button');
  node.type = 'button';
  node.className = className;
  node.textContent = text;
  node.setAttribute('aria-label', label);
  return node;
}

export function aliasInput(root, selector, className) {
  const input = root.querySelector(selector);
  if (input) input.classList.add(className);
}

export function decorateRoomTone(body, element) {
  if (!body) return;
  const layer = document.createElement('div');
  layer.className = 'media-lane-room-tone';
  layer.hidden = !element?.audio?.roomTone;
  body.append(layer);
}

export function decorateChapters(body, chapters, totalMs) {
  if (!body) return;
  const layer = document.createElement('div');
  layer.className = 'media-wv-chapter-layer';
  for (const [index, chapter] of chapters.entries()) {
    const marker = document.createElement('div');
    marker.className = 'media-wv-chapter-marker';
    marker.title = chapter.title || `Chapter ${index + 1}`;
    marker.dataset.chapter = String(index + 1);
    marker.style.left = `${(Math.max(0, Number(chapter.start) || 0) * 1000 / Math.max(1, totalMs)) * 100}%`;
    const label = document.createElement('span');
    label.className = 'media-wv-chapter-label';
    label.textContent = marker.title;
    marker.append(label);
    layer.append(marker);
  }
  body.append(layer);
}
