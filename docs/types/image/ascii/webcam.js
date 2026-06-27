// Live webcam → ASCII, the third consumer of the shared engine. Renders to a
// <canvas> (not <pre>) so we never build thousands of DOM nodes per frame. With
// requestVideoFrameCallback, preview FPS follows the camera's delivered frames;
// the RAF fallback is throttled to the target FPS.
//
// Mirrors image mode: it inherits the studio's current settings, exposes the
// SAME full control panel (as a top overlay behind a ⚙ button), shows the
// original feed on demand (eye toggle), and its export/reset buttons act on the
// current frame. Adds pause + fullscreen.

import { createAsciiEngine } from './engine.js';
import { buildControls } from './studio-controls.js';
import { PERFORMANCE_PRESETS, defaultOptions } from './state.js';
import { downloadText, downloadHtml, downloadPng, copyText, copyHtml } from './render.js';
import { makeFloatingPanel } from './floating-panel.js';
import { loadLast, saveLast } from './presets.js';
import { wirePresetUi } from './preset-ui.js';

const now = () => (typeof performance !== 'undefined' ? performance.now() : 0);
const BTN = (cls, label, title) => `<button class="asx-btn ${cls}" title="${title}">${label}</button>`;
const EYE = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>';

export function mountAsciiWebcam(host, opts = {}) {
  // Inherit image-mode settings (or last-used when opened standalone); webcam prefers the
  // fast sampler by default.
  const startOpts = { ...(loadLast() || {}), ...(opts.initialOptions || {}), samplingMethod: 'downscale' };
  host.innerHTML = `
    <div class="asx-cam">
      <div class="asx-bar">
        ${BTN('cam-start cam-flash', '▶ Start camera', 'Start the webcam')}
        ${BTN('cam-pause', '⏸ Pause', 'Freeze the current frame')}
        ${BTN('cam-rec', '● Record', 'Record the ASCII output to a video (max 2 min)')}
        ${BTN('cam-rec-dl', '↓ Video', 'Download the last recorded ASCII video')}
        ${BTN('cam-rec-studio', 'Studio', 'Open the last recorded ASCII video in the media studio')}
        <label class="cam-rec-fps-lbl" title="Frame rate for recorded ASCII video">Rec FPS <select class="cam-rec-fps">
          <option value="15">15</option><option value="20">20</option><option value="30" selected>30</option><option value="60">60</option>
        </select></label>
        <label class="cam-audio-lbl" title="Include microphone audio in the recording"><input type="checkbox" class="cam-audio"> Audio</label>
        ${BTN('cam-full', '⛶ Fullscreen', 'Fullscreen the ASCII result')}
        ${BTN('cam-rot-l', '↺', 'Rotate 90° left')}
        ${BTN('cam-rot-r', '↻', 'Rotate 90° right')}
        ${BTN('cam-flip-h', '↔', 'Flip horizontal')}
        ${BTN('cam-flip-v', '↕', 'Flip vertical')}
        ${BTN('cam-gear', '⚙ Settings', 'Show all settings')}
        <select class="asx-perf cam-perf" title="Performance preset"><option value="">Preset…</option>
          <option value="fast">Fast</option><option value="balanced">Balanced</option><option value="quality">Quality</option></select>
        <select class="asx-preset cam-preset" title="Load a saved settings preset"><option value="">Preset…</option></select>
        ${BTN('cam-preset-save', '💾', 'Save current settings as a preset')}
        ${BTN('cam-preset-del', '🗑', 'Delete the selected preset')}
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
  const stage = q('.asx-cam-stage');
  const stats = q('.cam-stats');
  const peek = q('.cam-orig-peek');
  const peekCanvas = peek.querySelector('canvas');
  const settings = q('.cam-settings');
  const recDownload = q('.cam-rec-dl');
  const recStudio = q('.cam-rec-studio');
  recDownload.hidden = true;
  recDownload.disabled = true;
  recStudio.hidden = true;
  recStudio.disabled = true;

  const engine = createAsciiEngine(startOpts);
  let stream = null, running = false, paused = false, eyeOn = false;
  let last = 0, frames = 0, fpsClock = now();
  const targetFps = opts.targetFps || 30;
  const minInterval = 1000 / targetFps;
  q('.cam-rec-fps').value = String(opts.recordFps || targetFps);

  // Fit the ASCII canvas to the available stage (contain), then apply zoom — so
  // the feed always fills the space and the column count changes DETAIL, not the
  // on-screen size (mirrors the image studio's fit-to-width behaviour).
  function applyFit() {
    // In fullscreen the :fullscreen CSS rule owns sizing — leave inline size clear.
    if (document.fullscreenElement === out) { out.style.width = ''; out.style.height = ''; return; }
    const cw = out.width, ch = out.height;
    const aw = stage.clientWidth - 24, ah = stage.clientHeight - 24;
    if (!cw || !ch || aw <= 0 || ah <= 0) return;
    const z = engine.options.zoom || 1;
    const scale = Math.min(aw / cw, ah / ch) * z;
    out.style.width = Math.max(1, Math.round(cw * scale)) + 'px';
    out.style.height = Math.max(1, Math.round(ch * scale)) + 'px';
    // When the glyph canvas is bigger than its display box (high column counts),
    // nearest-neighbour downscaling drops whole glyph rows → black lines. Smooth
    // when shrinking; keep crisp pixels only when scaling up.
    out.style.imageRendering = scale < 1 ? 'auto' : 'pixelated';
  }

  function renderOnce() {
    engine.update();
    engine.renderToCanvas(out);
    applyFit();
    if (eyeOn) paintOrig();
  }
  // Re-draw the source then reconvert after a transform (rotate/flip). Works
  // whether the loop is running or paused. Drives the WEBCAM's own engine.
  function transform(mutate) {
    mutate();
    if (engine.grabFrame()) { engine.markDirty('processedImage'); renderOnce(); }
  }
  function paintOrig() {
    const src = engine.sourceCanvas;
    if (!src.width) return;
    const maxW = 260, scale = Math.min(1, maxW / src.width);
    peekCanvas.width = Math.round(src.width * scale);
    peekCanvas.height = Math.round(src.height * scale);
    peekCanvas.getContext('2d').drawImage(src, 0, 0, peekCanvas.width, peekCanvas.height);
  }

  let lastCW = 0, lastCH = 0, inFlight = false;
  // Convert off the main thread (engine worker) and draw the returned bitmap. The
  // in-flight guard drops frames rather than queueing when the worker can't keep up.
  async function renderFrame() {
    if (inFlight) return;
    inFlight = true;
    const t0 = now();
    engine.grabFrame();
    try {
      const drawable = await engine.convertFrame('bitmap');
      if (!running || !drawable) return;
      if (out.width !== drawable.width || out.height !== drawable.height) { out.width = drawable.width; out.height = drawable.height; }
      out.getContext('2d').drawImage(drawable, 0, 0);
      drawable.close?.();
      if (out.width !== lastCW || out.height !== lastCH) { lastCW = out.width; lastCH = out.height; applyFit(); }
      if (eyeOn) paintOrig();
      const ms = now() - t0;
      frames++;
      const elapsed = now() - fpsClock;
      if (elapsed >= 500) {
        stats.textContent = `${Math.round(frames * 1000 / elapsed)} fps · ${ms.toFixed(1)} ms · ${out.width}×${out.height}`;
        frames = 0; fpsClock = now();
      }
    } finally { inFlight = false; }
  }
  function loopRVFC() { if (!running) return; if (!paused) renderFrame(); video.requestVideoFrameCallback(loopRVFC); }
  function loopRAF(ts) { if (!running) return; if (!paused && ts - last >= minInterval) { last = ts; renderFrame(); } requestAnimationFrame(loopRAF); }
  function cameraConstraints() {
    return {
      facingMode: opts.facingMode || 'user',
      frameRate: { ideal: targetFps },
    };
  }

  async function start() {
    if (running) return;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: cameraConstraints(), audio: false });
    } catch (e) { stats.textContent = 'Camera access denied: ' + (e.message || e); return; }
    video.srcObject = stream;
    await video.play();
    engine.setSource(video);
    running = true; paused = false;
    const sb = q('.cam-start'); sb.textContent = '⏹ Stop'; sb.classList.remove('cam-flash');
    if (video.requestVideoFrameCallback) loopRVFC(); else requestAnimationFrame(loopRAF);
  }
  function stop() {
    running = false; paused = false;
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
    video.srcObject = null;
    q('.cam-start').textContent = '▶ Start camera';
    q('.cam-pause').textContent = '⏸ Pause';
  }

  // ── controls (full panel, shown on demand) ──
  const floatingSettings = makeFloatingPanel(settings, { title: 'Camera ASCII settings' });
  let saveTimer = 0;
  const rememberSoon = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => saveLast({ ...engine.options }), 400); };
  const controls = buildControls(floatingSettings.body, engine.options, (key, value, dirty, displayOnly) => {
    engine.options[key] = value;
    if (key === 'transparentBackground' && controls?.inputs.backgroundColor) controls.inputs.backgroundColor.disabled = !!value;
    rememberSoon();
    if (displayOnly) { if (key === 'zoom') applyFit(); else if (!running || paused) renderOnce(); return; }
    engine.markDirty(...dirty);
    if (!running || paused) renderOnce();
  });
  controls.inputs.backgroundColor.disabled = !!engine.options.transparentBackground;
  // Named user presets (shared wiring with the studio).
  wirePresetUi({ sel: q('.cam-preset'), saveBtn: q('.cam-preset-save'), delBtn: q('.cam-preset-del'), controls, getOptions: () => ({ ...engine.options }) });
  // Keep the feed fitted to the stage as it resizes (responsive / fullscreen).
  const ro = new ResizeObserver(() => applyFit());
  ro.observe(stage);

  // ── recording (ASCII canvas → .webm, for the video studio) ──
  // Capped at 2 min to bound memory (MediaRecorder buffers encoded chunks ~2.5
  // Mbit/s ≈ ~37 MB for the full cap). Records what the user sees; optional mic
  // tracks are merged onto the canvas video stream.
  const MAX_REC_MS = 120000;
  let recorder = null, recChunks = [], recStream = null, audioStream = null, recTimer = null, recStart = 0;
  let lastRecording = null, lastRecordingMime = '';
  const fmt = (ms) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  function dl(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
  function recordFps() {
    const fps = Number(q('.cam-rec-fps').value);
    return [15, 20, 30, 60].includes(fps) ? fps : targetFps;
  }
  function setLastRecording(blob) {
    lastRecording = blob;
    lastRecordingMime = blob?.type || '';
    recDownload.hidden = !blob;
    recDownload.disabled = !blob;
    recStudio.hidden = !(blob && opts.onRecorded);
    recStudio.disabled = !(blob && opts.onRecorded);
  }
  async function startRec() {
    const wantAudio = !!q('.cam-audio').checked;
    if (!out.captureStream) { stats.textContent = 'Recording is not supported by this browser.'; return; }
    setLastRecording(null);
    try {
      recStream = out.captureStream(recordFps());
      if (wantAudio) {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        audioStream.getAudioTracks().forEach((track) => recStream.addTrack(track));
      }
    } catch (e) {
      stats.textContent = 'Recording denied: ' + (e.message || e);
      recStream?.getTracks().forEach((t) => t.stop());
      recStream = null; audioStream = null;
      return;
    }
    const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
      .find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || 'video/webm';
    recChunks = [];
    recorder = new MediaRecorder(recStream, { mimeType: mime });
    recorder.ondataavailable = (e) => { if (e.data && e.data.size) recChunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(recChunks, { type: mime }); recChunks = [];
      setLastRecording(blob);
      if (recStream) { recStream.getTracks().forEach((t) => t.stop()); recStream = null; }
      if (audioStream) { audioStream.getTracks().forEach((t) => t.stop()); audioStream = null; }
      clearInterval(recTimer); recTimer = null;
      const rb = q('.cam-rec'); rb.classList.remove('active'); rb.textContent = '● Record';
      // In the app, keep the user in webcam mode so they can download first, then
      // choose Studio. Standalone mode has no studio bridge, so auto-download.
      if (!opts.onRecorded) dl(blob, 'webcam-recording.webm');
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
  recDownload.addEventListener('click', () => lastRecording && dl(lastRecording, 'webcam-recording.webm'));
  recStudio.addEventListener('click', () => lastRecording && opts.onRecorded?.(lastRecording, lastRecordingMime || lastRecording.type || 'video/webm'));
  q('.cam-start').addEventListener('click', () => (running ? stop() : start()));
  q('.cam-pause').addEventListener('click', () => {
    if (!running) return;
    paused = !paused;
    q('.cam-pause').textContent = paused ? '▶ Resume' : '⏸ Pause';
  });
  q('.cam-full').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen(); else out.requestFullscreen?.();
  });
  out.addEventListener('fullscreenchange', applyFit);
  document.addEventListener('fullscreenchange', applyFit);
  // Geometric transforms drive the WEBCAM's own engine (these were previously only
  // wired to the image-studio engine, so they appeared to do nothing on camera).
  q('.cam-rot-l').addEventListener('click', () => transform(() => { engine.options.rotate = ((engine.options.rotate || 0) + 270) % 360; }));
  q('.cam-rot-r').addEventListener('click', () => transform(() => { engine.options.rotate = ((engine.options.rotate || 0) + 90) % 360; }));
  q('.cam-flip-h').addEventListener('click', () => transform(() => { engine.options.flipH = !engine.options.flipH; }));
  q('.cam-flip-v').addEventListener('click', () => transform(() => { engine.options.flipV = !engine.options.flipV; }));
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
    Object.keys(engine.options).forEach((k) => {
      // rotate/flip aren't in the control panel (toolbar buttons) — reset directly.
      if (k === 'rotate' || k === 'flipH' || k === 'flipV') engine.options[k] = defs[k];
      else if (k in defs) controls.setValue(k, defs[k]);
    });
    if (engine.grabFrame()) { engine.markDirty('processedImage'); renderOnce(); }
  });

  return { engine, start, stop, isRunning: () => running,
    destroy() { stopRec(); stop(); ro.disconnect(); floatingSettings.destroy(); document.removeEventListener('fullscreenchange', applyFit); host.innerHTML = ''; } };
}
