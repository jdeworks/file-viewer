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
    transitions: project.transitions || [],
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
  timeline.append(renderLaneStack(snapshot, layout, options));
  timeline.append(renderPlayhead(layout));
  body.append(timeline);

  const preview = buildSeekFramePreview(snapshot, layout.viewport.cursorMs, { ...options.previewSize, frames: options.visualFrames });
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

function renderLaneStack(snapshot, layout, options = {}) {
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
      children.unshift(renderThumbnailStrip(element, options.visualThumbnails));
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
    children.push(renderElementInspectorFields(selectedElement, snapshot));
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

function renderElementInspectorFields(element, snapshot = {}) {
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
    const transition = incomingTransition(snapshot, element);
    const crop = visualCrop(element);
    group.append(
      inspectorNumber('X', 'visual-x', element, element.visual?.x ?? 0, { step: 1 }),
      inspectorNumber('Y', 'visual-y', element, element.visual?.y ?? 0, { step: 1 }),
      inspectorNumber('Scale X', 'visual-scale-x', element, element.visual?.scaleX ?? 1, { min: 0.01, step: 0.01 }),
      inspectorNumber('Scale Y', 'visual-scale-y', element, element.visual?.scaleY ?? 1, { min: 0.01, step: 0.01 }),
      inspectorNumber('Rotate', 'visual-rotation', element, element.visual?.rotation ?? 0, { step: 1 }),
      inspectorNumber('Opacity', 'visual-opacity', element, element.visual?.opacity ?? 1, { min: 0, max: 1, step: 0.01 }),
      inspectorNumber('Visual fade in', 'visual-fade-in', element, element.visual?.fadeInMs ?? 0, { min: 0, step: 5 }),
      inspectorNumber('Visual fade out', 'visual-fade-out', element, element.visual?.fadeOutMs ?? 0, { min: 0, step: 5 }),
      inspectorNumber('Crop X', 'visual-crop-x', element, crop.x, { min: 0, max: 0.99, step: 0.01 }),
      inspectorNumber('Crop Y', 'visual-crop-y', element, crop.y, { min: 0, max: 0.99, step: 0.01 }),
      inspectorNumber('Crop W', 'visual-crop-width', element, crop.width, { min: 0.01, max: 1, step: 0.01 }),
      inspectorNumber('Crop H', 'visual-crop-height', element, crop.height, { min: 0.01, max: 1, step: 0.01 }),
      inspectorNumber('Transition in', 'transition-in', element, transition.durationMs, { min: 0, step: 25 }),
      inspectorSelect('Transition kind', 'transition-kind', element, transition.kind, [
        ['dissolve', 'Dissolve'],
        ['wipe-left', 'Wipe left'],
      ]),
    );
    const filter = videoFilterParams(element);
    group.append(
      inspectorNumber('Brightness', 'effect-brightness', element, filter.brightness, { min: -1, max: 1, step: 0.01 }),
      inspectorNumber('Contrast', 'effect-contrast', element, filter.contrast, { min: 0, max: 3, step: 0.01 }),
      inspectorNumber('Saturation', 'effect-saturation', element, filter.saturation, { min: 0, max: 3, step: 0.01 }),
      inspectorNumber('Blur', 'effect-blur', element, filter.blur, { min: 0, max: 20, step: 0.1 }),
      inspectorNumber('Grayscale', 'effect-grayscale', element, filter.grayscale, { min: 0, max: 1, step: 1 }),
    );
  }
  return group;
}

function visualCrop(element) {
  const crop = element.visual?.crop || {};
  return {
    x: finite(crop.x, 0),
    y: finite(crop.y, 0),
    width: finite(crop.width, 1),
    height: finite(crop.height, 1),
  };
}

function videoFilterParams(element) {
  const effect = (element.effects || []).find((item) => item.kind === 'video-filter' && item.enabled !== false);
  const params = effect?.params || {};
  return {
    brightness: finite(params.brightness, 0),
    contrast: finite(params.contrast, 1),
    saturation: finite(params.saturation, 1),
    blur: finite(params.blur, 0),
    grayscale: finite(params.grayscale, 0),
  };
}

function incomingTransition(snapshot, element) {
  const transition = (snapshot.transitions || []).find((item) => item.toElementId === element.id && item.enabled !== false);
  return {
    durationMs: finite(transition?.durationMs, 0),
    kind: transition?.kind || 'dissolve',
  };
}

function renderVisualBadge(element) {
  const badge = el('span', 'mmx-element-visual', [element.capabilities?.hasVideo ? 'Video frame' : 'Image frame']);
  badge.dataset.opacity = String(element.visual?.opacity ?? 1);
  if (element.capabilities?.needsFfmpegForPreview) badge.dataset.needsProxy = 'true';
  return badge;
}

function renderThumbnailStrip(element, thumbnails) {
  const strip = el('span', 'mmx-thumb-strip');
  const frames = thumbnailFramesFor(thumbnails, element);
  strip.dataset.elementId = element.id;
  strip.dataset.thumbCount = String(frames.length);
  if (element.capabilities?.needsFfmpegForPreview) {
    strip.dataset.needsProxy = 'true';
    strip.append(el('span', 'mmx-thumb-proxy', ['Proxy required']));
    return strip;
  }
  if (!frames.length) {
    strip.append(el('span', 'mmx-thumb-pending', ['Thumbnails pending']));
    return strip;
  }
  for (const frame of frames) {
    const canvas = document.createElement('canvas');
    canvas.className = 'mmx-thumb';
    canvas.width = 48;
    canvas.height = 28;
    canvas.dataset.sampledMs = String(Math.round(frame.sampledMs || 0));
    drawThumbnail(canvas, frame.source);
    strip.append(canvas);
  }
  return strip;
}

function thumbnailFramesFor(thumbnails, element) {
  if (!thumbnails) return [];
  const frames = typeof thumbnails.get === 'function'
    ? thumbnails.get(element.id) || thumbnails.get(element.assetId)
    : thumbnails[element.id] || thumbnails[element.assetId];
  return Array.isArray(frames) ? frames.filter((frame) => frame?.source) : [];
}

function drawThumbnail(canvas, source) {
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (source) drawContainedThumbnail(ctx, source, 0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
}

function drawContainedThumbnail(ctx, source, x, y, width, height) {
  const sourceWidth = source.naturalWidth || source.videoWidth || source.width || width;
  const sourceHeight = source.naturalHeight || source.videoHeight || source.height || height;
  const scale = Math.min(width / sourceWidth, height / sourceHeight);
  const drawW = sourceWidth * scale;
  const drawH = sourceHeight * scale;
  ctx.drawImage(source, x + (width - drawW) / 2, y + (height - drawH) / 2, drawW, drawH);
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

function inspectorSelect(labelText, field, element, value, options = []) {
  const label = el('label', 'mmx-inspector-field');
  const text = el('span', '', [labelText]);
  const input = document.createElement('select');
  input.className = `mmx-inspector-${field}`;
  input.dataset.action = 'update-element';
  input.dataset.elementId = element.id;
  input.dataset.field = field;
  input.dataset.valueType = 'string';
  for (const [optionValue, optionLabel] of options) {
    const option = document.createElement('option');
    option.value = optionValue;
    option.textContent = optionLabel;
    option.selected = optionValue === value;
    input.append(option);
  }
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

function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
