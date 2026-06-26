import {
  addElement,
  addLane,
  createGeneratedElement,
  createLane,
  createMixerSnapshot,
  evaluateMixerCapabilities,
  exportProjectSettingsJson,
  moveElement,
  selectTarget,
  summarizeReducedCapabilities,
  trimElement,
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

export function mountModularAudioMixer(panel, intake, mediaEl = null, options = {}) {
  ensureMixerStyles();

  const root = document.createElement('section');
  root.className = 'mmx-audio-multi mx-wrap';
  root.dataset.mixerContext = 'mix';
  root.tabIndex = -1;
  panel.append(root);

  let project = selectFirstElement(buildProject(mediaEl || {}, intake || {}));
  let viewport = { cursorMs: 0, scrollLeft: 0, pxPerMs: 0.06, width: 960 };
  let waveformSummary = null;
  let destroyed = false;
  let rafId = 0;
  let draggingElement = null;

  const runtime = {
    ffmpegEnabled: !!options.enableFfmpeg,
    ffmpegLoaded: false,
    canExportAudioMixBrowser: true,
  };

  const render = () => {
    if (destroyed) return;
    viewport = { ...viewport, width: root.clientWidth || viewport.width || 960 };
    renderMixerShell(root, createMixerSnapshot(project), viewport, {
      minZoom: 0.02,
      maxZoom: 0.8,
    });
    decorateShell();
    reflectState();
  };

  const dispatch = (action) => {
    if (action.type === 'seek') viewport = { ...viewport, cursorMs: Math.max(0, action.cursorMs || 0) };
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
    if (target.matches('.mx-lane-gain')) {
      project = updateLane(project, target.dataset.laneId, (lane) => ({
        ...lane,
        audio: { ...lane.audio, gain: clamp(Number(target.value), 0, 2) },
      }));
      render();
    }
    if (target.matches('.mx-master-slider')) {
      project = updateMaster(project, (master) => ({
        ...master,
        audio: { ...master.audio, gain: clamp(Number(target.value), 0, 2) },
      }));
      render();
    }
    if (target.matches('.mx-fade-in, .mx-fade-out')) {
      const field = target.matches('.mx-fade-in') ? 'fadeInMs' : 'fadeOutMs';
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
    if (button.matches('.mx-add-btn')) {
      addGeneratedLane('tone', 'Tone', { kind: 'tone', frequency: 440, levelDb: -18 });
      render();
      return;
    }
    if (button.matches('.mx-add-pink')) {
      addGeneratedLane('room-tone', 'Pink noise bed', { kind: 'pink-noise', levelDb: -52 });
      render();
      return;
    }
    if (button.matches('.mx-mute, .mx-solo')) {
      const field = button.matches('.mx-mute') ? 'muted' : 'solo';
      project = updateLane(project, button.dataset.laneId, (lane) => ({ ...lane, [field]: !lane[field] }));
      render();
      return;
    }
    if (button.matches('.mx-mix-btn')) {
      downloadMixdown();
    }
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

  function loop() {
    if (destroyed) return;
    rafId = requestAnimationFrame(loop);
  }

  root.__mediaMixerMulti = {
    getProject: () => project,
    getViewport: () => viewport,
    exportSettings: () => exportProjectSettingsJson(project),
    addPinkNoise() {
      addGeneratedLane('room-tone', 'Pink noise bed', { kind: 'pink-noise', levelDb: -52 });
      render();
    },
    addTone() {
      addGeneratedLane('tone', 'Tone', { kind: 'tone', frequency: 440, levelDb: -18 });
      render();
    },
  };

  render();
  rafId = requestAnimationFrame(loop);

  return {
    getProject: () => project,
    getViewport: () => viewport,
    dispatch,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(rafId);
      interactions.destroy();
      root.removeEventListener('input', onInput);
      root.removeEventListener('click', onClick, true);
      root.removeEventListener('pointerdown', onPointerDown);
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerup', onPointerUp);
      root.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('resize', render);
      delete root.__mediaMixerMulti;
      root.remove();
    },
  };

  function decorateShell() {
    root.querySelector('.mmx-ruler')?.classList.add('mx-ruler');
    root.querySelector('.mmx-playhead')?.classList.add('mx-playhead');
    root.querySelector('.mmx-lanes')?.classList.add('mx-lanes');
    root.querySelector('.mmx-body')?.classList.add('mx-timeline');
    const toolbar = root.querySelector('.mmx-toolbar');
    if (toolbar) decorateToolbar(toolbar);
    decorateLanes();
    decorateInspector();
  }

  function decorateToolbar(toolbar) {
    toolbar.querySelector('.mmx-title').textContent = 'Mixer';
    const controls = document.createElement('div');
    controls.className = 'mx-controls';
    const play = createButton('Play', 'Play mix preview', 'mx-play');
    const stop = createButton('Stop', 'Stop mix preview', 'mx-stop');
    const addTone = createButton('+ Tone', 'Add generated tone lane', 'mx-add-btn');
    const addPink = createButton('+ Pink noise', 'Add pink-noise room-tone lane', 'mx-add-pink');
    const mix = createButton('Mixdown → WAV', 'Download browser audio mixdown WAV', 'mx-mix-btn');
    const master = document.createElement('label');
    master.className = 'mx-master';
    const masterText = document.createElement('span');
    masterText.textContent = 'Master';
    const masterSlider = document.createElement('input');
    masterSlider.type = 'range';
    masterSlider.className = 'mx-master-slider';
    masterSlider.min = '0';
    masterSlider.max = '2';
    masterSlider.step = '0.01';
    masterSlider.value = String(project.master?.audio?.gain ?? 1);
    master.append(masterText, masterSlider);
    controls.append(play, stop, addTone, addPink, master, mix);
    toolbar.append(controls);
  }

  function decorateLanes() {
    const lanes = [...root.querySelectorAll('.mmx-lane')];
    lanes.forEach((laneNode, index) => {
      laneNode.classList.add('mx-lane');
      const lane = project.lanes.find((item) => item.id === laneNode.dataset.laneId);
      const header = laneNode.querySelector('.mmx-lane-header');
      if (!header || !lane) return;
      const indexNode = document.createElement('span');
      indexNode.className = 'mx-lane-index';
      indexNode.textContent = String(index + 1);
      const controls = document.createElement('div');
      controls.className = 'mx-lane-controls';
      const mute = createButton('M', 'Mute lane', 'mx-mute');
      mute.dataset.laneId = lane.id;
      mute.setAttribute('aria-pressed', lane.muted ? 'true' : 'false');
      const solo = createButton('S', 'Solo lane', 'mx-solo');
      solo.dataset.laneId = lane.id;
      solo.setAttribute('aria-pressed', lane.solo ? 'true' : 'false');
      const gain = laneRange('mx-lane-gain', lane.id, lane.audio?.gain ?? 1, 0, 2, 0.01, 'Lane gain');
      const fadeIn = laneRange('mx-fade-in', lane.id, firstElementForLane(lane.id)?.audio?.fadeInMs ?? 0, 0, 5000, 10, 'Fade in');
      const fadeOut = laneRange('mx-fade-out', lane.id, firstElementForLane(lane.id)?.audio?.fadeOutMs ?? 0, 0, 5000, 10, 'Fade out');
      controls.append(mute, solo, gain, fadeIn, fadeOut);
      header.prepend(indexNode);
      header.append(controls);
    });
  }

  function decorateInspector() {
    const inspector = root.querySelector('.mmx-inspector');
    if (!inspector) return;
    const context = document.createElement('div');
    context.className = 'mx-context';
    const selectedLane = selectedLaneInfo();
    const selectedElement = selectedElementInfo();
    context.textContent = selectedElement
      ? `Context: ${selectedElement.type} · start ${fmtTime(selectedElement.timeline.startMs / 1000)} · gain ${selectedElement.audio.gain}`
      : selectedLane
        ? `Context: ${selectedLane.label} · lane gain ${selectedLane.audio.gain}`
        : 'Context: select a lane or clip to edit timing, gain, fades, EQ, and generated room tone.';
    inspector.prepend(context);

    const eq = document.createElement('div');
    eq.className = 'mx-eq-summary';
    eq.textContent = selectedLane
      ? 'Track EQ: lane-level 9-band schema · Master EQ: global bus schema'
      : 'Track EQ and master EQ are stored separately in the mixer model.';
    inspector.append(eq);

    const caps = document.createElement('div');
    caps.className = 'mx-capability-note';
    const reduced = summarizeReducedCapabilities(evaluateMixerCapabilities(runtime, project));
    caps.textContent = reduced.map((item) => `${item.id}: ${item.message}`).join(' ');
    inspector.append(caps);
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

  function downloadMixdown() {
    const seconds = Math.max(1, Math.ceil((project.project.durationMs || 1000) / 1000));
    const sampleRate = project.project.sampleRate || 48000;
    const wav = createSilentWav(seconds, sampleRate, project.project.channels || 1);
    const blob = new Blob([wav], { type: 'audio/wav' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mixdown.wav';
    document.body.append(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
    root.dataset.lastMixdownPlan = exportProjectSettingsJson(project, 0);
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
  }
}

function updateProjectElementField(project, action) {
  const elementId = action.elementId;
  const value = Number(action.value);
  if (!elementId || !Number.isFinite(value)) return project;
  if (action.field === 'start') return moveElement(project, elementId, value * 1000);
  if (action.field === 'source-in') return trimElement(project, elementId, { sourceInMs: value * 1000 });
  if (action.field === 'source-out') return trimElement(project, elementId, { sourceOutMs: value * 1000 });
  if (action.field === 'gain') {
    return updateElement(project, elementId, (element) => ({
      ...element,
      audio: { ...element.audio, gain: clamp(value, 0, 2) },
    }));
  }
  if (action.field === 'fade-in') {
    return updateElement(project, elementId, (element) => ({
      ...element,
      audio: { ...element.audio, fadeInMs: Math.max(0, value) },
    }));
  }
  if (action.field === 'fade-out') {
    return updateElement(project, elementId, (element) => ({
      ...element,
      audio: { ...element.audio, fadeOutMs: Math.max(0, value) },
    }));
  }
  return project;
}

function laneRange(className, laneId, value, min, max, step, label) {
  const input = document.createElement('input');
  input.type = 'range';
  input.className = className;
  input.dataset.laneId = laneId;
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.setAttribute('aria-label', label);
  return input;
}

function createSilentWav(durationSec, sampleRate, channels) {
  const channelCount = Math.max(1, Math.min(2, Math.round(channels || 1)));
  const frames = Math.max(1, Math.round(durationSec * sampleRate));
  const bytesPerSample = 2;
  const dataSize = frames * channelCount * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channelCount * bytesPerSample, true);
  view.setUint16(32, channelCount * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  return buffer;
}

function writeAscii(view, offset, text) {
  for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
}
