import { MIXER_LIMITS, MIXER_PROJECT_SCHEMA, MIXER_PROJECT_VERSION, clampNumber, nowIso } from './mixer-config.js';
import { createDefaultEq, createDefaultMaster, normalizeEq } from './mixer-eq-schema.js';

let nextId = 1;

export const LANE_DESCRIPTORS = Object.freeze({
  source: descriptor('source', { audio: true, video: true, image: true }, ['timing', 'audio', 'visual', 'eq']),
  audio: descriptor('audio', { audio: true, video: false, image: false }, ['timing', 'audio', 'eq']),
  video: descriptor('video', { audio: true, video: true, image: false }, ['timing', 'audio', 'visual']),
  image: descriptor('image', { audio: false, video: false, image: true }, ['timing', 'visual']),
  music: descriptor('music', { audio: true, video: false, image: false }, ['timing', 'audio', 'eq']),
  sfx: descriptor('sfx', { audio: true, video: false, image: false }, ['timing', 'audio']),
  'room-tone': {
    ...descriptor('room-tone', { audio: true, video: false, image: false }, ['timing', 'audio']),
    derived: true,
    derivesFrom: ['source', 'audio'],
  },
  generated: descriptor('generated', { audio: true, video: true, image: true }, ['timing', 'audio', 'visual']),
  compare: descriptor('compare', { audio: true, video: true, image: true }, ['timing', 'compare']),
});

export function createProject({ id, name = 'Untitled media mix', fps, sampleRate, channels, background } = {}) {
  const ts = nowIso();
  return {
    schema: MIXER_PROJECT_SCHEMA,
    version: MIXER_PROJECT_VERSION,
    createdAt: ts,
    updatedAt: ts,
    project: {
      id: id || makeId('project'),
      name,
      durationMs: 0,
      fps: positiveNumber(fps, MIXER_LIMITS.defaultFps),
      sampleRate: positiveNumber(sampleRate, MIXER_LIMITS.defaultSampleRate),
      channels: positiveNumber(channels, MIXER_LIMITS.defaultChannels),
      background: background || '#000000',
    },
    assets: [],
    lanes: [],
    elements: [],
    effects: [],
    transitions: [],
    markers: [],
    selection: { primary: null, items: [], range: null },
    compare: { a: null, b: null, view: 'stacked', overlayOpacity: 0.5, normalizeAudio: false, analysisRange: null },
    master: createDefaultMaster({ video: { fps, background } }),
    requiredCapabilities: [],
    optionalCapabilities: [],
    lastKnownCapabilities: {},
  };
}

export function createAsset(metadata = {}) {
  const capabilities = normalizeCapabilities(metadata.capabilities || metadata);
  return {
    id: metadata.id || makeId('asset'),
    kind: metadata.kind || 'file',
    name: metadata.name || 'Untitled asset',
    mime: metadata.mime || metadata.type || '',
    size: finiteNumber(metadata.size, 0),
    lastModified: metadata.lastModified ?? null,
    hash: metadata.hash || null,
    capabilities,
    media: {
      durationMs: positiveNumber(metadata.media?.durationMs ?? metadata.durationMs, 0),
      audioSampleRate: positiveNumber(metadata.media?.audioSampleRate ?? metadata.audioSampleRate, 0),
      audioChannels: positiveNumber(metadata.media?.audioChannels ?? metadata.audioChannels, 0),
      videoWidth: positiveNumber(metadata.media?.videoWidth ?? metadata.videoWidth, 0),
      videoHeight: positiveNumber(metadata.media?.videoHeight ?? metadata.videoHeight, 0),
      frameRate: positiveNumber(metadata.media?.frameRate ?? metadata.frameRate, 0),
    },
    status: metadata.status || 'available',
  };
}

export function createLane(input = {}) {
  const role = input.role || 'source';
  return {
    id: input.id || makeId('lane'),
    label: input.label || labelForRole(role),
    role,
    order: finiteNumber(input.order, 0),
    height: positiveNumber(input.height, LANE_DESCRIPTORS[role]?.defaultHeight || 88),
    locked: !!input.locked,
    collapsed: !!input.collapsed,
    muted: !!input.muted,
    solo: !!input.solo,
    visible: input.visible ?? true,
    color: input.color || colorForRole(role),
    audio: {
      gain: finiteNumber(input.audio?.gain, 1),
      pan: finiteNumber(input.audio?.pan, 0),
      eq: normalizeEq(input.audio?.eq),
      sends: Array.isArray(input.audio?.sends) ? clone(input.audio.sends) : [],
    },
    video: {
      opacity: clampNumber(input.video?.opacity, 0, 1, 1),
      blendMode: input.video?.blendMode || 'normal',
    },
  };
}

