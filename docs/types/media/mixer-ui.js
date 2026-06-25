// P5 — Multi-track audio mixer UI ("swim lanes"). On-demand, opt-in panel.
//
// Builds the lane strips (waveform + gain + mute/solo + draggable fade handles +
// region drag), the shared-timeline transport, Ctrl+scroll zoom, drag-drop to add
// audio lanes, generator lanes (test tone / pink noise), and OfflineAudioContext
// → WAV (and optional ffmpeg MP3) mixdown/export.
//
// All audio math lives in mixer-engine.js; this file is DOM + interaction only.
//
// CPU policy: the panel decodes the loaded clip's buffer ONLY when first opened
// (the caller gates it behind a toggle). The transport's RAF playhead runs only
// while playing. Closing the panel tears down the transport + RAF.

import {
  MixerTransport, decodeFile, makeClipLane, makeGeneratorLane,
  timelineDuration, mixdown, encodeWav, releaseMixerAC,
} from './mixer-engine.js';
import {
  PX_PER_SEC_DEFAULT,
  MIN_TIMELINE_PX,
  LANE_H,
  buildRuler,
  createMixerAddBar,
  createMixerExportBar,
  createMixerTimeline,
  createMixerTransportBar,
  formatMixerTime,
  timelineWidthPx,
  mkBtn,
  range,
} from './mixer-ui-controls.js';
import { buildLaneRow } from './mixer-ui-lane.js';
import { appendDownloadLink, encodeMp3ViaFfmpeg } from './mixer-ui-export.js';

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
  const {
    bar,
    playBtn,
    stopBtn,
    timeLbl,
    context,
    masterSlider,
  } = createMixerTransportBar();

  // ── Add-lane controls ──
  const {
    addBar,
    toneBtn,
    tone1kBtn,
    noiseBtn,
  } = createMixerAddBar();

  // ── Timeline surface (ruler + lane list + playhead marker) ──
  const {
    timeline,
    laneHead,
    ruler,
    laneList,
    playhead,
    playheadTime,
  } = createMixerTimeline();

  // ── Lane export bar ──
  const {
    exportBar,
    mixWavBtn,
    mixMp3Btn,
    exportMsg,
    exportResult,
  } = createMixerExportBar();

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

  function updateLaneStripDims() {
    const total = timelineTotalSeconds();
    timelinePx = timelineWidthPx(total, pxPerSec);
    const pxWidth = `${timelinePx}px`;

    laneHead.style.minWidth = pxWidth;
    laneHead.style.width = pxWidth;
    ruler.style.width = pxWidth;
    laneList.style.width = pxWidth;
    buildRuler(total, pxPerSec, ruler);
    const rows = laneList.querySelectorAll('.mx-lane');
    rows.forEach((row) => {
      const strip = row.querySelector('.mx-lane-strip');
      if (strip) strip.style.width = pxWidth;
    });
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
    const allRows = [];

    laneList.textContent = '';
    for (const [idx, lane] of lanes.entries()) {
      const row = buildLaneRow({
        lane,
        index: idx,
        isAnySolo: solo,
        laneHeight: LANE_H,
        pxPerSec,
        timelinePx,
        mkBtn,
        range,
        onToggleMute: (target) => {
          target.muted = !target.muted;
          renderLanes();
        },
        onToggleSolo: (target) => {
          target.solo = !target.solo;
          renderLanes();
        },
        onDelete: removeLane,
        onSelect: setSelectedLane,
        onRender: renderLanes,
      });
      allRows.push(row);
    }
    laneList.append(...allRows);

    updateLaneStripDims();
    updateSelectionClasses();
    updatePlayhead(total);
    refreshContext(total);
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
    playheadTime.textContent = formatMixerTime(clamped);
  }

  function updateTimeLabel(totalSeconds) {
    const total = totalSeconds || 0;
    const pos = transport && transport.playing ? transport.position() : (transport?.startOffset || 0);
    timeLbl.textContent = formatMixerTime(Math.max(0, Math.min(pos, total || 0))) + ' / ' + formatMixerTime(total);
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
  masterSlider.addEventListener('input', () => {
    transport?.setMasterGain(parseInt(masterSlider.value, 10) / 100);
  });

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
    if (destroyed) return null;
    if (buf) {
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
      if (!lane && !isCurrentDecode(epoch)) break;
      if (destroyed || !isCurrentDecode(epoch)) break;
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
        blobUrls.push(appendDownloadLink(exportResult, blob, 'mixdown.wav'));
        const mb = blob.size / 1048576;
        exportMsg.textContent = 'WAV ready — ' + (mb < 1 ? `${Math.round(mb * 1000)} KB` : `${mb.toFixed(2)} MB`);
      } else {
        exportMsg.textContent = 'Encoding MP3 (ffmpeg)…';
        const wav = await encodeWav(buffer);
        const mp3 = await encodeMp3ViaFfmpeg(wav);
        blobUrls.push(appendDownloadLink(exportResult, mp3, 'mixdown.mp3'));
        const mb = mp3.size / 1048576;
        exportMsg.textContent = 'MP3 ready — ' + (mb < 1 ? `${Math.round(mb * 1000)} KB` : `${mb.toFixed(2)} MB`);
      }
    } catch (err) {
      exportMsg.textContent = 'Mixdown failed: ' + (err.message || err);
    } finally {
      mixWavBtn.disabled = mixMp3Btn.disabled = false;
    }
  }
  mixWavBtn.addEventListener('click', () => doMixdown('wav'));
  mixMp3Btn.addEventListener('click', () => doMixdown('mp3'));

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
      if (destroyed) return;
      destroyed = true;
      nextDecodeEpoch();
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      transport?.destroy();
      transport = null;
      for (const u of blobUrls) {
        try { URL.revokeObjectURL(u); } catch {}
      }
      blobUrls.length = 0;
      lanes.length = 0;
      selectedLaneId = null;
      wrap.remove();
      releaseMixerAC();
    },
  };
}
