import { MIXER_LIMITS } from './mixer-config.js';
import { addAsset, addElement, addLane, updateAsset, updateElement } from './mixer-model.js';

const AUDIO_EXT = /\.(wav|wave|mp3|m4a|aac|flac|ogg|oga|opus|webm)$/i;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i;
const VIDEO_EXT = /\.(mp4|m4v|webm|ogv|mov|mkv|avi|wmv|flv|ts|m2ts|m2v|asf|divx|vob|3gp|f4v)$/i;
const NATIVE_VIDEO_EXT = /\.(mp4|m4v|webm|ogv|mov)$/i;

export function hasMixerFileDrop(dataTransfer) {
  if (!dataTransfer) return false;
  if ([...(dataTransfer.files || [])].some(isMixerDropFile)) return true;
  return [...(dataTransfer.items || [])].some((item) => item.kind === 'file' && isMixerMime(item.type));
}

export function isMixerDropFile(file) {
  return classifyMixerFile(file).kind !== 'unknown';
}

export function classifyMixerFile(file) {
  if (!file) return { kind: 'unknown', capabilities: {} };
  const mime = String(file.type || '').toLowerCase();
  const name = String(file.name || '');
  if (/^video\//.test(mime)) return videoClassification(mime, name);
  if (/^audio\//.test(mime)) return { kind: 'audio', capabilities: { hasAudio: true } };
  if (/^image\//.test(mime)) return { kind: 'image', capabilities: { hasImage: true } };
  if (IMAGE_EXT.test(name)) return { kind: 'image', capabilities: { hasImage: true } };
  if (VIDEO_EXT.test(name)) return videoClassification(mime, name);
  if (AUDIO_EXT.test(name)) return { kind: 'audio', capabilities: { hasAudio: true } };
  return { kind: 'unknown', capabilities: {} };
}

function videoClassification(mime, name) {
    const needsFfmpegForPreview = !(/^video\/(mp4|webm|ogg|quicktime)/.test(mime) || NATIVE_VIDEO_EXT.test(name));
    return { kind: 'video', capabilities: { hasAudio: true, hasVideo: true, needsFfmpegForPreview } };
}

export function addDroppedMediaFile(project, file, options = {}) {
  const classification = classifyMixerFile(file);
  if (classification.kind === 'unknown') return null;
  const assetId = `asset-drop-${Date.now()}-${project.assets.length + 1}`;
  const laneId = `lane-drop-${Date.now()}-${project.lanes.length + 1}`;
  const durationMs = defaultDurationMs(classification.kind);
  let next = addAsset(project, {
    id: assetId,
    name: file.name || `Dropped ${classification.kind}`,
    mime: file.type || '',
    size: file.size || 0,
    lastModified: file.lastModified || null,
    capabilities: classification.capabilities,
    media: mediaDefaults(classification.kind, durationMs),
    status: classification.capabilities.needsFfmpegForPreview ? 'needs-proxy' : 'available',
  });
  next = addLane(next, {
    id: laneId,
    role: classification.kind,
    label: file.name || `Dropped ${classification.kind}`,
    order: project.lanes.length,
  });
  next = addElement(next, {
    laneId,
    assetId,
    capabilities: classification.capabilities,
    type: classification.kind,
    startMs: Math.max(0, Number(options.startMs) || 0),
    durationMs,
    rawDurationMs: classification.kind === 'image' ? durationMs : 0,
    visual: classification.kind === 'audio' ? undefined : { opacity: 1 },
  });
  return {
    project: next,
    assetId,
    laneId,
    elementId: next.elements[next.elements.length - 1]?.id || null,
    kind: classification.kind,
  };
}

export function applyDroppedAudioSummary(project, assetId, elementId, summary) {
  if (!summary) return project;
  const durationMs = Math.max(1, Math.round((summary.duration || 0) * 1000));
  let next = updateAsset(project, assetId, (asset) => ({
    ...asset,
    media: {
      ...asset.media,
      durationMs,
      audioSampleRate: summary.sampleRate || asset.media.audioSampleRate,
    },
  }));
  next = updateElement(next, elementId, (element) => ({
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
    analysis: { ...element.analysis, waveformSummary: summary },
  }));
  return next;
}

export function applyDroppedVisualMetadata(project, assetId, elementId, metadata = {}) {
  const durationMs = metadata.durationMs > 0 ? Math.round(metadata.durationMs) : null;
  let next = updateAsset(project, assetId, (asset) => ({
    ...asset,
    media: {
      ...asset.media,
      durationMs: durationMs ?? asset.media.durationMs,
      videoWidth: Math.max(0, Math.round(metadata.width || asset.media.videoWidth || 0)),
      videoHeight: Math.max(0, Math.round(metadata.height || asset.media.videoHeight || 0)),
      frameRate: Math.max(0, Number(metadata.frameRate || asset.media.frameRate || 0)),
    },
    status: asset.capabilities?.needsFfmpegForPreview ? asset.status : (metadata.status || asset.status),
  }));
  if (durationMs) {
    next = updateElement(next, elementId, (element) => ({
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
    }));
  }
  return next;
}

export function probeDroppedVisualMetadata(file, kind) {
  if (kind === 'image') return probeImageMetadata(file);
  if (kind === 'video') return probeVideoMetadata(file);
  return Promise.resolve(null);
}

function isMixerMime(mime = '') {
  return /^(audio|image|video)\//i.test(mime);
}

function defaultDurationMs(kind) {
  if (kind === 'image') return MIXER_LIMITS.defaultImageDurationMs;
  return 1000;
}

function mediaDefaults(kind, durationMs) {
  if (kind === 'image') return { durationMs, videoWidth: 0, videoHeight: 0, frameRate: 0 };
  if (kind === 'video') return { durationMs: 0, videoWidth: 0, videoHeight: 0, frameRate: 0, audioSampleRate: 0, audioChannels: 0 };
  return { durationMs: 0, audioSampleRate: 0, audioChannels: 0 };
}

function probeImageMetadata(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    const cleanup = () => URL.revokeObjectURL(url);
    img.onload = () => {
      const width = img.naturalWidth || img.width || 0;
      const height = img.naturalHeight || img.height || 0;
      cleanup();
      resolve({ width, height, status: width && height ? 'available' : 'metadata-unavailable' });
    };
    img.onerror = () => {
      cleanup();
      resolve({ status: 'metadata-unavailable' });
    };
    img.src = url;
  });
}

function probeVideoMetadata(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    const done = (metadata) => {
      URL.revokeObjectURL(url);
      video.removeAttribute('src');
      video.load?.();
      resolve(metadata);
    };
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => done({
      durationMs: Number.isFinite(video.duration) ? video.duration * 1000 : 0,
      width: video.videoWidth || 0,
      height: video.videoHeight || 0,
      status: 'available',
    });
    video.onerror = () => done({ status: 'metadata-unavailable' });
    video.src = url;
    video.load();
  });
}
