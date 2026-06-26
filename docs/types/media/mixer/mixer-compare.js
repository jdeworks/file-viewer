import {
  addElement,
  addAsset,
  addLane,
  captureElementKeyframe,
  computeCompareOverlap,
  createElement,
  createLane,
  createMixerSnapshot,
  createProjectFromAssetMetadata,
  exportProjectSettingsJson,
  selectTarget,
  setCompareTarget,
  updateElement,
  updateLane,
} from './index.js';
import { renderMixerShell } from './mixer-renderer.js';
import { attachMixerInteractions } from './mixer-interactions.js';
import { ensureMixerStyles } from './mixer-ui.js';
import { clampZoom, decodeSummary, mediaDuration, selectFirstElement } from './mixer-audio-listen-helpers.js';
import { createMixerVisualRuntime } from './mixer-visual-runtime.js';
import { updateProjectElementField } from './mixer-audio-multi-helpers.js';
import { analyzeCompareSelection } from './mixer-compare-analysis.js';
import { drawCompareOverlay, overlayKind } from './mixer-compare-overlay.js';
import {
  applyDroppedAudioSummary,
  applyDroppedVisualMetadata,
  classifyMixerFile,
  hasMixerFileDrop,
  isMixerDropFile,
  probeDroppedVisualMetadata,
} from './mixer-media-drop.js';
import { createProjectSettingsUi } from './mixer-project-settings-ui.js';

const ASSET_ID = 'asset-compare-source';

