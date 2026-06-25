// P5 — Mixer UI shared helpers and primitive controls.
// DOM constructors here keep `mixer-ui.js` focused on orchestration + state.

export const PX_PER_SEC_DEFAULT = 40;
export const LANE_H = 64;
export const MIN_TIMELINE_PX = 360;

export function mkBtn(text, cls) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = text;
  b.className = cls || 'media-ed-btn';
  return b;
}
export function range(min, max, val, cls) {
  const r = document.createElement('input');
  r.type = 'range';
  r.min = String(min);
  r.max = String(max);
  r.value = String(val);
  r.className = cls;
  return r;
}

export function createMixerTransportBar() {
  const bar = document.createElement('div');
  bar.className = 'mx-transport';

  const playBtn = mkBtn('▶ Play', 'mx-play');
  const stopBtn = mkBtn('⏹ Stop', 'mx-stop');
  const timeLbl = document.createElement('span');
  timeLbl.className = 'mx-time';
  timeLbl.textContent = '0:00 / 0:00';

  const context = document.createElement('div');
  context.className = 'mx-context';

  const masterLbl = document.createElement('label');
  masterLbl.className = 'mx-master';
  const masterSlider = range(0, 150, 100, 'mx-master-slider');
  masterLbl.append(document.createTextNode('Master '), masterSlider);

  bar.append(playBtn, stopBtn, timeLbl, masterLbl, context);

  return {
    bar,
    playBtn,
    stopBtn,
    timeLbl,
    context,
    masterSlider,
  };
}

export function createMixerAddBar() {
  const addBar = document.createElement('div');
  addBar.className = 'mx-addbar';
  const toneBtn = mkBtn('+ 440 Hz tone', 'mx-add-btn');
  const tone1kBtn = mkBtn('+ 1 kHz tone', 'mx-add-btn');
  const noiseBtn = mkBtn('+ Pink noise', 'mx-add-btn');
  const dropHint = document.createElement('span');
  dropHint.className = 'mx-drop-hint';
  dropHint.textContent = 'or drag-drop audio files here to add lanes';
  addBar.append(toneBtn, tone1kBtn, noiseBtn, dropHint);

  return {
    addBar,
    toneBtn,
    tone1kBtn,
    noiseBtn,
  };
}

export function createMixerTimeline() {
  const timeline = document.createElement('div');
  timeline.className = 'mx-timeline';

  const laneHead = document.createElement('div');
  laneHead.className = 'mx-lane-head';
  const laneHeadIdx = document.createElement('div');
  laneHeadIdx.className = 'mx-lane-head-idx';
  laneHeadIdx.textContent = '#';
  const laneHeadCtrl = document.createElement('div');
  laneHeadCtrl.className = 'mx-lane-head-ctrl';
  laneHeadCtrl.textContent = 'Lane';
  const laneHeadTimeline = document.createElement('div');
  laneHeadTimeline.className = 'mx-lane-head-timeline';
  laneHeadTimeline.textContent = 'Timeline';
  laneHead.append(laneHeadIdx, laneHeadCtrl, laneHeadTimeline);

  const ruler = document.createElement('div');
  ruler.className = 'mx-ruler';
  const playhead = document.createElement('div');
  playhead.className = 'mx-playhead';
  const playheadTime = document.createElement('span');
  playheadTime.className = 'mx-playhead-time';
  playhead.append(playheadTime);

  const laneList = document.createElement('div');
  laneList.className = 'mx-lanes';
  timeline.append(laneHead, ruler, laneList, playhead);

  return {
    timeline,
    laneHead,
    laneHeadIdx,
    laneHeadCtrl,
    laneHeadTimeline,
    ruler,
    playhead,
    playheadTime,
    laneList,
  };
}

export function createMixerExportBar() {
  const exportBar = document.createElement('div');
  exportBar.className = 'mx-export';
  const mixWavBtn = mkBtn('⬇ Mixdown → WAV', 'mx-mix-btn');
  const mixMp3Btn = mkBtn('⬇ Mixdown → MP3', 'mx-mix-btn');
  const exportMsg = document.createElement('span');
  exportMsg.className = 'mx-export-msg';
  const exportResult = document.createElement('span');
  exportResult.className = 'mx-export-result';
  exportBar.append(mixWavBtn, mixMp3Btn, exportMsg, exportResult);

  return {
    exportBar,
    mixWavBtn,
    mixMp3Btn,
    exportMsg,
    exportResult,
  };
}

export function timelineWidthPx(totalSeconds, pxPerSec) {
  return Math.max(MIN_TIMELINE_PX, Math.round(totalSeconds * pxPerSec));
}

export function buildRuler(totalSeconds, pxPerSec, rulerEl) {
  const pxWidth = timelineWidthPx(totalSeconds, pxPerSec);
  rulerEl.innerHTML = '';
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    const tick = document.createElement('div');
    tick.className = 'mx-ruler-tick';
    tick.style.left = '0px';
    tick.appendChild(document.createTextNode('0:00'));
    rulerEl.appendChild(tick);
    return;
  }

  const baseTick = pxPerSec >= 28 ? 1 : pxPerSec >= 14 ? 2 : 5;
  const labelEvery = Math.max(5, baseTick * 2);
  const labelPxLimit = 48;

  const tickCount = Math.ceil(totalSeconds / baseTick);
  for (let i = 0; i <= tickCount; i += 1) {
    const sec = Math.min(totalSeconds, i * baseTick);
    const x = Math.max(0, Math.min(pxWidth, Math.round(sec * pxPerSec)));
    const tick = document.createElement('div');
    tick.className = 'mx-ruler-tick';
    tick.style.left = x + 'px';
    if (i % Math.round(labelEvery / baseTick) === 0 || sec === totalSeconds) {
      const label = document.createElement('span');
      label.className = 'mx-ruler-label';
      label.style.left = `${Math.max(0, Math.min(pxWidth - labelPxLimit, x - 14))}px`;
      label.textContent = formatMixerTime(sec);
      tick.append(label);
      tick.classList.add('with-label');
    }
    rulerEl.appendChild(tick);
  }
}

export function formatMixerTime(t) {
  if (!isFinite(t)) t = 0;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return m + ':' + String(s).padStart(2, '0');
}