export function createElement(input = {}) {
  const caps = normalizeCapabilities(input.capabilities || input);
  const rawDuration = positiveNumber(input.timeline?.rawDurationMs ?? input.rawDurationMs ?? input.durationMs, 0);
  const duration = positiveNumber(input.timeline?.durationMs ?? input.durationMs, rawDuration || defaultDurationForCaps(caps));
  const sourceIn = Math.max(0, finiteNumber(input.timeline?.sourceInMs ?? input.sourceInMs, 0));
  const sourceOut = positiveNumber(input.timeline?.sourceOutMs ?? input.sourceOutMs, rawDuration || sourceIn + duration);
  const type = input.type || typeForCapabilities(caps);
  return {
    id: input.id || makeId('element'),
    laneId: input.laneId || null,
    assetId: input.assetId || null,
    type,
    capabilities: caps,
    timeline: {
      startMs: Math.max(0, finiteNumber(input.timeline?.startMs ?? input.startMs, 0)),
      durationMs: duration,
      rawDurationMs: rawDuration,
      placementDurationMs: positiveNumber(input.timeline?.placementDurationMs ?? input.placementDurationMs, duration),
      sourceInMs: sourceIn,
      sourceOutMs: Math.max(sourceIn, sourceOut),
      speed: positiveNumber(input.timeline?.speed ?? input.speed, 1),
      reversed: !!(input.timeline?.reversed ?? input.reversed),
    },
    audio: {
      gain: finiteNumber(input.audio?.gain, 1),
      pan: finiteNumber(input.audio?.pan, 0),
      fadeInMs: Math.max(0, finiteNumber(input.audio?.fadeInMs, 0)),
      fadeOutMs: Math.max(0, finiteNumber(input.audio?.fadeOutMs, 0)),
      roomTone: input.audio?.roomTone || null,
      eq: normalizeEq(input.audio?.eq),
    },
    visual: {
      x: finiteNumber(input.visual?.x, 0),
      y: finiteNumber(input.visual?.y, 0),
      scaleX: finiteNumber(input.visual?.scaleX, 1),
      scaleY: finiteNumber(input.visual?.scaleY, 1),
      rotation: finiteNumber(input.visual?.rotation, 0),
      opacity: clampNumber(input.visual?.opacity, 0, 1, 1),
      crop: input.visual?.crop || null,
      anchor: input.visual?.anchor || 'center',
    },
    analysis: clone(input.analysis || {}),
    keyframes: Array.isArray(input.keyframes) ? clone(input.keyframes) : [],
    effects: Array.isArray(input.effects) ? clone(input.effects) : [],
  };
}

export function createGeneratedElement(input = {}) {
  return createElement({
    ...input,
    assetId: input.assetId || null,
    type: 'generated',
    capabilities: {
      hasAudio: input.kind !== 'color-matte',
      hasVideo: input.kind === 'color-matte',
      hasImage: input.kind === 'color-matte',
    },
    audio: {
      ...input.audio,
      roomTone: input.audio?.roomTone || {
        kind: input.kind || 'pink-noise',
        levelDb: finiteNumber(input.levelDb, -45),
      },
    },
  });
}

export function createProjectFromAssetMetadata(metadata = {}, options = {}) {
  const asset = createAsset(metadata);
  const project = createProject({
    name: options.name || asset.name,
    fps: asset.media.frameRate || options.fps,
    sampleRate: asset.media.audioSampleRate || options.sampleRate,
    channels: asset.media.audioChannels || options.channels,
  });
  const lane = createLane({
    role: laneRoleForAsset(asset),
    label: options.laneLabel || 'Source',
    order: 0,
  });
  const element = createElement({
    laneId: lane.id,
    assetId: asset.id,
    capabilities: asset.capabilities,
    type: typeForCapabilities(asset.capabilities),
    durationMs: asset.media.durationMs || defaultDurationForCaps(asset.capabilities),
    rawDurationMs: asset.media.durationMs || 0,
  });
  return addElement(addLane(addAsset(project, asset), lane), element);
}