export function mountModularCompare(panel, intake, mediaEl = null, kind = 'audio', options = {}) {
  ensureMixerStyles();
  const root = document.createElement('section');
  root.className = `mmx-compare-source mmx-compare-source--${kind}`;
  root.dataset.mixerContext = 'compare';
  panel.append(root);

  let project = buildCompareProject(mediaEl || {}, intake || {}, kind);
  let viewport = { cursorMs: 0, scrollLeft: 0, pxPerMs: 0.06, width: 960 };
  let destroyed = false;
  let lastAnalysis = null;
  const runtimeFiles = new Map();
  if (intake?.file) runtimeFiles.set(ASSET_ID, intake.file);
  const visualRuntime = createMixerVisualRuntime({ runtimeFiles, onUpdate: render });
  const settingsUi = createProjectSettingsUi({
    root,
    getProject: () => project,
    setProject: (next) => { project = next; },
    runtimeFiles,
    render,
    filename: `${kind}-compare.mixer.json`,
  });

  const dispatch = (action) => {
    if (action.type === 'seek') viewport = { ...viewport, cursorMs: Math.max(0, Number(action.cursorMs) || 0) };
    if (action.type === 'zoom') viewport = { ...viewport, pxPerMs: clampZoom(action.pxPerMs) };
    if (action.type === 'zoom-relative') viewport = { ...viewport, pxPerMs: clampZoom(viewport.pxPerMs * action.factor) };
    if (action.type === 'pan') viewport = { ...viewport, scrollLeft: Math.max(0, Number(action.scrollLeft) || 0) };
    if (action.type === 'fit') viewport = { ...viewport, scrollLeft: 0, pxPerMs: 0.06 };
    if (action.type === 'select') project = selectTarget(project, action.target, [action.target]);
    if (action.type === 'capture-keyframe') project = captureElementKeyframe(project, action.elementId, viewport.cursorMs);
    if (action.type === 'update-element') {
      project = updateProjectElementField(project, action);
      project = refreshCompareTargets(project);
    }
    render();
  };
  const interactions = attachMixerInteractions(root, () => ({
    project,
    snapshot: createMixerSnapshot(project),
    viewport,
  }), dispatch);

  const onClick = (event) => {
    const button = event.target?.closest?.('.mmx-compare-view');
    if (button && root.contains(button)) {
      project = { ...project, compare: { ...project.compare, view: button.dataset.view || 'stacked' } };
      render();
      return;
    }
    const analyzeButton = event.target?.closest?.('.mmx-compare-analyze');
    if (!analyzeButton || !root.contains(analyzeButton)) return;
    runCompareAnalysis();
  };
  const onInput = (event) => {
    const input = event.target;
    if (!input?.matches?.('.mmx-compare-target-input')) return;
    const side = input.dataset.side;
    if (side !== 'a' && side !== 'b') return;
    const field = input.dataset.field;
    const seconds = Number(input.value);
    const value = Math.round((Number.isFinite(seconds) ? seconds : 0) * 1000);
    if (field === 'offsetMs') updateCompareTarget(side, { offsetMs: clampMs(value, -600000, 600000) });
    if (field === 'rangeStartMs') updateCompareTarget(side, { rangeStartMs: clampMs(value, 0, 3600000) });
    if (field === 'rangeEndMs') updateCompareTarget(side, { rangeEndMs: clampMs(value, 0, 3600000) });
    render();
  };
  const onChange = (event) => {
    if (event.target?.matches?.('.mmx-compare-normalize-input')) {
      project = { ...project, compare: { ...project.compare, normalizeAudio: event.target.checked } };
      lastAnalysis = null;
      delete root.dataset.lastCompareAnalysis;
      render();
      return;
    }
    if (event.target?.matches?.('.mmx-compare-target-select')) {
      const side = event.target.dataset.side;
      const element = project.elements.find((item) => item.id === event.target.value);
      if ((side === 'a' || side === 'b') && element) {
        const current = project.compare?.[side] || {};
        updateCompareTarget(side, targetFromElement(element, current.offsetMs || 0));
        render();
      }
      return;
    }
    if (!event.target?.matches?.('.mmx-compare-b-input')) return;
    const file = event.target.files?.[0];
    if (file) replaceCompareBFile(file);
    event.target.value = '';
  };
  const onDragOver = (event) => {
    if (!hasMixerFileDrop(event.dataTransfer)) return;
    event.preventDefault();
    root.classList.add('mmx-compare-drop-active');
  };
  const onDragLeave = (event) => {
    if (!root.contains(event.relatedTarget)) root.classList.remove('mmx-compare-drop-active');
  };
  const onDrop = (event) => {
    const file = [...(event.dataTransfer?.files || [])].find(isMixerDropFile);
    if (!file) return;
    event.preventDefault();
    root.classList.remove('mmx-compare-drop-active');
    replaceCompareBFile(file);
  };
  root.addEventListener('click', onClick);
  root.addEventListener('input', onInput);
  root.addEventListener('change', onChange);
  root.addEventListener('dragover', onDragOver);
  root.addEventListener('dragleave', onDragLeave);
  root.addEventListener('drop', onDrop);
  window.addEventListener('resize', render);

  if (kind === 'audio') {
    decodeSummary(intake || {}).then((summary) => {
      if (destroyed || !summary) return;
      project = {
        ...project,
        elements: project.elements.map((element) => ({
          ...element,
          analysis: { ...element.analysis, waveformSummary: summary },
        })),
      };
      render();
    }).catch(() => {});
  }

  root.__mediaMixerCompare = {
    getProject: () => project,
    getViewport: () => viewport,
    getOverlap: () => computeCompareOverlap(project),
    analyze: runCompareAnalysis,
    getLastAnalysis: () => lastAnalysis,
    exportSettings: () => exportProjectSettingsJson(project),
    importSettings: settingsUi.importSettings,
    relinkFiles: settingsUi.relinkFiles,
    getLastSettingsImport: () => settingsUi.getLastImport(),
    dispatch,
  };
  render();

  return {
    destroy() {
      destroyed = true;
      interactions.destroy();
      visualRuntime.dispose();
      settingsUi.destroy();
      root.removeEventListener('click', onClick);
      root.removeEventListener('input', onInput);
      root.removeEventListener('change', onChange);
      root.removeEventListener('dragover', onDragOver);
      root.removeEventListener('dragleave', onDragLeave);
      root.removeEventListener('drop', onDrop);
      window.removeEventListener('resize', render);
      delete root.__mediaMixerCompare;
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
    decorateCompare();
    settingsUi.decorate();
  }

  function decorateCompare() {
    root.dataset.compareView = project.compare.view || 'stacked';
    root.dataset.compareOverlapMs = String(Math.round(computeCompareOverlap(project).overlap.durationMs));
    const toolbar = root.querySelector('.mmx-toolbar');
    if (!toolbar) return;
    const group = document.createElement('div');
    group.className = 'mmx-compare-controls';
    for (const view of ['stacked', 'overlay']) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mmx-compare-view';
      button.dataset.view = view;
      button.setAttribute('aria-pressed', project.compare.view === view ? 'true' : 'false');
      button.textContent = view;
      group.append(button);
    }
    group.append(renderTargetControls('a'));
    group.append(renderTargetControls('b'));
    if (kind === 'audio') group.append(renderNormalizeToggle());
    group.append(renderBInput());
    group.append(renderAnalyzeButton());
    group.append(renderOverlap());
    toolbar.append(group);
    if (project.compare.view === 'overlay') root.append(renderOverlay());
    if (lastAnalysis) root.append(renderAnalysisPanel(lastAnalysis));
  }

  function renderOverlap() {
    const overlap = computeCompareOverlap(project);
    const node = document.createElement('span');
    node.className = 'mmx-compare-overlap';
    node.textContent = `Overlap ${(overlap.overlap.durationMs / 1000).toFixed(2)}s`;
    return node;
  }

  function renderOverlay() {
    const node = document.createElement('div');
    node.className = 'mmx-compare-overlay';
    const overlap = computeCompareOverlap(project);
    node.dataset.hasOverlap = overlap.hasOverlap ? 'true' : 'false';
    node.dataset.offsetDeltaMs = String(Math.round(overlap.offsetDeltaMs || 0));
    const heading = document.createElement('strong');
    heading.textContent = project.elements.some((element) => element.capabilities?.hasVideo || element.capabilities?.hasImage)
      ? 'Shared visual overlay'
      : 'Shared waveform overlay';
    const canvas = document.createElement('canvas');
    canvas.className = 'mmx-compare-overlay-canvas';
    canvas.width = 640;
    canvas.height = 180;
    canvas.dataset.compareA = project.compare?.a?.elementId || '';
    canvas.dataset.compareB = project.compare?.b?.elementId || '';
    canvas.dataset.kind = overlayKind(project);
    drawCompareOverlay(canvas, project, visualRuntime.frames);
    node.append(heading, canvas, renderOverlayStatus(canvas, overlap));
    return node;
  }

  function renderBInput() {
    const wrap = document.createElement('label');
    wrap.className = 'mmx-compare-b-drop';
    wrap.textContent = 'B file';
    const input = document.createElement('input');
    input.type = 'file';
    input.className = 'mmx-compare-b-input';
    input.accept = kind === 'video' ? 'video/*,image/*,audio/*' : 'audio/*,video/*,image/*';
    wrap.append(input);
    return wrap;
  }

  function renderNormalizeToggle() {
    const wrap = document.createElement('label');
    wrap.className = 'mmx-compare-normalize';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'mmx-compare-normalize-input';
    input.checked = !!project.compare?.normalizeAudio;
    wrap.append(input, `Normalize ${input.checked ? 'on' : 'off'}`);
    return wrap;
  }

  function renderTargetControls(side) {
    const target = project.compare?.[side] || {};
    const wrap = document.createElement('div');
    wrap.className = 'mmx-compare-target-controls';
    wrap.dataset.side = side;
    const title = document.createElement('strong');
    title.textContent = side.toUpperCase();
    wrap.append(
      title,
      label('source', renderTargetSelect(side)),
      label('offset', compareNumberInput(side, 'offsetMs', target.offsetMs || 0, -600, 600)),
      label('in', compareNumberInput(side, 'rangeStartMs', target.rangeStartMs || 0, 0, 3600)),
      label('out', compareNumberInput(side, 'rangeEndMs', target.rangeEndMs || 0, 0, 3600)),
    );
    return wrap;
  }

  function renderTargetSelect(side) {
    const select = document.createElement('select');
    select.className = 'mmx-compare-target-select';
    select.dataset.side = side;
    select.setAttribute('aria-label', `${side.toUpperCase()} compare source`);
    const selected = project.compare?.[side]?.elementId || '';
    project.elements.forEach((element, index) => {
      const option = document.createElement('option');
      option.value = element.id;
      option.textContent = elementLabel(element, index);
      option.selected = element.id === selected;
      select.append(option);
    });
    return select;
  }

  function compareNumberInput(side, field, valueMs, min, max) {
    const input = document.createElement('input');
    input.type = 'number';
    input.step = '0.1';
    input.min = String(min);
    input.max = String(max);
    input.dataset.side = side;
    input.dataset.field = field;
    input.className = `mmx-compare-target-input mmx-compare-${field.replace(/Ms$/, '').replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)} mmx-compare-${side}-${field.replace(/Ms$/, '').toLowerCase()}`;
    if (side === 'b' && field === 'offsetMs') input.classList.add('mmx-compare-offset-b');
    input.value = secondsString(valueMs);
    input.setAttribute('aria-label', `${side.toUpperCase()} ${field}`);
    return input;
  }

  function updateCompareTarget(side, patch) {
    const current = project.compare?.[side] || {};
    const element = project.elements.find((item) => item.id === (patch.elementId || current.elementId));
    const durationMs = element?.timeline?.durationMs || 3600000;
    const next = {
      ...current,
      ...patch,
    };
    next.rangeStartMs = clampMs(next.rangeStartMs ?? 0, 0, durationMs);
    next.rangeEndMs = clampMs(next.rangeEndMs ?? durationMs, 0, durationMs);
    if (next.rangeEndMs < next.rangeStartMs) {
      if (Object.prototype.hasOwnProperty.call(patch, 'rangeStartMs')) next.rangeEndMs = next.rangeStartMs;
      else next.rangeStartMs = next.rangeEndMs;
    }
    project = setCompareTarget(project, side, next);
    lastAnalysis = null;
    delete root.dataset.lastCompareAnalysis;
  }

  function elementLabel(element, index) {
    const lane = project.lanes.find((item) => item.id === element.laneId);
    const asset = project.assets.find((item) => item.id === element.assetId);
    return `${lane?.label || `Lane ${index + 1}`} · ${asset?.name || element.type || 'element'}`;
  }

  function renderAnalyzeButton() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mmx-compare-analyze';
    button.textContent = overlayKind(project) === 'visual' ? 'Analyze overlap frames' : 'Analyze overlap audio';
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      runCompareAnalysis();
    });
    return button;
  }

  function runCompareAnalysis() {
    lastAnalysis = analyzeCompareSelection(project, visualRuntime.frames);
    root.dataset.lastCompareAnalysis = lastAnalysis.status;
    render();
    return lastAnalysis;
  }

  function renderAnalysisPanel(analysis) {
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

  function replaceCompareBFile(file) {
    const classification = classifyMixerFile(file);
    if (classification.kind === 'unknown') return null;
    const b = project.elements[1];
    const lane = project.lanes.find((item) => item.id === b?.laneId);
    if (!b || !lane) return null;
    const assetId = `asset-compare-b-${Date.now()}`;
    const durationMs = durationForKind(classification.kind);
    project = addAsset(project, {
      id: assetId,
      name: file.name || `Compare B ${classification.kind}`,
      mime: file.type || '',
      size: file.size || 0,
      lastModified: file.lastModified || null,
      capabilities: classification.capabilities,
      media: mediaForKind(classification.kind, durationMs),
      status: classification.capabilities.needsFfmpegForPreview ? 'needs-proxy' : 'available',
    });
    project = updateLane(project, lane.id, (item) => ({
      ...item,
      role: classification.kind === 'unknown' ? 'compare' : classification.kind,
      label: `B · ${file.name || classification.kind}`,
    }));
    project = updateElement(project, b.id, (element) => ({
      ...element,
      assetId,
      type: classification.kind,
      capabilities: classification.capabilities,
      timeline: {
        ...element.timeline,
        durationMs,
        rawDurationMs: classification.kind === 'image' ? durationMs : 0,
        placementDurationMs: durationMs,
        sourceInMs: 0,
        sourceOutMs: durationMs,
      },
      visual: classification.kind === 'audio' ? element.visual : { ...element.visual, opacity: element.visual?.opacity ?? 1 },
      analysis: {},
    }));
    runtimeFiles.set(assetId, file);
    project = refreshCompareTargets(project);
    project = selectTarget(project, { type: 'element', id: b.id }, [{ type: 'element', id: b.id }]);
    root.dataset.compareBFile = file.name || classification.kind;
    render();
    if (classification.kind === 'audio') {
      decodeSummary({ file, filename: file.name, mime: file.type, size: file.size }).then((summary) => {
        if (destroyed || !summary) return;
        project = refreshCompareTargets(applyDroppedAudioSummary(project, assetId, b.id, summary));
        render();
      }).catch(() => {});
    }
    if (classification.kind === 'image' || classification.kind === 'video') {
      probeDroppedVisualMetadata(file, classification.kind).then((metadata) => {
        if (destroyed || !metadata) return;
        project = refreshCompareTargets(applyDroppedVisualMetadata(project, assetId, b.id, metadata));
        render();
      }).catch(() => {});
    }
    return { assetId, elementId: b.id, kind: classification.kind };
  }
}

