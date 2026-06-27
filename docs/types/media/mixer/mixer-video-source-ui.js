import { currentMusicBedGain, editSummary, transitionSummary } from './mixer-video-source-helpers.js';
import { MIXER_LAYOUT } from './mixer-hit-test.js';
import { clamp } from './mixer-audio-listen-helpers.js';

export function renderSecondMediaControls(project) {
  const wrap = document.createElement('div');
  wrap.className = 'mmx-video-second-drop';
  const text = document.createElement('span');
  text.textContent = 'Drop second video, image overlay, or music bed';
  const music = document.createElement('label');
  music.className = 'mmx-video-music-bed-wrap';
  const musicText = document.createElement('span');
  musicText.textContent = 'Music bed';
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.className = 'mmx-video-music-bed';
  slider.min = '0';
  slider.max = '1';
  slider.step = '0.05';
  slider.value = String(currentMusicBedGain(project));
  slider.setAttribute('aria-label', 'Music bed level under original video audio');
  slider.title = 'Music bed level; original video audio stays unchanged';
  const readout = document.createElement('span');
  readout.className = 'mmx-video-music-bed-readout';
  readout.textContent = `${Math.round(Number(slider.value) * 100)}% under video audio`;
  music.append(musicText, slider, readout);
  const transition = document.createElement('div');
  transition.className = 'mmx-video-transition-tools';
  const transitionText = document.createElement('span');
  transitionText.textContent = 'Selected visual transition';
  const kind = document.createElement('select');
  kind.className = 'mmx-video-transition-kind';
  kind.setAttribute('aria-label', 'Selected visual transition kind');
  [
    ['dissolve', 'Dissolve'],
    ['wipe-left', 'Wipe left'],
  ].forEach(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    kind.append(option);
  });
  const duration = document.createElement('input');
  duration.type = 'number';
  duration.className = 'mmx-video-transition-duration';
  duration.min = '0';
  duration.step = '0.05';
  duration.value = '0.4';
  duration.setAttribute('aria-label', 'Selected visual transition duration in seconds');
  const apply = document.createElement('button');
  apply.type = 'button';
  apply.className = 'mmx-video-transition-apply';
  apply.textContent = 'Apply';
  const transitionReadout = document.createElement('span');
  transitionReadout.className = 'mmx-video-transition-readout';
  transitionReadout.textContent = transitionSummary(project);
  transition.append(transitionText, kind, duration, apply, transitionReadout);
  const edit = document.createElement('div');
  edit.className = 'mmx-video-edit-tools';
  const editText = document.createElement('span');
  editText.textContent = 'Selected clip edit';
  const trimIn = editNumberInput('mmx-video-trim-in', 'Trim in seconds', '0', 0.01);
  const trimOut = editNumberInput('mmx-video-trim-out', 'Trim out seconds', '', 0.01);
  const fadeIn = editNumberInput('mmx-video-fade-in', 'Fade in seconds', '0', 0.05);
  const fadeOut = editNumberInput('mmx-video-fade-out', 'Fade out seconds', '0', 0.05);
  const editApply = document.createElement('button');
  editApply.type = 'button';
  editApply.className = 'mmx-video-edit-apply';
  editApply.textContent = 'Apply edit';
  const editReadout = document.createElement('span');
  editReadout.className = 'mmx-video-edit-readout';
  editReadout.textContent = editSummary(project);
  edit.append(editText, trimIn, trimOut, fadeIn, fadeOut, editApply, editReadout);
  wrap.append(text, music, transition, edit);
  return wrap;
}

function editNumberInput(className, label, value, step) {
  const input = document.createElement('input');
  input.type = 'number';
  input.className = className;
  input.min = '0';
  input.step = String(step);
  input.value = value;
  input.setAttribute('aria-label', label);
  return input;
}

export function syncTransitionReadout(root, project) {
  const readout = root.querySelector('.mmx-video-transition-readout');
  if (readout) readout.textContent = transitionSummary(project);
}

export function syncEditReadout(root, project) {
  const readout = root.querySelector('.mmx-video-edit-readout');
  if (readout) readout.textContent = editSummary(project);
}

export function secondsInput(root, selector, fallbackMs) {
  const raw = root.querySelector(selector)?.value;
  if (raw === '') return Math.max(0, Math.round(Number(fallbackMs) || 0));
  const value = Number(raw);
  if (!Number.isFinite(value)) return Math.max(0, Math.round(Number(fallbackMs) || 0));
  return Math.max(0, Math.round(value * 1000));
}

export function fitZoom(root, project) {
  const width = Math.max(240, root.clientWidth - MIXER_LAYOUT.gutterWidth);
  const duration = Math.max(1000, project.project.durationMs || 1000);
  return clamp(width / duration, 0.02, 0.8);
}

// Build the bespoke video-source toolbar (zoom controls + title).
// Returns { toolbar, zoomRange } so render() can update the range value.
export function buildVideoSourceToolbar(pxPerMs = 0.06) {
  const toolbar = document.createElement('div');
  toolbar.className = 'al-toolbar mmx-toolbar';
  const title = document.createElement('span');
  title.className = 'al-title mmx-title'; title.textContent = 'Timeline';
  const mk = (text, action, tip) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = text; b.dataset.action = action; b.title = tip; return b;
  };
  const zoomRange = document.createElement('input');
  zoomRange.type = 'range'; zoomRange.className = 'mmx-zoom'; zoomRange.dataset.action = 'zoom';
  zoomRange.min = '0.02'; zoomRange.max = '0.8'; zoomRange.step = '0.001';
  zoomRange.value = String(pxPerMs); zoomRange.setAttribute('aria-label', 'Zoom');
  toolbar.append(title, mk('−', 'zoom-out', 'Zoom out'), zoomRange, mk('+', 'zoom-in', 'Zoom in'), mk('Fit', 'fit', 'Fit timeline'));
  return { toolbar, zoomRange };
}
