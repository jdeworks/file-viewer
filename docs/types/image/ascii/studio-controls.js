// Declarative control definitions for the ASCII studio panel + a builder that
// turns them into DOM and reports changes. Kept data-driven so the panel and
// its option/dirty wiring stay in one place (and the file stays small).

import { GRADIENTS } from './charsets.js';
import { DITHER_METHODS } from './dither.js';
import { defaultOptions } from './state.js';

// factor: optionValue = rawInput * factor (e.g. a 0–200 slider with factor .01
// → a 0–2 multiplier). dirty: which engine dirty flags a change invalidates.
// display:true means "render only" — never reconvert (font size).
const GROUPS = [
  ['Detail', true, [
    { key: 'columns', label: 'Columns (detail)', kind: 'range', min: 20, max: 300, step: 1, dirty: ['ascii'] },
    { key: 'zoom', label: 'Zoom', kind: 'range', min: 0.25, max: 4, step: 0.05, display: true },
    { key: 'spaceDensity', label: 'Space density', kind: 'range', min: 1, max: 3, step: 0.1, display: true },
    { key: 'fontAspect', label: 'Font aspect', kind: 'range', min: 0.3, max: 1, step: 0.05, dirty: ['ascii'] },
    { key: 'fillGaps', label: 'Fill enclosed gaps', kind: 'checkbox', dirty: ['ascii'] },
  ]],
  ['Characters', true, [
    { key: 'gradientName', label: 'Gradient', kind: 'select', options: [...Object.keys(GRADIENTS)], dirty: ['ascii'] },
    { key: 'customRamp', label: 'Custom ramp (dark→light)', kind: 'text', dirty: ['ascii'] },
    { key: 'invertRamp', label: 'Invert ramp', kind: 'checkbox', dirty: ['ascii'] },
  ]],
  ['Image filters', false, [
    { key: 'brightness', label: 'Brightness', kind: 'range', min: 0, max: 200, step: 1, factor: 0.01, dirty: ['processedImage'] },
    { key: 'contrast', label: 'Contrast', kind: 'range', min: 0, max: 200, step: 1, factor: 0.01, dirty: ['processedImage'] },
    { key: 'saturation', label: 'Saturation', kind: 'range', min: 0, max: 200, step: 1, factor: 0.01, dirty: ['processedImage'] },
    { key: 'hue', label: 'Hue', kind: 'range', min: 0, max: 360, step: 1, dirty: ['processedImage'] },
    { key: 'grayscale', label: 'Grayscale', kind: 'range', min: 0, max: 100, step: 1, factor: 0.01, dirty: ['processedImage'] },
    { key: 'sepia', label: 'Sepia', kind: 'range', min: 0, max: 100, step: 1, factor: 0.01, dirty: ['processedImage'] },
    { key: 'invertColors', label: 'Invert colours', kind: 'range', min: 0, max: 100, step: 1, factor: 0.01, dirty: ['processedImage'] },
    { key: 'thresholdEnabled', label: 'Threshold', kind: 'checkbox', dirty: ['processedImage'] },
    { key: 'threshold', label: 'Threshold level', kind: 'range', min: 0, max: 255, step: 1, dirty: ['processedImage'] },
    { key: 'sharpness', label: 'Sharpness', kind: 'range', min: 0, max: 10, step: 1, dirty: ['processedImage'] },
    { key: 'edgeDetection', label: 'Edge detection', kind: 'range', min: 0, max: 10, step: 1, dirty: ['processedImage'] },
  ]],
  ['Quality', false, [
    { key: 'samplingMethod', label: 'Sampling', kind: 'select', options: ['downscale', 'nearest', 'center', 'average', 'median'], dirty: ['ascii'] },
    { key: 'dithering', label: 'Dithering', kind: 'select', options: DITHER_METHODS, dirty: ['ascii'] },
  ]],
  ['Output', true, [
    { key: 'fontName', label: 'Font', kind: 'select', options: ['Uniform', 'System', 'Courier'], display: true },
    { key: 'colorMode', label: 'Colour glyphs', kind: 'checkbox', dirty: ['render'] },
    { key: 'colorSource', label: 'Colour source', kind: 'select', options: ['processed', 'original'], dirty: ['ascii'] },
    { key: 'glyphColorMode', label: 'Glyph colour', kind: 'select', options: ['colored', 'white', 'grayscale'], dirty: ['render'] },
    { key: 'backgroundColor', label: 'Background', kind: 'color', dirty: ['render'] },
    { key: 'transparentBackground', label: 'Transparent BG', kind: 'checkbox', dirty: ['render'] },
    { key: 'transparentFrame', label: 'Frame padding', kind: 'range', min: 0, max: 100, step: 1, display: true },
  ]],
];

