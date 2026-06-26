import {
  addElement,
  addLane,
  computeCompareOverlap,
  createElement,
  createLane,
  createMixerSnapshot,
  createProjectFromAssetMetadata,
  exportProjectSettingsJson,
  selectTarget,
  setCompareTarget,
} from './index.js';
import { renderMixerShell } from './mixer-renderer.js';
import { attachMixerInteractions } from './mixer-interactions.js';
import { ensureMixerStyles } from './mixer-ui.js';
import { clampZoom, decodeSummary, mediaDuration, selectFirstElement } from './mixer-audio-listen-helpers.js';
import { createMixerVisualRuntime } from './mixer-visual-runtime.js';
import { updateProjectElementField } from './mixer-audio-multi-helpers.js';
import { classifyMixerFile } from './mixer-media-drop.js';

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
  const runtimeFiles = new Map();
  if (intake?.file) runtimeFiles.set(ASSET_ID, intake.file);
  const visualRuntime = createMixerVisualRuntime({ runtimeFiles, onUpdate: render });

  const dispatch = (action) => {
    if (action.type === 'seek') viewport = { ...viewport, cursorMs: Math.max(0, Number(action.cursorMs) || 0) };
    if (action.type === 'zoom') viewport = { ...viewport, pxPerMs: clampZoom(action.pxPerMs) };
    if (action.type === 'zoom-relative') viewport = { ...viewport, pxPerMs: clampZoom(viewport.pxPerMs * action.factor) };
    if (action.type === 'pan') viewport = { ...viewport, scrollLeft: Math.max(0, Number(action.scrollLeft) || 0) };
    if (action.type === 'fit') viewport = { ...viewport, scrollLeft: 0, pxPerMs: 0.06 };
    if (action.type === 'select') project = selectTarget(project, action.target, [action.target]);
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
    if (!button || !root.contains(button)) return;
    project = { ...project, compare: { ...project.compare, view: button.dataset.view || 'stacked' } };
    render();
  };
  const onInput = (event) => {
    if (!event.target?.matches?.('.mmx-compare-offset-b')) return;
    const value = Math.max(-600000, Math.min(600000, Number(event.target.value) * 1000 || 0));
    project = { ...project, compare: { ...project.compare, b: { ...project.compare.b, offsetMs: value } } };
    render();
  };
  root.addEventListener('click', onClick);
  root.addEventListener('input', onInput);
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
    exportSettings: () => exportProjectSettingsJson(project),
    dispatch,
  };
  render();

  return {
    destroy() {
      destroyed = true;
      interactions.destroy();
      visualRuntime.dispose();
      root.removeEventListener('click', onClick);
      root.removeEventListener('input', onInput);
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
    const offset = document.createElement('input');
    offset.className = 'mmx-compare-offset-b';
    offset.type = 'number';
    offset.step = '0.1';
    offset.value = String(Math.round((project.compare.b?.offsetMs || 0) / 100) / 10);
    group.append(label('B offset', offset));
    group.append(renderOverlap());
    toolbar.append(group);
    if (project.compare.view === 'overlay') root.append(renderOverlay());
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
    node.textContent = 'Shared-model overlay preview';
    return node;
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
  const durationA = a.timeline?.durationMs || 0;
  const durationB = b.timeline?.durationMs || 0;
  let next = setCompareTarget(project, 'a', {
    elementId: a.id,
    rangeStartMs: a.timeline?.sourceInMs || 0,
    rangeEndMs: Math.max(a.timeline?.sourceInMs || 0, durationA),
    offsetMs: project.compare?.a?.offsetMs || 0,
  });
  next = setCompareTarget(next, 'b', {
    elementId: b.id,
    rangeStartMs: b.timeline?.sourceInMs || 0,
    rangeEndMs: Math.max(b.timeline?.sourceInMs || 0, durationB),
    offsetMs: project.compare?.b?.offsetMs || 0,
  });
  return next;
}

function label(text, input) {
  const wrap = document.createElement('label');
  wrap.className = 'mmx-compare-field';
  wrap.append(text, input);
  return wrap;
}
