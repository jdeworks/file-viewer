import {
  clamp,
  createButton,
  fmtTime,
} from './mixer-audio-listen-helpers.js';
import {
  addElement,
  addLane,
  createGeneratedElement,
  createLane,
  evaluateMixerCapabilities,
  selectTarget,
  summarizeReducedCapabilities,
} from './index.js';
import { MIXER_LAYOUT } from './mixer-hit-test.js';
import { laneRange } from './mixer-audio-multi-helpers.js';
import { reflectMultiPlaybackState } from './mixer-audio-multi-decorators.js';
import { renderVideoExportPlanPanel } from './mixer-video-export-ui.js';
import { renderVideoProxyPlanPanel } from './mixer-video-proxy-ui.js';

// --- Pure project queries ---

export function hasVisualElements(project) {
  return (project.elements || []).some((element) => element.capabilities?.hasVideo || element.capabilities?.hasImage);
}

export function firstElementForLane(project, laneId) {
  return project.elements.find((element) => element.laneId === laneId) || null;
}

export function selectedLaneInfo(project) {
  const primary = project.selection?.primary;
  if (primary?.type !== 'lane') return null;
  return project.lanes.find((lane) => lane.id === primary.id) || null;
}

export function selectedElementInfo(project) {
  const primary = project.selection?.primary;
  if (primary?.type !== 'element') return null;
  return project.elements.find((element) => element.id === primary.id) || null;
}

export function selectedElementStart(project, elementId) {
  return project.elements.find((element) => element.id === elementId)?.timeline?.startMs || 0;
}

// --- Viewport helpers ---

export function fitZoom(root, project) {
  const width = Math.max(240, root.clientWidth - MIXER_LAYOUT.gutterWidth);
  const duration = Math.max(1000, project.project.durationMs || 1000);
  return clamp(width / duration, 0.02, 0.8);
}

// --- Project mutation helpers (pure: take project, return next project) ---

export function addGeneratedLane(project, kind, label, roomTone) {
  const lane = createLane({
    role: kind === 'room-tone' ? 'room-tone' : 'generated',
    label,
    order: project.lanes.length,
  });
  project = addLane(project, lane);
  const durationMs = Math.max(1000, project.project.durationMs || 3000);
  project = addElement(project, createGeneratedElement({
    laneId: lane.id,
    kind: roomTone.kind,
    durationMs,
    rawDurationMs: durationMs,
    audio: {
      gain: kind === 'room-tone' ? 0.35 : 0.5,
      roomTone,
    },
  }));
  const elementId = project.elements[project.elements.length - 1]?.id;
  if (elementId) project = selectTarget(project, { type: 'element', id: elementId }, [{ type: 'element', id: elementId }]);
  return project;
}

// --- Bespoke clip-lane helpers (used by mountModularAudioMixer) ---

// Build the flat "clip view" that createClipLane.update() expects.
export function buildClipView(project, laneId, cursorMs) {
  const element = firstElementForLane(project, laneId);
  if (!element) return null;
  const durationMs = Math.max(1000, project.project?.durationMs || 1000);
  const rawDur = element.timeline.rawDurationMs || element.timeline.durationMs || durationMs;
  const inMs = element.timeline.sourceInMs || 0;
  const outMs = element.timeline.sourceOutMs || rawDur;
  const lenMs = Math.max(1, outMs - inMs);
  return {
    timelineSec: durationMs / 1000,
    startSec: (element.timeline.startMs || 0) / 1000,
    lenSec: lenMs / 1000,
    sourceInFrac: inMs / Math.max(1, rawDur),
    sourceOutFrac: outMs / Math.max(1, rawDur),
    cursorSec: (cursorMs || 0) / 1000,
    cursorLabel: fmtTime((cursorMs || 0) / 1000),
    fadeInSec: (element.audio?.fadeInMs || 0) / 1000,
    fadeOutSec: (element.audio?.fadeOutMs || 0) / 1000,
    summary: element.analysis?.waveformSummary || null,
    selected: project.selection?.primary?.id === element.id,
  };
}