function controlEl(c, optionValue) {
  const wrap = document.createElement('div');
  wrap.className = 'asx-ctl';
  const name = document.createElement('span');
  name.className = 'asx-ctl-name';
  name.textContent = c.label;
  let input;
  if (c.kind === 'select') {
    input = document.createElement('select');
    for (const opt of c.options) {
      const o = document.createElement('option');
      o.value = opt; o.textContent = opt;
      if (opt === optionValue) o.selected = true;
      input.appendChild(o);
    }
  } else if (c.kind === 'checkbox') {
    input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = !!optionValue;
  } else if (c.kind === 'color') {
    input = document.createElement('input');
    input.type = 'color';
    input.value = optionValue;
  } else if (c.kind === 'text') {
    input = document.createElement('input');
    input.type = 'text';
    input.value = optionValue || '';
    input.placeholder = '(uses gradient)';
  } else { // range
    input = document.createElement('input');
    input.type = 'range';
    input.min = c.min; input.max = c.max; input.step = c.step;
    input.value = c.factor ? optionValue / c.factor : optionValue;
  }
  input.className = 'asx-ctl-input';
  input.dataset.key = c.key;
  const val = document.createElement('span');
  val.className = 'asx-ctl-val';
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'asx-ctl-reset';
  reset.textContent = '↺';
  reset.title = 'Reset to default';
  const row = document.createElement('div');
  row.className = 'asx-ctl-row';
  row.append(input, val, reset);
  wrap.append(name, row);
  return { wrap, input, val, reset };
}

function readValue(c, input) {
  if (c.kind === 'checkbox') return input.checked;
  if (c.kind === 'select' || c.kind === 'color' || c.kind === 'text') return input.value;
  const raw = parseFloat(input.value);
  return c.factor ? raw * c.factor : raw;
}

// Build the panel into `host`. `onChange(key, value, dirtyKeys, displayOnly)`
// fires on every input. Returns { setValue } to sync inputs after a reset.
export function buildControls(host, options, onChange) {
  const inputs = {};
  const defs = {};
  const defaults = defaultOptions();
  function setValue(key, optionValue) {
    const c = defs[key]; const input = inputs[key];
    if (!c || !input) return;
    if (c.kind === 'checkbox') input.checked = !!optionValue;
    else if (c.kind === 'range') input.value = c.factor ? optionValue / c.factor : optionValue;
    else input.value = optionValue;
    input.dispatchEvent(new Event('input'));
  }
  for (const [title, open, controls] of GROUPS) {
    const fs = document.createElement('details');
    fs.className = 'asx-group';
    fs.open = open;
    const lg = document.createElement('summary');
    lg.textContent = title;
    fs.appendChild(lg);
    for (const c of controls) {
      defs[c.key] = c;
      const { wrap, input, val, reset } = controlEl(c, options[c.key]);
      const atDefault = () => readValue(c, input) === defaults[c.key];
      const showVal = () => {
        if (c.kind === 'range') val.textContent = c.factor ? (readValue(c, input)).toFixed(2) : input.value;
        reset.classList.toggle('asx-hidden', atDefault());
      };
      showVal();
      input.addEventListener('input', () => {
        showVal();
        onChange(c.key, readValue(c, input), c.dirty || [], !!c.display);
      });
      reset.addEventListener('click', () => setValue(c.key, defaults[c.key]));
      fs.appendChild(wrap);
      inputs[c.key] = input;
    }
    host.appendChild(fs);
  }
  return { setValue, inputs };
}

// Colour source + glyph colour only matter when colour glyphs are on — hide their rows
// when colorMode is off. Shared by the studio + webcam.
export function syncColorControls(controls, colorOn) {
  for (const key of ['colorSource', 'glyphColorMode']) {
    const row = controls?.inputs?.[key]?.closest('.asx-ctl');
    if (row) row.hidden = !colorOn;
  }
}
