// Default single-track audio Listen surface — a direct port of the auto-audiobook mixer
// aesthetic (waveform-first lane, ruler, red seek cursor, DAW-style transport + selection panel)
// for the lone MP3/WAV case. This deliberately builds its OWN DOM and stylesheet rather than the
// generic renderMixerShell, so the audio experience reads like a DAW instead of a debug form.
// The shared mixer project MODEL is still the source of truth for timing/gain/fade/settings.
import { moveElement, trimElement, updateElement } from './mixer-model.js';
import { exportProjectSettingsJson, importProjectSettings } from './mixer-import-export.js';
import {
  buildProject, clamp, decodeSummary, fmtTime, mediaDuration, mergeDuration, selectFirstElement,
} from './mixer-audio-listen-helpers.js';
import { drawListenWaveform } from './audio-listen-waveform.js';

const ZOOM_MIN = 12;     // px per second (fully zoomed out)
const ZOOM_MAX = 4000;   // px per second (fully zoomed in)

export function ensureAudioListenStyles() {
  if (document.querySelector('link[data-audio-listen-styles]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./audio-listen-lane.css', import.meta.url).href;
  link.dataset.audioListenStyles = 'true';
  document.head.append(link);
}

export function buildMixerAudioListenSurface(mediaEl, intake, options = {}) {
  ensureAudioListenStyles();
  mediaEl.controls = false;
  mediaEl.classList.add('media-view-hidden');
  mediaEl.setAttribute('aria-hidden', 'true');
  mediaEl.tabIndex = -1;

  let project = selectFirstElement(buildProject(mediaEl, intake));
  let waveformSummary = null;
  let waveformStatus = 'pending';
  let pxPerSec = 0;          // 0 → "fit to width" until first render
  let chapters = Array.isArray(options.chapters) ? options.chapters : [];
  let onRegionSelect = typeof options.onRegionSelect === 'function' ? options.onRegionSelect : null;
  let destroyed = false;
  let rafId = 0;
  let drag = null;

  const firstElement = () => project.elements[0];
  const startSec = () => (firstElement()?.timeline?.startMs || 0) / 1000;
  const durationSec = () => {
    const d = Number(mediaEl.duration);
    if (Number.isFinite(d) && d > 0) return d;
    if (Number.isFinite(waveformSummary?.duration) && waveformSummary.duration > 0) return waveformSummary.duration;
    const el = firstElement();
    return Math.max(0.001, (el?.timeline?.rawDurationMs || el?.timeline?.durationMs || 0) / 1000);
  };

  // ── DOM ───────────────────────────────────────────────────────────────
  const root = h('section', 'al-surface media-listen-surface', { 'data-mixer-context': 'listen' });

  const stopBtn = h('button', 'al-btn al-stop', { type: 'button', title: 'Stop and rewind', 'aria-label': 'Stop' }, '⏹');
  const playBtn = h('button', 'al-btn al-play', { type: 'button', title: 'Play', 'aria-label': 'Play' }, '▶');
  const timeLabel = h('span', 'al-time', {}, '0:00.0 / 0:00.0');
  const zoomOut = h('button', 'al-btn al-zoom-out', { type: 'button', title: 'Zoom out', 'aria-label': 'Zoom out' }, '−');
  const zoomIn = h('button', 'al-btn al-zoom-in', { type: 'button', title: 'Zoom in', 'aria-label': 'Zoom in' }, '+');
  const fitBtn = h('button', 'al-btn al-fit', { type: 'button', title: 'Fit to width' }, 'Fit');
  const exportBtn = h('button', 'al-btn al-export', { type: 'button', title: 'Export project settings (config only)' }, 'Export settings');
  const toolbar = h('div', 'al-toolbar', {}, [
    h('div', 'al-transport', {}, [stopBtn, playBtn, timeLabel]),
    h('div', 'al-spacer'),
    h('div', 'al-zoom', {}, [zoomOut, fitBtn, zoomIn]),
    exportBtn,
  ]);

  const errorBanner = h('div', 'al-error', { role: 'alert' });

  const ruler = h('div', 'al-ruler');
  const canvas = h('canvas', 'al-canvas');
  const cursorLine = h('div', 'al-cursor', {}, [h('span', 'al-cursor-bubble', {}, '0:00.0')]);
  const chapterLayer = h('div', 'al-chapters');
  const canvasWrap = h('div', 'al-canvas-wrap', {}, [canvas, chapterLayer, cursorLine]);
  const trackLabel = h('div', 'al-track-label', {}, [
    h('span', 'al-track-name', {}, 'Source'),
    h('span', 'al-track-kind', {}, intake?.filename?.split('.').pop()?.toUpperCase() || 'AUDIO'),
  ]);
  const track = h('div', 'al-track', {}, [trackLabel, canvasWrap]);
  const timeline = h('div', 'al-timeline', {}, [ruler, track]);

  const inspector = h('div', 'al-inspector');
  const note = h('div', 'al-note', {}, 'Edit timing, trim, gain, fades and the room-tone bed here. Drag across the waveform to set the trim range; click to seek. Enable Media Transcoding for ffmpeg render paths.');

  root.append(toolbar, errorBanner, timeline, inspector, note);

  // ── Rendering ───────────────────────────────────────────────────────────
  function contentWidth() {
    const avail = Math.max(120, (canvasWrap.clientWidth || timeline.clientWidth - 96 || 700));
    if (pxPerSec <= 0) return avail; // fit
    return Math.max(avail, Math.round(durationSec() * pxPerSec));
  }

  function renderWaveform() {
    const width = contentWidth();
    canvas.style.width = `${width}px`;
    ruler.style.width = `${96 + width}px`;
    const el = firstElement();
    drawListenWaveform(canvas, root, {
      summary: waveformSummary,
      durationSec: durationSec(),
      cursorSec: (Number(mediaEl.currentTime) || 0) + startSec(),
      inSec: (el?.timeline?.sourceInMs || 0) / 1000,
      outSec: (el?.timeline?.sourceOutMs || el?.timeline?.durationMs || 0) / 1000 || durationSec(),
      fadeInSec: (el?.audio?.fadeInMs || 0) / 1000,
      fadeOutSec: (el?.audio?.fadeOutMs || 0) / 1000,
    });
    renderRuler(width);
    renderChapters(width);
    updateCursor();
  }

  function renderChapters(width) {
    chapterLayer.replaceChildren();
    const dur = durationSec();
    for (const chapter of chapters) {
      const start = Math.max(0, Number(chapter.start) || 0);
      const marker = h('div', 'al-chapter', { title: chapter.title || '' });
      marker.style.left = `${(start / Math.max(0.001, dur)) * 100}%`;
      chapterLayer.append(marker);
    }
  }

  function renderRuler(width) {
    ruler.replaceChildren();
    const dur = durationSec();
    const target = 80; // px between ticks
    const stepSec = niceStep((dur * (width / Math.max(1, dur))) > 0 ? (target / (width / Math.max(0.001, dur))) : 1);
    for (let t = 0; t <= dur + 0.0001; t += stepSec) {
      const tick = h('div', 'al-ruler-tick', {}, fmtTime(t));
      tick.style.left = `${96 + (t / dur) * width}px`;
      ruler.append(tick);
    }
  }

  function updateCursor() {
    const dur = durationSec();
    const cur = (Number(mediaEl.currentTime) || 0);
    const frac = clamp(cur / Math.max(0.001, dur), 0, 1);
    const width = canvas.clientWidth || contentWidth();
    cursorLine.style.left = `${frac * width}px`;
    const bubble = cursorLine.querySelector('.al-cursor-bubble');
    if (bubble) bubble.textContent = fmtTime(cur + startSec());
    timeLabel.textContent = `${fmtTime(cur + startSec())} / ${fmtTime(dur)}`;
    playBtn.textContent = mediaEl.paused ? '▶' : '⏸';
    playBtn.setAttribute('aria-label', mediaEl.paused ? 'Play' : 'Pause');
    playBtn.title = mediaEl.paused ? 'Play' : 'Pause';
  }

  function renderInspector() {
    const el = firstElement();
    const inSec = (el?.timeline?.sourceInMs || 0) / 1000;
    const outSec = (el?.timeline?.sourceOutMs || el?.timeline?.durationMs || 0) / 1000 || durationSec();
    inspector.replaceChildren(
      h('div', 'al-inspector-head', {}, [
        h('span', 'al-inspector-title', {}, 'Source'),
        h('span', 'al-inspector-sub', {}, intake?.filename || 'Audio'),
      ]),
      h('div', 'al-grid', {}, [
        numberField('Start (s)', 'al-f-start', startSec(), (v) => { project = moveElement(project, el.id, v * 1000); syncAll(); }),
        numberField('In (s)', 'al-f-in', inSec, (v) => { project = trimElement(project, el.id, { sourceInMs: v * 1000 }); emitRegion(); syncAll(); }),
        numberField('Out (s)', 'al-f-out', outSec, (v) => { project = trimElement(project, el.id, { sourceOutMs: v * 1000 }); emitRegion(); syncAll(); }),
      ]),
      h('div', 'al-sliders', {}, [
        sliderField('Gain', 'al-f-gain', 0, 2, 0.01, el?.audio?.gain ?? 1, (v) => {
          project = updateElement(project, el.id, (it) => ({ ...it, audio: { ...it.audio, gain: v } }));
          mediaEl.volume = clamp(v, 0, 1);
          syncAll();
        }, (v) => `${Math.round(v * 100)}%`),
        sliderField('Fade in', 'al-f-fade-in', 0, 5000, 50, el?.audio?.fadeInMs ?? 0, (v) => {
          project = updateElement(project, el.id, (it) => ({ ...it, audio: { ...it.audio, fadeInMs: v } })); syncAll();
        }, (v) => `${(v / 1000).toFixed(1)}s`),
        sliderField('Fade out', 'al-f-fade-out', 0, 5000, 50, el?.audio?.fadeOutMs ?? 0, (v) => {
          project = updateElement(project, el.id, (it) => ({ ...it, audio: { ...it.audio, fadeOutMs: v } })); syncAll();
        }, (v) => `${(v / 1000).toFixed(1)}s`),
        roomToneField(!!el?.audio?.roomTone, (on) => {
          project = updateElement(project, el.id, (it) => ({
            ...it,
            audio: { ...it.audio, roomTone: on ? { kind: 'room-tone', source: 'derived-gap-bed', levelDb: -52 } : null },
          }));
          syncAll();
        }),
      ]),
      h('div', 'al-inspector-sub', {}, `Duration ${fmtTime(Math.max(0, outSec - inSec))}`),
    );
    reflectState();
  }

  function syncAll() { renderWaveform(); renderInspector(); }

  // ── Transport ─────────────────────────────────────────────────────────
  function showError(message) {
    errorBanner.textContent = message;
    errorBanner.classList.add('is-visible');
  }
  function clearError() { errorBanner.classList.remove('is-visible'); errorBanner.textContent = ''; }

  function togglePlay() {
    if (mediaEl.paused) {
      clearError();
      const p = mediaEl.play();
      if (p && typeof p.then === 'function') {
        p.then(() => { clearError(); updateCursor(); })
          .catch((err) => showError(`Playback failed: ${err?.message || err?.name || 'unknown error'}. Try clicking play again, or download the file.`));
      }
    } else {
      mediaEl.pause();
    }
    updateCursor();
  }
  function stop() { mediaEl.pause(); mediaEl.currentTime = 0; renderWaveform(); }

  stopBtn.addEventListener('click', stop);
  playBtn.addEventListener('click', togglePlay);
  zoomIn.addEventListener('click', () => { setZoomPxPerSec((pxPerSec || fitPxPerSec()) * 1.5); });
  zoomOut.addEventListener('click', () => { setZoomPxPerSec((pxPerSec || fitPxPerSec()) / 1.5); });
  fitBtn.addEventListener('click', () => { pxPerSec = 0; renderWaveform(); });
  exportBtn.addEventListener('click', () => { exportSettings(); });

  function fitPxPerSec() { return (canvasWrap.clientWidth || 700) / Math.max(0.001, durationSec()); }
  function setZoomPxPerSec(v) { pxPerSec = clamp(v, ZOOM_MIN, ZOOM_MAX); renderWaveform(); }

  // ── Canvas seek + drag-trim ───────────────────────────────────────────
  function canvasXToSec(clientX) {
    const rect = canvas.getBoundingClientRect();
    const frac = clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1);
    return frac * durationSec();
  }
  canvasWrap.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    canvasWrap.setPointerCapture?.(e.pointerId);
    drag = { startSec: canvasXToSec(e.clientX), moved: false };
  });
  canvasWrap.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const cur = canvasXToSec(e.clientX);
    if (Math.abs(cur - drag.startSec) > 0.02) drag.moved = true;
    if (drag.moved) {
      const el = firstElement();
      const a = Math.min(drag.startSec, cur);
      const b = Math.max(drag.startSec, cur);
      project = trimElement(project, el.id, { sourceInMs: a * 1000, sourceOutMs: b * 1000 });
      renderWaveform();
    }
  });
  canvasWrap.addEventListener('pointerup', (e) => {
    if (!drag) return;
    if (!drag.moved) {
      const sec = canvasXToSec(e.clientX);
      mediaEl.currentTime = clamp(sec - startSec(), 0, durationSec());
      updateCursor();
    } else {
      emitRegion();
      renderInspector();
    }
    drag = null;
  });

  function emitRegion() {
    const el = firstElement();
    const a = (el?.timeline?.sourceInMs || 0) / 1000;
    const b = (el?.timeline?.sourceOutMs || 0) / 1000;
    if (onRegionSelect && b > a) onRegionSelect({ start: a, end: b });
  }

  // ── Media + lifecycle ─────────────────────────────────────────────────
  const onLoaded = () => { project = mergeDuration(project, mediaDuration(mediaEl) * 1000); syncAll(); };
  const onMedia = () => { updateCursor(); };
  mediaEl.addEventListener('loadedmetadata', onLoaded);
  ['play', 'pause', 'seeked', 'ended', 'volumechange'].forEach((ev) => mediaEl.addEventListener(ev, onMedia));
  window.addEventListener('resize', renderWaveform);

  decodeSummary(intake).then((summary) => {
    if (destroyed) return;
    if (summary) {
      waveformSummary = summary;
      waveformStatus = 'available';
      if (Number.isFinite(summary.duration) && summary.duration > 0) project = mergeDuration(project, summary.duration * 1000);
      options.onWaveformSummary?.(summary);
    } else {
      waveformStatus = 'unavailable';
    }
    options.onWaveformSummaryStatus?.(waveformStatus);
    syncAll();
  }).catch(() => { waveformStatus = 'unavailable'; options.onWaveformSummaryStatus?.(waveformStatus); });

  function loop() {
    if (destroyed) return;
    if (!mediaEl.paused) renderWaveform(); else updateCursor();
    rafId = requestAnimationFrame(loop);
  }

  function reflectState() {
    const el = firstElement();
    root.dataset.mixerProjectId = project.project.id;
    root.dataset.mixerElementId = el?.id || '';
    root.dataset.mixerGain = String(el?.audio?.gain ?? 1);
    root.dataset.mixerRoomTone = el?.audio?.roomTone ? 'true' : 'false';
    root.dataset.mixerWaveformStatus = waveformStatus;
    root.dataset.mixerWaveformBuckets = String(waveformSummary?.buckets || (waveformSummary?.peak?.length ?? 0));
    root.dataset.mixerDurationSec = String(durationSec());
  }

  function exportSettings() { const json = exportProjectSettingsJson(project); root.dataset.projectSettings = json; return json; }
  function importSettings(json) { const imported = importProjectSettings(json); project = selectFirstElement(imported.project); syncAll(); return imported; }

  // Test/integration handle on the DOM node (parity with the previous surface).
  root.__mediaMixerListen = {
    getProject: () => project,
    exportSettings,
    importSettings,
    zoomFactor: (f) => setZoomPxPerSec(fitPxPerSec() * Math.max(0.1, Number(f) || 1)),
  };

  // Initial paint (deferred a tick so layout width is known).
  requestAnimationFrame(() => { if (!destroyed) syncAll(); });
  rafId = requestAnimationFrame(loop);

  return {
    el: root,
    getProject: () => project,
    exportSettings,
    importSettings,
    setChapters(next) { chapters = Array.isArray(next) ? next : []; renderWaveform(); },
    setRegionSelect(fn) { onRegionSelect = typeof fn === 'function' ? fn : null; },
    getState() {
      const el = firstElement();
      return {
        offsetSec: startSec(),
        inSec: (el?.timeline?.sourceInMs || 0) / 1000,
        outSec: (el?.timeline?.sourceOutMs || el?.timeline?.durationMs || 0) / 1000,
        gain: el?.audio?.gain ?? 1,
        fadeInMs: el?.audio?.fadeInMs ?? 0,
        fadeOutMs: el?.audio?.fadeOutMs ?? 0,
        roomTone: !!el?.audio?.roomTone,
        durationSec: durationSec(),
        currentTime: Number(mediaEl.currentTime) || 0,
      };
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(rafId);
      mediaEl.removeEventListener('loadedmetadata', onLoaded);
      ['play', 'pause', 'seeked', 'ended', 'volumechange'].forEach((ev) => mediaEl.removeEventListener(ev, onMedia));
      window.removeEventListener('resize', renderWaveform);
      root.remove();
    },
  };
}

