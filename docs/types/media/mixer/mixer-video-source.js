import {
  createMixerSnapshot,
  buildVideoMixExportPlan,
  exportProjectSettingsJson,
  moveElement,
  renderVideoMixWithFfmpeg,
  selectTarget,
  setElementTransition,
  trimElement,
  updateElement,
} from './index.js';
import { renderMixerShell } from './mixer-renderer.js';
import { attachMixerInteractions } from './mixer-interactions.js';
import { ensureMixerStyles } from './mixer-ui.js';
import { clamp, clampZoom, decodeSummary, mediaDuration, selectFirstElement } from './mixer-audio-listen-helpers.js';
import { updateProjectElementField } from './mixer-audio-multi-helpers.js';
import {
  addDroppedMediaFile,
  applyDroppedAudioSummary,
  applyDroppedVisualMetadata,
  hasMixerFileDrop,
  isMixerDropFile,
  probeDroppedVisualMetadata,
} from './mixer-media-drop.js';
import { createMixerVisualRuntime } from './mixer-visual-runtime.js';
import { MIXER_LAYOUT } from './mixer-hit-test.js';
import { createProjectSettingsUi } from './mixer-project-settings-ui.js';
import { downloadBlob } from './mixer-audio-multi-helpers.js';
import {
  SOURCE_ASSET_ID,
  buildVideoProject,
  currentMusicBedGain,
  editSummary,
  isVisualElement,
  latestVisualElement,
  mergeVideoMetadata,
  previousVisualElement,
  renderExportPlanPanel,
  selectedEditableElement,
  selectedVisualElement,
  transitionSummary,
  updateMusicBedGain,
} from './mixer-video-source-helpers.js';