export function addAsset(project, assetInput) {
  const next = cloneProject(project);
  next.assets.push(createAsset(assetInput));
  return touch(next);
}

export function addLane(project, laneInput) {
  const next = cloneProject(project);
  next.lanes.push(createLane({ ...laneInput, order: laneInput.order ?? next.lanes.length }));
  next.lanes.sort((a, b) => a.order - b.order);
  return touch(next);
}

export function addElement(project, elementInput) {
  const next = cloneProject(project);
  next.elements.push(createElement(elementInput));
  return touch(recomputeDuration(next));
}

export function updateElement(project, elementId, updater) {
  const next = cloneProject(project);
  next.elements = next.elements.map((element) => {
    if (element.id !== elementId) return element;
    return createElement(typeof updater === 'function' ? updater(clone(element)) : { ...element, ...updater });
  });
  return touch(recomputeDuration(next));
}

export function moveElement(project, elementId, startMs, laneId) {
  return updateElement(project, elementId, (element) => ({
    ...element,
    laneId: laneId || element.laneId,
    timeline: {
      ...element.timeline,
      startMs: Math.max(0, finiteNumber(startMs, element.timeline.startMs)),
    },
  }));
}

export function trimElement(project, elementId, { sourceInMs, sourceOutMs, startMs } = {}) {
  return updateElement(project, elementId, (element) => {
    const rawDuration = positiveNumber(element.timeline.rawDurationMs, element.timeline.durationMs);
    const sourceIn = Math.max(0, Math.min(rawDuration, finiteNumber(sourceInMs, element.timeline.sourceInMs)));
    const sourceOut = Math.max(sourceIn, Math.min(rawDuration || Infinity, finiteNumber(sourceOutMs, element.timeline.sourceOutMs)));
    const duration = Math.max(0, (sourceOut - sourceIn) / positiveNumber(element.timeline.speed, 1));
    return {
      ...element,
      timeline: {
        ...element.timeline,
        startMs: startMs == null ? element.timeline.startMs : Math.max(0, finiteNumber(startMs, element.timeline.startMs)),
        sourceInMs: sourceIn,
        sourceOutMs: sourceOut,
        durationMs: duration,
        placementDurationMs: duration,
      },
    };
  });
}

export function setElementPlacementDuration(project, elementId, placementDurationMs) {
  return updateElement(project, elementId, (element) => ({
    ...element,
    timeline: {
      ...element.timeline,
      placementDurationMs: Math.max(0, finiteNumber(placementDurationMs, element.timeline.placementDurationMs)),
    },
  }));
}

export function splitElement(project, elementId, splitAtMs) {
  const element = project.elements.find((item) => item.id === elementId);
  if (!element) return cloneProject(project);
  const splitAt = finiteNumber(splitAtMs, element.timeline.startMs);
  const local = splitAt - element.timeline.startMs;
  if (local <= 0 || local >= element.timeline.durationMs) return cloneProject(project);
  const speed = positiveNumber(element.timeline.speed, 1);
  const leftSourceOut = element.timeline.sourceInMs + local * speed;
  const rightSourceIn = leftSourceOut;
  const left = createElement({
    ...element,
    id: element.id,
    timeline: {
      ...element.timeline,
      sourceOutMs: leftSourceOut,
      durationMs: local,
      placementDurationMs: local,
    },
  });
  const rightDuration = element.timeline.durationMs - local;
  const right = createElement({
    ...element,
    id: makeId('element'),
    timeline: {
      ...element.timeline,
      startMs: splitAt,
      sourceInMs: rightSourceIn,
      durationMs: rightDuration,
      placementDurationMs: rightDuration,
    },
  });
  const next = cloneProject(project);
  next.elements = next.elements.flatMap((item) => (item.id === elementId ? [left, right] : [item]));
  return touch(recomputeDuration(next));
}

export function selectTarget(project, target, items = []) {
  const next = cloneProject(project);
  next.selection = { ...next.selection, primary: target || null, items: clone(items) };
  return touch(next);
}

export function setCompareTarget(project, side, target) {
  if (side !== 'a' && side !== 'b') throw new Error('Compare side must be "a" or "b".');
  const next = cloneProject(project);
  next.compare = { ...next.compare, [side]: normalizeCompareTarget(target) };
  return touch(next);
}

