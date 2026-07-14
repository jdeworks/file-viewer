import {
  createMixerSnapshot,
  applyVideoProxyResults,
  buildVideoMixExportPlan,
  buildVideoProxyPlan,
  captureElementKeyframe,
  exportProjectSettingsJson,
  moveElement,
  renderVideoMixWithFfmpeg,
  runVideoProxyRender,
  selectTarget,
  setElementTransition, splitElement,
  trimElement,
  updateElement,
} from './index.js';
import { renderMixerShell } from './mixer-renderer.js';
import { attachMixerInteractions } from './mixer-interactions.js';
import { ensureMixerStyles } from './mixer-ui.js';
import { ensureAudioListenStyles } from './mixer-audio-listen.js';
import { createClipLane } from './audio-clip-lane.js';
import { buildSeekFramePreview, renderSeekFramePreview } from './mixer-visual-preview.js';
import {
  buildLaneClips,
  buildThumbnailStrip,
  firstElementForLane,
  hasVisualElements,
} from './mixer-audio-multi-ui.js';
import { clamp, clampZoom, decodeSummary, mediaDuration, selectFirstElement } from './mixer-audio-listen-helpers.js';
import { downloadBlob, updateProjectElementField } from './mixer-audio-multi-helpers.js';
import {
  addDroppedMediaFile,
  applyDroppedAudioSummary,
  applyDroppedVisualMetadata,
  hasMixerFileDrop,
  isMixerDropFile,
  probeDroppedVisualMetadata,
} from './mixer-media-drop.js';
import { createMixerVisualRuntime } from './mixer-visual-runtime.js';
import { createProjectSettingsUi } from './mixer-project-settings-ui.js';
import { renderVideoExportPlanPanel } from './mixer-video-export-ui.js';
import { renderVideoProxyPlanPanel } from './mixer-video-proxy-ui.js';
import {
  SOURCE_ASSET_ID,
  buildVideoProject,
  isVisualElement,
  latestVisualElement,
  mergeVideoMetadata,
  previousVisualElement,
  selectedEditableElement,
  selectedVisualElement,
  updateMusicBedGain,
} from './mixer-video-source-helpers.js';
import {
  buildVideoSourceToolbar,
  fitZoom,
  renderSecondMediaControls,
  secondsInput,
  syncEditReadout,
  syncTransitionReadout,
} from './mixer-video-source-ui.js';
import { buildWorkingCopyButton } from '../media-working-copy.js';

