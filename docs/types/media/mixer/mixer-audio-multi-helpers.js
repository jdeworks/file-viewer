import { moveElement, setElementTransition, trimElement, updateElement } from './mixer-model.js';
import { clamp } from './mixer-audio-listen-helpers.js';

export function updateProjectElementField(project, action) {
  const elementId = action.elementId;
  const value = Number(action.value);
  if (!elementId) return project;
  if (action.field === 'transition-kind') {
    return setElementTransition(project, elementId, { kind: String(action.value || 'dissolve') });
  }
  if (action.field === 'transition-in') {
    return setElementTransition(project, elementId, { durationMs: Math.max(0, value) });
  }
  if (!Number.isFinite(value)) return project;
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
  if (action.field?.startsWith('effect-')) {
    return updateElement(project, elementId, (element) => updateVideoFilterEffect(element, action.field, value));
  }
  if (action.field?.startsWith('visual-')) {
    const visualField = {
      'visual-x': 'x',
      'visual-y': 'y',
      'visual-scale-x': 'scaleX',
      'visual-scale-y': 'scaleY',
      'visual-rotation': 'rotation',
      'visual-opacity': 'opacity',
      'visual-fade-in': 'fadeInMs',
      'visual-fade-out': 'fadeOutMs',
    }[action.field];
    const cropField = {
      'visual-crop-x': 'x',
      'visual-crop-y': 'y',
      'visual-crop-width': 'width',
      'visual-crop-height': 'height',
    }[action.field];
    if (cropField) {
      return updateElement(project, elementId, (element) => {
        const base = element.visual?.crop || { x: 0, y: 0, width: 1, height: 1 };
        return {
          ...element,
          visual: {
            ...element.visual,
            crop: clampCrop({ ...base, [cropField]: value }),
          },
        };
      });
    }
    if (!visualField) return project;
    const nextValue = visualField === 'opacity'
      ? clamp(value, 0, 1)
      : visualField === 'fadeInMs' || visualField === 'fadeOutMs'
        ? Math.max(0, value)
        : value;
    return updateElement(project, elementId, (element) => ({
      ...element,
      visual: {
        ...element.visual,
        [visualField]: nextValue,
      },
    }));
  }
  return project;
}

export function clampCrop(crop) {
  const x = clamp(crop.x, 0, 0.99);
  const y = clamp(crop.y, 0, 0.99);
  const width = clamp(crop.width, 0.01, 1 - x);
  const height = clamp(crop.height, 0.01, 1 - y);
  if (x <= 0 && y <= 0 && width >= 1 && height >= 1) return null;
  return { x, y, width, height };
}

export function updateVideoFilterEffect(element, field, value) {
  const param = {
    'effect-brightness': 'brightness',
    'effect-contrast': 'contrast',
    'effect-saturation': 'saturation',
    'effect-hue': 'hue',
    'effect-blur': 'blur',
    'effect-grayscale': 'grayscale',
    'effect-invert': 'invert',
    'effect-sepia': 'sepia',
  }[field];
  if (!param) return element;
  const defaults = { brightness: 0, contrast: 1, saturation: 1, hue: 0, blur: 0, grayscale: 0, invert: 0, sepia: 0 };
  const clamped = clampEffectParam(param, value);
  let found = false;
  const effects = (element.effects || []).map((effect) => {
    if (effect.kind !== 'video-filter') return effect;
    found = true;
    return {
      ...effect,
      enabled: true,
      params: { ...defaults, ...effect.params, [param]: clamped },
    };
  });
  if (!found) {
    effects.push({
      id: `effect-${element.id}-video-filter`,
      targetType: 'element',
      targetId: element.id,
      kind: 'video-filter',
      enabled: true,
      params: { ...defaults, [param]: clamped },
      keyframes: [],
    });
  }
  return { ...element, effects };
}

function clampEffectParam(param, value) {
  if (param === 'brightness') return clamp(value, -1, 1);
  if (param === 'contrast' || param === 'saturation') return clamp(value, 0, 3);
  if (param === 'hue') return clamp(value, -180, 180);
  if (param === 'blur') return clamp(value, 0, 20);
  if (param === 'grayscale' || param === 'invert') return value >= 0.5 ? 1 : 0;
  if (param === 'sepia') return clamp(value, 0, 1);
  return value;
}

export function laneRange(className, laneId, value, min, max, step, label) {
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

export function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.append(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 0);
}