// ── small DOM + field helpers ─────────────────────────────────────────────
function h(tag, className, attrs = {}, children) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (Array.isArray(children)) node.append(...children.filter(Boolean));
  else if (children != null) node.textContent = children;
  return node;
}

function numberField(label, cls, value, onChange) {
  const input = h('input', cls, { type: 'number', step: '0.01', value: String(round2(value)) });
  const fire = () => { const n = Number(input.value); if (Number.isFinite(n)) onChange(n); };
  input.addEventListener('input', fire);
  input.addEventListener('change', fire);
  return h('label', 'al-field', {}, [h('span', '', {}, label), input]);
}

function sliderField(label, cls, min, max, step, value, onChange, fmt) {
  const span = h('span', '', {}, `${label} (${fmt(value)})`);
  const input = h('input', cls, { type: 'range', min: String(min), max: String(max), step: String(step), value: String(value) });
  input.addEventListener('input', () => { const n = Number(input.value); span.textContent = `${label} (${fmt(n)})`; onChange(n); });
  return h('div', 'al-slider', {}, [span, input]);
}

function roomToneField(checked, onChange) {
  const input = h('input', 'al-f-room', { type: 'checkbox' });
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));
  return h('div', 'al-toggle', {}, [input, h('label', '', {}, 'Pink-noise / room-tone bed')]);
}

function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

function niceStep(seconds) {
  const steps = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
  for (const s of steps) if (seconds <= s) return s;
  return 600;
}
