import { computeWaveformSummary } from './waveform-data.js';

const DEFAULT_STATE = {
  offsetSec: 0,
  inSec: 0,
  outSec: null,
  gain: 1,
  fadeInMs: 10,
  fadeOutMs: 50,
  roomTone: true,
};

function fmtTime(value) {
  const total = Math.max(0, Math.floor(Number(value) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function clamp(value, min, max) {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : min;
}

function button(label, title, className = '') {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `media-listen-btn ${className}`.trim();
  el.textContent = label;
  el.title = title;
  el.setAttribute('aria-label', title);
  return el;
}

function numberField(labelText, className, attrs, onInput) {
  const label = document.createElement('label');
  label.className = 'media-lane-field';
  const span = document.createElement('span');
  span.textContent = labelText;
  const input = document.createElement('input');
  input.type = attrs.type || 'number';
  input.className = className;
  Object.entries(attrs).forEach(([key, value]) => {
    if (key !== 'type') input.setAttribute(key, String(value));
  });
  input.addEventListener('input', onInput);
  label.append(span, input);
  return { label, input };
}

async function decodeSummary(file) {
  if (!file) return null;
  const MAX_FULL_DECODE = 96 * 1024 * 1024;
  const SLICE = 60 * 256 * 128;
  const source = file.size && file.size <= MAX_FULL_DECODE ? file : file.slice(0, SLICE);
  const bytes = await source.arrayBuffer();
  const ac = new AudioContext();
  try {
    const buffer = await ac.decodeAudioData(bytes.slice(0));
    return computeWaveformSummary(buffer);
  } finally {
    ac.close().catch(() => {});
  }
}

export function buildAudioListenSurface(mediaEl, intake, options = {}) {
  mediaEl.controls = false;
  mediaEl.classList.add('media-view-hidden');
  mediaEl.setAttribute('aria-hidden', 'true');
  mediaEl.tabIndex = -1;

  const state = { ...DEFAULT_STATE };
  let summary = null;
  let chapters = Array.isArray(options.chapters) ? options.chapters : [];
  let destroyed = false;
  let rafId = 0;
  let selecting = false;
  let selectionStartPx = 0;
  let onRegionSelect = typeof options.onRegionSelect === 'function' ? options.onRegionSelect : null;
  const onWaveformSummary = typeof options.onWaveformSummary === 'function' ? options.onWaveformSummary : null;
  const onWaveformSummaryStatus = typeof options.onWaveformSummaryStatus === 'function' ? options.onWaveformSummaryStatus : null;

  const file = intake.file || new File([intake.bytes || new Uint8Array()], intake.filename || 'audio');

  const wrap = document.createElement('div');
  wrap.className = 'media-listen-surface';

  const toolbar = document.createElement('div');
  toolbar.className = 'media-lane-toolbar';
  const title = document.createElement('div');
  title.className = 'media-lane-title';
  title.textContent = intake.filename || 'Audio';
  const transport = document.createElement('div');
  transport.className = 'media-lane-transport';
  const stopBtn = button('Stop', 'Stop and rewind', 'media-listen-stop');
  const playBtn = button('Play', 'Play or pause', 'media-listen-play');
  const time = document.createElement('span');
  time.className = 'media-listen-time media-lane-time';
  time.textContent = '0:00 / --:--';
  transport.append(stopBtn, playBtn, time);
  toolbar.append(title, transport);

  const editor = document.createElement('div');
  editor.className = 'media-lane-editor';

  const label = document.createElement('div');
  label.className = 'media-lane-label';
  const idx = document.createElement('span');
  idx.className = 'media-listen-index';
  idx.textContent = '1';
  const labelName = document.createElement('span');
  labelName.className = 'media-lane-label-name';
  labelName.textContent = 'Source';
  const bed = document.createElement('span');
  bed.className = 'media-lane-bed';
  bed.textContent = 'Room tone -52 dB';
  label.append(idx, labelName, bed);

  const waveformSurface = document.createElement('div');
  waveformSurface.className = 'media-waveform-surface media-lane-waveform';
  const ruler = document.createElement('div');
  ruler.className = 'media-lane-ruler';
  const canvas = document.createElement('canvas');
  canvas.className = 'media-wv-canvas media-lane-canvas';
  const roomToneLayer = document.createElement('div');
  roomToneLayer.className = 'media-lane-room-tone';
  const trimRegion = document.createElement('div');
  trimRegion.className = 'media-wv-region media-lane-trim';
  const playhead = document.createElement('div');
  playhead.className = 'media-wv-playhead media-lane-cursor';
  const playheadLabel = document.createElement('span');
  playheadLabel.className = 'media-wv-playhead-label';
  playhead.append(playheadLabel);
  const markerLayer = document.createElement('div');
  markerLayer.className = 'media-wv-chapter-layer';
  waveformSurface.append(ruler, canvas, roomToneLayer, trimRegion, markerLayer, playhead);

  editor.append(label, waveformSurface);

  const controls = document.createElement('div');
  controls.className = 'media-lane-controls';
  const offset = numberField('Start later', 'media-lane-offset', { min: 0, max: 3600, step: 0.01, value: 0 }, () => {
    state.offsetSec = clamp(Number(offset.input.value), 0, 3600);
    sync();
  });
  const trimIn = numberField('In', 'media-lane-in', { min: 0, step: 0.01, value: 0 }, () => {
    state.inSec = clamp(Number(trimIn.input.value), 0, duration());
    if (state.outSec !== null && state.outSec < state.inSec) state.outSec = state.inSec;
    syncInputs();
    sync();
  });
  const trimOut = numberField('Out', 'media-lane-out', { min: 0, step: 0.01, value: 0 }, () => {
    state.outSec = clamp(Number(trimOut.input.value), state.inSec, duration());
    syncInputs();
    sync();
  });
  const gain = numberField('Gain', 'media-lane-gain', { min: 0, max: 2, step: 0.01, value: 1 }, () => {
    state.gain = clamp(Number(gain.input.value), 0, 2);
    mediaEl.volume = clamp(state.gain, 0, 1);
    sync();
  });
  const fadeIn = numberField('Fade in', 'media-lane-fade-in', { min: 0, max: 5000, step: 5, value: 10 }, () => {
    state.fadeInMs = clamp(Number(fadeIn.input.value), 0, 5000);
    draw();
  });
  const fadeOut = numberField('Fade out', 'media-lane-fade-out', { min: 0, max: 5000, step: 5, value: 50 }, () => {
    state.fadeOutMs = clamp(Number(fadeOut.input.value), 0, 5000);
    draw();
  });
  const roomTone = document.createElement('label');
  roomTone.className = 'media-lane-field media-lane-room-field';
  const roomToneCb = document.createElement('input');
  roomToneCb.type = 'checkbox';
  roomToneCb.className = 'media-lane-room-toggle';
  roomToneCb.checked = true;
  const roomToneText = document.createElement('span');
  roomToneText.textContent = 'Pink-noise / room-tone bed';
  roomTone.append(roomToneCb, roomToneText);
  roomToneCb.addEventListener('change', () => {
    state.roomTone = roomToneCb.checked;
    draw();
  });
  const durationReadout = document.createElement('div');
  durationReadout.className = 'media-lane-duration';
  durationReadout.textContent = 'Duration --:--';

  controls.append(
    offset.label,
    trimIn.label,
    trimOut.label,
    gain.label,
    fadeIn.label,
    fadeOut.label,
    roomTone,
    durationReadout,
  );
  wrap.append(toolbar, editor, controls);

  const duration = () => Number(mediaEl.duration) || Number(summary?.duration) || 0;
  const current = () => Number(mediaEl.currentTime) || 0;
  const effectiveOut = () => state.outSec === null ? duration() : clamp(state.outSec, state.inSec, duration());
  const timelineDuration = () => Math.max(0.001, state.offsetSec + duration());
  const timeToPct = (seconds) => clamp(seconds / timelineDuration(), 0, 1) * 100;
  const contentStartPct = () => timeToPct(state.offsetSec + state.inSec);
  const contentEndPct = () => timeToPct(state.offsetSec + effectiveOut());

  function syncInputs() {
    const dur = duration();
    trimIn.input.max = String(Math.max(0, dur));
    trimOut.input.max = String(Math.max(0, dur));
    trimIn.input.value = String(Math.round(state.inSec * 100) / 100);
    trimOut.input.value = String(Math.round(effectiveOut() * 100) / 100);
    offset.input.value = String(Math.round(state.offsetSec * 100) / 100);
    gain.input.value = String(Math.round(state.gain * 100) / 100);
    fadeIn.input.value = String(Math.round(state.fadeInMs));
    fadeOut.input.value = String(Math.round(state.fadeOutMs));
    roomToneCb.checked = !!state.roomTone;
  }

  function drawRuler(ctx, w, h) {
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--fg-2').trim() || '#888';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textBaseline = 'top';
    ctx.globalAlpha = 0.55;
    const total = timelineDuration();
    const targetTicks = Math.max(3, Math.floor(w / 90));
    const rawStep = total / targetTicks;
    const step = rawStep <= 1 ? 0.5 : rawStep <= 3 ? 1 : rawStep <= 8 ? 5 : rawStep <= 20 ? 10 : 30;
    for (let t = 0; t <= total + 0.001; t += step) {
      const x = (t / total) * w;
      ctx.fillRect(x, 0, 1, h);
      ctx.fillText(fmtTime(t), x + 4, 2);
    }
    ctx.globalAlpha = 1;
  }

  function draw() {
    if (destroyed) return;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(320, Math.round(rect.width || canvas.clientWidth || 640));
    const h = Math.max(110, Math.round(rect.height || canvas.clientHeight || 130));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const style = getComputedStyle(document.documentElement);
    const accent = style.getPropertyValue('--accent').trim() || '#4c9aff';
    const fg2 = style.getPropertyValue('--fg-2').trim() || '#889';
    const bg = style.getPropertyValue('--bg').trim() || '#111';
    const topPad = 24;
    const waveH = h - topPad;
    const mid = topPad + waveH / 2;
    const total = timelineDuration();
    const dur = duration();
    const sourceStartX = (state.offsetSec / total) * w;
    const sourceW = dur > 0 ? (dur / total) * w : w;
    const inX = (state.offsetSec + state.inSec) / total * w;
    const outX = (state.offsetSec + effectiveOut()) / total * w;

    ctx.fillStyle = bg;
    ctx.fillRect(0, topPad, w, waveH);
    drawRuler(ctx, w, topPad - 2);

    if (state.roomTone) {
      ctx.fillStyle = 'rgba(211, 84, 140, 0.14)';
      if (sourceStartX > 0) ctx.fillRect(0, topPad, sourceStartX, waveH);
      if (outX < w) ctx.fillRect(outX, topPad, w - outX, waveH);
      ctx.fillStyle = 'rgba(211, 84, 140, 0.42)';
      let seed = 97;
      for (let x = 0; x < w; x += 4) {
        if (x >= sourceStartX && x <= outX) continue;
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const barH = ((seed % 1000) / 1000) * waveH * 0.22;
        ctx.fillRect(x, mid - barH / 2, 1, barH);
      }
    }

    if (!summary) {
      ctx.fillStyle = fg2;
      ctx.globalAlpha = 0.25;
      ctx.fillRect(sourceStartX, mid - 5, Math.max(1, sourceW), 10);
      ctx.globalAlpha = 1;
    } else {
      const startBucket = Math.max(0, Math.floor(state.inSec * summary.peaksPerSecond));
      const endBucket = Math.min(summary.buckets, Math.ceil(effectiveOut() * summary.peaksPerSecond));
      const bucketCount = Math.max(1, endBucket - startBucket);
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.78;
      for (let x = Math.floor(sourceStartX); x <= Math.ceil(sourceStartX + sourceW); x += 1) {
        if (x < inX || x > outX) continue;
        const frac = sourceW > 0 ? clamp((x - sourceStartX) / sourceW, 0, 1) : 0;
        const bucket = startBucket + Math.floor(frac * bucketCount);
        const peak = summary.peak[bucket] || summary.rms[bucket] || 0;
        const localSec = state.inSec + frac * Math.max(0.001, effectiveOut() - state.inSec);
        let env = state.gain;
        const fadeInSec = state.fadeInMs / 1000;
        const fadeOutSec = state.fadeOutMs / 1000;
        if (fadeInSec > 0 && localSec < state.inSec + fadeInSec) {
          env *= Math.pow((localSec - state.inSec) / fadeInSec, 2);
        }
        if (fadeOutSec > 0 && localSec > effectiveOut() - fadeOutSec) {
          env *= Math.pow((effectiveOut() - localSec) / fadeOutSec, 2);
        }
        const barH = Math.max(1, peak * waveH * 0.78 * Math.min(2, env));
        ctx.fillRect(x, mid - barH / 2, 1, barH);
      }
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = 'rgba(76, 154, 255, 0.16)';
    ctx.fillRect(inX, topPad, Math.max(1, outX - inX), waveH);
    ctx.strokeStyle = 'rgba(76, 154, 255, 0.72)';
    ctx.strokeRect(inX, topPad + 0.5, Math.max(1, outX - inX), waveH - 1);

    roomToneLayer.hidden = !state.roomTone;
    trimRegion.style.left = `${contentStartPct()}%`;
    trimRegion.style.width = `${Math.max(0.1, contentEndPct() - contentStartPct())}%`;
    syncMarkers();
  }

  function syncMarkers() {
    markerLayer.textContent = '';
    const dur = duration();
    if (!chapters.length || dur <= 0) return;
    for (const [index, chapter] of chapters.entries()) {
      const marker = document.createElement('div');
      marker.className = 'media-wv-chapter-marker';
      marker.title = chapter.title || `Chapter ${index + 1}`;
      marker.dataset.chapter = String(index + 1);
      marker.style.left = `${timeToPct(state.offsetSec + clamp(Number(chapter.start), 0, dur))}%`;
      const label = document.createElement('span');
      label.className = 'media-wv-chapter-label';
      label.textContent = marker.title;
      marker.append(label);
      markerLayer.append(marker);
    }
  }

  function sync() {
    const dur = duration();
    if (state.outSec === null && dur > 0) state.outSec = dur;
    if (dur > 0) state.outSec = clamp(effectiveOut(), state.inSec, dur);
    const now = current();
    const cursorSec = state.offsetSec + now;
    const pct = timeToPct(cursorSec);
    time.textContent = `${fmtTime(now)} / ${dur > 0 ? fmtTime(dur) : '--:--'}`;
    playBtn.textContent = mediaEl.paused ? 'Play' : 'Pause';
    playBtn.setAttribute('aria-label', mediaEl.paused ? 'Play' : 'Pause');
    playhead.style.left = `${pct}%`;
    playheadLabel.textContent = fmtTime(cursorSec);
    durationReadout.textContent = `Duration ${dur > 0 ? fmtTime(Math.max(0, effectiveOut() - state.inSec)) : '--:--'}`;
    syncInputs();
    draw();
  }

  function seekAtClientX(clientX) {
    const rect = canvas.getBoundingClientRect();
    const x = clamp(clientX - rect.left, 0, rect.width || 1);
    const timelineSec = (x / Math.max(1, rect.width)) * timelineDuration();
    mediaEl.currentTime = clamp(timelineSec - state.offsetSec, 0, duration());
    sync();
  }

  function selectAtClientX(clientX) {
    const rect = canvas.getBoundingClientRect();
    return clamp(clientX - rect.left, 0, rect.width || 1);
  }

  function pxToSourceSec(px) {
    const rect = canvas.getBoundingClientRect();
    const timelineSec = (px / Math.max(1, rect.width)) * timelineDuration();
    return clamp(timelineSec - state.offsetSec, 0, duration());
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    selectionStartPx = selectAtClientX(event.clientX);
    selecting = true;
    try { canvas.setPointerCapture(event.pointerId); } catch { /* ignore */ }
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!selecting) return;
    const curr = selectAtClientX(event.clientX);
    const a = pxToSourceSec(Math.min(selectionStartPx, curr));
    const b = pxToSourceSec(Math.max(selectionStartPx, curr));
    if (Math.abs(curr - selectionStartPx) >= 3) {
      state.inSec = a;
      state.outSec = Math.max(a, b);
      sync();
    }
  });
  canvas.addEventListener('pointerup', (event) => {
    if (!selecting) return;
    const curr = selectAtClientX(event.clientX);
    selecting = false;
    if (Math.abs(curr - selectionStartPx) < 3) {
      seekAtClientX(event.clientX);
      return;
    }
    const start = pxToSourceSec(Math.min(selectionStartPx, curr));
    const end = pxToSourceSec(Math.max(selectionStartPx, curr));
    if (onRegionSelect && end > start) onRegionSelect({ start, end });
    sync();
  });
  canvas.addEventListener('pointercancel', () => { selecting = false; });

  playBtn.addEventListener('click', () => {
    if (mediaEl.paused) mediaEl.play().catch(() => {});
    else mediaEl.pause();
    sync();
  });
  stopBtn.addEventListener('click', () => {
    mediaEl.pause();
    mediaEl.currentTime = 0;
    sync();
  });

  const events = ['loadedmetadata', 'durationchange', 'timeupdate', 'play', 'pause', 'seeked', 'ended', 'volumechange'];
  events.forEach((event) => mediaEl.addEventListener(event, sync));
  window.addEventListener('resize', sync);

  decodeSummary(file).then((next) => {
    if (destroyed) return;
    summary = next;
    if (summary) {
      onWaveformSummary?.(summary);
      onWaveformSummaryStatus?.('available');
    } else {
      onWaveformSummaryStatus?.('unavailable');
    }
    sync();
  }).catch(() => {
    onWaveformSummaryStatus?.('unavailable');
    sync();
  });

  function loop() {
    if (destroyed) return;
    sync();
    rafId = requestAnimationFrame(loop);
  }
  rafId = requestAnimationFrame(loop);
  sync();

  return {
    el: wrap,
    update: sync,
    setChapters(nextChapters) {
      chapters = Array.isArray(nextChapters) ? nextChapters : [];
      sync();
    },
    setRegionSelect(fn) {
      onRegionSelect = typeof fn === 'function' ? fn : null;
    },
    getState() {
      return { ...state, durationSec: duration(), currentTime: current() };
    },
    getWaveformSummary() {
      return summary;
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(rafId);
      events.forEach((event) => mediaEl.removeEventListener(event, sync));
      window.removeEventListener('resize', sync);
      wrap.remove();
    },
  };
}