export function mountModularVideoSourceMixer(panel, intake, mediaEl = null, options = {}) {
  ensureMixerStyles();
  const root = document.createElement('section');
  root.className = 'mmx-video-source';
  root.dataset.mixerContext = 'video-source';
  root.tabIndex = -1;
  panel.append(root);

  let project = selectFirstElement(buildVideoProject(mediaEl || {}, intake || {}));
  let viewport = { cursorMs: 0, scrollLeft: 0, pxPerMs: 0.06, width: 960 };
  let destroyed = false;
  let draggingElement = null;
  let lastExportPlan = null;
  const runtime = {
    ffmpegEnabled: !!options.enableFfmpeg,
    ffmpegLoaded: !!options.ffmpegLoaded,
  };
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
  root.addEventListener('click', onClick, true);
  root.addEventListener('input', onInput);
  root.addEventListener('dragover', onDragOver);
  root.addEventListener('dragleave', onDragLeave);
  root.addEventListener('drop', onDrop);
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
    buildExportPlan,
    getLastExportPlan: () => lastExportPlan,
    exportSettings: () => exportProjectSettingsJson(project),
    importSettings: settingsUi.importSettings,
    relinkFiles: settingsUi.relinkFiles,
    getLastSettingsImport: () => settingsUi.getLastImport(),
    dispatch,
    addMediaFile: addDroppedFile,
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
      root.removeEventListener('click', onClick, true);
      root.removeEventListener('input', onInput);
      root.removeEventListener('dragover', onDragOver);
      root.removeEventListener('dragleave', onDragLeave);
      root.removeEventListener('drop', onDrop);
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
    root.dataset.ffmpegEnabled = runtime.ffmpegEnabled ? 'true' : 'false';
    root.dataset.videoExportStatus = lastExportPlan?.status || '';
    root.dataset.videoExportCanRender = lastExportPlan?.canRender ? 'true' : 'false';
    root.querySelector('.mmx-ruler')?.classList.add('mmx-video-ruler');
    root.querySelector('.mmx-playhead')?.classList.add('mmx-video-playhead');
    root.querySelector('.mmx-body')?.classList.add('mmx-video-timeline');
    const toolbar = root.querySelector('.mmx-toolbar');
    if (toolbar && !toolbar.querySelector('.mmx-video-source-note')) {
      const note = document.createElement('div');
      note.className = 'mmx-video-source-note';
      note.textContent = runtime.ffmpegEnabled
        ? 'Source video lane: visual transforms, trims, and frame preview are active.'
        : 'Source video lane: browser preview active; ffmpeg opt-in unlocks conversion and final video render.';
      toolbar.append(note);
    }
    if (toolbar && !toolbar.querySelector('.mmx-video-export-plan')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mmx-video-export-plan';
      button.textContent = 'Plan final export';
      toolbar.append(button);
    }
    if (toolbar && !toolbar.querySelector('.mmx-video-second-drop')) {
      toolbar.append(renderSecondMediaControls());
    }
    const inspector = root.querySelector('.mmx-inspector');
    if (inspector) inspector.append(renderExportPlanPanel(lastExportPlan || buildExportPlan(), runtime));
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
      syncTransitionReadout();
      return;
    }
    if (target?.matches?.('.mmx-video-trim-in, .mmx-video-trim-out, .mmx-video-fade-in, .mmx-video-fade-out')) {
      syncEditReadout();
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

  function renderSecondMediaControls() {
    const wrap = document.createElement('div');
    wrap.className = 'mmx-video-second-drop';
    const text = document.createElement('span');
    text.textContent = 'Drop second video, image overlay, or music bed';
    const music = document.createElement('label');
    music.className = 'mmx-video-music-bed-wrap';
    const musicText = document.createElement('span');
    musicText.textContent = 'Music bed';
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'mmx-video-music-bed';
    slider.min = '0';
    slider.max = '1';
    slider.step = '0.05';
    slider.value = String(currentMusicBedGain(project));
    slider.setAttribute('aria-label', 'Music bed level under original video audio');
    slider.title = 'Music bed level; original video audio stays unchanged';
    const readout = document.createElement('span');
    readout.className = 'mmx-video-music-bed-readout';
    readout.textContent = `${Math.round(Number(slider.value) * 100)}% under video audio`;
    music.append(musicText, slider, readout);
    const transition = document.createElement('div');
    transition.className = 'mmx-video-transition-tools';
    const transitionText = document.createElement('span');
    transitionText.textContent = 'Selected visual transition';
    const kind = document.createElement('select');
    kind.className = 'mmx-video-transition-kind';
    kind.setAttribute('aria-label', 'Selected visual transition kind');
    [
      ['dissolve', 'Dissolve'],
      ['wipe-left', 'Wipe left'],
    ].forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      kind.append(option);
    });
    const duration = document.createElement('input');
    duration.type = 'number';
    duration.className = 'mmx-video-transition-duration';
    duration.min = '0';
    duration.step = '0.05';
    duration.value = '0.4';
    duration.setAttribute('aria-label', 'Selected visual transition duration in seconds');
    const apply = document.createElement('button');
    apply.type = 'button';
    apply.className = 'mmx-video-transition-apply';
    apply.textContent = 'Apply';
    const transitionReadout = document.createElement('span');
    transitionReadout.className = 'mmx-video-transition-readout';
    transitionReadout.textContent = transitionSummary(project);
    transition.append(transitionText, kind, duration, apply, transitionReadout);
    const edit = document.createElement('div');
    edit.className = 'mmx-video-edit-tools';
    const editText = document.createElement('span');
    editText.textContent = 'Selected clip edit';
    const trimIn = editNumberInput('mmx-video-trim-in', 'Trim in seconds', '0', 0.01);
    const trimOut = editNumberInput('mmx-video-trim-out', 'Trim out seconds', '', 0.01);
    const fadeIn = editNumberInput('mmx-video-fade-in', 'Fade in seconds', '0', 0.05);
    const fadeOut = editNumberInput('mmx-video-fade-out', 'Fade out seconds', '0', 0.05);
    const editApply = document.createElement('button');
    editApply.type = 'button';
    editApply.className = 'mmx-video-edit-apply';
    editApply.textContent = 'Apply edit';
    const editReadout = document.createElement('span');
    editReadout.className = 'mmx-video-edit-readout';
    editReadout.textContent = editSummary(project);
    edit.append(editText, trimIn, trimOut, fadeIn, fadeOut, editApply, editReadout);
    wrap.append(text, music, transition, edit);
    return wrap;
  }

  function editNumberInput(className, label, value, step) {
    const input = document.createElement('input');
    input.type = 'number';
    input.className = className;
    input.min = '0';
    input.step = String(step);
    input.value = value;
    input.setAttribute('aria-label', label);
    return input;
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

  function syncTransitionReadout() {
    const readout = root.querySelector('.mmx-video-transition-readout');
    if (readout) readout.textContent = transitionSummary(project);
  }

  function applyToolbarEdit() {
    const target = selectedEditableElement(project) || project.elements[0];
    if (!target) return;
    const sourceInMs = secondsInput('.mmx-video-trim-in', target.timeline?.sourceInMs || 0);
    const sourceOutFallback = target.timeline?.sourceOutMs || target.timeline?.rawDurationMs || target.timeline?.durationMs || sourceInMs;
    const sourceOutMs = secondsInput('.mmx-video-trim-out', sourceOutFallback);
    const fadeInMs = secondsInput('.mmx-video-fade-in', target.audio?.fadeInMs || target.visual?.fadeInMs || 0);
    const fadeOutMs = secondsInput('.mmx-video-fade-out', target.audio?.fadeOutMs || target.visual?.fadeOutMs || 0);
    project = trimElement(project, target.id, { sourceInMs, sourceOutMs });
    project = updateElement(project, target.id, (element) => ({
      ...element,
      audio: {
        ...element.audio,
        fadeInMs,
        fadeOutMs,
      },
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

  function syncEditReadout() {
    const readout = root.querySelector('.mmx-video-edit-readout');
    if (readout) readout.textContent = editSummary(project);
  }

  function secondsInput(selector, fallbackMs) {
    const raw = root.querySelector(selector)?.value;
    if (raw === '') return Math.max(0, Math.round(Number(fallbackMs) || 0));
    const value = Number(raw);
    if (!Number.isFinite(value)) return Math.max(0, Math.round(Number(fallbackMs) || 0));
    return Math.max(0, Math.round(value * 1000));
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
}
