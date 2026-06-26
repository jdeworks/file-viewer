import {
  addElement,
  addLane,
  createAudioBufferCache,
  createGeneratedElement,
  createLane,
  createMixerSnapshot,
  evaluateMixerCapabilities,
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
  summarizeReducedCapabilities,
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
  createButton,
  decodeSummary,
  fmtTime,
  mediaDuration,
  mergeDuration,
  selectFirstElement,
} from './mixer-audio-listen-helpers.js';
import { MIXER_LAYOUT } from './mixer-hit-test.js';
import {
  laneRange,
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
import { renderVideoExportPlanPanel } from './mixer-video-export-ui.js';
import { renderVideoProxyPlanPanel } from './mixer-video-proxy-ui.js';

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
    reflectState();
  }
  const dispatch = (action) => {
    if (action.type === 'seek') setCursorMs(action.cursorMs);
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
      const elementId = firstElementForLane(target.dataset.laneId)?.id;
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
      addGeneratedLane('tone', 'Tone', { kind: 'tone', frequency: 440, levelDb: -18 });
      render();
      return;
    }
    if (button.matches('.mmx-mix-add-pink')) {
      addGeneratedLane('room-tone', 'Pink noise bed', { kind: 'pink-noise', levelDb: -52 });
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
      startMs: selectedElementStart(element.dataset.elementId),
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
      addGeneratedLane('room-tone', 'Pink noise bed', { kind: 'pink-noise', levelDb: -52 });
      render();
    },
    addTone() {
      addGeneratedLane('tone', 'Tone', { kind: 'tone', frequency: 440, levelDb: -18 });
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
    decorateLanes();
    decorateInspector();
    settingsUi.decorate();
  }

  function decorateLanes() {
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
      const fadeIn = laneRange('mmx-mix-fade-in', lane.id, firstElementForLane(lane.id)?.audio?.fadeInMs ?? 0, 0, 5000, 10, 'Fade in');
      const fadeOut = laneRange('mmx-mix-fade-out', lane.id, firstElementForLane(lane.id)?.audio?.fadeOutMs ?? 0, 0, 5000, 10, 'Fade out');
      controls.append(mute, solo, gain, fadeIn, fadeOut);
      header.prepend(indexNode);
      header.append(controls);
    });
  }

  function decorateInspector() {
    const inspector = root.querySelector('.mmx-inspector');
    if (!inspector) return;
    const context = document.createElement('div');
    context.className = 'mmx-mix-context';
    const selectedLane = selectedLaneInfo();
    const selectedElement = selectedElementInfo();
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

  function addGeneratedLane(kind, label, roomTone) {
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

  function fitZoom() {
    const width = Math.max(240, root.clientWidth - MIXER_LAYOUT.gutterWidth);
    const duration = Math.max(1000, project.project.durationMs || 1000);
    return clamp(width / duration, 0.02, 0.8);
  }

  function firstElementForLane(laneId) {
    return project.elements.find((element) => element.laneId === laneId) || null;
  }

  function selectedLaneInfo() {
    const primary = project.selection?.primary;
    if (primary?.type !== 'lane') return null;
    return project.lanes.find((lane) => lane.id === primary.id) || null;
  }

  function selectedElementInfo() {
    const primary = project.selection?.primary;
    if (primary?.type !== 'element') return null;
    return project.elements.find((element) => element.id === primary.id) || null;
  }

  function selectedElementStart(elementId) {
    return project.elements.find((element) => element.id === elementId)?.timeline?.startMs || 0;
  }

  function reflectState() {
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
}

function hasVisualElements(project) {
  return (project.elements || []).some((element) => element.capabilities?.hasVideo || element.capabilities?.hasImage);
}
