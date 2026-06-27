import {
  addElement,
  addLane,
  createElement,
  createLane,
  createProjectFromAssetMetadata,
  setCompareTarget,
} from './index.js';
import { mediaDuration, selectFirstElement } from './mixer-audio-listen-helpers.js';
import { classifyMixerFile } from './mixer-media-drop.js';

const ASSET_ID = 'asset-compare-source';

export function buildCompareProject(mediaEl, intake, kind) {
  const classification = classifyMixerFile(intake.file || { name: intake.filename || '', type: intake.mime || intake.mimeType || '' });
  const durationMs = Math.max(1000, Math.round(mediaDuration(mediaEl) * 1000) || 1000);
  let project = selectFirstElement(createProjectFromAssetMetadata({
    id: ASSET_ID,
    name: intake.filename || intake.file?.name || `${kind} compare source`,
    mime: intake.mime || intake.mimeType || intake.file?.type || '',
    size: intake.size || intake.file?.size || 0,
    capabilities: kind === 'video'
      ? { hasAudio: true, hasVideo: true, needsFfmpegForPreview: !!classification.capabilities?.needsFfmpegForPreview }
      : { hasAudio: true },
    media: {
      durationMs,
      videoWidth: mediaEl.videoWidth || 0,
      videoHeight: mediaEl.videoHeight || 0,
    },
  }, { name: `${kind === 'video' ? 'Video' : 'Audio'} compare`, laneLabel: 'A' }));
  const first = project.elements[0];
  const laneB = createLane({ role: 'compare', label: 'B', order: 1 });
  project = addLane(project, laneB);
  project = addElement(project, createElement({
    ...first,
    id: undefined,
    laneId: laneB.id,
    startMs: 0,
    durationMs,
    rawDurationMs: durationMs,
  }));
  project = refreshCompareTargets(project);
  return project;
}

export function refreshCompareTargets(project) {
  const [a, b] = project.elements;
  if (!a || !b) return project;
  let next = setCompareTarget(project, 'a', targetFromElement(a, project.compare?.a?.offsetMs || 0));
  next = setCompareTarget(next, 'b', targetFromElement(b, project.compare?.b?.offsetMs || 0));
  return next;
}

export function targetFromElement(element, offsetMs = 0) {
  const startMs = element.timeline?.sourceInMs || 0;
  const endMs = Math.max(startMs, element.timeline?.durationMs || 0);
  return {
    elementId: element.id,
    rangeStartMs: startMs,
    rangeEndMs: endMs,
    offsetMs,
  };
}

export function label(text, input) {
  const wrap = document.createElement('label');
  wrap.className = 'mmx-compare-field';
  wrap.append(text, input);
  return wrap;
}

export function secondsString(valueMs) {
  return String(Math.round((Number(valueMs) || 0) / 100) / 10);
}

export function clampMs(value, min, max) {
  const number = Number(value);
  return Math.max(min, Math.min(max, Number.isFinite(number) ? number : min));
}

export function durationForKind(kind) {
  if (kind === 'image') return 5000;
  return 1000;
}

export function mediaForKind(kind, durationMs) {
  if (kind === 'image') return { durationMs, videoWidth: 0, videoHeight: 0, frameRate: 0 };
  if (kind === 'video') return { durationMs: 0, videoWidth: 0, videoHeight: 0, frameRate: 0, audioSampleRate: 0, audioChannels: 0 };
  return { durationMs: 0, audioSampleRate: 0, audioChannels: 0 };
}

export function renderOverlayStatus(canvas, overlap) {
  const status = document.createElement('span');
  status.className = 'mmx-compare-overlay-status';
  status.textContent = `${canvas.dataset.kind} overlay · ${Number(canvas.dataset.variedPixels || 0)} varied samples · overlap ${(overlap.overlap.durationMs / 1000).toFixed(2)}s`;
  return status;
}

export function renderAnalysisPanel(analysis) {
  const panel = document.createElement('section');
  panel.className = 'mmx-compare-analysis';
  panel.dataset.status = analysis.status;
  panel.dataset.kind = analysis.kind;
  panel.dataset.overlapMs = String(Math.round(analysis.overlapMs || 0));
  panel.dataset.metric = analysis.metric || '';
  panel.dataset.value = String(analysis.value ?? '');
  panel.dataset.maxDelta = String(analysis.maxDelta ?? '');
  panel.dataset.averageEnergy = String(analysis.averageEnergy ?? '');
  panel.dataset.highRatio = String(analysis.highRatio ?? '');
  panel.dataset.averageDifference = String(analysis.averageDifference ?? '');
  panel.dataset.highPixels = String(analysis.highPixels ?? '');
  panel.dataset.transformDelta = analysis.transformDelta?.summary || '';
  if (analysis.timing) {
    panel.dataset.aOnlyMs = String(Math.round(analysis.timing.aOnlyMs || 0));
    panel.dataset.bOnlyMs = String(Math.round(analysis.timing.bOnlyMs || 0));
    panel.dataset.unionMs = String(Math.round(analysis.timing.unionMs || 0));
    panel.dataset.overlapRatio = String(analysis.timing.overlapRatio || 0);
  }
  const title = document.createElement('strong');
  title.textContent = analysis.kind === 'visual' ? 'Visual overlap analysis' : 'Audio overlap analysis';
  const message = document.createElement('span');
  message.className = 'mmx-compare-analysis-message';
  message.textContent = analysis.message;
  panel.append(title, message);
  if (analysis.detailRows?.length) panel.append(renderAnalysisDetails(analysis.detailRows));
  if (analysis.timing) panel.append(renderTimingDetails(analysis.timing));
  return panel;
}

function renderAnalysisDetails(rows) {
  const list = document.createElement('dl');
  list.className = 'mmx-compare-analysis-details';
  for (const [labelText, rawValue] of rows) {
    const term = document.createElement('dt');
    term.textContent = labelText;
    const value = document.createElement('dd');
    value.textContent = typeof rawValue === 'number' ? String(Math.round(rawValue * 10000) / 10000) : String(rawValue);
    list.append(term, value);
  }
  return list;
}

function renderTimingDetails(timing) {
  const list = document.createElement('dl');
  list.className = 'mmx-compare-analysis-timing';
  list.dataset.aOnlyMs = String(Math.round(timing.aOnlyMs || 0));
  list.dataset.bOnlyMs = String(Math.round(timing.bOnlyMs || 0));
  list.dataset.unionMs = String(Math.round(timing.unionMs || 0));
  list.dataset.overlapRatio = String(timing.overlapRatio || 0);
  appendTimingRow(list, 'Overlap', timing.overlapMs);
  appendTimingRow(list, 'A only', timing.aOnlyMs);
  appendTimingRow(list, 'B only', timing.bOnlyMs);
  appendTimingRow(list, 'Union', timing.unionMs);
  return list;
}

function appendTimingRow(list, labelText, valueMs) {
  const term = document.createElement('dt');
  term.textContent = labelText;
  const value = document.createElement('dd');
  value.textContent = `${((valueMs || 0) / 1000).toFixed(2)}s`;
  list.append(term, value);
}
