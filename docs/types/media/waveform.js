// Audio waveform renderer + Web Audio gain helper.
import { getGraph } from './audio-graph.js';
// Module-level AudioContext singleton (created lazily, reused across renders).
let _ac = null;
const _gainProxies = new WeakMap(); // audio element → { gain: { value } } proxy

function getAC() {
  if (!_ac || _ac.state === 'closed') {
    try { _ac = new AudioContext(); } catch { return null; }
  }
  return _ac;
}

function hms(t) {
  if (!Number.isFinite(t)) t = 0;
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

function clamp(v, min, max) {
  return Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : min;
}

// Connect el through the shared media graph's mixer gain. createMediaElementSource
// can only be called ONCE per element, so the mixer gain must live in the same graph
// as the Spectrum & EQ panel (audio-graph.js owns the single source). This returns a
// small proxy whose `.gain.value` setter drives that graph's mixer gain — keeping the
// old `connectGain(el).gain.value = x` call sites working without a second source.
export function connectGain(el) {
  if (_gainProxies.has(el)) return _gainProxies.get(el);
  const graph = getGraph(el);
  if (!graph) return null;
  const proxy = { gain: { get value() { return graph.getUserGain(); }, set value(v) { graph.setUserGain(v); } } };
  _gainProxies.set(el, proxy);
  return proxy;
}

async function drawWaveform(canvas, file, { ownContext = false } = {}) {
  const ctx2d = canvas.getContext('2d');
  if (!ctx2d) return null;
  const W = canvas.width;
  const H = canvas.height;

  // Slice first ~60s (60s × 256kbps ≈ 1.8 MB) to avoid decoding entire large files.
  const SLICE = 60 * 256 * 128;
  let buf;
  try {
    buf = await file.slice(0, SLICE).arrayBuffer();
  } catch { return null; }

  let ac = null;
  try { ac = ownContext ? new AudioContext() : getAC(); } catch {}
  if (!ac) return null;

  let audioBuffer;
  try {
    // decodeAudioData consumes the buffer; pass a copy so the original stays usable.
    audioBuffer = await ac.decodeAudioData(buf.slice(0));
  } catch { return null; }

  // Downsample to one peak per pixel column.
  const ch = audioBuffer.getChannelData(0);
  const step = Math.max(1, Math.floor(ch.length / W));
  const peaks = new Float32Array(W);
  for (let i = 0; i < W; i++) {
    let max = 0;
    for (let j = 0; j < step; j++) {
      const v = Math.abs(ch[i * step + j] || 0);
      if (v > max) max = v;
    }
    peaks[i] = max;
  }

  const style = getComputedStyle(document.documentElement);
  const accent = style.getPropertyValue('--accent').trim() || '#4c9aff';

  function draw(currentTime = 0, duration = 0) {
    ctx2d.clearRect(0, 0, W, H);
    const mid = H / 2;
    ctx2d.fillStyle = accent + '55';
    for (let i = 0; i < W; i++) {
      const h = Math.max(1, peaks[i] * mid * 0.9);
      ctx2d.fillRect(i, mid - h, 1, h * 2);
    }
    if (duration > 0) {
      const x = Math.min(W - 2, Math.round((currentTime / duration) * W));
      ctx2d.fillStyle = '#e5534b';
      ctx2d.fillRect(x, 0, 2, H);
    }
  }

  draw();

  let rafId = null;
  let audioEl = null;
  let destroyed = false;

  function update(el) {
    if (destroyed) return;
    audioEl = el;
    if (!rafId) {
      (function loop() {
        if (destroyed) return;
        if (audioEl) draw(audioEl.currentTime, audioEl.duration || 0);
        rafId = requestAnimationFrame(loop);
      })();
    }
  }

  function destroy() {
    destroyed = true;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    audioEl = null;
    if (ownContext) ac.close().catch(() => {});
  }

  return { update, destroy };
}

function toCallback(opts) {
  if (typeof opts === 'function') return opts;
  return opts && typeof opts.onRegionSelect === 'function' ? opts.onRegionSelect : null;
}

export async function mountWaveform(container, file, options = {}) {
  container.textContent = '';
  const onRegionSelect = toCallback(options);
  const chapters = Array.isArray(options.chapters) ? options.chapters : [];
  const canvas = document.createElement('canvas');
  canvas.className = 'media-wv-canvas';
  canvas.height = 120;
  canvas.width = Math.max(320, Math.round(container.clientWidth || container.getBoundingClientRect().width || 400));
  container.appendChild(canvas);

  const status = document.createElement('div');
  status.className = 'media-wv-status';
  status.hidden = true;
  container.appendChild(status);

  const region = document.createElement('div');
  region.className = 'media-wv-region';
  region.hidden = true;
  container.appendChild(region);

  const playhead = document.createElement('div');
  playhead.className = 'media-wv-playhead';
  const playheadLabel = document.createElement('span');
  playheadLabel.className = 'media-wv-playhead-label';
  playhead.append(playheadLabel);
  container.appendChild(playhead);

  const markerLayer = document.createElement('div');
  markerLayer.className = 'media-wv-chapter-layer';
  container.appendChild(markerLayer);
  const markers = chapters.map((chapter, index) => {
    const marker = document.createElement('div');
    marker.className = 'media-wv-chapter-marker';
    marker.title = chapter.title || `Chapter ${index + 1}`;
    marker.dataset.chapter = String(index + 1);
    const label = document.createElement('span');
    label.className = 'media-wv-chapter-label';
    label.textContent = marker.title;
    marker.appendChild(label);
    markerLayer.appendChild(marker);
    return { marker, chapter };
  });

  let regionPx = null;
  let startPx = 0;
  let selecting = false;
  let seekScrubbing = false;
  let lastClientX = null;

  const controller = await drawWaveform(canvas, file, { ownContext: true });
  const getAudioEl = () => container.closest('.media-doc')?.querySelector('audio.media-view');

  const updateMarkers = () => {
    if (!markers.length) return;
    const mediaDuration = Number(getAudioEl()?.duration);
    const chapterDuration = Math.max(...markers.map(({ chapter }) => {
      const end = Number(chapter.end);
      const start = Number(chapter.start);
      if (Number.isFinite(end)) return end;
      return Number.isFinite(start) ? start : 0;
    }));
    const duration = Number.isFinite(mediaDuration) && mediaDuration > 0 ? mediaDuration : chapterDuration;
    const width = canvas.clientWidth || markerLayer.clientWidth || 0;
    const ready = Number.isFinite(duration) && duration > 0 && width > 0;
    markerLayer.hidden = false;
    if (!ready) {
      const step = markers.length > 1 ? 100 / Math.max(1, markers.length - 1) : 0;
      markers.forEach(({ marker }, index) => { marker.style.left = `${Math.min(100, index * step)}%`; });
      return;
    }
    markers.forEach(({ marker, chapter }) => {
      const start = clamp(Number(chapter.start), 0, duration);
      marker.style.left = `${(start / duration) * 100}%`;
    });
  };

  const updateSelectionStatus = (start, end, duration) => {
    if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(duration) || duration <= 0) {
      status.textContent = '';
      status.hidden = true;
      return;
    }
    status.textContent = 'Trim ' + hms(start) + ' → ' + hms(end);
    status.hidden = false;
  };

  const updatePlayhead = () => {
    const audioEl = getAudioEl();
    const duration = Number(audioEl?.duration) || 0;
    const current = Number(audioEl?.currentTime) || 0;
    const pct = duration > 0 ? (clamp(current, 0, duration) / duration) * 100 : 0;
    playhead.style.left = `${pct}%`;
    playheadLabel.textContent = hms(current);
  };

  const setRegion = (left, right) => {
    if (!onRegionSelect) return;
    const W = canvas.clientWidth;
    if (!W) return;
    regionPx = { left: clamp(Math.min(left, right), 0, W), right: clamp(Math.max(left, right), 0, W) };
    const regionWidth = Math.max(1, regionPx.right - regionPx.left);
    region.hidden = false;
    region.style.left = regionPx.left + 'px';
    region.style.width = regionWidth + 'px';
  };

  const toClientX = (ev) => {
    const v = typeof ev === 'number' ? ev : ev?.clientX;
    return Number.isFinite(v) ? v : null;
  };

  const selectRegion = (ev) => {
    const r = canvas.getBoundingClientRect();
    const width = r.width;
    if (!width) return null;
    const x = toClientX(ev);
    if (x === null) return null;
    const px = clamp(x - r.left, 0, width);
    return px;
  };

  const clearRegion = () => {
    regionPx = null;
    region.style.left = '0px';
    region.style.width = '0px';
    region.hidden = true;
  };

  const pixelToSeconds = (px, duration) => {
    const w = canvas.clientWidth || 1;
    const clamped = clamp(px, 0, w);
    return duration > 0 ? (clamped / w) * duration : 0;
  };

  const seekToPixel = (px) => {
    const audioEl = getAudioEl();
    const duration = Number(audioEl?.duration) || 0;
    if (!audioEl || duration <= 0) return;
    audioEl.currentTime = pixelToSeconds(px, duration);
    updatePlayhead();
    controller?.update(audioEl);
  };

  const onDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    startPx = selectRegion(event) || 0;
    lastClientX = toClientX(event);
    selecting = !!onRegionSelect;
    seekScrubbing = !selecting;
    if (selecting) {
      setRegion(startPx, startPx);
      status.textContent = '';
      status.hidden = true;
    } else {
      seekToPixel(startPx);
    }
    try { canvas.setPointerCapture(event.pointerId); } catch { /* ignore */ }
  };

  const onMove = (event) => {
    if (!selecting && !seekScrubbing) return;
    const curr = selectRegion(event);
    if (curr === null) return;
    const x = toClientX(event);
    if (x !== null) lastClientX = x;
    if (selecting && onRegionSelect) setRegion(startPx, curr);
    else if (seekScrubbing) seekToPixel(curr);
  };

  const onUp = (event) => {
    if (seekScrubbing) {
      const curr = selectRegion(event) ?? selectRegion(lastClientX) ?? startPx;
      seekToPixel(curr);
      seekScrubbing = false;
      selecting = false;
      return;
    }
    if (!selecting || !onRegionSelect) {
      selecting = false;
      return;
    }
    selecting = false;
    const curr = selectRegion(event) ?? selectRegion(lastClientX);
    if (Math.abs((curr ?? startPx) - startPx) < 3) {
      seekToPixel(curr ?? startPx);
      clearRegion();
      status.hidden = true;
      return;
    }
    const audioEl = getAudioEl();
    const duration = Number(audioEl?.duration) || 0;
    const start = pixelToSeconds(Math.min(startPx, curr ?? startPx), duration);
    const end = pixelToSeconds(Math.max(startPx, curr ?? startPx), duration);
    if (Number.isFinite(start) && Number.isFinite(end) && start <= end) {
      const finalEnd = end < start ? start : end;
      const nextStart = clamp(start, 0, duration);
      const nextEnd = clamp(finalEnd, 0, duration);
      updateSelectionStatus(nextStart, nextEnd, duration);
      onRegionSelect({
        start: clamp(nextStart, 0, duration),
        end: clamp(nextEnd, 0, duration),
      });
    }
    if (regionPx && regionPx.right - regionPx.left < 2) {
      clearRegion();
    }
  };

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('lostpointercapture', onUp);

  if (controller) controller.update(getAudioEl());
  const audioEl = getAudioEl();
  audioEl?.addEventListener('loadedmetadata', updateMarkers);
  audioEl?.addEventListener('durationchange', updateMarkers);
  audioEl?.addEventListener('loadedmetadata', updatePlayhead);
  audioEl?.addEventListener('durationchange', updatePlayhead);
  audioEl?.addEventListener('timeupdate', updatePlayhead);
  audioEl?.addEventListener('seeked', updatePlayhead);
  window.addEventListener('resize', updateMarkers);
  updateMarkers();
  updatePlayhead();
  return {
    destroy() {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('lostpointercapture', onUp);
      clearRegion();
      status.hidden = true;
      audioEl?.removeEventListener('loadedmetadata', updateMarkers);
      audioEl?.removeEventListener('durationchange', updateMarkers);
      audioEl?.removeEventListener('loadedmetadata', updatePlayhead);
      audioEl?.removeEventListener('durationchange', updatePlayhead);
      audioEl?.removeEventListener('timeupdate', updatePlayhead);
      audioEl?.removeEventListener('seeked', updatePlayhead);
      window.removeEventListener('resize', updateMarkers);
      controller?.destroy();
      canvas.remove();
      status.remove();
      region.remove();
      playhead.remove();
      markerLayer.remove();
    },
  };
}

export async function renderWaveform(canvas, intake) {
  const file = intake.file || new File([intake.bytes || new Uint8Array()], intake.filename || 'audio');
  return drawWaveform(canvas, file);
}
