import {
  addElement,
  addAsset,
  addLane,
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
  const onChange = (event) => {
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
    const offset = document.createElement('input');
    offset.className = 'mmx-compare-offset-b';
    offset.type = 'number';
    offset.step = '0.1';
    offset.value = String(Math.round((project.compare.b?.offsetMs || 0) / 100) / 10);
    group.append(label('B offset', offset));
    group.append(renderBInput());
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

function durationForKind(kind) {
  if (kind === 'image') return 5000;
  return 1000;
}

function mediaForKind(kind, durationMs) {
  if (kind === 'image') return { durationMs, videoWidth: 0, videoHeight: 0, frameRate: 0 };
  if (kind === 'video') return { durationMs: 0, videoWidth: 0, videoHeight: 0, frameRate: 0, audioSampleRate: 0, audioChannels: 0 };
  return { durationMs: 0, audioSampleRate: 0, audioChannels: 0 };
}

function overlayKind(project) {
  return project.elements.some((element) => element.capabilities?.hasVideo || element.capabilities?.hasImage)
    ? 'visual'
    : 'audio';
}

function drawCompareOverlay(canvas, project, frames) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
  const [a, b] = compareElements(project);
  if (overlayKind(project) === 'visual') drawVisualOverlay(ctx, canvas, a, b, frames);
  else drawAudioOverlay(ctx, canvas, a, b);
  canvas.dataset.variedPixels = String(countVariedPixels(ctx, canvas));
}

function compareElements(project) {
  return ['a', 'b'].map((side) => {
    const id = project.compare?.[side]?.elementId;
    return project.elements.find((element) => element.id === id) || null;
  });
}

function drawAudioOverlay(ctx, canvas, a, b) {
  drawWave(ctx, canvas, a?.analysis?.waveformSummary, '#4c78a8', 0.72);
  drawWave(ctx, canvas, b?.analysis?.waveformSummary, '#e5534b', 0.58);
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.font = '12px sans-serif';
  ctx.fillText('A', 10, 18);
  ctx.fillStyle = 'rgba(229,83,75,0.92)';
  ctx.fillText('B', 30, 18);
}

function drawWave(ctx, canvas, summary, color, alpha) {
  const mid = canvas.height / 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  if (!summary?.buckets) {
    ctx.fillRect(0, mid - 1, canvas.width, 2);
    ctx.restore();
    return;
  }
  for (let x = 0; x < canvas.width; x += 1) {
    const index = Math.min(summary.buckets - 1, Math.floor((x / canvas.width) * summary.buckets));
    const hi = Math.max(0.02, summary.max?.[index] || summary.peak?.[index] || 0);
    const lo = Math.min(-0.02, summary.min?.[index] || -(summary.peak?.[index] || 0));
    const top = mid - Math.max(1, hi * mid * 0.88);
    const bottom = mid - Math.min(-1, lo * mid * 0.88);
    ctx.fillRect(x, top, 1, Math.max(1, bottom - top));
  }
  ctx.restore();
}

function drawVisualOverlay(ctx, canvas, a, b, frames) {
  drawVisual(ctx, canvas, a, frames, '#4c78a8', 0.72, 'A', -canvas.width * 0.08);
  drawVisual(ctx, canvas, b, frames, '#e5534b', 0.54, 'B', canvas.width * 0.08);
}

function drawVisual(ctx, canvas, element, frames, color, alpha, labelText, offsetX) {
  if (!element) return;
  const source = frameFor(frames, element)?.source;
  const visual = element.visual || {};
  const w = canvas.width * 0.56 * Math.max(0.05, Number(visual.scaleX) || 1);
  const h = canvas.height * 0.66 * Math.max(0.05, Number(visual.scaleY) || 1);
  const cx = canvas.width / 2 + offsetX + (Number(visual.x) || 0);
  const cy = canvas.height / 2 + (Number(visual.y) || 0);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha * (visual.opacity ?? 1)));
  ctx.translate(cx, cy);
  ctx.rotate(((Number(visual.rotation) || 0) * Math.PI) / 180);
  if (source) drawContained(ctx, source, -w / 2, -h / 2, w, h);
  else {
    ctx.fillStyle = color;
    ctx.fillRect(-w / 2, -h / 2, w, h);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = '#ffffff';
  ctx.font = '13px sans-serif';
  ctx.fillText(labelText, -w / 2 + 8, -h / 2 + 18);
  ctx.restore();
}

function drawContained(ctx, source, x, y, width, height) {
  const sourceWidth = source.naturalWidth || source.videoWidth || source.width || width;
  const sourceHeight = source.naturalHeight || source.videoHeight || source.height || height;
  const scale = Math.min(width / sourceWidth, height / sourceHeight);
  const drawW = sourceWidth * scale;
  const drawH = sourceHeight * scale;
  ctx.drawImage(source, x + (width - drawW) / 2, y + (height - drawH) / 2, drawW, drawH);
}

function frameFor(frames, element) {
  if (!frames) return null;
  if (typeof frames.get === 'function') return frames.get(element.id) || frames.get(element.assetId) || null;
  return frames[element.id] || frames[element.assetId] || null;
}

function countVariedPixels(ctx, canvas) {
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const first = [data[0], data[1], data[2], data[3]];
  let varied = 0;
  for (let i = 0; i < data.length; i += 32) {
    if (data[i] !== first[0] || data[i + 1] !== first[1] || data[i + 2] !== first[2] || data[i + 3] !== first[3]) varied += 1;
  }
  return varied;
}

function renderOverlayStatus(canvas, overlap) {
  const status = document.createElement('span');
  status.className = 'mmx-compare-overlay-status';
  status.textContent = `${canvas.dataset.kind} overlay · ${Number(canvas.dataset.variedPixels || 0)} varied samples · overlap ${(overlap.overlap.durationMs / 1000).toFixed(2)}s`;
  return status;
}
