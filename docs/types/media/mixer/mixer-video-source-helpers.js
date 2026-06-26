import {
  createProjectFromAssetMetadata,
  updateAsset,
  updateElement,
} from './index.js';
import { clamp, mediaDuration } from './mixer-audio-listen-helpers.js';
import { classifyMixerFile } from './mixer-media-drop.js';

export const SOURCE_ASSET_ID = 'asset-video-source';

export function renderExportPlanPanel(plan, runtime = {}) {
  const panel = document.createElement('section');
  panel.className = 'mmx-video-export-status';
  panel.dataset.status = plan.status;
  panel.dataset.canRender = plan.canRender ? 'true' : 'false';
  const title = document.createElement('strong');
  title.textContent = plan.canRender ? 'Final video export ready' : 'Final video export needs Media Transcoding';
  const summary = document.createElement('span');
  summary.className = 'mmx-video-export-summary';
  summary.textContent = `${plan.provenance.visualItems.length} visual · ${plan.provenance.audioItems.length} audio · ${Math.round(plan.durationMs)} ms`;
  const note = document.createElement('p');
  note.className = 'mmx-video-export-note';
  note.textContent = plan.warnings[0] || plan.statusMessage || 'ffmpeg render planning is available for this project.';
  const render = document.createElement('button');
  render.type = 'button';
  render.className = 'mmx-video-render-run';
  render.textContent = 'Render final export';
  render.disabled = !runtime.ffmpegEnabled;
  render.title = runtime.ffmpegEnabled ? 'Load Media Transcoding and render this mix' : 'Enable Media Transcoding to render this mix';
  panel.append(title, summary, note, render);
  return panel;
}

export function buildVideoProject(mediaEl, intake) {
  const classification = classifyMixerFile(intake.file || { name: intake.filename || '', type: intake.mime || intake.mimeType || '' });
  const durationMs = Math.max(0, mediaDuration(mediaEl) * 1000);
  return createProjectFromAssetMetadata({
    id: SOURCE_ASSET_ID,
    name: intake.filename || intake.file?.name || 'Video source',
    mime: intake.mime || intake.mimeType || intake.file?.type || '',
    size: intake.size || intake.file?.size || 0,
    lastModified: intake.file?.lastModified || null,
    capabilities: {
      hasAudio: true,
      hasVideo: true,
      hasImage: false,
      needsFfmpegForPreview: !!classification.capabilities?.needsFfmpegForPreview,
      needsFfmpegForExport: true,
    },
    media: {
      durationMs,
      videoWidth: mediaEl.videoWidth || 0,
      videoHeight: mediaEl.videoHeight || 0,
    },
    status: classification.capabilities?.needsFfmpegForPreview ? 'needs-proxy' : 'available',
  }, {
    name: intake.filename || 'Video source mix',
    laneLabel: 'Source video',
  });
}

export function mergeVideoMetadata(project, mediaEl) {
  if (!mediaEl) return project;
  const durationMs = Math.max(0, Math.round(mediaDuration(mediaEl) * 1000));
  const videoWidth = mediaEl.videoWidth || 0;
  const videoHeight = mediaEl.videoHeight || 0;
  let next = updateAsset(project, SOURCE_ASSET_ID, (asset) => ({
    ...asset,
    media: {
      ...asset.media,
      durationMs: durationMs || asset.media.durationMs,
      videoWidth: videoWidth || asset.media.videoWidth,
      videoHeight: videoHeight || asset.media.videoHeight,
    },
  }));
  const id = next.elements.find((element) => element.assetId === SOURCE_ASSET_ID)?.id;
  if (!id || !durationMs) return next;
  next = updateElement(next, id, (element) => ({
    ...element,
    timeline: {
      ...element.timeline,
      durationMs,
      rawDurationMs: durationMs,
      placementDurationMs: durationMs,
      sourceOutMs: Math.max(element.timeline.sourceInMs || 0, durationMs),
    },
  }));
  return next;
}

export function currentMusicBedGain(project) {
  const music = (project.elements || []).find((element) => (
    element.capabilities?.hasAudio
    && !element.capabilities?.hasVideo
    && !element.capabilities?.hasImage
  ));
  return music ? clamp(Number(music.audio?.gain), 0, 1) : 0.35;
}

export function updateMusicBedGain(project, gain) {
  const value = clamp(Number(gain), 0, 1);
  let next = project;
  for (const element of project.elements || []) {
    if (!element.capabilities?.hasAudio || element.capabilities?.hasVideo || element.capabilities?.hasImage) continue;
    next = updateElement(next, element.id, (item) => ({
      ...item,
      audio: { ...item.audio, gain: value },
    }));
  }
  return next;
}

export function selectedVisualElement(project) {
  const selectedId = project.selection?.primary?.type === 'element' ? project.selection.primary.id : null;
  const selected = selectedId ? project.elements.find((element) => element.id === selectedId) : null;
  return isVisualElement(selected) ? selected : null;
}

export function selectedEditableElement(project) {
  const selectedId = project.selection?.primary?.type === 'element' ? project.selection.primary.id : null;
  return selectedId ? project.elements.find((element) => element.id === selectedId) || null : null;
}

export function latestVisualElement(project) {
  return (project.elements || [])
    .filter(isVisualElement)
    .sort((a, b) => {
      const aStart = Number(a.timeline?.startMs) || 0;
      const bStart = Number(b.timeline?.startMs) || 0;
      if (aStart !== bStart) return bStart - aStart;
      return project.elements.indexOf(b) - project.elements.indexOf(a);
    })[0] || null;
}

export function previousVisualElement(project, target) {
  const targetStart = Number(target?.timeline?.startMs) || 0;
  return (project.elements || [])
    .filter((element) => element.id !== target?.id && isVisualElement(element))
    .filter((element) => (Number(element.timeline?.startMs) || 0) <= targetStart)
    .sort((a, b) => (Number(b.timeline?.startMs) || 0) - (Number(a.timeline?.startMs) || 0))[0] || null;
}

export function transitionSummary(project) {
  const target = selectedVisualElement(project) || latestVisualElement(project);
  if (!target) return 'No visual target';
  const transition = (project.transitions || []).find((item) => item.toElementId === target.id && item.enabled !== false);
  if (!transition) return `${target.type || 'visual'}: no transition`;
  return `${target.type || 'visual'}: ${transition.kind || 'dissolve'} ${Math.round(transition.durationMs || 0)} ms`;
}

export function editSummary(project) {
  const target = selectedEditableElement(project) || project.elements?.[0];
  if (!target) return 'No clip selected';
  const sourceIn = Math.round(Number(target.timeline?.sourceInMs) || 0);
  const sourceOut = Math.round(Number(target.timeline?.sourceOutMs) || 0);
  const fadeIn = Math.round(Number(target.audio?.fadeInMs || target.visual?.fadeInMs) || 0);
  const fadeOut = Math.round(Number(target.audio?.fadeOutMs || target.visual?.fadeOutMs) || 0);
  return `${target.type || 'clip'}: ${msSeconds(sourceIn)}-${msSeconds(sourceOut)}s · fades ${msSeconds(fadeIn)}/${msSeconds(fadeOut)}s`;
}

export function isVisualElement(element) {
  return !!(element?.capabilities?.hasVideo || element?.capabilities?.hasImage);
}

function msSeconds(ms) {
  return String(Math.round((Number(ms) || 0) / 10) / 100);
}
