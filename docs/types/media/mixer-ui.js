// P5 — Multi-track audio mixer UI ("swim lanes"). On-demand, opt-in panel.
//
// Builds the lane strips (waveform + gain + mute/solo + draggable fade handles +
// region drag), the shared-timeline transport, Ctrl+scroll zoom, drag-drop to add
// audio lanes, generator lanes (test tone / pink noise), and OfflineAudioContext
// → WAV (and optional ffmpeg MP3) mixdown/export. All audio math lives in
// mixer-engine.js; this file is DOM + interaction only.
//
// CPU policy: the panel decodes the loaded clip's buffer ONLY when first opened
// (the caller gates it behind a toggle). The transport's RAF playhead runs only
// while playing. Closing the panel tears down the transport + RAF.

import {
  MixerTransport, decodeFile, makeClipLane, makeGeneratorLane,
  effectiveGain, timelineDuration, mixdown, encodeWav, releaseMixerAC,
} from './mixer-engine.js';
import { drawLaneWaveform } from './mixer-draw.js';

const PX_PER_SEC_DEFAULT = 40;   // timeline zoom baseline
const LANE_H = 64;
const MIN_TIMELINE_PX = 360;

// Mount the mixer into `container` for the primary `intake` audio file.
// Returns { destroy() }. Self-contained; no dependency on the EQ graph.
export function mountMixer(container, intake) {
  const lanes = [];
  let destroyed = false;
  let decodeEpoch = 0;
  let pxPerSec = PX_PER_SEC_DEFAULT;
  let transport = null;
  let rafId = 0;
  const blobUrls = [];
  let selectedLaneId = null;
  let timelinePx = MIN_TIMELINE_PX;

  const wrap = document.createElement('div');
  wrap.className = 'mx-wrap';

  // ── Transport bar ──
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

  // ── Add-lane controls ──
  const addBar = document.createElement('div');
  addBar.className = 'mx-addbar';
  const toneBtn = mkBtn('+ 440 Hz tone', 'mx-add-btn');
  const tone1kBtn = mkBtn('+ 1 kHz tone', 'mx-add-btn');
  const noiseBtn = mkBtn('+ Pink noise', 'mx-add-btn');
  const dropHint = document.createElement('span');
  dropHint.className = 'mx-drop-hint';
  dropHint.textContent = 'or drag-drop audio files here to add lanes';
  addBar.append(toneBtn, tone1kBtn, noiseBtn, dropHint);

  // ── Timeline surface (ruler + lane list + playhead marker) ──
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

  // ── Lane export bar ──
  const exportBar = document.createElement('div');
  exportBar.className = 'mx-export';
  const mixWavBtn = mkBtn('⬇ Mixdown → WAV', 'mx-mix-btn');
  const mixMp3Btn = mkBtn('⬇ Mixdown → MP3', 'mx-mix-btn');
  const exportMsg = document.createElement('span');
  exportMsg.className = 'mx-export-msg';
  const exportResult = document.createElement('span');
  exportResult.className = 'mx-export-result';
  exportBar.append(mixWavBtn, mixMp3Btn, exportMsg, exportResult);

  wrap.append(bar, addBar, timeline, exportBar);
  container.append(wrap);

  // ── Lane rendering ─────────────────────────────────────────────────────────
  function anySolo() { return lanes.some((l) => l.solo); }
  function getSelectedLane() {
    if (!selectedLaneId) return null;
    return lanes.find((l) => l.id === selectedLaneId) || null;
  }
  function nextDecodeEpoch() { return ++decodeEpoch; }
  function isCurrentDecode(token) { return !destroyed && token === decodeEpoch; }
  function resolveSelection() {
    if (lanes.length === 0) {
      selectedLaneId = null;
      return;
    }
    if (!getSelectedLane()) selectedLaneId = lanes[0].id;
  }

  function timelineTotalSeconds() {
    return Math.max(timelineDuration(lanes), 0);
  }
  function timelineWidthPx() {
    return Math.max(MIN_TIMELINE_PX, Math.round(timelineTotalSeconds() * pxPerSec));
  }

  function updateLaneStripDims() {
    timelinePx = timelineWidthPx();
    const total = timelineTotalSeconds();
    const pxWidth = `${timelinePx}px`;

    laneHead.style.minWidth = pxWidth;
    laneHead.style.width = pxWidth;
    ruler.style.width = pxWidth;
    laneList.style.width = pxWidth;
    buildRuler(total, timelinePx);
    const rows = laneList.querySelectorAll('.mx-lane');
    rows.forEach((row) => {
      const strip = row.querySelector('.mx-lane-strip');
      if (strip) strip.style.width = pxWidth;
    });
  }

  function buildRuler(totalSeconds, pxWidth) {
    ruler.innerHTML = '';
    if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
      const tick = document.createElement('div');
      tick.className = 'mx-ruler-tick';
      tick.style.left = '0px';
      tick.appendChild(document.createTextNode('0:00'));
      ruler.appendChild(tick);
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
        label.textContent = fmt(sec);
        tick.append(label);
        tick.classList.add('with-label');
      }
      ruler.appendChild(tick);
    }
  }

  function refreshContext(totalSeconds) {
    const sel = getSelectedLane();
    const idx = sel ? lanes.findIndex((l) => l.id === sel.id) : -1;
    const base = sel ? `Lane ${idx + 1}: ${sel.name}` : 'Master output';
    const state = transport?.playing ? 'playing' : 'ready';
    context.textContent = `Context: ${base} (${state})`;
    updateTimeLabel(totalSeconds);
  }

  function updateSelectionClasses() {
    for (const row of laneList.querySelectorAll('.mx-lane')) {
      row.classList.toggle('mx-lane--active', row.dataset.id === selectedLaneId);
    }
  }

  function renderLanes() {
    resolveSelection();
    const total = timelineTotalSeconds();
    const solo = anySolo();
    laneList.textContent = '';
    lanes.forEach((lane, idx) => buildLaneRow(lane, idx, solo));
    updateLaneStripDims();
    updateSelectionClasses();
    updatePlayhead(total);
    refreshContext(total);
  }

  function buildLaneRow(lane, index, solo) {
    const row = document.createElement('div');
    row.className = 'mx-lane' + (effectiveGain(lane, solo) <= 0 ? ' mx-lane--silent' : '');
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
      lane.muted = !lane.muted;
      renderLanes();
    });
    soloBtn.addEventListener('click', () => {
      lane.solo = !lane.solo;
      renderLanes();
    });
    delBtn.addEventListener('click', () => {
      removeLane(lane.id);
    });
    btnRow.append(muteBtn, soloBtn, delBtn);

    const gain = range(0, 200, Math.round(lane.gain * 100), 'mx-lane-gain');
    gain.title = 'Lane volume';
    gain.addEventListener('input', () => {
      lane.gain = parseInt(gain.value, 10) / 100;
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
    canvas.height = LANE_H;
    canvas.width = Math.max(8, Math.round(lane.duration * pxPerSec));
    region.appendChild(canvas);
    requestAnimationFrame(() => drawLaneWaveform(canvas, lane));

    // Fade handles (in + out) at region edges.
    const fadeIn = document.createElement('div');
    fadeIn.className = 'mx-fade mx-fade-in';
    fadeIn.style.left = Math.round((lane.fadeIn || 0) * pxPerSec) + 'px';
    fadeIn.title = 'Drag: fade-in';
    const fadeOut = document.createElement('div');
    fadeOut.className = 'mx-fade mx-fade-out';
    fadeOut.style.right = Math.round((lane.fadeOut || 0) * pxPerSec) + 'px';
    fadeOut.title = 'Drag: fade-out';
    wireRegionDrag(region, strip, lane);
    wireFadeDrag(fadeIn, lane, 'fadeIn', region);
    wireFadeDrag(fadeOut, lane, 'fadeOut', region);

    region.append(fadeIn, fadeOut);
    strip.append(region);
    row.append(laneIndex, ctrls, strip);
    laneList.appendChild(row);

    row.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.mx-mute, .mx-solo, .mx-del, .mx-lane-gain, .mx-region, .mx-fade, input, button')) return;
      setSelectedLane(lane.id);
    });
  }

  function setSelectedLane(id) {
    selectedLaneId = id;
    resolveSelection();
    updateSelectionClasses();
    refreshContext(timelineTotalSeconds());
  }

  function updatePlayhead(totalSeconds) {
    const total = totalSeconds || timelineTotalSeconds();
    const rawPos = transport && transport.playing ? transport.position() : (transport?.startOffset || 0);
    const clamped = total > 0 ? Math.max(0, Math.min(rawPos, total)) : 0;
    playhead.style.left = `${Math.max(0, Math.min(timelinePx - 1, Math.round(clamped * pxPerSec)))}px`;
    playheadTime.textContent = fmt(clamped);
  }

  function updateTimeLabel(totalSeconds) {
    const total = totalSeconds || 0;
    const pos = transport && transport.playing ? transport.position() : (transport?.startOffset || 0);
    timeLbl.textContent = fmt(Math.max(0, Math.min(pos, total || 0))) + ' / ' + fmt(total);
  }

  // Drag the whole region horizontally → change lane.offset (timeline position).
  function wireRegionDrag(region, strip, lane) {
    region.addEventListener('pointerdown', (e) => {
      if (e.target.classList.contains('mx-fade')) return;   // fades handle their own drag
      e.preventDefault();
      setSelectedLane(lane.id);
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
        renderLanes();
      };
      region.addEventListener('pointermove', move);
      region.addEventListener('pointerup', up);
    });
  }

  // Drag a fade handle → change lane.fadeIn / lane.fadeOut (seconds), clamped.
  function wireFadeDrag(handle, lane, key, region) {
    handle.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      setSelectedLane(lane.id);
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
        drawLaneWaveform(region.querySelector('canvas'), lane);
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
    });
  }

  function removeLane(id) {
    const i = lanes.findIndex((l) => l.id === id);
    if (i >= 0) lanes.splice(i, 1);
    renderLanes();
  }

  function addLane(lane) {
    lanes.push(lane);
    if (!selectedLaneId) selectedLaneId = lane.id;
    renderLanes();
  }

  // ── Transport ────────────────────────────────────────────────────────────
  function ensureTransport() {
    if (!transport) transport = new MixerTransport();
    transport.setMasterGain(parseInt(masterSlider.value, 10) / 100);
    return transport;
  }
  masterSlider.addEventListener('input', () => { transport?.setMasterGain(parseInt(masterSlider.value, 10) / 100); });

  function startRaf() {
    if (rafId) return;
    const loop = () => {
      const total = timelineTotalSeconds();
      updatePlayhead(total);
      updateTimeLabel(total);
      if (transport && transport.playing) rafId = requestAnimationFrame(loop);
      else {
        rafId = 0;
        updatePlayBtn();
      }
    };
    rafId = requestAnimationFrame(loop);
  }

  function fmt(t) {
    if (!isFinite(t)) t = 0;
    const m = Math.floor(t / 60), s = Math.floor(t % 60);
    return m + ':' + String(s).padStart(2, '0');
  }
  function updatePlayBtn() {
    playBtn.textContent = transport && transport.playing ? '⏸ Pause' : '▶ Play';
    updateTimeLabel(timelineTotalSeconds());
    refreshContext(timelineTotalSeconds());
  }

  playBtn.addEventListener('click', () => {
    const t = ensureTransport();
    if (t.playing) {
      t.pause();
      updatePlayBtn();
      return;
    }
    if (!lanes.length) {
      exportMsg.textContent = 'Add a lane first.';
      return;
    }
    t.play(lanes, t.startOffset || 0, () => {
      updatePlayBtn();
      updateTimeLabel(timelineTotalSeconds());
      updatePlayhead(timelineTotalSeconds());
    });
    updatePlayBtn();
    startRaf();
  });

  stopBtn.addEventListener('click', () => {
    transport?.stop();
    updatePlayBtn();
    updateTimeLabel(timelineTotalSeconds());
    updatePlayhead(timelineTotalSeconds());
  });

  // ── Generators ──
  toneBtn.addEventListener('click', () => addLane(makeGeneratorLane('tone', { freq: 440 })));
  tone1kBtn.addEventListener('click', () => addLane(makeGeneratorLane('tone', { freq: 1000 })));
  noiseBtn.addEventListener('click', () => addLane(makeGeneratorLane('noise')));

  async function decodeAndAdd(file, epoch, onFailureMessage) {
    const buf = await decodeFile(file);
    if (!isCurrentDecode(epoch)) return null;
    if (buf) {
      if (destroyed) return null;
      const lane = makeClipLane(file?.name || 'Lane', buf);
      addLane(lane);
      return lane;
    }
    if (onFailureMessage) {
      exportMsg.textContent = onFailureMessage;
    }
    return null;
  }

  // ── Drag-drop audio files → new clip lanes ──
  ['dragover', 'dragenter'].forEach((ev) => wrap.addEventListener(ev, (e) => {
    e.preventDefault();
    wrap.classList.add('mx-dragover');
  }));
  ['dragleave', 'drop'].forEach((ev) => wrap.addEventListener(ev, (e) => {
    if (ev === 'dragleave' && wrap.contains(e.relatedTarget)) return;
    wrap.classList.remove('mx-dragover');
  }));
  wrap.addEventListener('drop', async (e) => {
    e.preventDefault();
    const files = [...(e.dataTransfer?.files || [])].filter((f) => /^audio\//.test(f.type) || /\.(mp3|wav|ogg|m4a|aac|flac|opus|oga|weba)$/i.test(f.name));
    if (!files.length) {
      exportMsg.textContent = 'Drop audio files only.';
      return;
    }
    if (destroyed) return;
    const epoch = nextDecodeEpoch();
    exportMsg.textContent = 'Decoding ' + files.length + ' file(s)…';
    for (const f of files) {
      const lane = await decodeAndAdd(f, epoch);
      if (destroyed || !isCurrentDecode(epoch)) break;
      if (!lane && !isCurrentDecode(epoch)) break;
    }
    if (isCurrentDecode(epoch)) exportMsg.textContent = '';
  });

  // ── Ctrl+scroll zoom ──
  timeline.addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    pxPerSec = Math.max(8, Math.min(400, pxPerSec * factor));
    renderLanes();
  }, { passive: false });

  // ── Mixdown / export ──
  async function doMixdown(format) {
    if (!lanes.length) {
      exportMsg.textContent = 'Add a lane first.';
      return;
    }
    transport?.stop();
    updatePlayBtn();
    exportMsg.textContent = 'Rendering mixdown…';
    exportResult.textContent = '';
    mixWavBtn.disabled = mixMp3Btn.disabled = true;
    try {
      const buffer = await mixdown(lanes);
      if (format === 'wav') {
        const blob = await encodeWav(buffer);
        offerDownload(blob, 'mixdown.wav');
        const mb = blob.size / 1048576;
        exportMsg.textContent = 'WAV ready — ' + (mb < 1 ? `${Math.round(mb * 1000)} KB` : `${mb.toFixed(2)} MB`);
      } else {
        exportMsg.textContent = 'Encoding MP3 (ffmpeg)…';
        const wav = await encodeWav(buffer);
        const mp3 = await encodeMp3ViaFfmpeg(wav);
        offerDownload(mp3, 'mixdown.mp3');
        const mb = mp3.size / 1048576;
        exportMsg.textContent = 'MP3 ready — ' + (mb < 1 ? `${Math.round(mb * 1000)} KB` : `${mb.toFixed(2)} MB`);
      }
    } catch (err) {
      exportMsg.textContent = 'Mixdown failed: ' + (err.message || err);
    } finally {
      mixWavBtn.disabled = mixMp3Btn.disabled = false;
    }
  }
  function offerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    blobUrls.push(url);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.className = 'media-tx-download';
    a.textContent = 'Download ' + filename;
    exportResult.textContent = '';
    exportResult.appendChild(a);
    a.click();   // auto-trigger; link stays for re-download
  }
  mixWavBtn.addEventListener('click', () => doMixdown('wav'));
  mixMp3Btn.addEventListener('click', () => doMixdown('mp3'));

  // Encode a WAV blob → MP3 using the vendored ffmpeg.wasm (reuses transcoder).
  async function encodeMp3ViaFfmpeg(wavBlob) {
    const { loadFfmpeg } = await import('./transcoder.js');
    const ff = await loadFfmpeg();
    const data = new Uint8Array(await wavBlob.arrayBuffer());
    ff.FS('writeFile', 'mix.wav', data);
    try {
      await ff.run('-i', 'mix.wav', '-c:a', 'libmp3lame', '-q:a', '2', 'mix.mp3');
      const out = ff.FS('readFile', 'mix.mp3');
      return new Blob([out.buffer], { type: 'audio/mpeg' });
    } finally {
      try { ff.FS('unlink', 'mix.wav'); } catch {}
      try { ff.FS('unlink', 'mix.mp3'); } catch {}
    }
  }

  // ── Seed lane 1 from the loaded file (decoded lazily, here on open) ──
  (async () => {
    if (destroyed) return;
    const epoch = nextDecodeEpoch();
    exportMsg.textContent = 'Decoding loaded audio…';
    const file = intake.file || new File([intake.bytes || new Uint8Array()], intake.filename || 'audio');
    const buf = await decodeFile(file);
    if (!isCurrentDecode(epoch)) return;
    if (destroyed) return;
    if (buf) {
      addLane(makeClipLane(intake.filename || 'Lane 1', buf));
      if (isCurrentDecode(epoch)) exportMsg.textContent = '';
    } else {
      addLane(makeGeneratorLane('tone', { freq: 440 }));
      exportMsg.textContent = 'Could not decode the loaded file — added a test tone instead.';
    }
    if (!isCurrentDecode(epoch) || destroyed) return;
    updateTimeLabel(0);
    updatePlayBtn();
    updateLaneStripDims();
  })();

  return {
    destroy() {
      if (destroyed) {
        return;
      }
      destroyed = true;
      nextDecodeEpoch();
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      transport?.destroy();
      transport = null;
      for (const u of blobUrls) { try { URL.revokeObjectURL(u); } catch {} }
      blobUrls.length = 0;
      lanes.length = 0;
      selectedLaneId = null;
      wrap.remove();
      releaseMixerAC();
    },
  };
}

function mkBtn(text, cls) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = text;
  b.className = cls || 'media-ed-btn';
  return b;
}
function range(min, max, val, cls) {
  const r = document.createElement('input');
  r.type = 'range';
  r.min = String(min);
  r.max = String(max);
  r.value = String(val);
  r.className = cls;
  return r;
}
