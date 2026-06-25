// P5 — mixer lane row + interaction primitives extracted for readability.

import { drawLaneWaveform } from './mixer-draw.js';

export function buildLaneRow({
  lane,
  index,
  isAnySolo,
  laneHeight = 64,
  pxPerSec,
  timelinePx,
  mkBtn,
  range,
  onToggleMute,
  onToggleSolo,
  onDelete,
  onSelect,
  onRender,
}) {
  const row = document.createElement('div');
  row.className = 'mx-lane' + (effectiveGainValue(lane, isAnySolo) <= 0 ? ' mx-lane--silent' : '');
  row.dataset.id = lane.id;

  const laneIndex = document.createElement('div');
  laneIndex.className = 'mx-lane-index';
  laneIndex.textContent = String(index + 1);

  // Left: fixed controls.
  const ctrls = document.createElement('div');
  ctrls.className = 'mx-lane-ctrls';
  const name = document.createElement('div');
  name.className = 'mx-lane-name';
  name.textContent = lane.name;

  const btnRow = document.createElement('div');
  btnRow.className = 'mx-lane-btns';
  const muteBtn = mkBtn('M', 'mx-mute' + (lane.muted ? ' active' : ''));
  muteBtn.title = 'Mute';
  const soloBtn = mkBtn('S', 'mx-solo' + (lane.solo ? ' active' : ''));
  soloBtn.title = 'Solo';
  const delBtn = mkBtn('✕', 'mx-del');
  delBtn.title = 'Remove lane';
  muteBtn.addEventListener('click', () => {
    onToggleMute(lane);
  });
  soloBtn.addEventListener('click', () => {
    onToggleSolo(lane);
  });
  delBtn.addEventListener('click', () => {
    onDelete(lane.id);
  });
  btnRow.append(muteBtn, soloBtn, delBtn);

  const gain = range(0, 200, Math.round(lane.gain * 100), 'mx-lane-gain');
  gain.title = 'Lane volume';
  gain.addEventListener('input', () => {
    lane.gain = parseInt(gain.value, 10) / 100;
    onRender({ liveOnly: true, lane });
  });
  ctrls.append(name, btnRow, gain);

  // Right: timeline strip (waveform + fade handles), positioned by offset.
  const strip = document.createElement('div');
  strip.className = 'mx-lane-strip';
  strip.style.width = `${timelinePx}px`;

  const region = document.createElement('div');
  region.className = 'mx-region mx-region--' + lane.kind;
  region.style.left = Math.max(0, Math.round(lane.offset * pxPerSec)) + 'px';
  region.style.width = Math.max(8, Math.round(lane.duration * pxPerSec)) + 'px';

  const canvas = document.createElement('canvas');
  canvas.className = 'mx-lane-canvas';
  canvas.height = laneHeight;
  canvas.width = Math.max(8, Math.round(lane.duration * pxPerSec));
  region.appendChild(canvas);
  requestAnimationFrame(() => drawLaneWaveform(canvas, lane, { effectiveGain: effectiveGainValue(lane, isAnySolo) }));

  // Fade handles (in + out) at region edges.
  const fadeIn = document.createElement('div');
  fadeIn.className = 'mx-fade mx-fade-in';
  fadeIn.style.left = Math.round((lane.fadeIn || 0) * pxPerSec) + 'px';
  fadeIn.title = 'Drag: fade-in';
  const fadeOut = document.createElement('div');
  fadeOut.className = 'mx-fade mx-fade-out';
  fadeOut.style.right = Math.round((lane.fadeOut || 0) * pxPerSec) + 'px';
  fadeOut.title = 'Drag: fade-out';
  wireRegionDrag(region, lane, pxPerSec, { onSelect, onRender });
  wireFadeDrag(fadeIn, lane, 'fadeIn', region, pxPerSec, { onSelect, onRender });
  wireFadeDrag(fadeOut, lane, 'fadeOut', region, pxPerSec, { onSelect, onRender });

  region.append(fadeIn, fadeOut);
  strip.append(region);
  row.append(laneIndex, ctrls, strip);

  row.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.mx-mute, .mx-solo, .mx-del, .mx-lane-gain, .mx-region, .mx-fade, input, button')) return;
    onSelect(lane.id);
  });

  return row;
}

function effectiveGainValue(lane, isAnySolo) {
  if (lane.muted) return 0;
  if (isAnySolo && !lane.solo) return 0;
  return lane.gain;
}

// Drag the whole region horizontally → change lane.offset (timeline position).
export function wireRegionDrag(region, lane, pxPerSec, handlers) {
  const { onSelect, onRender } = handlers;
  region.addEventListener('pointerdown', (e) => {
    if (e.target.classList.contains('mx-fade')) return;   // fades handle their own drag
    e.preventDefault();
    onSelect(lane.id);
    const startX = e.clientX;
    const startOffset = lane.offset;
    region.setPointerCapture(e.pointerId);
    const move = (ev) => {
      const dx = ev.clientX - startX;
      lane.offset = Math.max(0, startOffset + dx / pxPerSec);
      region.style.left = Math.round(lane.offset * pxPerSec) + 'px';
    };
    const up = () => {
      region.removeEventListener('pointermove', move);
      region.removeEventListener('pointerup', up);
      onRender();
    };
    region.addEventListener('pointermove', move);
    region.addEventListener('pointerup', up);
  });
}

// Drag a fade handle → change lane.fadeIn / lane.fadeOut (seconds), clamped.
export function wireFadeDrag(handle, lane, key, region, pxPerSec, handlers) {
  const { onSelect, onRender } = handlers;
  handle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(lane.id);
    const startX = e.clientX;
    const startVal = lane[key] || 0;
    handle.setPointerCapture(e.pointerId);
    const move = (ev) => {
      const dir = key === 'fadeIn' ? 1 : -1;
      const dx = (ev.clientX - startX) * dir;
      const v = Math.max(0, Math.min(lane.duration / 2, startVal + dx / pxPerSec));
      lane[key] = v;
      if (key === 'fadeIn') handle.style.left = Math.round(v * pxPerSec) + 'px';
      else handle.style.right = Math.round(v * pxPerSec) + 'px';
    };
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      drawLaneWaveform(region.querySelector('canvas'), lane, { effectiveGain: lane.gain });
      onRender({ liveOnly: true, lane });
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
  });
}