export function computeCompareOverlap(project, compare = project.compare) {
  const a = resolveCompareTarget(project, compare?.a);
  const b = resolveCompareTarget(project, compare?.b);
  if (!a || !b) return { hasOverlap: false, overlap: { startMs: 0, endMs: 0, durationMs: 0 }, a, b };
  const aStart = a.rangeStartMs + a.offsetMs;
  const aEnd = a.rangeEndMs + a.offsetMs;
  const bStart = b.rangeStartMs + b.offsetMs;
  const bEnd = b.rangeEndMs + b.offsetMs;
  const startMs = Math.max(aStart, bStart);
  const endMs = Math.min(aEnd, bEnd);
  const durationMs = Math.max(0, endMs - startMs);
  return {
    hasOverlap: durationMs > 0,
    overlap: { startMs, endMs: durationMs > 0 ? endMs : startMs, durationMs },
    a,
    b,
    offsetDeltaMs: b.offsetMs - a.offsetMs,
  };
}

export function cloneProject(project) {
  return normalizeProject(project);
}

export function normalizeProject(project = {}) {
  const base = createProject(project.project || {});
  const next = {
    ...base,
    ...clone(project),
    schema: MIXER_PROJECT_SCHEMA,
    version: MIXER_PROJECT_VERSION,
    project: { ...base.project, ...(project.project || {}) },
    assets: Array.isArray(project.assets) ? project.assets.map(createAsset) : [],
    lanes: Array.isArray(project.lanes) ? project.lanes.map(createLane) : [],
    elements: Array.isArray(project.elements) ? project.elements.map(createElement) : [],
    effects: Array.isArray(project.effects) ? clone(project.effects) : [],
    transitions: Array.isArray(project.transitions) ? clone(project.transitions) : [],
    markers: Array.isArray(project.markers) ? clone(project.markers) : [],
    selection: project.selection || base.selection,
    compare: { ...base.compare, ...(project.compare || {}) },
    master: createDefaultMaster(project.master || {}),
    requiredCapabilities: Array.isArray(project.requiredCapabilities) ? clone(project.requiredCapabilities) : [],
    optionalCapabilities: Array.isArray(project.optionalCapabilities) ? clone(project.optionalCapabilities) : [],
    lastKnownCapabilities: clone(project.lastKnownCapabilities || {}),
  };
  return recomputeDuration(next);
}

export function getLaneDescriptor(role) {
  return LANE_DESCRIPTORS[role] || LANE_DESCRIPTORS.source;
}

function recomputeDuration(project) {
  const duration = project.elements.reduce((max, element) => (
    Math.max(max, element.timeline.startMs + element.timeline.placementDurationMs)
  ), 0);
  project.project.durationMs = duration;
  return project;
}

function touch(project) {
  project.updatedAt = nowIso();
  return project;
}

function resolveCompareTarget(project, target) {
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

function normalizeCompareTarget(target = {}) {
  return {
    elementId: target.elementId || null,
    rangeStartMs: Math.max(0, finiteNumber(target.rangeStartMs, 0)),
    rangeEndMs: Math.max(0, finiteNumber(target.rangeEndMs, 0)),
    offsetMs: finiteNumber(target.offsetMs, 0),
  };
}

function descriptor(role, accepts, inspectorSections) {
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

function normalizeCapabilities(input = {}) {
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

function laneRoleForAsset(asset) {
  if (asset.capabilities.hasVideo) return 'video';
  if (asset.capabilities.hasImage) return 'image';
  if (asset.capabilities.hasAudio) return 'audio';
  return 'source';
}

function typeForCapabilities(caps) {
  if (caps.hasVideo) return 'video';
  if (caps.hasImage) return 'image';
  if (caps.hasAudio) return 'audio';
  return 'generated';
}

function defaultDurationForCaps(caps) {
  return caps.hasImage ? MIXER_LIMITS.defaultImageDurationMs : 0;
}

function labelForRole(role) {
  return role.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function colorForRole(role) {
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

function finiteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function positiveNumber(value, fallback = 0) {
  const n = finiteNumber(value, fallback);
  return n > 0 ? n : fallback;
}

function makeId(prefix) {
  nextId += 1;
  return `${prefix}-${nextId}`;
}

function clone(value) {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}
