import { moveElement, selectTarget, trimElement, updateElement } from './mixer-model.js';
import { exportProjectSettingsJson, importProjectSettings } from './mixer-import-export.js';
import { createMixerSnapshot, renderMixerShell } from './mixer-renderer.js';
import { attachMixerInteractions } from './mixer-interactions.js';
import { MIXER_LAYOUT } from './mixer-hit-test.js';
import { ensureMixerStyles } from './mixer-ui.js';
import {
  attachSourceMoveDrag, aliasInput, buildProject, clamp, clampZoom,
  createButton, decorateChapters, decorateRoomTone, decodeSummary, fmtTime,
  mediaDuration, mergeDuration, selectFirstElement,
} from './mixer-audio-listen-helpers.js';

export function buildMixerAudioListenSurface(mediaEl, intake, options = {}) {
  ensureMixerStyles();
  mediaEl.controls = false;
  mediaEl.classList.add('media-view-hidden');
  mediaEl.setAttribute('aria-hidden', 'true');
  mediaEl.tabIndex = -1;

  const root = document.createElement('section');
  root.className = 'media-listen-surface mmx-audio-listen mmx-direct-listen';
  root.dataset.mixerContext = 'listen';

  let project = selectFirstElement(buildProject(mediaEl, intake));
  let viewport = { cursorMs: 0, scrollLeft: 0, pxPerMs: 0.08, width: 960 };
  let chapters = Array.isArray(options.chapters) ? options.chapters : [];
  let waveformSummary = null;
  let waveformStatus = 'pending';
  let onRegionSelect = typeof options.onRegionSelect === 'function' ? options.onRegionSelect : null;
  let destroyed = false;
  let rafId = 0;
  let canvasPointer = null;
  let suppressCanvasClick = false;

  const firstElementId = () => project.elements[0]?.id;
  const firstElement = () => project.elements[0];
  const durationSec = () => {
    const mediaDuration = Number(mediaEl.duration);
    if (Number.isFinite(mediaDuration) && mediaDuration > 0) return mediaDuration;
    if (Number.isFinite(waveformSummary?.duration) && waveformSummary.duration > 0) return waveformSummary.duration;
    return Math.max(0, (firstElement()?.timeline?.rawDurationMs || firstElement()?.timeline?.durationMs || 0) / 1000);
  };

  function render() {
    if (destroyed) return;
    viewport = { ...viewport, width: root.clientWidth || viewport.width || 960 };
    renderMixerShell(root, createMixerSnapshot(project), viewport, { minZoom: 0.02, maxZoom: 0.8 });
    decorateRenderedShell();
    reflectProjectState();
  }

  function dispatch(action) {
    if (action.type === 'seek') {
      setCursorMs(action.cursorMs);
      mediaEl.currentTime = clamp(action.cursorMs / 1000 - elementStartSec(), 0, durationSec());
    }
    if (action.type === 'zoom') viewport = { ...viewport, pxPerMs: clampZoom(action.pxPerMs) };
    if (action.type === 'zoom-relative') viewport = { ...viewport, pxPerMs: clampZoom(viewport.pxPerMs * action.factor) };
    if (action.type === 'pan') viewport = { ...viewport, scrollLeft: Math.max(0, Number(action.scrollLeft) || 0) };
    if (action.type === 'fit') viewport = { ...viewport, scrollLeft: 0, pxPerMs: 0.08 };
    if (action.type === 'select') project = selectTarget(project, action.target, [action.target]);
    if (action.type === 'update-element') updateFromInspector(action.field, action.value);
    render();
  }

  const interactions = attachMixerInteractions(root, () => ({
    project,
    snapshot: createMixerSnapshot(project),
    viewport,
  }), dispatch);

  const onMediaUpdate = () => {
    setCursorMs((elementStartSec() + (Number(mediaEl.currentTime) || 0)) * 1000);
    updateTransportLabels();
    reflectProjectState();
  };
  const onLoadedMetadata = () => {
    project = mergeDuration(project, mediaDuration(mediaEl) * 1000);
    attachWaveformSummary(waveformSummary);
    render();
  };
  const onInput = (event) => {
    if (event.target?.matches?.('.media-lane-offset, .media-lane-in, .media-lane-out, .media-lane-gain, .media-lane-fade-in, .media-lane-fade-out')) {
      updateFromCompatInput(event.target);
    }
  };
  const onChange = (event) => {
    if (event.target?.matches?.('.media-lane-room-toggle')) {
      setRoomTone(event.target.checked);
      render();
    }
  };
  const onClickCapture = (event) => {
    const play = event.target?.closest?.('.media-listen-play');
    if (play && root.contains(play)) {
      if (mediaEl.paused) mediaEl.play().catch(() => {});
      else mediaEl.pause();
      updateTransportLabels();
      event.stopPropagation();
      return;
    }
    const stop = event.target?.closest?.('.media-listen-stop');
    if (stop && root.contains(stop)) {
      mediaEl.pause();
      mediaEl.currentTime = 0;
      onMediaUpdate();
      event.stopPropagation();
      return;
    }
    const waveform = event.target?.closest?.('.media-wv-canvas, .media-waveform-surface');
    if (waveform && root.contains(waveform) && !event.target?.closest?.('.media-lane-trim')) {
      if (suppressCanvasClick) {
        suppressCanvasClick = false;
        event.stopPropagation();
        return;
      }
      if (!canvasPointer?.moved) {
        const timeMs = canvasClientXToTimeMs(event.clientX);
        mediaEl.currentTime = clamp(timeMs / 1000 - elementStartSec(), 0, durationSec());
        setCursorMs(timeMs);
        render();
      }
      event.stopPropagation();
    }
  };
  const onPointerDownCapture = (event) => {
    const waveform = event.target?.closest?.('.media-wv-canvas, .media-waveform-surface');
    if (!waveform || !root.contains(waveform) || event.target?.closest?.('.media-lane-trim') || event.button !== 0) return;
    canvasPointer = {
      pointerId: event.pointerId,
      startX: event.clientX,
      moved: false,
    };
    try { waveform.setPointerCapture?.(event.pointerId); } catch { /* ignore synthetic capture */ }
    event.stopPropagation();
  };
  const onPointerMoveCapture = (event) => {
    if (!canvasPointer || event.pointerId !== canvasPointer.pointerId) return;
    if (Math.abs(event.clientX - canvasPointer.startX) < 3) return;
    canvasPointer.moved = true;
    const a = canvasClientXToSourceSec(canvasPointer.startX);
    const b = canvasClientXToSourceSec(event.clientX);
    updateTrimRange(Math.min(a, b), Math.max(a, b));
    render();
    event.preventDefault();
    event.stopPropagation();
  };
  const onPointerUpCapture = (event) => {
    if (!canvasPointer || event.pointerId !== canvasPointer.pointerId) return;
    const wasMoved = canvasPointer.moved;
    const startX = canvasPointer.startX;
    canvasPointer = null;
    if (wasMoved) {
      suppressCanvasClick = true;
      const a = canvasClientXToSourceSec(startX);
      const b = canvasClientXToSourceSec(event.clientX);
      const start = Math.min(a, b);
      const end = Math.max(a, b);
      updateTrimRange(start, end);
      if (onRegionSelect && end > start) onRegionSelect({ start, end });
      render();
      event.preventDefault();
      event.stopPropagation();
    }
  };
  const detachDrag = attachSourceMoveDrag(root, (deltaSec) => {
    const element = firstElement();
    if (!element) return;
    project = moveElement(project, element.id, element.timeline.startMs + deltaSec * 1000);
    render();
  });

  root.addEventListener('click', onClickCapture, true);
  root.addEventListener('pointerdown', onPointerDownCapture, true);
  root.addEventListener('pointermove', onPointerMoveCapture, true);
  root.addEventListener('pointerup', onPointerUpCapture, true);
  root.addEventListener('input', onInput);
  root.addEventListener('change', onChange);
  mediaEl.addEventListener('loadedmetadata', onLoadedMetadata);
  ['timeupdate', 'play', 'pause', 'seeked', 'ended', 'volumechange'].forEach((event) => mediaEl.addEventListener(event, onMediaUpdate));
  window.addEventListener('resize', render);

  decodeSummary(intake).then((summary) => {
    if (destroyed) return;
    if (summary) {
      waveformSummary = summary;
      waveformStatus = 'available';
      if (Number.isFinite(summary.duration) && summary.duration > 0) project = mergeDuration(project, summary.duration * 1000);
      attachWaveformSummary(summary);
      options.onWaveformSummary?.(summary);
    } else {
      waveformStatus = 'unavailable';
    }
    options.onWaveformSummaryStatus?.(waveformStatus);
    render();
  }).catch(() => {
    if (destroyed) return;
    waveformStatus = 'unavailable';
    options.onWaveformSummaryStatus?.(waveformStatus);
    render();
  });

  function loop() {
    if (destroyed) return;
    onMediaUpdate();
    rafId = requestAnimationFrame(loop);
  }

  root.__mediaMixerListen = {
    getProject: () => project,
    exportSettings,
    importSettings,
    getWaveformSummary: () => waveformSummary,
    setZoom(value) {
      viewport = { ...viewport, pxPerMs: clampZoom(Number(value) * 0.08) };
      render();
    },
    setPan(value) {
      viewport = { ...viewport, scrollLeft: Math.max(0, Number(value) || 0) };
      render();
    },
  };

  render();
  rafId = requestAnimationFrame(loop);

  return {
    el: root,
    getProject: () => project,
    exportSettings,
    importSettings,
    setChapters(nextChapters) {
      chapters = Array.isArray(nextChapters) ? nextChapters : [];
      render();
    },
    setRegionSelect(fn) {
      onRegionSelect = typeof fn === 'function' ? fn : null;
    },
    getState() {
      const element = firstElement();
      return {
        offsetSec: elementStartSec(),
        inSec: (element?.timeline?.sourceInMs || 0) / 1000,
        outSec: (element?.timeline?.sourceOutMs || element?.timeline?.durationMs || 0) / 1000,
        gain: element?.audio?.gain ?? 1,
        fadeInMs: element?.audio?.fadeInMs ?? 0,
        fadeOutMs: element?.audio?.fadeOutMs ?? 0,
        roomTone: !!element?.audio?.roomTone,
        durationSec: durationSec(),
        currentTime: Number(mediaEl.currentTime) || 0,
      };
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(rafId);
      interactions.destroy();
      detachDrag();
      root.removeEventListener('click', onClickCapture, true);
      root.removeEventListener('pointerdown', onPointerDownCapture, true);
      root.removeEventListener('pointermove', onPointerMoveCapture, true);
      root.removeEventListener('pointerup', onPointerUpCapture, true);
      root.removeEventListener('input', onInput);
      root.removeEventListener('change', onChange);
      mediaEl.removeEventListener('loadedmetadata', onLoadedMetadata);
      ['timeupdate', 'play', 'pause', 'seeked', 'ended', 'volumechange'].forEach((event) => mediaEl.removeEventListener(event, onMediaUpdate));
      window.removeEventListener('resize', render);
      delete root.__mediaMixerListen;
      root.remove();
    },
  };

  function decorateRenderedShell() {
    const toolbar = root.querySelector('.mmx-toolbar');
    const body = root.querySelector('.mmx-body');
    const element = firstElement();
    const currentSec = Number(mediaEl.currentTime) || 0;
    const sourceOutSec = (element?.timeline?.sourceOutMs || element?.timeline?.durationMs || 0) / 1000;
    const sourceInSec = (element?.timeline?.sourceInMs || 0) / 1000;

    root.querySelector('.mmx-ruler')?.classList.add('media-lane-ruler');
    const playhead = root.querySelector('.mmx-playhead');
    playhead?.classList.add('media-wv-playhead', 'media-lane-cursor');
    if (playhead && !playhead.querySelector('.media-wv-playhead-label')) {
      const label = document.createElement('span');
      label.className = 'media-wv-playhead-label';
      label.textContent = fmtTime(viewport.cursorMs / 1000);
      playhead.append(label);
    }
    root.querySelector('.mmx-lane-label')?.classList.add('media-lane-label-name');
    root.querySelector('.mmx-element')?.classList.add('media-lane-trim');
    const waveformCanvas = root.querySelector('.mmx-element-waveform');
    waveformCanvas?.classList.add('media-wv-canvas', 'media-lane-canvas');
    if (waveformCanvas) waveformCanvas.style.width = `${Math.round((viewport.pxPerMs / 0.08) * 100)}%`;
    if (body) body.classList.add('media-waveform-surface', 'media-lane-waveform');

    if (toolbar) {
      toolbar.querySelector('.mmx-zoom')?.classList.add('mmx-listen-zoom');
      toolbar.querySelector('[data-action="zoom-out"]')?.classList.add('mmx-listen-zoom-out');
      toolbar.querySelector('[data-action="zoom-in"]')?.classList.add('mmx-listen-zoom-in');
      const transport = document.createElement('div');
      transport.className = 'media-lane-transport';
      const stop = createButton('Stop', 'Stop and rewind', 'media-listen-btn media-listen-stop');
      const play = createButton(mediaEl.paused ? 'Play' : 'Pause', mediaEl.paused ? 'Play' : 'Pause', 'media-listen-btn media-listen-play');
      const time = document.createElement('span');
      time.className = 'media-listen-time media-lane-time';
      time.textContent = `${fmtTime(currentSec)} / ${durationSec() > 0 ? fmtTime(durationSec()) : '--:--'}`;
      transport.append(stop, play, time);
      toolbar.append(transport);

      const pan = document.createElement('input');
      pan.type = 'range';
      pan.className = 'mmx-listen-pan';
      pan.min = '0';
      pan.max = String(Math.max(100, root.querySelector('.mmx-body')?.scrollWidth || 100));
      pan.step = '1';
      pan.value = String(Math.round(viewport.scrollLeft));
      pan.setAttribute('aria-label', 'Listen lane pan');
      pan.addEventListener('input', () => dispatch({ type: 'pan', scrollLeft: Number(pan.value) }));
      toolbar.append(pan);

      const exportBtn = createButton('Export settings', 'Export mixer settings', 'mmx-settings-export');
      exportBtn.addEventListener('click', exportSettings);
      toolbar.append(exportBtn);

      const note = document.createElement('div');
      note.className = 'mmx-capability-note';
      note.textContent = 'You can edit timing, fades, gain, room tone, and project settings now. Enable Media Transcoding for render paths that need ffmpeg.';
      root.insertBefore(note, toolbar);
    }

    const inspector = root.querySelector('.mmx-inspector');
    if (inspector) {
      aliasInput(root, '.mmx-inspector-start', 'media-lane-offset');
      aliasInput(root, '.mmx-inspector-source-in', 'media-lane-in');
      aliasInput(root, '.mmx-inspector-source-out', 'media-lane-out');
      aliasInput(root, '.mmx-inspector-gain', 'media-lane-gain');
      aliasInput(root, '.mmx-inspector-fade-in', 'media-lane-fade-in');
      aliasInput(root, '.mmx-inspector-fade-out', 'media-lane-fade-out');
      const roomField = document.createElement('label');
      roomField.className = 'mmx-inspector-field media-lane-room-field';
      const room = document.createElement('input');
      room.type = 'checkbox';
      room.className = 'media-lane-room-toggle';
      room.checked = !!element?.audio?.roomTone;
      const span = document.createElement('span');
      span.textContent = 'Pink-noise / room-tone bed';
      roomField.append(span, room);
      inspector.querySelector('.mmx-inspector-grid')?.append(roomField);
      const duration = document.createElement('div');
      duration.className = 'media-lane-duration';
      duration.textContent = `Duration ${fmtTime(Math.max(0, sourceOutSec - sourceInSec))}`;
      inspector.append(duration);
    }

    decorateRoomTone(body, element);
    decorateChapters(body, chapters, project.project.durationMs || 1000);
    updateTransportLabels();
  }

  function updateTransportLabels() {
    const play = root.querySelector('.media-listen-play');
    if (play) {
      play.textContent = mediaEl.paused ? 'Play' : 'Pause';
      play.setAttribute('aria-label', mediaEl.paused ? 'Play' : 'Pause');
    }
    const time = root.querySelector('.media-listen-time');
    if (time) time.textContent = `${fmtTime(Number(mediaEl.currentTime) || 0)} / ${durationSec() > 0 ? fmtTime(durationSec()) : '--:--'}`;
    const playhead = root.querySelector('.media-wv-playhead');
    if (playhead) {
      playhead.style.left = `${MIXER_LAYOUT.gutterWidth + viewport.cursorMs * viewport.pxPerMs - viewport.scrollLeft}px`;
      const label = playhead.querySelector('.media-wv-playhead-label');
      if (label) label.textContent = fmtTime(viewport.cursorMs / 1000);
    }
  }

  function updateFromInspector(field, value) {
    const element = firstElement();
    if (!element) return;
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    if (field === 'start') project = moveElement(project, element.id, n * 1000);
    if (field === 'source-in') project = trimElement(project, element.id, { sourceInMs: n * 1000 });
    if (field === 'source-out') project = trimElement(project, element.id, { sourceOutMs: n * 1000 });
    if (field === 'gain') {
      project = updateElement(project, element.id, (item) => ({ ...item, audio: { ...item.audio, gain: clamp(n, 0, 2) } }));
      mediaEl.volume = clamp(n, 0, 1);
    }
    if (field === 'fade-in') project = updateElement(project, element.id, (item) => ({ ...item, audio: { ...item.audio, fadeInMs: Math.max(0, n) } }));
    if (field === 'fade-out') project = updateElement(project, element.id, (item) => ({ ...item, audio: { ...item.audio, fadeOutMs: Math.max(0, n) } }));
  }

  function updateFromCompatInput(input) {
    const map = {
      'media-lane-offset': 'start',
      'media-lane-in': 'source-in',
      'media-lane-out': 'source-out',
      'media-lane-gain': 'gain',
      'media-lane-fade-in': 'fade-in',
      'media-lane-fade-out': 'fade-out',
    };
    const field = Object.keys(map).find((className) => input.classList.contains(className));
    if (field) {
      updateFromInspector(map[field], input.value);
      render();
    }
  }

  function setRoomTone(enabled) {
    const id = firstElementId();
    if (!id) return;
    project = updateElement(project, id, (element) => ({
      ...element,
      audio: {
        ...element.audio,
        roomTone: enabled ? { kind: 'room-tone', source: 'derived-gap-bed', levelDb: -52 } : null,
      },
    }));
  }

  function updateTrimRange(startSec, endSec) {
    const element = firstElement();
    if (!element) return;
    project = trimElement(project, element.id, {
      sourceInMs: clamp(startSec, 0, durationSec()) * 1000,
      sourceOutMs: clamp(endSec, 0, durationSec()) * 1000,
    });
  }

  function attachWaveformSummary(summary) {
    const id = firstElementId();
    if (!id || !summary) return;
    project = updateElement(project, id, (element) => ({
      ...element,
      analysis: {
        ...element.analysis,
        waveformSummary: summary,
      },
    }));
  }

  function setCursorMs(cursorMs) {
    viewport = { ...viewport, cursorMs: Math.max(0, Number(cursorMs) || 0) };
  }

  function elementStartSec() {
    return (firstElement()?.timeline?.startMs || 0) / 1000;
  }

  function canvasClientXToTimeMs(clientX) {
    const rect = root.querySelector('.mmx-body')?.getBoundingClientRect();
    if (!rect) return 0;
    const x = clientX - rect.left + viewport.scrollLeft - MIXER_LAYOUT.gutterWidth;
    return Math.max(0, x / Math.max(0.001, viewport.pxPerMs));
  }

  function canvasClientXToSourceSec(clientX) {
    return clamp(canvasClientXToTimeMs(clientX) / 1000 - elementStartSec(), 0, durationSec());
  }

  function exportSettings() {
    const json = exportProjectSettingsJson(project);
    root.dataset.projectSettings = json;
    return json;
  }

  function importSettings(json) {
    const imported = importProjectSettings(json);
    project = selectFirstElement(imported.project);
    attachWaveformSummary(waveformSummary);
    render();
    return imported;
  }

  function reflectProjectState() {
    const element = firstElement();
    root.dataset.mixerProjectId = project.project.id;
    root.dataset.mixerElementId = element?.id || '';
    root.dataset.mixerOffsetMs = String(Math.round(element?.timeline?.startMs || 0));
    root.dataset.mixerGain = String(element?.audio?.gain ?? 1);
    root.dataset.mixerRoomTone = element?.audio?.roomTone ? 'true' : 'false';
    root.dataset.mixerZoom = String(Math.round((viewport.pxPerMs / 0.08) * 100) / 100);
    root.dataset.mixerPan = String(Math.round(viewport.scrollLeft));
    root.dataset.mixerWaveformStatus = waveformStatus;
    root.dataset.mixerWaveformBuckets = String(element?.analysis?.waveformSummary?.buckets || 0);
    root.dataset.mixerDurationSec = String(Math.max(0.001, project.project.durationMs / 1000));
  }
}

function button(text, label, className) {
  const node = document.createElement('button');
  node.type = 'button';
  node.className = className;
  node.textContent = text;
  node.setAttribute('aria-label', label);
  return node;
}
