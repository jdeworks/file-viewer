import {
  captureElementKeyframe,
  createAudioBufferCache,
  createMixerSnapshot,
  exportProjectSettingsJson,
  buildAudioMixExportPlan,
  buildVideoMixExportPlan,
  buildVideoProxyPlan,
  applyVideoProxyResults,
  moveElement,
  renderVideoMixWithFfmpeg,
  renderAudioMixToWav,
  runVideoProxyRender,
  selectTarget,
  trimElement,
  updateElement,
  updateLane,
  updateMaster,
} from './index.js';
import { ensureMixerStyles } from './mixer-ui.js';
import { ensureAudioListenStyles } from './mixer-audio-listen.js';
import { createClipLane } from './audio-clip-lane.js';
import { buildSeekFramePreview, renderSeekFramePreview } from './mixer-visual-preview.js';
import {
  buildProject,
  clamp,
  clampZoom,
  decodeSummary,
  mediaDuration,
  mergeDuration,
  selectFirstElement,
} from './mixer-audio-listen-helpers.js';
import {
  downloadBlob,
  updateProjectElementField,
} from './mixer-audio-multi-helpers.js';
import {
  addDroppedMediaFile,
  applyDroppedAudioSummary,
  applyDroppedVisualMetadata,
  hasMixerFileDrop,
  isMixerDropFile,
  probeDroppedVisualMetadata,
} from './mixer-media-drop.js';
import { createMixerVisualRuntime } from './mixer-visual-runtime.js';
import { createMixerAudioPlayback } from './mixer-audio-playback.js';
import { reflectMultiPlaybackState } from './mixer-audio-multi-decorators.js';
import { createProjectSettingsUi } from './mixer-project-settings-ui.js';
import {
  addGeneratedLane,
  buildClipView,
  buildLaneControlsEl,
  buildMixToolbar,
  buildThumbnailStrip,
  decorateInspector,
  firstElementForLane,
  fitZoom,
  hasVisualElements,
  reflectState,
  updateLaneControlsState,
} from './mixer-audio-multi-ui.js';

