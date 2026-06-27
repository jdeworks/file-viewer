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
