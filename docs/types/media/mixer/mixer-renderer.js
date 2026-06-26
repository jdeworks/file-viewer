import { buildMixerLayout, MIXER_LAYOUT, timeMsToX } from './mixer-hit-test.js';
import { drawWaveformSummary } from '../waveform-data.js';
import { buildSeekFramePreview, renderSeekFramePreview } from './mixer-visual-preview.js';

export function createMixerSnapshot(project = {}) {
  const lanes = (project.lanes || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const elements = (project.elements || []).slice();
  return {
    projectId: project.project?.id || project.id || 'mixer-project',
    name: project.project?.name || project.name || 'Media mix',
    durationMs: project.project?.durationMs || 0,
    lanes,
    elements,
    selection: project.selection || { primary: null, items: [] },
    compare: project.compare || {},
    capabilities: project.capabilities || null,
  };
}

export function renderMixerShell(root, snapshot, viewportInput = {}, options = {}) {
  if (!root) throw new Error('renderMixerShell requires a root element.');
  const viewport = { ...viewportInput, width: viewportInput.width || root.clientWidth || 960 };
  const layout = buildMixerLayout(snapshot, viewport);
  root.replaceChildren();
  root.className = mergeClass(root.className, 'mmx-shell');
  root.dataset.mixerProjectId = snapshot.projectId;
  root.dataset.cursorMs = String(Math.round(layout.viewport.cursorMs));
  root.dataset.zoom = layout.viewport.pxPerMs.toFixed(4);
  root.dataset.scrollLeft = String(Math.round(layout.viewport.scrollLeft));

  const toolbar = el('div', 'mmx-toolbar', [
    el('div', 'mmx-title', [snapshot.name]),
    el('div', 'mmx-modebar', [
      el('button', 'mmx-mode is-active', ['Listen']),
      el('button', 'mmx-mode', ['Mix']),
      el('button', 'mmx-mode', ['Compare']),
    ]),
    button('Zoom out', 'zoom-out', '-'),
    range('mmx-zoom', layout.viewport.pxPerMs, options.minZoom || 0.02, options.maxZoom || 0.4),
    button('Zoom in', 'zoom-in', '+'),
    button('Fit', 'fit', 'Fit'),
    el('div', 'mmx-time', [formatTime(layout.viewport.cursorMs)]),
  ]);

  const body = el('div', 'mmx-body');
  body.scrollLeft = layout.viewport.scrollLeft;
  const timeline = el('div', 'mmx-timeline');
  timeline.style.width = `${Math.max(layout.width, layout.viewport.width)}px`;
  timeline.style.height = `${layout.height}px`;
  timeline.append(renderRuler(snapshot, layout));
  timeline.append(renderLaneStack(snapshot, layout));
  timeline.append(renderPlayhead(layout));
  body.append(timeline);

  const preview = buildSeekFramePreview(snapshot, layout.viewport.cursorMs, options.previewSize);
  const inspector = renderInspector(snapshot);
  root.append(toolbar, body);
  renderSeekFramePreview(root, preview);
  root.append(inspector);
  drawElementWaveforms(root, snapshot, options);
  return {
    layout,
    elements: { toolbar, body, timeline, inspector },
  };
}

function renderRuler(snapshot, layout) {
  const ruler = el('div', 'mmx-ruler');
  ruler.style.left = `${MIXER_LAYOUT.gutterWidth}px`;
  ruler.style.width = `${layout.timelineWidth}px`;
  const tickStep = chooseTickStep(layout.viewport.pxPerMs);
  const start = Math.floor(layout.viewport.scrollLeft / layout.viewport.pxPerMs / tickStep) * tickStep;
  const end = Math.max(layout.durationMs, start + layout.timelineWidth / layout.viewport.pxPerMs);
  for (let t = start; t <= end; t += tickStep) {
    const tick = el('div', 'mmx-ruler-tick', [formatTime(t)]);
    tick.style.left = `${timeMsToX(t, layout.viewport) - MIXER_LAYOUT.gutterWidth}px`;
    ruler.append(tick);
  }
  void snapshot;
  return ruler;
}

function renderLaneStack(snapshot, layout) {
  const stack = el('div', 'mmx-lanes');
  for (const laneRect of layout.laneRects) {
    const lane = snapshot.lanes.find((item) => item.id === laneRect.laneId);
    const laneNode = el('div', 'mmx-lane');
    laneNode.dataset.laneId = laneRect.laneId;
    laneNode.style.top = `${laneRect.y}px`;
    laneNode.style.height = `${laneRect.height}px`;

    const header = el('div', 'mmx-lane-header', [
      el('strong', 'mmx-lane-label', [lane?.label || lane?.role || 'Lane']),
      el('span', 'mmx-lane-role', [lane?.role || 'source']),
    ]);
    header.style.width = `${MIXER_LAYOUT.gutterWidth}px`;
    laneNode.append(header);

    const rail = el('div', 'mmx-lane-rail');
    rail.style.left = `${MIXER_LAYOUT.gutterWidth}px`;
    rail.style.width = `${layout.timelineWidth}px`;
    laneNode.append(rail);
    stack.append(laneNode);
  }

  for (const rect of layout.elementRects) {
    const element = snapshot.elements.find((item) => item.id === rect.elementId);
    const children = [
      el('span', 'mmx-element-title', [elementLabel(element)]),
      el('span', 'mmx-element-meta', [elementMeta(element)]),
      el('span', 'mmx-fade mmx-fade-in'),
      el('span', 'mmx-fade mmx-fade-out'),
    ];
    if (element?.capabilities?.hasAudio) {
      const canvas = document.createElement('canvas');
      canvas.className = 'mmx-element-waveform';
      canvas.dataset.elementId = rect.elementId;
      children.unshift(canvas);
    }
    if (element?.capabilities?.hasVideo || element?.capabilities?.hasImage) {
      children.unshift(renderVisualBadge(element));
    }
    const block = el('button', 'mmx-element', children);
    block.type = 'button';
    block.dataset.elementId = rect.elementId;
    block.dataset.laneId = rect.laneId;
    block.style.left = `${rect.x}px`;
    block.style.top = `${rect.y}px`;
    block.style.width = `${rect.width}px`;
    block.style.height = `${rect.height}px`;
    if (snapshot.selection?.primary?.type === 'element' && snapshot.selection.primary.id === rect.elementId) {
      block.classList.add('is-selected');
    }
    stack.append(block);
  }

  return stack;
}

function renderPlayhead(layout) {
  const playhead = el('div', 'mmx-playhead');
  playhead.style.left = `${layout.playheadX}px`;
  playhead.style.height = `${layout.height}px`;
  return playhead;
}

function renderInspector(snapshot) {
  const primary = snapshot.selection?.primary;
  const selectedElement = primary?.type === 'element'
    ? snapshot.elements.find((element) => element.id === primary.id)
    : null;
  const selectedLane = primary?.type === 'lane'
    ? snapshot.lanes.find((lane) => lane.id === primary.id)
    : null;
  const title = selectedElement
    ? elementLabel(selectedElement)
    : selectedLane
      ? selectedLane.label || selectedLane.role
      : 'No selection';
  const children = [
    el('div', 'mmx-inspector-kicker', ['Inspector']),
    el('h3', 'mmx-inspector-title', [title]),
  ];
  if (selectedElement) {
    children.push(renderElementInspectorFields(selectedElement));
  } else {
    children.push(el('p', 'mmx-inspector-body', [selectedLane
      ? `Lane ${selectedLane.role}`
      : 'Select a lane or element to edit timing, gain, fades, transforms, and effects.']));
  }
  const inspector = el('aside', 'mmx-inspector', children);
  inspector.dataset.selectedType = primary?.type || '';
  inspector.dataset.selectedId = primary?.id || '';
  return inspector;
}

function renderElementInspectorFields(element) {
  const group = el('div', 'mmx-inspector-grid');
  group.append(
    inspectorNumber('Start', 'start', element, (element.timeline?.startMs || 0) / 1000, { min: 0, step: 0.01 }),
    inspectorNumber('In', 'source-in', element, (element.timeline?.sourceInMs || 0) / 1000, { min: 0, step: 0.01 }),
    inspectorNumber('Out', 'source-out', element, (element.timeline?.sourceOutMs || element.timeline?.durationMs || 0) / 1000, { min: 0, step: 0.01 }),
    inspectorNumber('Gain', 'gain', element, element.audio?.gain ?? 1, { min: 0, max: 2, step: 0.01 }),
    inspectorNumber('Fade in', 'fade-in', element, element.audio?.fadeInMs ?? 0, { min: 0, step: 5 }),
    inspectorNumber('Fade out', 'fade-out', element, element.audio?.fadeOutMs ?? 0, { min: 0, step: 5 }),
  );
  if (element.capabilities?.hasVideo || element.capabilities?.hasImage) {
    group.append(
      inspectorNumber('X', 'visual-x', element, element.visual?.x ?? 0, { step: 1 }),
      inspectorNumber('Y', 'visual-y', element, element.visual?.y ?? 0, { step: 1 }),
      inspectorNumber('Scale X', 'visual-scale-x', element, element.visual?.scaleX ?? 1, { min: 0.01, step: 0.01 }),
      inspectorNumber('Scale Y', 'visual-scale-y', element, element.visual?.scaleY ?? 1, { min: 0.01, step: 0.01 }),
      inspectorNumber('Rotate', 'visual-rotation', element, element.visual?.rotation ?? 0, { step: 1 }),
      inspectorNumber('Opacity', 'visual-opacity', element, element.visual?.opacity ?? 1, { min: 0, max: 1, step: 0.01 }),
    );
  }
  return group;
}

function renderVisualBadge(element) {
  const badge = el('span', 'mmx-element-visual', [element.capabilities?.hasVideo ? 'Video frame' : 'Image frame']);
  badge.dataset.opacity = String(element.visual?.opacity ?? 1);
  return badge;
}

function inspectorNumber(labelText, field, element, value, attrs = {}) {
  const label = el('label', 'mmx-inspector-field');
  const text = el('span', '', [labelText]);
  const input = document.createElement('input');
  input.type = 'number';
  input.className = `mmx-inspector-${field}`;
  input.dataset.action = 'update-element';
  input.dataset.elementId = element.id;
  input.dataset.field = field;
  input.value = String(Math.round(Number(value) * 1000) / 1000);
  for (const [key, attrValue] of Object.entries(attrs)) input.setAttribute(key, String(attrValue));
  label.append(text, input);
  return label;
}

function drawElementWaveforms(root, snapshot, options = {}) {
  for (const canvas of root.querySelectorAll('.mmx-element-waveform')) {
    const element = snapshot.elements.find((item) => item.id === canvas.dataset.elementId);
    const summary = element?.analysis?.waveformSummary
      || options.waveforms?.[element?.id]
      || options.waveforms?.[element?.assetId];
    if (!summary) continue;
    drawWaveformSummary(canvas, summary, {
      startTime: (element.timeline?.sourceInMs || 0) / 1000,
      endTime: (element.timeline?.sourceOutMs || element.timeline?.durationMs || 0) / 1000,
    });
  }
}

function button(label, action, text) {
  const node = el('button', 'mmx-tool', [text || label]);
  node.type = 'button';
  node.dataset.action = action;
  node.setAttribute('aria-label', label);
  return node;
}

function range(className, value, min, max) {
  const input = document.createElement('input');
  input.className = className;
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = '0.005';
  input.value = String(value);
  input.dataset.action = 'zoom';
  input.setAttribute('aria-label', 'Timeline zoom');
  return input;
}

function el(tag, className, children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const child of Array.isArray(children) ? children : [children]) {
    if (child == null) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

function mergeClass(existing, required) {
  const parts = new Set(String(existing || '').split(/\s+/).filter(Boolean));
  parts.add(required);
  return Array.from(parts).join(' ');
}

function elementLabel(element = {}) {
  return element.assetId || element.type || 'element';
}

function elementMeta(element = {}) {
  const caps = element.capabilities || {};
  const bits = [];
  if (caps.hasAudio) bits.push('audio');
  if (caps.hasVideo) bits.push('video');
  if (caps.hasImage) bits.push('image');
  return bits.join(' + ') || element.type || 'media';
}

function chooseTickStep(pxPerMs) {
  const targetPx = 90;
  const rawMs = targetPx / Math.max(0.001, pxPerMs);
  const steps = [100, 250, 500, 1000, 2000, 5000, 10000, 15000, 30000, 60000, 120000, 300000];
  return steps.find((step) => step >= rawMs) || steps[steps.length - 1];
}

function formatTime(ms) {
  const total = Math.max(0, Math.round(Number(ms) || 0));
  const seconds = Math.floor(total / 1000);
  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, '0');
  const tenths = Math.floor((total % 1000) / 100);
  return `${mm}:${ss}.${tenths}`;
}