// Build the per-lane controls row appended to .al-track-label.
export function buildLaneControlsEl(laneModel, element) {
  const controls = document.createElement('div');
  controls.className = 'al-lane-controls mmx-mix-lane-controls';
  const mute = createButton('M', 'Mute lane', 'mmx-mix-mute');
  mute.dataset.laneId = laneModel.id;
  mute.setAttribute('aria-pressed', laneModel.muted ? 'true' : 'false');
  const solo = createButton('S', 'Solo lane', 'mmx-mix-solo');
  solo.dataset.laneId = laneModel.id;
  solo.setAttribute('aria-pressed', laneModel.solo ? 'true' : 'false');
  const gain = laneRange('mmx-mix-lane-gain', laneModel.id, laneModel.audio?.gain ?? 1, 0, 2, 0.01, 'Lane gain');
  const fadeIn = laneRange('mmx-mix-fade-in', laneModel.id, element?.audio?.fadeInMs ?? 0, 0, 5000, 10, 'Fade in');
  const fadeOut = laneRange('mmx-mix-fade-out', laneModel.id, element?.audio?.fadeOutMs ?? 0, 0, 5000, 10, 'Fade out');
  controls.append(mute, solo, gain, fadeIn, fadeOut);
  return controls;
}

// Sync per-lane control values and aria states on each render.
export function updateLaneControlsState(laneEl, laneModel, element) {
  const mute = laneEl.querySelector('.mmx-mix-mute');
  const solo = laneEl.querySelector('.mmx-mix-solo');
  const gain = laneEl.querySelector('.mmx-mix-lane-gain');
  const fadeIn = laneEl.querySelector('.mmx-mix-fade-in');
  const fadeOut = laneEl.querySelector('.mmx-mix-fade-out');
  if (mute) mute.setAttribute('aria-pressed', laneModel.muted ? 'true' : 'false');
  if (solo) solo.setAttribute('aria-pressed', laneModel.solo ? 'true' : 'false');
  if (gain) gain.value = String(laneModel.audio?.gain ?? 1);
  if (fadeIn) fadeIn.value = String(element?.audio?.fadeInMs ?? 0);
  if (fadeOut) fadeOut.value = String(element?.audio?.fadeOutMs ?? 0);
}

// Build a thumbnail strip for a visual element (mirrors renderThumbnailStrip in mixer-renderer).
export function buildThumbnailStrip(element, thumbnails) {
  const strip = document.createElement('span');
  strip.className = 'mmx-thumb-strip';
  strip.dataset.elementId = element.id;
  if (element.capabilities?.needsFfmpegForPreview) {
    strip.dataset.needsProxy = 'true';
    strip.dataset.thumbCount = '0';
    const proxy = document.createElement('span');
    proxy.className = 'mmx-thumb-proxy';
    proxy.textContent = 'Proxy required';
    strip.append(proxy);
    return strip;
  }
  const frames = getThumbnailFrames(thumbnails, element);
  strip.dataset.thumbCount = String(frames.length);
  if (!frames.length) {
    const pending = document.createElement('span');
    pending.className = 'mmx-thumb-pending';
    pending.textContent = 'Thumbnails pending';
    strip.append(pending);
    return strip;
  }
  for (const frame of frames) {
    const canvas = document.createElement('canvas');
    canvas.className = 'mmx-thumb';
    canvas.width = 48;
    canvas.height = 28;
    canvas.dataset.sampledMs = String(Math.round(frame.sampledMs || 0));
    drawThumb(canvas, frame.source);
    strip.append(canvas);
  }
  return strip;
}

function getThumbnailFrames(thumbnails, element) {
  if (!thumbnails) return [];
  const frames = typeof thumbnails.get === 'function'
    ? thumbnails.get(element.id) || thumbnails.get(element.assetId)
    : thumbnails?.[element.id] || thumbnails?.[element.assetId];
  return Array.isArray(frames) ? frames.filter((f) => f?.source) : [];
}