export function mountModularAudioMixer(panel, intake, mediaEl = null, options = {}) {
  ensureMixerStyles();
  ensureAudioListenStyles();
  const root = document.createElement('section');
  root.className = 'mmx-audio-multi mmx-mix al-surface';
  root.dataset.mixerContext = 'mix';
  root.tabIndex = -1;
  panel.append(root);
  let project = selectFirstElement(buildProject(mediaEl || {}, intake || {}));
  let viewport = { cursorMs: 0, scrollLeft: 0, pxPerMs: 0.06, width: 960 };
  let waveformSummary = null;
  let destroyed = false;
  let lastExportPlan = null;
  let lastVideoExportPlan = null;
  let lastProxyPlan = null;
  const decodedAudioCache = createAudioBufferCache({ budgetBytes: options.decodedAudioBudgetBytes });
  const runtimeFiles = new Map();
  if (intake?.file) runtimeFiles.set('asset-listen-source', intake.file);
  const visualRuntime = createMixerVisualRuntime({ runtimeFiles, onUpdate: render });
  const runtime = {
    ffmpegEnabled: !!options.enableFfmpeg,
    ffmpegLoaded: !!options.ffmpegLoaded,
    canExportAudioMixBrowser: true,
  };
  const setCursorMs = (cursorMs) => {
    viewport = { ...viewport, cursorMs: Math.max(0, Number(cursorMs) || 0) };
  };
  const playback = createMixerAudioPlayback({
    getProject: () => project,
    getViewport: () => viewport,
    setCursorMs,
    cache: decodedAudioCache,
    runtimeFiles,
    onState: (state) => reflectMultiPlaybackState(root, state),
    onTick: render,
  });
  const settingsUi = createProjectSettingsUi({
    root,
    getProject: () => project,
    setProject: (next) => { project = next; },
    runtimeFiles,
    render,
    filename: `${(intake?.filename || 'media-mix').replace(/\.[^.]+$/, '')}.mixer.json`,
  });

  const { toolbar, masterSlider, videoPlanBtn } = buildMixToolbar();
  const lanesContainer = document.createElement('div');
  lanesContainer.className = 'al-lanes';
  const inspector = document.createElement('aside');
  inspector.className = 'mmx-inspector';
  root.append(toolbar, lanesContainer, inspector);
  const clipLanes = new Map();

  const dispatch = (action) => {
    if (action.type === 'seek') setCursorMs(action.cursorMs);
    if (action.type === 'zoom') viewport = { ...viewport, pxPerMs: clampZoom(action.pxPerMs) };
    if (action.type === 'zoom-relative') viewport = { ...viewport, pxPerMs: clampZoom(viewport.pxPerMs * action.factor) };
    if (action.type === 'pan') viewport = { ...viewport, scrollLeft: Math.max(0, Number(action.scrollLeft) || 0) };
    if (action.type === 'fit') viewport = { ...viewport, scrollLeft: 0, pxPerMs: fitZoom(root, project) };
    if (action.type === 'select') project = selectTarget(project, action.target, [action.target]);
    if (action.type === 'capture-keyframe') project = captureElementKeyframe(project, action.elementId, viewport.cursorMs);
    if (action.type === 'update-element') project = updateProjectElementField(project, action);
    render();
  };

  function makeLaneCallbacks(laneId) {
    const ge = () => firstElementForLane(project, laneId);
    return {
      onMove(ds) { const e = ge(); if (!e) return; project = moveElement(project, e.id, Math.max(0, (e.timeline.startMs || 0) + ds * 1000)); render(); },
      onTrim(side, ds) {
        const e = ge(); if (!e) return;
        const raw = e.timeline.rawDurationMs || e.timeline.durationMs || 0;
        const ins = e.timeline.sourceInMs || 0; const outs = e.timeline.sourceOutMs || raw;
        project = trimElement(project, e.id, side === 'in'
          ? { sourceInMs: clamp(ins + ds * 1000, 0, outs - 50), sourceOutMs: outs }
          : { sourceInMs: ins, sourceOutMs: clamp(outs + ds * 1000, ins + 50, raw) });
        render();
      },
      onFade(side, ds) {
        const e = ge(); if (!e) return;
        const field = side === 'in' ? 'fadeInMs' : 'fadeOutMs';
        const sign = side === 'in' ? 1 : -1;
        project = updateElement(project, e.id, (el) => ({ ...el, audio: { ...el.audio, [field]: Math.max(0, (el.audio?.[field] || 0) + sign * ds * 1000) } }));
        render();
      },
      onSeek(sec) { setCursorMs(sec * 1000); render(); },
      onSelect() { const e = ge(); if (e) project = selectTarget(project, { type: 'element', id: e.id }, [{ type: 'element', id: e.id }]); render(); },
    };
  }

  function reconcileLanes() {
    const laneIds = new Set(project.lanes.map((l) => l.id));
    for (const [id, lane] of clipLanes) if (!laneIds.has(id)) { lane.el.remove(); clipLanes.delete(id); }
    for (const lm of project.lanes) {
      if (!clipLanes.has(lm.id)) {
        const el = firstElementForLane(project, lm.id);
        const isVis = !!(el?.capabilities?.hasVideo || el?.capabilities?.hasImage);
        const lane = createClipLane({ label: lm.label || lm.role || 'Lane', kind: lm.role || '', interactive: !isVis, callbacks: makeLaneCallbacks(lm.id) });
        lane.setSurface(root);
        lane.el.dataset.laneId = lm.id;
        lane.el.querySelector('.al-track-label').append(buildLaneControlsEl(lm, el));
        lanesContainer.append(lane.el);
        clipLanes.set(lm.id, lane);
      }
      const lane = clipLanes.get(lm.id);
      if (lane) lanesContainer.append(lane.el);
    }
  }

  function render() {
    if (destroyed) return;
    viewport = { ...viewport, width: root.clientWidth || viewport.width || 960 };
    reconcileLanes();
    masterSlider.value = String(project.master?.audio?.gain ?? 1);
    videoPlanBtn.hidden = !hasVisualElements(project);
    for (const [laneId, lane] of clipLanes) {
      const laneModel = project.lanes.find((l) => l.id === laneId);
      if (!laneModel) continue;
      const clipView = buildClipView(project, laneId, viewport.cursorMs);
      if (clipView) lane.update(clipView);
      updateLaneControlsState(lane.el, laneModel, firstElementForLane(project, laneId));
      const element = firstElementForLane(project, laneId);
      if (element?.capabilities?.hasVideo || element?.capabilities?.hasImage) {
        lane.canvasWrap.querySelector('.mmx-thumb-strip')?.remove();
        lane.canvasWrap.append(buildThumbnailStrip(element, visualRuntime.thumbnails));
      }
    }
    const snapshot = createMixerSnapshot(project);
    visualRuntime.update(project, viewport.cursorMs);
    root.querySelectorAll('.mmx-frame-preview').forEach((el) => el.remove());
    if (hasVisualElements(project)) {
      const preview = buildSeekFramePreview(snapshot, viewport.cursorMs, { frames: visualRuntime.frames, thumbnails: visualRuntime.thumbnails });
      renderSeekFramePreview(root, preview);
    }
    inspector.replaceChildren();
    decorateInspector(root, project, runtime, { lastProxyPlan, lastVideoExportPlan, buildProxyPlan, buildVideoExportPlan });
    reflectState(root, project, viewport, { waveformSummary, lastVideoExportPlan, lastProxyPlan, decodedAudioCache, playback });
    root.querySelector('.mmx-settings-controls')?.remove();
    root.querySelectorAll('.mmx-relink-modal').forEach((el) => el.remove());
    settingsUi.decorate();
  }

  const onInput = (event) => {
    const target = event.target;
    if (!target?.matches) return;
    if (target.matches('.mmx-mix-lane-gain')) {
      project = updateLane(project, target.dataset.laneId, (lane) => ({
        ...lane,
        audio: { ...lane.audio, gain: clamp(Number(target.value), 0, 2) },
      }));
      render();
    }
    if (target.matches('.mmx-mix-master-slider')) {
      project = updateMaster(project, (master) => ({
        ...master,
        audio: { ...master.audio, gain: clamp(Number(target.value), 0, 2) },
      }));
      render();
    }
    if (target.matches('.mmx-mix-fade-in, .mmx-mix-fade-out')) {
      const field = target.matches('.mmx-mix-fade-in') ? 'fadeInMs' : 'fadeOutMs';
      const elementId = firstElementForLane(project, target.dataset.laneId)?.id;
      if (elementId) {
        project = updateElement(project, elementId, (element) => ({
          ...element,
          audio: { ...element.audio, [field]: Math.max(0, Number(target.value) || 0) },
        }));
        render();
      }
    }
    if (target.dataset?.action === 'update-element') {
      project = updateProjectElementField(project, {
        type: 'update-element',
        elementId: target.dataset.elementId,
        field: target.dataset.field,
        value: target.dataset.valueType === 'string' ? target.value : Number(target.value),
      });
      render();
    }
  };
  const onClick = (event) => {
    const target = event.target;
    const button = target?.closest?.('button');
    if (!button || !root.contains(button)) return;
    if (button.matches('.mmx-mix-add-tone')) {
      project = addGeneratedLane(project, 'tone', 'Tone', { kind: 'tone', frequency: 440, levelDb: -18 });
      render(); return;
    }
    if (button.matches('.mmx-mix-add-pink')) {
      project = addGeneratedLane(project, 'room-tone', 'Pink noise bed', { kind: 'pink-noise', levelDb: -52 });
      render(); return;
    }
    if (button.matches('.mmx-mix-mute, .mmx-mix-solo')) {
      const field = button.matches('.mmx-mix-mute') ? 'muted' : 'solo';
      project = updateLane(project, button.dataset.laneId, (lane) => ({ ...lane, [field]: !lane[field] }));
      render(); return;
    }
    if (button.matches('.mmx-mix-play')) { playback.play(); return; }
    if (button.matches('.mmx-mix-stop')) { playback.stop({ resetCursor: true }); render(); return; }
    if (button.matches('.mmx-mix-download')) { downloadMixdown(); return; }
    if (button.matches('.mmx-mix-video-export-plan')) {
      lastVideoExportPlan = buildVideoExportPlan();
      root.dataset.lastVideoExportPlan = JSON.stringify(lastVideoExportPlan.provenance);
      render(); return;
    }
    if (button.matches('.mmx-video-proxy-run')) { renderPreviewProxies(); return; }
    if (button.matches('.mmx-video-render-run')) renderFinalVideoExport();
  };
  root.addEventListener('input', onInput);
  root.addEventListener('click', onClick, true);
  root.addEventListener('dragover', onDragOver);
  root.addEventListener('dragleave', onDragLeave);
  root.addEventListener('drop', onDrop);
  window.addEventListener('resize', render);

  if (mediaEl) {
    const updateFromMedia = () => {
      const durationMs = Math.max(0, mediaDuration(mediaEl) * 1000);
      project = mergeDuration(project, durationMs);
      render();
    };
    mediaEl.addEventListener('loadedmetadata', updateFromMedia, { once: true });
    if (mediaDuration(mediaEl) > 0) project = mergeDuration(project, mediaDuration(mediaEl) * 1000);
  }

  decodeSummary(intake || {}).then((summary) => {
    if (destroyed || !summary) return;
    waveformSummary = summary;
    const id = project.elements[0]?.id;
    if (id) {
      project = updateElement(mergeDuration(project, summary.duration * 1000), id, (element) => ({
        ...element,
        analysis: { ...element.analysis, waveformSummary: summary },
      }));
    }
    render();
  }).catch(() => {});

  root.__mediaMixerMulti = {
    getProject: () => project,
    getViewport: () => viewport,
    exportSettings: () => exportProjectSettingsJson(project),
    getAudioCacheStats: () => decodedAudioCache.stats(),
    getPlaybackState: () => playback.getState(),
    getLastExportPlan: () => lastExportPlan,
    getLastVideoExportPlan: () => lastVideoExportPlan,
    getLastProxyPlan: () => lastProxyPlan,
    buildVideoExportPlan,
    buildProxyPlan,
    getLastSettingsImport: () => settingsUi.getLastImport(),
    dispatch,
    importSettings: settingsUi.importSettings,
    relinkFiles: settingsUi.relinkFiles,
    addPinkNoise() {
      project = addGeneratedLane(project, 'room-tone', 'Pink noise bed', { kind: 'pink-noise', levelDb: -52 });
      render();
    },
    addTone() {
      project = addGeneratedLane(project, 'tone', 'Tone', { kind: 'tone', frequency: 440, levelDb: -18 });
      render();
    },
    addAudioFile: addDroppedFile,
    addMediaFile: addDroppedFile,
  };

  render();

  return {
    getProject: () => project,
    getViewport: () => viewport,
    getAudioCacheStats: () => decodedAudioCache.stats(),
    getPlaybackState: () => playback.getState(),
    getLastExportPlan: () => lastExportPlan,
    getLastVideoExportPlan: () => lastVideoExportPlan,
    getLastProxyPlan: () => lastProxyPlan,
    buildVideoExportPlan,
    buildProxyPlan,
    dispatch,
    destroy() {
      destroyed = true;
      playback.destroy();
      visualRuntime.dispose();
      settingsUi.destroy();
      decodedAudioCache.releaseProject(project.project.id);
      root.removeEventListener('input', onInput);
      root.removeEventListener('click', onClick, true);
      root.removeEventListener('dragover', onDragOver);
      root.removeEventListener('dragleave', onDragLeave);
      root.removeEventListener('drop', onDrop);
      window.removeEventListener('resize', render);
      delete root.__mediaMixerMulti;
      root.remove();
    },
  };

  function addDroppedFile(file, input = {}) {
    const result = addDroppedMediaFile(project, file, { startMs: input.startMs ?? viewport.cursorMs });
    if (!result) return null;
    project = result.project;
    runtimeFiles.set(result.assetId, file);
    if (result.elementId) project = selectTarget(project, { type: 'element', id: result.elementId }, [{ type: 'element', id: result.elementId }]);
    root.dataset.lastDroppedKind = result.kind;
    if (result.kind === 'audio') root.dataset.lastDroppedAudio = file.name || 'audio';
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

  function onDragOver(event) {
    if (!hasMixerFileDrop(event.dataTransfer)) return;
    event.preventDefault();
    event.stopPropagation();
    root.classList.add('mmx-mix-drop-active');
  }

  function onDragLeave(event) {
    if (!root.contains(event.relatedTarget)) root.classList.remove('mmx-mix-drop-active');
  }

  function onDrop(event) {
    const files = [...(event.dataTransfer?.files || [])].filter(isMixerDropFile);
    if (!files.length) return;
    event.preventDefault();
    event.stopPropagation();
    root.classList.remove('mmx-mix-drop-active');
    for (const file of files) addDroppedFile(file, { startMs: viewport.cursorMs });
  }

  function downloadMixdown() {
    lastExportPlan = buildAudioMixExportPlan(project);
    root.dataset.lastMixdownPlan = JSON.stringify(lastExportPlan.provenance);
    renderAudioMixToWav(project, { runtimeFiles, cache: decodedAudioCache }).then(({ blob, plan }) => {
      lastExportPlan = plan;
      root.dataset.lastMixdownPlan = JSON.stringify(plan.provenance);
      root.dataset.lastMixdownBytes = String(blob.size);
      downloadBlob(blob, plan.filename);
    }).catch((error) => {
      root.dataset.lastMixdownError = error?.message || String(error);
    });
  }

  function buildVideoExportPlan() {
    return buildVideoMixExportPlan(project, {
      ffmpegEnabled: runtime.ffmpegEnabled,
      ffmpegLoaded: runtime.ffmpegLoaded,
      filename: `${(intake?.filename || 'media-mix').replace(/\.[^.]+$/, '')}.mp4`,
    });
  }

  function buildProxyPlan() {
    return buildVideoProxyPlan(project, {
      ffmpegEnabled: runtime.ffmpegEnabled,
      ffmpegLoaded: runtime.ffmpegLoaded,
    });
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

  async function renderFinalVideoExport() {
    lastVideoExportPlan = buildVideoExportPlan();
    root.dataset.lastVideoExportPlan = JSON.stringify(lastVideoExportPlan.provenance);
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
      lastVideoExportPlan = buildVideoExportPlan();
      root.dataset.lastVideoExportPlan = JSON.stringify(lastVideoExportPlan.provenance);
      root.dataset.videoExportRunState = 'rendering';
      render();
      const result = await renderVideoMixWithFfmpeg(ff, lastVideoExportPlan, runtimeFiles);
      root.dataset.videoExportRunState = 'complete';
      root.dataset.lastVideoExportBytes = String(result.bytes);
      root.dataset.lastVideoExportFilename = result.filename;
      downloadBlob(result.blob, result.filename);
    } catch (error) {
      const { formatFfmpegError } = await import('../transcoder.js').catch(() => ({ formatFfmpegError: (err) => err?.message || String(err) }));
      root.dataset.videoExportRunState = 'error';
      root.dataset.videoExportError = formatFfmpegError(error);
    } finally {
      render();
    }
  }
}