function buildCompareProject(mediaEl, intake, kind) {
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

function refreshCompareTargets(project) {
  const [a, b] = project.elements;
  if (!a || !b) return project;
  let next = setCompareTarget(project, 'a', targetFromElement(a, project.compare?.a?.offsetMs || 0));
  next = setCompareTarget(next, 'b', targetFromElement(b, project.compare?.b?.offsetMs || 0));
  return next;
}

function targetFromElement(element, offsetMs = 0) {
  const startMs = element.timeline?.sourceInMs || 0;
  const endMs = Math.max(startMs, element.timeline?.durationMs || 0);
  return {
    elementId: element.id,
    rangeStartMs: startMs,
    rangeEndMs: endMs,
    offsetMs,
  };
}

function label(text, input) {
  const wrap = document.createElement('label');
  wrap.className = 'mmx-compare-field';
  wrap.append(text, input);
  return wrap;
}

function secondsString(valueMs) {
  return String(Math.round((Number(valueMs) || 0) / 100) / 10);
}

function clampMs(value, min, max) {
  const number = Number(value);
  return Math.max(min, Math.min(max, Number.isFinite(number) ? number : min));
}

function durationForKind(kind) {
  if (kind === 'image') return 5000;
  return 1000;
}

function mediaForKind(kind, durationMs) {
  if (kind === 'image') return { durationMs, videoWidth: 0, videoHeight: 0, frameRate: 0 };
  if (kind === 'video') return { durationMs: 0, videoWidth: 0, videoHeight: 0, frameRate: 0, audioSampleRate: 0, audioChannels: 0 };
  return { durationMs: 0, audioSampleRate: 0, audioChannels: 0 };
}

function renderOverlayStatus(canvas, overlap) {
  const status = document.createElement('span');
  status.className = 'mmx-compare-overlay-status';
  status.textContent = `${canvas.dataset.kind} overlay · ${Number(canvas.dataset.variedPixels || 0)} varied samples · overlap ${(overlap.overlap.durationMs / 1000).toFixed(2)}s`;
  return status;
}