function drawThumb(canvas, source) {
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (source) {
    const sw = source.naturalWidth || source.videoWidth || source.width || canvas.width;
    const sh = source.naturalHeight || source.videoHeight || source.height || canvas.height;
    const scale = Math.min(canvas.width / sw, canvas.height / sh);
    const dw = sw * scale;
    const dh = sh * scale;
    ctx.drawImage(source, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
  }
}

// Build the Mix toolbar DOM once; returns handles needed by render().
export function buildMixToolbar() {
  const mk = (t, l, c) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = t; b.className = c;
    b.setAttribute('aria-label', l); return b;
  };
  const masterSlider = document.createElement('input');
  Object.assign(masterSlider, { type: 'range', className: 'mmx-mix-master-slider', min: '0', max: '2', step: '0.01', value: '1' });
  const masterLabel = Object.assign(document.createElement('label'), { className: 'mmx-mix-master' });
  masterLabel.append('Master', masterSlider);
  const videoPlanBtn = mk('Plan video export', 'Plan ffmpeg-gated video export', 'mmx-mix-video-export-plan mmx-video-export-plan');
  videoPlanBtn.hidden = true;
  const dropZone = Object.assign(document.createElement('span'), { className: 'mmx-mix-drop-zone', textContent: 'Drop audio, image, or video to add lane' });
  const controls = document.createElement('div');
  controls.className = 'mmx-mix-controls';
  controls.append(
    mk('Play', 'Play mix preview', 'mmx-mix-play'),
    mk('Stop', 'Stop mix preview', 'mmx-mix-stop'),
    mk('+ Tone', 'Add generated tone lane', 'mmx-mix-add-tone'),
    mk('+ Pink noise', 'Add pink-noise room-tone lane', 'mmx-mix-add-pink'),
    masterLabel,
    mk('Mixdown → WAV', 'Download browser audio mixdown WAV', 'mmx-mix-download'),
    videoPlanBtn, dropZone,
  );
  const toolbar = document.createElement('div');
  toolbar.className = 'al-toolbar mmx-toolbar';
  toolbar.append(Object.assign(document.createElement('span'), { className: 'al-title mmx-title', textContent: 'Mix' }), controls);
  return { toolbar, masterSlider, videoPlanBtn };
}

// --- DOM decoration helpers ---

export function decorateLanes(root, project) {
  const lanes = [...root.querySelectorAll('.mmx-lane')];
  lanes.forEach((laneNode, index) => {
    laneNode.classList.add('mmx-mix-lane');
    const lane = project.lanes.find((item) => item.id === laneNode.dataset.laneId);
    const header = laneNode.querySelector('.mmx-lane-header');
    if (!header || !lane) return;
    const indexNode = document.createElement('span');
    indexNode.className = 'mmx-mix-lane-index';
    indexNode.textContent = String(index + 1);
    const controls = document.createElement('div');
    controls.className = 'mmx-mix-lane-controls';
    const mute = createButton('M', 'Mute lane', 'mmx-mix-mute');
    mute.dataset.laneId = lane.id;
    mute.setAttribute('aria-pressed', lane.muted ? 'true' : 'false');
    const solo = createButton('S', 'Solo lane', 'mmx-mix-solo');
    solo.dataset.laneId = lane.id;
    solo.setAttribute('aria-pressed', lane.solo ? 'true' : 'false');
    const gain = laneRange('mmx-mix-lane-gain', lane.id, lane.audio?.gain ?? 1, 0, 2, 0.01, 'Lane gain');
    const fadeIn = laneRange('mmx-mix-fade-in', lane.id, firstElementForLane(project, lane.id)?.audio?.fadeInMs ?? 0, 0, 5000, 10, 'Fade in');
    const fadeOut = laneRange('mmx-mix-fade-out', lane.id, firstElementForLane(project, lane.id)?.audio?.fadeOutMs ?? 0, 0, 5000, 10, 'Fade out');
    controls.append(mute, solo, gain, fadeIn, fadeOut);
    header.prepend(indexNode);
    header.append(controls);
  });
}

