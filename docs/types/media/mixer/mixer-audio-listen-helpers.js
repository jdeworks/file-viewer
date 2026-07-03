import { computeWaveformSummary } from '../waveform-data.js';
import {
  createProjectFromAssetMetadata,
  selectTarget,
  updateElement,
} from './mixer-model.js';

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

