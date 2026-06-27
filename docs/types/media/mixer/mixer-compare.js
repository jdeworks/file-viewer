import {
  addAsset,
  captureElementKeyframe,
  computeCompareOverlap,
  exportProjectSettingsJson,
  selectTarget,
  setCompareTarget,
  updateElement,
  updateLane,
} from './index.js';
import { ensureAudioListenStyles } from './mixer-audio-listen.js';
import { createClipLane } from './audio-clip-lane.js';
import { clampZoom, decodeSummary, fmtTime } from './mixer-audio-listen-helpers.js';
import {
  buildCompareProject,
  clampMs,
  durationForKind,
  label,
  mediaForKind,
  refreshCompareTargets,
  renderAnalysisPanel,
  renderCompareBInput,
  renderCompareNormalizeToggle,
  renderCompareOverlap,
  renderOverlayStatus,
  secondsString,
  targetFromElement,
} from './mixer-compare-ui.js';
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
  ensureAudioListenStyles();
  const root = document.createElement('section');
  root.className = `mmx-compare-source mmx-compare-source--${kind} al-surface`;
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

  let _scrollSyncing = false;
  const syncScroll = (px) => { if (_scrollSyncing) return; _scrollSyncing = true; laneA.setScroll(px); laneB.setScroll(px); _scrollSyncing = false; };

  // Shared lane factory — A and B have the same interaction shape
  function makeLane(side) {
    return createClipLane({
      label: side.toUpperCase(), kind: kind.toUpperCase(), interactive: true,
      callbacks: {
        onMove(deltaSec) {
          const c = project.compare?.[side] || {};
          updateCompareTarget(side, { offsetMs: clampMs((c.offsetMs || 0) + deltaSec * 1000, -600000, 600000) });
          render();
        },
        onTrim(trimSide, deltaSec) {
          const c = project.compare?.[side] || {};
          const deltaMs = deltaSec * 1000;
          if (trimSide === 'in') updateCompareTarget(side, { rangeStartMs: clampMs((c.rangeStartMs || 0) + deltaMs, 0, 3600000) });
          else updateCompareTarget(side, { rangeEndMs: clampMs((c.rangeEndMs || 0) + deltaMs, 0, 3600000) });
          render();
        },
        onSeek(sec) { viewport = { ...viewport, cursorMs: sec * 1000 }; render(); },
        onScroll(px) { viewport = { ...viewport, scrollLeft: px }; syncScroll(px); },
        onSelect() {},
      },
    });
  }
  const laneA = makeLane('a');
  const laneB = makeLane('b');
  laneA.setSurface(root);
  laneB.setSurface(root);

  // Persistent skeleton — toolbar and lanes container never leave root (preserves pointer capture).
  // Toolbar carries both al-toolbar (DAW styling) and mmx-toolbar (settingsUi.decorate() hook).
  const toolbarEl = document.createElement('div');
  toolbarEl.className = 'al-toolbar mmx-toolbar';
  const lanesContainer = document.createElement('div');
  lanesContainer.className = 'al-lanes';
  lanesContainer.append(laneA.el, laneB.el);
  root.append(toolbarEl, lanesContainer);

  const dispatch = (action) => {
    if (action.type === 'seek') viewport = { ...viewport, cursorMs: Math.max(0, Number(action.cursorMs) || 0) };
    if (action.type === 'zoom') viewport = { ...viewport, pxPerMs: clampZoom(action.pxPerMs) };
    if (action.type === 'zoom-relative') viewport = { ...viewport, pxPerMs: clampZoom(viewport.pxPerMs * action.factor) };
    if (action.type === 'pan') viewport = { ...viewport, scrollLeft: Math.max(0, Number(action.scrollLeft) || 0) };
    if (action.type === 'fit') { const tl = computeTimelineSec(); viewport = { ...viewport, scrollLeft: 0, pxPerMs: Math.max(120, (root.clientWidth||960)-96) / Math.max(1, tl*1000) }; }
    if (action.type === 'select') project = selectTarget(project, action.target, [action.target]);
    if (action.type === 'capture-keyframe') project = captureElementKeyframe(project, action.elementId, viewport.cursorMs);
    if (action.type === 'update-element') {
      project = updateProjectElementField(project, action);
      project = refreshCompareTargets(project);
    }
    render();
  };

  const onClick = (event) => {
    const btn = event.target?.closest?.('button,.mmx-compare-view');
    if (!btn || !root.contains(btn)) return;
    if (btn.matches('.mmx-compare-view')) { project = { ...project, compare: { ...project.compare, view: btn.dataset.view || 'stacked' } }; render(); return; }
    if (btn.matches('.mmx-compare-zoom-in')) { dispatch({ type: 'zoom-relative', factor: 1.5 }); return; }
    if (btn.matches('.mmx-compare-zoom-out')) { dispatch({ type: 'zoom-relative', factor: 1/1.5 }); return; }
    if (btn.matches('.mmx-compare-fit')) { dispatch({ type: 'fit' }); return; }
  };
  const onInput = (event) => {
    const input = event.target;
    if (!input?.matches?.('.mmx-compare-target-input')) return;
    const side = input.dataset.side;
    if (side !== 'a' && side !== 'b') return;
    const field = input.dataset.field;
    const value = Math.round((Number.isFinite(Number(input.value)) ? Number(input.value) : 0) * 1000);
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
        updateCompareTarget(side, targetFromElement(element, project.compare?.[side]?.offsetMs || 0));
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
        elements: project.elements.map((el) => ({ ...el, analysis: { ...el.analysis, waveformSummary: summary } })),
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
    root.dataset.compareView = project.compare.view || 'stacked';
    root.dataset.compareOverlapMs = String(Math.round(computeCompareOverlap(project).overlap.durationMs));

    // Rebuild toolbar controls (no drag elements — safe to replace every render)
    const controls = document.createElement('div');
    controls.className = 'mmx-compare-controls';
    for (const v of ['stacked', 'overlay']) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mmx-compare-view';
      btn.dataset.view = v;
      btn.setAttribute('aria-pressed', project.compare.view === v ? 'true' : 'false');
      btn.textContent = v;
      controls.append(btn);
    }
    controls.append(renderTargetControls('a'), renderTargetControls('b'));
    if (kind === 'audio') controls.append(renderCompareNormalizeToggle(project));
    const zg = document.createElement('span'); zg.className = 'al-zoom';
    [['−','mmx-compare-zoom-out'],['Fit','mmx-compare-fit'],['+','mmx-compare-zoom-in']].forEach(([t,c]) => { const b=document.createElement('button'); b.type='button'; b.className=`al-btn ${c}`; b.textContent=t; zg.append(b); });
    controls.append(renderCompareBInput(kind), renderAnalyzeButton(), renderCompareOverlap(computeCompareOverlap(project)), zg);
    toolbarEl.replaceChildren(controls);

    // Stacked lanes vs overlay
    root.querySelector('.mmx-compare-overlay')?.remove();
    if ((project.compare.view || 'stacked') === 'overlay') {
      lanesContainer.hidden = true;
      root.insertBefore(renderOverlay(), lanesContainer.nextSibling);
    } else {
      lanesContainer.hidden = false;
      const tl = computeTimelineSec();
      const cursorSec = viewport.cursorMs / 1000;
      const pxs = viewport.pxPerMs * 1000;
      laneA.update(buildClipView('a', tl, cursorSec, pxs));
      laneB.update(buildClipView('b', tl, cursorSec, pxs));
      syncScroll(viewport.scrollLeft);
    }

    root.querySelector('.mmx-compare-analysis')?.remove();
    if (lastAnalysis) root.append(renderAnalysisPanel(lastAnalysis));
    settingsUi.decorate();
    visualRuntime.update(project, viewport.cursorMs);
  }

  function computeTimelineSec() {
    const a = project.compare?.a || {};
    const b = project.compare?.b || {};
    const elA = project.elements.find((e) => e.id === a.elementId);
    const elB = project.elements.find((e) => e.id === b.elementId);
    const durAMs = elA?.timeline?.durationMs || 1000;
    const durBMs = elB?.timeline?.durationMs || 1000;
    const endA = (a.offsetMs || 0) / 1000 + ((a.rangeEndMs ?? durAMs) - (a.rangeStartMs || 0)) / 1000;
    const endB = (b.offsetMs || 0) / 1000 + ((b.rangeEndMs ?? durBMs) - (b.rangeStartMs || 0)) / 1000;
    return Math.max(endA, endB, 1);
  }

  function buildClipView(side, timelineSec, cursorSec, pxPerSec = 0) {
    const target = project.compare?.[side] || {};
    const element = project.elements.find((e) => e.id === target.elementId);
    const durationMs = element?.timeline?.durationMs || 1000;
    const rangeStartMs = target.rangeStartMs || 0;
    const rangeEndMs = target.rangeEndMs ?? durationMs;
    return {
      timelineSec,
      startSec: (target.offsetMs || 0) / 1000,
      lenSec: Math.max(0.001, (rangeEndMs - rangeStartMs) / 1000),
      sourceInFrac: rangeStartMs / Math.max(1, durationMs),
      sourceOutFrac: rangeEndMs / Math.max(1, durationMs),
      cursorSec,
      cursorLabel: fmtTime(cursorSec),
      fadeInSec: (element?.audio?.fadeInMs || 0) / 1000,
      fadeOutSec: (element?.audio?.fadeOutMs || 0) / 1000,
      summary: element?.analysis?.waveformSummary || null,
      selected: false,
      pxPerSec,
    };
  }

  function renderOverlay() {
    const node = document.createElement('div');
    node.className = 'mmx-compare-overlay';
    const overlap = computeCompareOverlap(project);
    node.dataset.hasOverlap = overlap.hasOverlap ? 'true' : 'false';
    node.dataset.offsetDeltaMs = String(Math.round(overlap.offsetDeltaMs || 0));
    const heading = document.createElement('strong');
    heading.textContent = project.elements.some((el) => el.capabilities?.hasVideo || el.capabilities?.hasImage)
      ? 'Shared visual overlay' : 'Shared waveform overlay';
    const canvas = document.createElement('canvas');
    canvas.className = 'mmx-compare-overlay-canvas';
    canvas.width = 640;
    canvas.height = 180;
    canvas.dataset.compareA = project.compare?.a?.elementId || '';
    canvas.dataset.compareB = project.compare?.b?.elementId || '';
    canvas.dataset.kind = overlayKind(project);
    drawCompareOverlay(canvas, project, visualRuntime.frames, project.compare?.overlayOpacity ?? 0.5);
    // B-layer opacity: drag to fade B over A and see where they differ. Its input only redraws the
    // canvas (no full render), so the slider survives the drag.
    const opWrap = document.createElement('label');
    opWrap.className = 'mmx-compare-opacity-field';
    const opSpan = document.createElement('span');
    const opacity = document.createElement('input');
    opacity.type = 'range';
    opacity.className = 'mmx-compare-opacity';
    opacity.min = '0';
    opacity.max = '1';
    opacity.step = '0.05';
    opacity.value = String(project.compare?.overlayOpacity ?? 0.5);
    opSpan.textContent = `B opacity ${Math.round((project.compare?.overlayOpacity ?? 0.5) * 100)}%`;
    opacity.addEventListener('input', () => {
      const v = Number(opacity.value);
      project = { ...project, compare: { ...project.compare, overlayOpacity: v } };
      opSpan.textContent = `B opacity ${Math.round(v * 100)}%`;
      drawCompareOverlay(canvas, project, visualRuntime.frames, v);
    });
    opWrap.append(opSpan, opacity);
    node.append(heading, opWrap, canvas, renderOverlayStatus(canvas, overlap));
    return node;
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
      const lane = project.lanes.find((l) => l.id === element.laneId);
      const asset = project.assets.find((a) => a.id === element.assetId);
      const option = document.createElement('option');
      option.value = element.id;
      option.textContent = `${lane?.label || `Lane ${index + 1}`} · ${asset?.name || element.type || 'element'}`;
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
    input.className = `mmx-compare-target-input mmx-compare-${field.replace(/Ms$/, '').replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)} mmx-compare-${side}-${field.replace(/Ms$/, '').toLowerCase()}`;
    if (side === 'b' && field === 'offsetMs') input.classList.add('mmx-compare-offset-b');
    input.value = secondsString(valueMs);
    input.setAttribute('aria-label', `${side.toUpperCase()} ${field}`);
    return input;
  }

  function updateCompareTarget(side, patch) {
    const current = project.compare?.[side] || {};
    const element = project.elements.find((item) => item.id === (patch.elementId || current.elementId));
    const durationMs = element?.timeline?.durationMs || 3600000;
    const next = { ...current, ...patch };
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

  function renderAnalyzeButton() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mmx-compare-analyze';
    button.textContent = overlayKind(project) === 'visual' ? 'Analyze overlap frames' : 'Analyze overlap audio';
    button.addEventListener('click', (event) => { event.stopPropagation(); runCompareAnalysis(); });
    return button;
  }

  function runCompareAnalysis() {
    lastAnalysis = analyzeCompareSelection(project, visualRuntime.frames);
    root.dataset.lastCompareAnalysis = lastAnalysis.status;
    render();
    return lastAnalysis;
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