export function decorateInspector(root, project, runtime, { lastProxyPlan, lastVideoExportPlan, buildProxyPlan, buildVideoExportPlan }) {
  const inspector = root.querySelector('.mmx-inspector');
  if (!inspector) return;
  const context = document.createElement('div');
  context.className = 'mmx-mix-context';
  const selectedLane = selectedLaneInfo(project);
  const selectedElement = selectedElementInfo(project);
  context.textContent = selectedElement
    ? `Context: ${selectedElement.type} · start ${fmtTime(selectedElement.timeline.startMs / 1000)} · gain ${selectedElement.audio.gain}`
    : selectedLane
      ? `Context: ${selectedLane.label} · lane gain ${selectedLane.audio.gain}`
      : 'Context: select a lane or clip to edit timing, gain, fades, EQ, and generated room tone.';
  inspector.prepend(context);

  const eq = document.createElement('div');
  eq.className = 'mmx-mix-eq-summary';
  eq.textContent = selectedLane
    ? 'Track EQ: lane-level 9-band schema · Master EQ: global bus schema'
    : 'Track EQ and master EQ are stored separately in the mixer model.';
  inspector.append(eq);

  const caps = document.createElement('div');
  caps.className = 'mmx-mix-capability-note mmx-capability-note';
  const reduced = summarizeReducedCapabilities(evaluateMixerCapabilities(runtime, project));
  caps.textContent = reduced.map((item) => `${item.id}: ${item.message}`).join(' ');
  inspector.append(caps);

  // Visual element inspector fields (opacity + more) for the selected visual element.
  if (selectedElement && (selectedElement.capabilities?.hasVideo || selectedElement.capabilities?.hasImage)) {
    const visualSection = document.createElement('div');
    visualSection.className = 'mmx-inspector-visual-section';
    const opacityInput = document.createElement('input');
    opacityInput.type = 'number';
    opacityInput.className = 'mmx-inspector-visual-opacity';
    opacityInput.dataset.action = 'update-element';
    opacityInput.dataset.elementId = selectedElement.id;
    opacityInput.dataset.field = 'visual-opacity';
    opacityInput.value = String(selectedElement.visual?.opacity ?? 1);
    opacityInput.setAttribute('min', '0');
    opacityInput.setAttribute('max', '1');
    opacityInput.setAttribute('step', '0.01');
    visualSection.append(opacityInput);
    inspector.append(visualSection);
  }

  if (hasVisualElements(project)) {
    const proxyPlan = lastProxyPlan || buildProxyPlan();
    if (proxyPlan.provenance.assets.length) inspector.append(renderVideoProxyPlanPanel(proxyPlan, runtime));
    inspector.append(renderVideoExportPlanPanel(lastVideoExportPlan || buildVideoExportPlan(), runtime));
  }
}

// --- State reflection ---

export function reflectState(root, project, viewport, { waveformSummary, lastVideoExportPlan, lastProxyPlan, decodedAudioCache, playback }) {
  root.dataset.laneCount = String(project.lanes.length);
  root.dataset.elementCount = String(project.elements.length);
  root.dataset.cursorMs = String(Math.round(viewport.cursorMs));
  root.dataset.zoom = String(viewport.pxPerMs);
  root.dataset.hasPinkNoise = project.elements.some((element) => element.audio?.roomTone?.kind === 'pink-noise') ? 'true' : 'false';
  root.dataset.waveformBuckets = String(waveformSummary?.buckets || 0);
  root.dataset.hasDroppedAudio = project.assets.some((asset) => asset.id.startsWith('asset-drop-') && asset.capabilities?.hasAudio) ? 'true' : 'false';
  root.dataset.hasDroppedVisual = project.assets.some((asset) => asset.id.startsWith('asset-drop-') && (asset.capabilities?.hasVideo || asset.capabilities?.hasImage)) ? 'true' : 'false';
  root.dataset.videoExportStatus = lastVideoExportPlan?.status || '';
  root.dataset.videoExportCanRender = lastVideoExportPlan?.canRender ? 'true' : 'false';
  root.dataset.videoProxyStatus = lastProxyPlan?.status || '';
  root.dataset.videoProxyCanRender = lastProxyPlan?.canRender ? 'true' : 'false';
  root.dataset.decodedCacheEntries = String(decodedAudioCache.stats().entryCount);
  root.dataset.decodedCacheBudgetBytes = String(decodedAudioCache.stats().budgetBytes);
  reflectMultiPlaybackState(root, playback.getState());
}
