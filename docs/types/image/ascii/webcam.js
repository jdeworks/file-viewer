// Live webcam → ASCII, the third consumer of the shared engine. Renders to a
// <canvas> (not <pre>) so we never build thousands of DOM nodes per frame, and
// throttles to a target FPS via requestVideoFrameCallback when available.
//
// Mirrors image mode: it inherits the studio's current settings, exposes the
// SAME full control panel (as a top overlay behind a ⚙ button), shows the
// original feed on demand (eye toggle), and its export/reset buttons act on the
// current frame. Adds pause + fullscreen.

import { createAsciiEngine } from './engine.js';
import { buildControls } from './studio-controls.js';
import { PERFORMANCE_PRESETS, defaultOptions } from './state.js';
import { downloadText, downloadHtml, downloadPng, copyText, copyHtml } from './render.js';

const now = () => (typeof performance !== 'undefined' ? performance.now() : 0);
const BTN = (cls, label, title) => `<button class="asx-btn ${cls}" title="${title}">${label}</button>`;
const EYE = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>';

export function mountAsciiWebcam(host, opts = {}) {
  // Inherit image-mode settings; webcam prefers the fast sampler by default.
  const startOpts = { ...(opts.initialOptions || {}), samplingMethod: 'downscale' };
  host.innerHTML = `
    <div class="asx-cam">
      <div class="asx-bar">
        ${BTN('cam-start', 'Start camera', 'Start the webcam')}
        ${BTN('cam-pause', '⏸ Pause', 'Freeze the current frame')}
        ${BTN('cam-rec', '● Record', 'Record the raw webcam to a video (max 2 min)')}
        <label class="cam-audio-lbl" title="Include microphone audio in the recording"><input type="checkbox" class="cam-audio"> Audio</label>
        ${BTN('cam-full', '⛶ Fullscreen', 'Fullscreen the ASCII result')}
        ${BTN('cam-gear', '⚙ Settings', 'Show all settings')}
        <select class="asx-perf cam-perf" title="Performance preset"><option value="">Preset…</option>
          <option value="fast">Fast</option><option value="balanced">Balanced</option><option value="quality">Quality</option></select>
        ${BTN('cam-copy', 'Copy', 'Copy current frame as text')}
        ${BTN('cam-txt', '↓ TXT', 'Download current frame .txt')}
        ${BTN('cam-html', '↓ HTML', 'Download current frame .html')}
        ${BTN('cam-png', '↓ PNG', 'Download current frame .png')}
        ${BTN('cam-reset', 'Reset', 'Reset all settings')}
        <span class="cam-stats"></span>
      </div>
      <div class="asx-cam-stage">
        <video class="cam-video" playsinline muted style="display:none"></video>
        <canvas class="cam-out"></canvas>
        <button class="cam-eye" title="Show original feed">${EYE}</button>
        <figure class="cam-orig-peek" hidden><figcaption>Original</figcaption><canvas></canvas></figure>
        <div class="cam-settings" hidden></div>
      </div>
    </div>`;
  const q = (s) => host.querySelector(s);
  const video = q('.cam-video');
  const out = q('.cam-out');
  const stats = q('.cam-stats');
  const peek = q('.cam-orig-peek');
  const peekCanvas = peek.querySelector('canvas');
  const settings = q('.cam-settings');

  const engine = createAsciiEngine(startOpts);
  let stream = null, running = false, paused = false, eyeOn = false;
  let last = 0, frames = 0, fpsClock = now();
  const targetFps = opts.targetFps || 20;
  const minInterval = 1000 / targetFps;

  function applyZoom() {
    const z = engine.options.zoom || 1;
    out.style.transform = z !== 1 ? `scale(${z})` : '';
    out.style.transformOrigin = 'top left';
  }

  function renderOnce() {
    engine.update();
    engine.renderToCanvas(out);
    if (eyeOn) paintOrig();
  }
  function paintOrig() {
    const src = engine.sourceCanvas;
    if (!src.width) return;
    const maxW = 260, scale = Math.min(1, maxW / src.width);
    peekCanvas.width = Math.round(src.width * scale);
    peekCanvas.height = Math.round(src.height * scale);
    peekCanvas.getContext('2d').drawImage(src, 0, 0, peekCanvas.width, peekCanvas.height);
  }

  function renderFrame() {
    const t0 = now();
    engine.grabFrame();
    engine.update();
    engine.renderToCanvas(out);
    if (eyeOn) paintOrig();
    const ms = now() - t0;
    frames++;
    const elapsed = now() - fpsClock;
    if (elapsed >= 500) {
      stats.textContent = `${Math.round(frames * 1000 / elapsed)} fps · ${ms.toFixed(1)} ms · ${engine.result?.columns || 0}×${engine.result?.rows || 0}`;
      frames = 0; fpsClock = now();
    }
  }
  function loopRVFC() { if (!running) return; if (!paused) renderFrame(); video.requestVideoFrameCallback(loopRVFC); }
  function loopRAF(ts) { if (!running) return; if (!paused && ts - last >= minInterval) { last = ts; renderFrame(); } requestAnimationFrame(loopRAF); }

  async function start() {
    if (running) return;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: opts.facingMode || 'user' }, audio: false });
    } catch (e) { stats.textContent = 'Camera access denied: ' + (e.message || e); return; }
    video.srcObject = stream;
    await video.play();
    engine.setSource(video);
    running = true; paused = false;
    q('.cam-start').textContent = '⏹ Stop';
    if (video.requestVideoFrameCallback) loopRVFC(); else requestAnimationFrame(loopRAF);
  }
  function stop() {
    running = false; paused = false;
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
    video.srcObject = null;
    q('.cam-start').textContent = 'Start camera';
    q('.cam-pause').textContent = '⏸ Pause';
  }

  // ── controls (full panel, shown on demand) ──
  const controls = buildControls(settings, engine.options, (key, value, dirty, displayOnly) => {
    engine.options[key] = value;
    if (key === 'transparentBackground' && controls?.inputs.backgroundColor) controls.inputs.backgroundColor.disabled = !!value;
    if (displayOnly) { if (key === 'zoom') applyZoom(); else if (!running || paused) renderOnce(); return; }
    engine.markDirty(...dirty);
    if (!running || paused) renderOnce();
  });
  controls.inputs.backgroundColor.disabled = !!engine.options.transparentBackground;
  applyZoom();

  // ── recording (raw webcam → .webm, for the video studio) ──
  // Capped at 2 min to bound memory (MediaRecorder buffers encoded chunks ~2.5
  // Mbit/s ≈ ~37 MB for the full cap). Records a DEDICATED stream so audio can be
  // included independently of the (video-only) preview feed.
  const MAX_REC_MS = 120000;
  let recorder = null, recChunks = [], recStream = null, recTimer = null, recStart = 0;
  const fmt = (ms) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  function dl(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
  async function startRec() {
    const wantAudio = !!q('.cam-audio').checked;
    try { recStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: wantAudio }); }
    catch (e) { stats.textContent = 'Recording denied: ' + (e.message || e); return; }
    const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
      .find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || 'video/webm';
    recChunks = [];
    recorder = new MediaRecorder(recStream, { mimeType: mime });
    recorder.ondataavailable = (e) => { if (e.data && e.data.size) recChunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(recChunks, { type: mime }); recChunks = [];
      if (recStream) { recStream.getTracks().forEach((t) => t.stop()); recStream = null; }
      clearInterval(recTimer); recTimer = null;
      const rb = q('.cam-rec'); rb.classList.remove('active'); rb.textContent = '● Record';
      // If the host wired a handler (file viewer → open in the media/video studio),
      // let it take the blob. Otherwise (standalone page) fall back to a download.
      if (opts.onRecorded) opts.onRecorded(blob, mime);
      else dl(blob, 'webcam-recording.webm');
    };
    recorder.start(1000);
    recStart = now();
    const rb = q('.cam-rec'); rb.classList.add('active');
    recTimer = setInterval(() => {
      const el = now() - recStart;
      if (el >= MAX_REC_MS) { stopRec(); return; }
      rb.textContent = '■ ' + fmt(el) + ' / 2:00';
    }, 250);
  }
  function stopRec() { if (recorder && recorder.state !== 'inactive') recorder.stop(); }

  // ── wiring ──
  q('.cam-rec').addEventListener('click', () => (recorder && recorder.state !== 'inactive' ? stopRec() : startRec()));
  q('.cam-start').addEventListener('click', () => (running ? stop() : start()));
  q('.cam-pause').addEventListener('click', () => {
    if (!running) return;
    paused = !paused;
    q('.cam-pause').textContent = paused ? '▶ Resume' : '⏸ Pause';
  });
  q('.cam-full').addEventListener('click', () => {
    const el = out;
    if (document.fullscreenElement) document.exitFullscreen(); else el.requestFullscreen?.();
  });
  q('.cam-gear').addEventListener('click', () => {
    settings.hidden = !settings.hidden;
    q('.cam-gear').classList.toggle('active', !settings.hidden);
  });
  q('.cam-eye').addEventListener('click', () => {
    eyeOn = !eyeOn;
    q('.cam-eye').classList.toggle('active', eyeOn);
    peek.hidden = !eyeOn;
    if (eyeOn) paintOrig();
  });
  q('.cam-perf').addEventListener('change', (e) => {
    const preset = PERFORMANCE_PRESETS[e.target.value]; if (!preset) return;
    Object.entries(preset).forEach(([k, v]) => controls.setValue(k, v));
  });
  // Exports act on the CURRENT frame (engine.result).
  q('.cam-copy').addEventListener('click', () => engine.result && copyText(engine.result.text));
  q('.cam-txt').addEventListener('click', () => engine.result && downloadText('webcam-ascii.txt', engine.result.text));
  q('.cam-html').addEventListener('click', () => engine.result && downloadHtml('webcam-ascii.html', engine.result, engine.options));
  q('.cam-png').addEventListener('click', () => {
    if (!engine.result) return;
    const c = document.createElement('canvas'); engine.renderToCanvas(c); downloadPng('webcam-ascii.png', c);
  });
  q('.cam-reset').addEventListener('click', () => {
    const defs = defaultOptions();
    Object.keys(engine.options).forEach((k) => { if (k in defs) controls.setValue(k, defs[k]); });
  });

  return { engine, start, stop, destroy() { stopRec(); stop(); host.innerHTML = ''; } };
}
