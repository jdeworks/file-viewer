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
  updateElement,
  updateLane,
  updateMaster,
} from './index.js';
import { renderMixerShell } from './mixer-renderer.js';
import { attachMixerInteractions } from './mixer-interactions.js';
import { ensureMixerStyles } from './mixer-ui.js';
import {
  buildProject,
  clamp,
  clampZoom,
  decodeSummary,
  mediaDuration,
  mergeDuration,
  selectFirstElement,
} from './mixer-audio-listen-helpers.js';
import { MIXER_LAYOUT } from './mixer-hit-test.js';
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
import { decorateMultiToolbar, reflectMultiPlaybackState } from './mixer-audio-multi-decorators.js';
import { createProjectSettingsUi } from './mixer-project-settings-ui.js';
import {
  addGeneratedLane,
  decorateInspector,
  decorateLanes,
  firstElementForLane,
  fitZoom,
  hasVisualElements,
  reflectState,
  selectedElementStart,
} from './mixer-audio-multi-ui.js';

export function mountModularAudioMixer(panel, intake, mediaEl = null, options = {}) {
  ensureMixerStyles();
  const root = document.createElement('section');
  root.className = 'mmx-audio-multi mmx-mix';
  root.dataset.mixerContext = 'mix';
  root.tabIndex = -1;
  panel.append(root);
  let project = selectFirstElement(buildProject(mediaEl || {}, intake || {}));
  let viewport = { cursorMs: 0, scrollLeft: 0, pxPerMs: 0.06, width: 960 };
  let waveformSummary = null;
  let destroyed = false;
  let draggingElement = null;
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
    decorateShell();
    reflectState(root, project, viewport, {
      waveformSummary, lastVideoExportPlan, lastProxyPlan, decodedAudioCache, playback,
    });
  }
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
  const interactions = attachMixerInteractions(root, () => ({
    project,
    snapshot: createMixerSnapshot(project),
    viewport,
  }), dispatch);
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
  };
  const onClick = (event) => {
    const target = event.target;
    const button = target?.closest?.('button');
    if (!button || !root.contains(button)) return;
    if (button.matches('.mmx-mix-add-tone')) {
      project = addGeneratedLane(project, 'tone', 'Tone', { kind: 'tone', frequency: 440, levelDb: -18 });
      render();
      return;
    }
    if (button.matches('.mmx-mix-add-pink')) {
      project = addGeneratedLane(project, 'room-tone', 'Pink noise bed', { kind: 'pink-noise', levelDb: -52 });
      render();
      return;
    }
    if (button.matches('.mmx-mix-mute, .mmx-mix-solo')) {
      const field = button.matches('.mmx-mix-mute') ? 'muted' : 'solo';
      project = updateLane(project, button.dataset.laneId, (lane) => ({ ...lane, [field]: !lane[field] }));
      render();
      return;
    }
    if (button.matches('.mmx-mix-play')) {
      playback.play();
      return;
    }
    if (button.matches('.mmx-mix-stop')) {
      playback.stop({ resetCursor: true });
      render();
      return;
    }
    if (button.matches('.mmx-mix-download')) {
      downloadMixdown();
      return;
    }
    if (button.matches('.mmx-mix-video-export-plan')) {
      lastVideoExportPlan = buildVideoExportPlan();
      root.dataset.lastVideoExportPlan = JSON.stringify(lastVideoExportPlan.provenance);
      render();
      return;
    }
    if (button.matches('.mmx-video-proxy-run')) {
      renderPreviewProxies();
      return;
    }
    if (button.matches('.mmx-video-render-run')) renderFinalVideoExport();
  };
  const onPointerDown = (event) => {
    const element = event.target?.closest?.('.mmx-element');
    if (!element || !root.contains(element) || event.button !== 0) return;
    draggingElement = {
      id: element.dataset.elementId,
      startX: event.clientX,
      startMs: selectedElementStart(project, element.dataset.elementId),
      pointerId: event.pointerId,
      moved: false,
    };
    try { element.setPointerCapture?.(event.pointerId); } catch { /* synthetic capture may fail */ }
  };
  const onPointerMove = (event) => {
    if (!draggingElement || event.pointerId !== draggingElement.pointerId) return;
    const deltaMs = (event.clientX - draggingElement.startX) / Math.max(0.001, viewport.pxPerMs);
    if (Math.abs(deltaMs) < 20) return;
    draggingElement.moved = true;
    project = moveElement(project, draggingElement.id, Math.max(0, draggingElement.startMs + deltaMs));
    render();
    event.preventDefault();
  };
  const onPointerUp = (event) => {
    if (draggingElement && event.pointerId === draggingElement.pointerId) draggingElement = null;
  };
  root.addEventListener('input', onInput);
  root.addEventListener('click', onClick, true);
  root.addEventListener('pointerdown', onPointerDown);
  root.addEventListener('pointermove', onPointerMove);
  root.addEventListener('pointerup', onPointerUp);
  root.addEventListener('pointercancel', onPointerUp);
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
      interactions.destroy();
      visualRuntime.dispose();
      settingsUi.destroy();
      decodedAudioCache.releaseProject(project.project.id);
      root.removeEventListener('input', onInput);
      root.removeEventListener('click', onClick, true);
      root.removeEventListener('pointerdown', onPointerDown);
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerup', onPointerUp);
      root.removeEventListener('pointercancel', onPointerUp);
      root.removeEventListener('dragover', onDragOver);
      root.removeEventListener('dragleave', onDragLeave);
      root.removeEventListener('drop', onDrop);
      window.removeEventListener('resize', render);
      delete root.__mediaMixerMulti;
      root.remove();
    },
  };

  function decorateShell() {
    root.querySelector('.mmx-ruler')?.classList.add('mmx-mix-ruler');
    root.querySelector('.mmx-playhead')?.classList.add('mmx-mix-playhead');
    root.querySelector('.mmx-lanes')?.classList.add('mmx-mix-lanes');
    root.querySelector('.mmx-body')?.classList.add('mmx-mix-timeline');
    const toolbar = root.querySelector('.mmx-toolbar');
    if (toolbar) decorateMultiToolbar(toolbar, project);
    decorateLanes(root, project);
    decorateInspector(root, project, runtime, {
      lastProxyPlan, lastVideoExportPlan, buildProxyPlan, buildVideoExportPlan,
    });
    settingsUi.decorate();
  }

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
