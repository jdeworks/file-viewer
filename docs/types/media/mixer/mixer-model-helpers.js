// Private helpers for the modular mixer project model (mixer-model.js). These are pure
// normalizers, derivation utilities, and id/clone primitives kept out of the model surface so the
// public factory/mutation API stays focused. Not part of the public mixer API — import from
// mixer-model.js instead.
import { MIXER_LIMITS, clampNumber, nowIso } from './mixer-config.js';

let nextId = 1;

export function recomputeDuration(project) {
  const duration = project.elements.reduce((max, element) => (
    Math.max(max, element.timeline.startMs + element.timeline.placementDurationMs)
  ), 0);
  project.project.durationMs = duration;
  return project;
}

export function touch(project) {
  project.updatedAt = nowIso();
  return project;
}

export function resolveCompareTarget(project, target) {
  if (!target?.elementId) return null;
  const element = project.elements.find((item) => item.id === target.elementId);
  if (!element) return null;
  const rangeStartMs = Math.max(0, finiteNumber(target.rangeStartMs, element.timeline.startMs));
  const rangeEndMs = Math.max(rangeStartMs, finiteNumber(target.rangeEndMs, element.timeline.startMs + element.timeline.durationMs));
  return {
    elementId: element.id,
    rangeStartMs,
    rangeEndMs,
    offsetMs: finiteNumber(target.offsetMs, 0),
  };
}

export function normalizeCompareTarget(target = {}) {
  return {
    elementId: target.elementId || null,
    rangeStartMs: Math.max(0, finiteNumber(target.rangeStartMs, 0)),
    rangeEndMs: Math.max(0, finiteNumber(target.rangeEndMs, 0)),
    offsetMs: finiteNumber(target.offsetMs, 0),
  };
}

export function descriptor(role, accepts, inspectorSections) {
  return {
    role,
    accepts,
    derived: false,
    defaultHeight: role === 'room-tone' ? 56 : 88,
    canPlay: !!accepts.audio,
    canExport: true,
    inspectorSections,
  };
}

export function normalizeCapabilities(input = {}) {
  return {
    hasAudio: !!input.hasAudio,
    hasVideo: !!input.hasVideo,
    hasImage: !!input.hasImage,
    hasText: !!input.hasText,
    nativePreview: input.nativePreview ?? true,
    needsFfmpegForPreview: !!input.needsFfmpegForPreview,
    needsFfmpegForExport: !!input.needsFfmpegForExport,
  };
}

export function normalizeElementEffects(effects = [], elementId = null) {
  if (!Array.isArray(effects)) return [];
  return effects.map((effect) => ({
    id: effect.id || makeId('effect'),
    targetType: effect.targetType || 'element',
    targetId: effect.targetId || elementId,
    kind: effect.kind || 'custom',
    enabled: effect.enabled !== false,
    params: clone(effect.params || {}),
    keyframes: Array.isArray(effect.keyframes) ? clone(effect.keyframes) : [],
  }));
}

export function keyframeValuesFor(element, paths = null) {
  const requested = new Set(Array.isArray(paths) ? paths : []);
  const include = (path) => !requested.size || requested.has(path);
  const values = [];
  const add = (path, value) => {
    if (include(path)) values.push({ path, value });
  };
  add('visual.x', finiteNumber(element.visual?.x, 0));
  add('visual.y', finiteNumber(element.visual?.y, 0));
  add('visual.scaleX', finiteNumber(element.visual?.scaleX, 1));
  add('visual.scaleY', finiteNumber(element.visual?.scaleY, 1));
  add('visual.rotation', finiteNumber(element.visual?.rotation, 0));
  add('visual.opacity', clampNumber(element.visual?.opacity, 0, 1, 1));
  if (element.visual?.crop) add('visual.crop', normalizeVisualCrop(element.visual.crop));
  const filter = (element.effects || []).find((effect) => effect.kind === 'video-filter' && effect.enabled !== false);
  if (filter?.params) add('effect.video-filter.params', clone(filter.params));
  return values;
}

export function safeKeyPath(path) {
  return String(path || 'value').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'value';
}

export function normalizeTransition(transition = {}) {
  return {
    id: transition.id || makeId('transition'),
    kind: transition.kind || 'dissolve',
    enabled: transition.enabled !== false,
    fromElementId: transition.fromElementId || null,
    toElementId: transition.toElementId || transition.targetId || null,
    durationMs: Math.max(0, finiteNumber(transition.durationMs, 0)),
    offsetMs: finiteNumber(transition.offsetMs, 0),
    params: clone(transition.params || {}),
  };
}

export function normalizeVisualCrop(crop) {
  if (!crop) return null;
  const x = clampNumber(crop.x, 0, 0.99, 0);
  const y = clampNumber(crop.y, 0, 0.99, 0);
  const width = clampNumber(crop.width, 0.01, 1 - x, 1 - x);
  const height = clampNumber(crop.height, 0.01, 1 - y, 1 - y);
  if (x <= 0 && y <= 0 && width >= 1 && height >= 1) return null;
  return { x, y, width, height };
}

export function existingTransition(project, elementId) {
  return (project.transitions || []).find((transition) => transition.toElementId === elementId) || null;
}

export function findPreviousVisualElement(project, element) {
  const start = finiteNumber(element.timeline?.startMs, 0);
  return (project.elements || [])
    .filter((item) => item.id !== element.id && item.laneId === element.laneId && (item.capabilities?.hasVideo || item.capabilities?.hasImage))
    .filter((item) => finiteNumber(item.timeline?.startMs, 0) <= start)
    .sort((a, b) => finiteNumber(b.timeline?.startMs, 0) - finiteNumber(a.timeline?.startMs, 0))[0] || null;
}

export function laneRoleForAsset(asset) {
  if (asset.capabilities.hasVideo) return 'video';
  if (asset.capabilities.hasImage) return 'image';
  if (asset.capabilities.hasAudio) return 'audio';
  return 'source';
}

export function typeForCapabilities(caps) {
  if (caps.hasVideo) return 'video';
  if (caps.hasImage) return 'image';
  if (caps.hasAudio) return 'audio';
  return 'generated';
}

export function defaultDurationForCaps(caps) {
  return caps.hasImage ? MIXER_LIMITS.defaultImageDurationMs : 0;
}

export function labelForRole(role) {
  return role.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

export function colorForRole(role) {
  const colors = {
    source: '#4c78a8',
    audio: '#4c78a8',
    video: '#7a5cbd',
    image: '#54a24b',
    music: '#f58518',
    sfx: '#e45756',
    'room-tone': '#b279a2',
    generated: '#72b7b2',
    compare: '#ff9da6',
  };
  return colors[role] || colors.source;
}

export function finiteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function positiveNumber(value, fallback = 0) {
  const n = finiteNumber(value, fallback);
  return n > 0 ? n : fallback;
}

export function makeId(prefix) {
  nextId += 1;
  return `${prefix}-${nextId}`;
}

export function clone(value) {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}