export function mountModularVideoSourceMixer(panel, intake, mediaEl = null, options = {}) {
  ensureMixerStyles();
  ensureAudioListenStyles();
  const root = document.createElement('section');
  root.className = 'mmx-video-source al-surface';
  root.dataset.mixerContext = 'video-source';
  root.tabIndex = -1;
  panel.append(root);

  let project = selectFirstElement(buildVideoProject(mediaEl || {}, intake || {}));
  let viewport = { cursorMs: 0, scrollLeft: 0, pxPerMs: 0.06, width: 960 };
  let destroyed = false;
  let lastExportPlan = null;
  let lastProxyPlan = null;
  let lastRenderedOutput = null;
  const runtime = { ffmpegEnabled: !!options.enableFfmpeg, ffmpegLoaded: !!options.ffmpegLoaded };
  const runtimeFiles = new Map();
  if (intake?.file) runtimeFiles.set(SOURCE_ASSET_ID, intake.file);
  const visualRuntime = createMixerVisualRuntime({ runtimeFiles, onUpdate: render });
  const settingsUi = createProjectSettingsUi({ root, getProject: () => project, setProject: (next) => { project = next; }, runtimeFiles, render, filename: `${(intake?.filename || 'video-source').replace(/\.[^.]+$/, '')}.mixer.json` });

  const dispatch = (action) => {
    if (action.type === 'seek') setCursorMs(action.cursorMs, { syncMedia: true });
    if (action.type === 'zoom') viewport = { ...viewport, pxPerMs: clampZoom(action.pxPerMs) };
    if (action.type === 'zoom-relative') viewport = { ...viewport, pxPerMs: clampZoom(viewport.pxPerMs * action.factor) };
    if (action.type === 'pan') viewport = { ...viewport, scrollLeft: Math.max(0, Number(action.scrollLeft) || 0) };
    if (action.type === 'fit') viewport = { ...viewport, scrollLeft: 0, pxPerMs: fitZoom(root, project) };
    if (action.type === 'select') project = selectTarget(project, action.target, [action.target]);
    if (action.type === 'capture-keyframe') project = captureElementKeyframe(project, action.elementId, viewport.cursorMs);
    if (action.type === 'split') project = splitElement(project, action.elementId || selectedEditableElement(project)?.id || project.elements[0]?.id, viewport.cursorMs);
    if (action.type === 'update-element') project = updateProjectElementField(project, action);
    render();
  };

  const interactions = attachMixerInteractions(root, () => ({
    project,
    snapshot: createMixerSnapshot(project),
    viewport,
  }), dispatch);

  // Build bespoke DOM: toolbar + lanes container (inspector is rebuilt each render).
  const { toolbar, zoomRange } = buildVideoSourceToolbar(viewport.pxPerMs);
  const lanesContainer = document.createElement('div');
  lanesContainer.className = 'al-lanes';
  root.append(toolbar, lanesContainer);
  const clipLanes = new Map();
  let _scrollSyncing = false;
  const syncScroll = (px) => { if (_scrollSyncing) return; _scrollSyncing = true; for (const [, ln] of clipLanes) ln.setScroll(px); _scrollSyncing = false; };

  root.addEventListener('click', onClick, true); root.addEventListener('input', onInput);
  root.addEventListener('dragover', onDragOver); root.addEventListener('dragleave', onDragLeave);
  root.addEventListener('drop', onDrop); window.addEventListener('resize', render);

  const updateFromMedia = () => { project = mergeVideoMetadata(project, mediaEl); render(); };
  if (mediaEl) {
    mediaEl.addEventListener('loadedmetadata', updateFromMedia);
    mediaEl.addEventListener('durationchange', updateFromMedia);
    if (mediaDuration(mediaEl) > 0 || mediaEl.videoWidth || mediaEl.videoHeight) updateFromMedia();
  }

  root.__mediaMixerVideoSource = {
    getProject: () => project, getViewport: () => viewport,
    buildExportPlan, buildProxyPlan,
    getLastExportPlan: () => lastExportPlan, getLastProxyPlan: () => lastProxyPlan,
    exportSettings: () => exportProjectSettingsJson(project),
    importSettings: settingsUi.importSettings, relinkFiles: settingsUi.relinkFiles,
    getLastSettingsImport: () => settingsUi.getLastImport(),
    dispatch, addMediaFile: addDroppedFile,
  };
  render();

  return {
    getProject: () => project,
    getViewport: () => viewport,
    dispatch,
    destroy() {
      destroyed = true;
      interactions.destroy(); visualRuntime.dispose(); settingsUi.destroy();
      root.removeEventListener('click', onClick, true); root.removeEventListener('input', onInput);
      root.removeEventListener('dragover', onDragOver); root.removeEventListener('dragleave', onDragLeave);
      root.removeEventListener('drop', onDrop); window.removeEventListener('resize', render);
      mediaEl?.removeEventListener?.('loadedmetadata', updateFromMedia);
      mediaEl?.removeEventListener?.('durationchange', updateFromMedia);
      delete root.__mediaMixerVideoSource; root.remove();
    },
  };

  function makeLaneCallbacks(laneId) {
    const ge = (clipId) => project.elements.find((e) => e.id === clipId && e.laneId === laneId) || firstElementForLane(project, laneId);
    return {
      onMove(ds, _v, clipId) { const e = ge(clipId); if (!e) return; project = moveElement(project, e.id, Math.max(0, (e.timeline.startMs || 0) + ds * 1000)); render(); },
      onTrim(side, ds, _v, clipId) {
        const e = ge(clipId); if (!e) return;
        const raw = e.timeline.rawDurationMs || e.timeline.durationMs || 0;
        const ins = e.timeline.sourceInMs || 0; const outs = e.timeline.sourceOutMs || raw;
        project = trimElement(project, e.id, side === 'in'
          ? { sourceInMs: clamp(ins + ds * 1000, 0, outs - 50), sourceOutMs: outs }
          : { sourceInMs: ins, sourceOutMs: clamp(outs + ds * 1000, ins + 50, raw) });
        render();
      },
      onFade(side, ds, _v, clipId) {
        const e = ge(clipId); if (!e) return;
        const field = side === 'in' ? 'fadeInMs' : 'fadeOutMs';
        const sign = side === 'in' ? 1 : -1;
        project = updateElement(project, e.id, (el) => ({ ...el, audio: { ...el.audio, [field]: Math.max(0, (el.audio?.[field] || 0) + sign * ds * 1000) } }));
        render();
      },
      onSeek(sec) { setCursorMs(sec * 1000, { syncMedia: true }); render(); },
      onScroll(px) { viewport = { ...viewport, scrollLeft: px }; syncScroll(px); },
      onSelect(clipId) { const e = ge(clipId); if (e) project = selectTarget(project, { type: 'element', id: e.id }, [{ type: 'element', id: e.id }]); render(); },
    };
  }

  function reconcileLanes() {
    const laneIds = new Set(project.lanes.map((l) => l.id));
    for (const [id, ln] of clipLanes) if (!laneIds.has(id)) { ln.el.remove(); clipLanes.delete(id); }
    for (const lm of project.lanes) {
      if (!clipLanes.has(lm.id)) {
        const el = firstElementForLane(project, lm.id);
        const isVis = !!(el?.capabilities?.hasVideo || el?.capabilities?.hasImage);
        const ln = createClipLane({ label: lm.label || lm.role || 'Lane', kind: lm.role || '', interactive: !isVis, callbacks: makeLaneCallbacks(lm.id) });
        ln.setSurface(root); ln.el.dataset.laneId = lm.id;
        lanesContainer.append(ln.el); clipLanes.set(lm.id, ln);
      }
      const ln = clipLanes.get(lm.id); if (ln) lanesContainer.append(ln.el);
    }
  }

  function render() {
    if (destroyed) return;
    viewport = { ...viewport, width: root.clientWidth || viewport.width || 960 };
    if (zoomRange) zoomRange.value = String(viewport.pxPerMs);
    reconcileLanes();
    for (const [laneId, ln] of clipLanes) {
      const clipView = buildLaneClips(project, laneId, viewport.cursorMs, viewport.pxPerMs * 1000);
      if (clipView) ln.update(clipView);
      const el = firstElementForLane(project, laneId);
      if (el?.capabilities?.hasVideo || el?.capabilities?.hasImage) {
        ln.canvasWrap.querySelector('.mmx-thumb-strip')?.remove();
        ln.canvasWrap.append(buildThumbnailStrip(el, visualRuntime.thumbnails));
        // Badge lives on the first clip block (clips reconcile each update, so recreate it here).
        ln.el.querySelector('.mmx-element-visual')?.remove();
        if (ln.clip) {
          const badge = Object.assign(document.createElement('span'), { className: 'mmx-element-visual' });
          badge.textContent = el.capabilities?.hasVideo ? 'Video frame' : 'Image frame';
          badge.dataset.opacity = String(el.visual?.opacity ?? 1);
          if (el.capabilities?.needsFfmpegForPreview) badge.dataset.needsProxy = 'true';
          ln.clip.append(badge);
        }
      }
    }
    syncScroll(viewport.scrollLeft);
    visualRuntime.update(project, viewport.cursorMs);
    root.querySelectorAll('.mmx-frame-preview').forEach((n) => n.remove());
    if (hasVisualElements(project)) {
      const snap = createMixerSnapshot(project);
      const previewPanel = renderSeekFramePreview(root, buildSeekFramePreview(snap, viewport.cursorMs, { frames: visualRuntime.frames, thumbnails: visualRuntime.thumbnails }));
      lanesContainer.before(previewPanel);
    }
    // Extract inspector from a throwaway renderMixerShell call; replaces/appends it to root.
    const tmp = document.createElement('div');
    const { elements: { inspector: ni } } = renderMixerShell(tmp, createMixerSnapshot(project), viewport, { visualThumbnails: visualRuntime.thumbnails });
    ni.remove();
    const old = root.querySelector('.mmx-inspector');
    if (old) old.replaceWith(ni); else root.append(ni);
    decorate();
    root.querySelector('.mmx-settings-controls')?.remove();
    root.querySelectorAll('.mmx-relink-modal').forEach((n) => n.remove());
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
    root.dataset.ffmpegEnabled = runtime.ffmpegEnabled ? 'true' : 'false';
    root.dataset.videoExportStatus = lastExportPlan?.status || '';
    root.dataset.videoExportCanRender = lastExportPlan?.canRender ? 'true' : 'false';
    root.dataset.videoProxyStatus = lastProxyPlan?.status || '';
    root.dataset.videoProxyCanRender = lastProxyPlan?.canRender ? 'true' : 'false';
    const toolbarEl = root.querySelector('.mmx-toolbar');
    if (toolbarEl && !toolbarEl.querySelector('.mmx-video-source-note')) {
      const note = document.createElement('div');
      note.className = 'mmx-video-source-note';
      note.textContent = runtime.ffmpegEnabled
        ? 'Source video lane: visual transforms, trims, and frame preview are active.'
        : 'Source video lane: browser preview active; ffmpeg opt-in unlocks conversion and final video render.';
      toolbarEl.append(note);
    }
    if (toolbarEl && !toolbarEl.querySelector('.mmx-video-export-plan')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mmx-video-export-plan';
      button.textContent = 'Plan final export';
      toolbarEl.append(button);
    }
    if (toolbarEl && !toolbarEl.querySelector('.mmx-video-second-drop')) {
      toolbarEl.append(renderSecondMediaControls(project));
    }
    const inspector = root.querySelector('.mmx-inspector');
    if (inspector) {
      const proxyPlan = lastProxyPlan || buildProxyPlan();
      if (proxyPlan.provenance.assets.length) inspector.append(renderVideoProxyPlanPanel(proxyPlan, runtime));
      const exportStatus = renderVideoExportPlanPanel(lastExportPlan || buildExportPlan(), runtime);
      const workingCopyButton = buildWorkingCopyButton(lastRenderedOutput, options.workingCopy, 'al-btn media-working-copy');
      if (workingCopyButton) exportStatus.append(workingCopyButton);
      inspector.append(exportStatus);
    }
  }

  function onClick(event) {
    const button = event.target?.closest?.('button');
    if (!button || !root.contains(button)) return;
    if (button.matches('.mmx-video-export-plan')) {
      lastExportPlan = buildExportPlan();
      root.dataset.lastVideoExportPlan = JSON.stringify(lastExportPlan.provenance);
      render();
      return;
    }
    if (button.matches('.mmx-video-proxy-run')) {
      renderPreviewProxies();
      return;
    }
    if (button.matches('.mmx-video-transition-apply')) {
      applyToolbarTransition();
      return;
    }
    if (button.matches('.mmx-video-edit-apply')) {
      applyToolbarEdit();
      return;
    }
    if (button.matches('.mmx-video-render-run')) renderFinalExport();
  }

  function onInput(event) {
    const target = event.target;
    if (target?.matches?.('.mmx-video-music-bed')) {
      const gain = clamp(Number(target.value), 0, 1);
      project = updateMusicBedGain(project, gain);
      root.dataset.musicBedGain = String(gain);
      render();
      return;
    }
    if (target?.matches?.('.mmx-video-transition-kind, .mmx-video-transition-duration')) {
      syncTransitionReadout(root, project);
      return;
    }
    if (target?.matches?.('.mmx-video-trim-in, .mmx-video-trim-out, .mmx-video-fade-in, .mmx-video-fade-out')) {
      syncEditReadout(root, project);
    }
  }

  function onDragOver(event) {
    if (!hasMixerFileDrop(event.dataTransfer)) return;
    event.preventDefault();
    event.stopPropagation();
    root.classList.add('mmx-video-drop-active');
  }

  function onDragLeave(event) {
    if (!root.contains(event.relatedTarget)) root.classList.remove('mmx-video-drop-active');
  }

  function onDrop(event) {
    const files = [...(event.dataTransfer?.files || [])].filter(isMixerDropFile);
    if (!files.length) return;
    event.preventDefault();
    event.stopPropagation();
    root.classList.remove('mmx-video-drop-active');
    for (const file of files) addDroppedFile(file, { startMs: viewport.cursorMs });
  }

  function addDroppedFile(file, input = {}) {
    const result = addDroppedMediaFile(project, file, { startMs: input.startMs ?? viewport.cursorMs });
    if (!result) return null;
    project = result.project;
    runtimeFiles.set(result.assetId, file);
    if (result.kind === 'audio') {
      project = updateElement(project, result.elementId, (element) => ({
        ...element,
        audio: { ...element.audio, gain: 0.35 },
      }));
      root.dataset.lastMusicBed = file.name || 'audio';
    }
    if (result.elementId) {
      project = selectTarget(project, { type: 'element', id: result.elementId }, [{ type: 'element', id: result.elementId }]);
    }
    root.dataset.lastDroppedKind = result.kind;
    if (result.kind !== 'audio') root.dataset.lastDroppedVisual = file.name || result.kind;
    render();
    if (result.kind === 'audio') decodeDroppedAudio(file, result.assetId, result.elementId);
    if (result.kind === 'image' || result.kind === 'video') probeDroppedVisual(file, result);
    return result;
  }

  function decodeDroppedAudio(file, assetId, elementId) {
    decodeSummary({ file, filename: file.name, mime: file.type, size: file.size }).then((summary) => {
      if (destroyed || !summary) return;
      project = applyDroppedAudioSummary(project, assetId, elementId, summary);
      project = updateElement(project, elementId, (element) => ({
        ...element,
        audio: { ...element.audio, gain: 0.35 },
      }));
      render();
    }).catch(() => {
      if (!destroyed) root.dataset.lastDropDecode = 'unavailable';
    });
  }

  function probeDroppedVisual(file, drop) {
    probeDroppedVisualMetadata(file, drop.kind).then((metadata) => {
      if (destroyed || !metadata) return;
      project = applyDroppedVisualMetadata(project, drop.assetId, drop.elementId, metadata);
      root.dataset.lastVisualMetadata = metadata.status || 'available';
      render();
    }).catch(() => {
      if (!destroyed) root.dataset.lastVisualMetadata = 'metadata-unavailable';
    });
  }

  function buildExportPlan() {
    return buildVideoMixExportPlan(project, {
      ffmpegEnabled: runtime.ffmpegEnabled,
      ffmpegLoaded: runtime.ffmpegLoaded,
      filename: `${(intake?.filename || 'video-source').replace(/\.[^.]+$/, '')}.mp4`,
    });
  }

  function buildProxyPlan() {
    return buildVideoProxyPlan(project, {
      ffmpegEnabled: runtime.ffmpegEnabled,
      ffmpegLoaded: runtime.ffmpegLoaded,
    });
  }

  function applyToolbarTransition() {
    const target = selectedVisualElement(project) || latestVisualElement(project);
    if (!target) return;
    const kind = root.querySelector('.mmx-video-transition-kind')?.value || 'dissolve';
    const seconds = Number(root.querySelector('.mmx-video-transition-duration')?.value);
    const durationMs = Math.max(0, Math.round((Number.isFinite(seconds) ? seconds : 0) * 1000));
    project = setElementTransition(project, target.id, {
      kind,
      durationMs,
      fromElementId: previousVisualElement(project, target)?.id || null,
    });
    project = selectTarget(project, { type: 'element', id: target.id }, [{ type: 'element', id: target.id }]);
    root.dataset.lastTransitionTarget = target.id;
    root.dataset.lastTransitionKind = kind;
    root.dataset.lastTransitionMs = String(durationMs);
    lastExportPlan = buildExportPlan();
    root.dataset.lastVideoExportPlan = JSON.stringify(lastExportPlan.provenance);
    render();
  }

  function applyToolbarEdit() {
    const target = selectedEditableElement(project) || project.elements[0];
    if (!target) return;
    const sourceInMs = secondsInput(root, '.mmx-video-trim-in', target.timeline?.sourceInMs || 0);
    const sourceOutFallback = target.timeline?.sourceOutMs || target.timeline?.rawDurationMs || target.timeline?.durationMs || sourceInMs;
    const sourceOutMs = secondsInput(root, '.mmx-video-trim-out', sourceOutFallback);
    const fadeInMs = secondsInput(root, '.mmx-video-fade-in', target.audio?.fadeInMs || target.visual?.fadeInMs || 0);
    const fadeOutMs = secondsInput(root, '.mmx-video-fade-out', target.audio?.fadeOutMs || target.visual?.fadeOutMs || 0);
    project = trimElement(project, target.id, { sourceInMs, sourceOutMs });
    project = updateElement(project, target.id, (element) => ({
      ...element,
      audio: { ...element.audio, fadeInMs, fadeOutMs },
      visual: {
        ...element.visual,
        fadeInMs: isVisualElement(element) ? fadeInMs : element.visual?.fadeInMs,
        fadeOutMs: isVisualElement(element) ? fadeOutMs : element.visual?.fadeOutMs,
      },
    }));
    project = selectTarget(project, { type: 'element', id: target.id }, [{ type: 'element', id: target.id }]);
    root.dataset.lastEditTarget = target.id;
    root.dataset.lastTrimInMs = String(sourceInMs);
    root.dataset.lastTrimOutMs = String(sourceOutMs);
    root.dataset.lastFadeInMs = String(fadeInMs);
    root.dataset.lastFadeOutMs = String(fadeOutMs);
    lastExportPlan = buildExportPlan();
    root.dataset.lastVideoExportPlan = JSON.stringify(lastExportPlan.provenance);
    render();
  }

  async function renderFinalExport() {
    lastExportPlan = buildExportPlan();
    root.dataset.lastVideoExportPlan = JSON.stringify(lastExportPlan.provenance);
    if (!runtime.ffmpegEnabled) {
      root.dataset.videoExportRunState = 'opt-in-required';
      render();
      return;
    }
    root.dataset.videoExportRunState = 'loading';
    root.dataset.videoExportError = '';
    render();
    try {
      const { loadFfmpeg } = await import('../transcoder.js');
      const ff = await loadFfmpeg(({ ratio }) => {
        root.dataset.videoExportProgress = String(Math.round((ratio || 0) * 100));
      });
      runtime.ffmpegLoaded = true;
      lastExportPlan = buildExportPlan();
      root.dataset.lastVideoExportPlan = JSON.stringify(lastExportPlan.provenance);
      root.dataset.videoExportRunState = 'rendering';
      render();
      const result = await renderVideoMixWithFfmpeg(ff, lastExportPlan, runtimeFiles);
      root.dataset.videoExportRunState = 'complete';
      root.dataset.lastVideoExportBytes = String(result.bytes);
      root.dataset.lastVideoExportFilename = result.filename;
      lastRenderedOutput = result;
      downloadBlob(result.blob, result.filename);
    } catch (error) {
      const { formatFfmpegError } = await import('../transcoder.js').catch(() => ({ formatFfmpegError: (err) => err?.message || String(err) }));
      root.dataset.videoExportRunState = 'error';
      root.dataset.videoExportError = formatFfmpegError(error);
    } finally {
      render();
    }
  }

  async function renderPreviewProxies() {
    await runVideoProxyRender({
      root,
      runtime,
      runtimeFiles,
      buildPlan: buildProxyPlan,
      setPlan: (plan) => { lastProxyPlan = plan; },
      applyProxies: (proxies) => {
        project = applyVideoProxyResults(project, runtimeFiles, proxies);
        lastProxyPlan = buildProxyPlan();
      },
      render,
    });
  }
}
