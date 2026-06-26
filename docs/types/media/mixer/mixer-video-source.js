import {
  createMixerSnapshot,
  createProjectFromAssetMetadata,
  exportProjectSettingsJson,
  moveElement,
  selectTarget,
  updateAsset,
  updateElement,
} from './index.js';
import { renderMixerShell } from './mixer-renderer.js';
import { attachMixerInteractions } from './mixer-interactions.js';
import { ensureMixerStyles } from './mixer-ui.js';
import { clamp, clampZoom, mediaDuration, selectFirstElement } from './mixer-audio-listen-helpers.js';
import { updateProjectElementField } from './mixer-audio-multi-helpers.js';
import { classifyMixerFile } from './mixer-media-drop.js';
import { createMixerVisualRuntime } from './mixer-visual-runtime.js';
import { MIXER_LAYOUT } from './mixer-hit-test.js';
import { createProjectSettingsUi } from './mixer-project-settings-ui.js';

const SOURCE_ASSET_ID = 'asset-video-source';

export function mountModularVideoSourceMixer(panel, intake, mediaEl = null, options = {}) {
  ensureMixerStyles();
  const root = document.createElement('section');
  root.className = 'mmx-video-source mx-wrap';
  root.dataset.mixerContext = 'video-source';
  root.tabIndex = -1;
  panel.append(root);

  let project = selectFirstElement(buildVideoProject(mediaEl || {}, intake || {}));
  let viewport = { cursorMs: 0, scrollLeft: 0, pxPerMs: 0.06, width: 960 };
  let destroyed = false;
  let draggingElement = null;
  const runtimeFiles = new Map();
  if (intake?.file) runtimeFiles.set(SOURCE_ASSET_ID, intake.file);
  const visualRuntime = createMixerVisualRuntime({ runtimeFiles, onUpdate: render });
  const settingsUi = createProjectSettingsUi({
    root,
    getProject: () => project,
    setProject: (next) => { project = next; },
    runtimeFiles,
    render,
    filename: `${(intake?.filename || 'video-source').replace(/\.[^.]+$/, '')}.mixer.json`,
  });

  const dispatch = (action) => {
    if (action.type === 'seek') setCursorMs(action.cursorMs, { syncMedia: true });
    if (action.type === 'zoom') viewport = { ...viewport, pxPerMs: clampZoom(action.pxPerMs) };
    if (action.type === 'zoom-relative') viewport = { ...viewport, pxPerMs: clampZoom(viewport.pxPerMs * action.factor) };
    if (action.type === 'pan') viewport = { ...viewport, scrollLeft: Math.max(0, Number(action.scrollLeft) || 0) };
    if (action.type === 'fit') viewport = { ...viewport, scrollLeft: 0, pxPerMs: fitZoom() };
    if (action.type === 'select') project = selectTarget(project, action.target, [action.target]);
    if (action.type === 'update-element') project = updateProjectElementField(project, action);
    render();
  };

  const interactions = attachMixerInteractions(root, () => ({
    project,
    snapshot: createMixerSnapshot(project),
    viewport,
  }), dispatch);

  const onPointerDown = (event) => {
    const element = event.target?.closest?.('.mmx-element');
    if (!element || !root.contains(element) || event.button !== 0) return;
    draggingElement = {
      id: element.dataset.elementId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startMs: project.elements.find((item) => item.id === element.dataset.elementId)?.timeline?.startMs || 0,
    };
    try { element.setPointerCapture?.(event.pointerId); } catch { /* synthetic capture may fail */ }
  };
  const onPointerMove = (event) => {
    if (!draggingElement || event.pointerId !== draggingElement.pointerId) return;
    const deltaMs = (event.clientX - draggingElement.startX) / Math.max(0.001, viewport.pxPerMs);
    if (Math.abs(deltaMs) < 20) return;
    project = moveElement(project, draggingElement.id, Math.max(0, draggingElement.startMs + deltaMs));
    render();
    event.preventDefault();
  };
  const onPointerUp = (event) => {
    if (draggingElement && event.pointerId === draggingElement.pointerId) draggingElement = null;
  };
  root.addEventListener('pointerdown', onPointerDown);
  root.addEventListener('pointermove', onPointerMove);
  root.addEventListener('pointerup', onPointerUp);
  root.addEventListener('pointercancel', onPointerUp);
  window.addEventListener('resize', render);

  const updateFromMedia = () => {
    project = mergeVideoMetadata(project, mediaEl);
    render();
  };
  if (mediaEl) {
    mediaEl.addEventListener('loadedmetadata', updateFromMedia);
    mediaEl.addEventListener('durationchange', updateFromMedia);
    if (mediaDuration(mediaEl) > 0 || mediaEl.videoWidth || mediaEl.videoHeight) updateFromMedia();
  }

  root.__mediaMixerVideoSource = {
    getProject: () => project,
    getViewport: () => viewport,
    exportSettings: () => exportProjectSettingsJson(project),
    importSettings: settingsUi.importSettings,
    getLastSettingsImport: () => settingsUi.getLastImport(),
    dispatch,
  };
  render();

  return {
    getProject: () => project,
    getViewport: () => viewport,
    dispatch,
    destroy() {
      destroyed = true;
      interactions.destroy();
      visualRuntime.dispose();
      settingsUi.destroy();
      root.removeEventListener('pointerdown', onPointerDown);
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerup', onPointerUp);
      root.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('resize', render);
      mediaEl?.removeEventListener?.('loadedmetadata', updateFromMedia);
      mediaEl?.removeEventListener?.('durationchange', updateFromMedia);
      delete root.__mediaMixerVideoSource;
      root.remove();
    },
  };

  function render() {
    if (destroyed) return;
    viewport = { ...viewport, width: root.clientWidth || viewport.width || 960 };
    renderMixerShell(root, createMixerSnapshot(project), viewport, {
      minZoom: 0.02,
      maxZoom: 0.8,
      visualFrames: visualRuntime.frames,
      visualThumbnails: visualRuntime.thumbnails,
    });
    visualRuntime.update(project, viewport.cursorMs);
    decorate();
    settingsUi.decorate();
  }

  function setCursorMs(cursorMs, { syncMedia = false } = {}) {
    viewport = { ...viewport, cursorMs: Math.max(0, Number(cursorMs) || 0) };
    if (syncMedia && mediaEl && Number.isFinite(mediaEl.duration)) {
      const seconds = Math.min(mediaEl.duration || 0, viewport.cursorMs / 1000);
      try { mediaEl.currentTime = seconds; } catch { /* unsupported source seek */ }
    }
  }

  function decorate() {
    root.dataset.laneCount = String(project.lanes.length);
    root.dataset.elementCount = String(project.elements.length);
    root.dataset.hasOpenedVideo = 'true';
    root.dataset.ffmpegEnabled = options.enableFfmpeg ? 'true' : 'false';
    root.querySelector('.mmx-ruler')?.classList.add('mx-ruler');
    root.querySelector('.mmx-playhead')?.classList.add('mx-playhead');
    root.querySelector('.mmx-body')?.classList.add('mx-timeline');
    const toolbar = root.querySelector('.mmx-toolbar');
    if (toolbar && !toolbar.querySelector('.mmx-video-source-note')) {
      const note = document.createElement('div');
      note.className = 'mmx-video-source-note';
      note.textContent = options.enableFfmpeg
        ? 'Source video lane: visual transforms, trims, and frame preview are active.'
        : 'Source video lane: browser preview active; ffmpeg opt-in unlocks conversion and final video render.';
      toolbar.append(note);
    }
  }

  function fitZoom() {
    const width = Math.max(240, root.clientWidth - MIXER_LAYOUT.gutterWidth);
    const duration = Math.max(1000, project.project.durationMs || 1000);
    return clamp(width / duration, 0.02, 0.8);
  }
}

function buildVideoProject(mediaEl, intake) {
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

function mergeVideoMetadata(project, mediaEl) {
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
