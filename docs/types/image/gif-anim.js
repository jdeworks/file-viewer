// Animated GIF player UI. The image editor's static path only ever paints a GIF's
// first frame; this mounts a real player — play/pause, a frame scrubber, a "frame
// N/total" counter, loop, and an opt-in "✂ Split frames" button — over a canvas
// driven by each frame's own delay. The heavy decoder (gif-decode.js + the vendored
// gifuct bundle) is lazy-imported only when a GIF actually animates or is split, so
// the editor's first paint pays nothing.
//
// mountGifPlayer({ host, bytes, openBlob }) -> { destroy() }
//   host     — element to render the player into (its content is replaced).
//   bytes    — the GIF's Uint8Array.
//   openBlob — optional (blob, name, {mime}) => Promise; the host wires this to
//              window.__fv.openBlobFile so a split frame opens as its own image.

import { decodeGifFrames, frameToPngBlob } from './gif-decode.js';
import { openGifOcrPanel } from './ocr-ui.js';

export function mountGifPlayer({ host, bytes, openBlob }) {
  host.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'gifv-root';
  root.innerHTML = `
    <div class="gifv-stage"><canvas class="gifv-canvas"></canvas></div>
    <div class="gifv-bar">
      <button class="gifv-play" title="Play / pause" disabled>❚❚</button>
      <input class="gifv-scrub" type="range" min="0" max="0" value="0" step="1" disabled />
      <span class="gifv-count">…</span>
      <label class="gifv-loop"><input class="gifv-loop-chk" type="checkbox" checked /> loop</label>
      <button class="gifv-split" title="Decompose into individual PNG frames" disabled>✂ Split frames</button>
      <button class="gifv-ocr" title="Extract text from every frame into a timestamped transcript" disabled>Extract text (OCR)</button>
    </div>
    <div class="gifv-frames" hidden></div>`;
  host.appendChild(root);
  injectStyle();

  const canvas = root.querySelector('.gifv-canvas');
  const cx = canvas.getContext('2d');
  const playBtn = root.querySelector('.gifv-play');
  const scrub = root.querySelector('.gifv-scrub');
  const count = root.querySelector('.gifv-count');
  const loopChk = root.querySelector('.gifv-loop-chk');
  const splitBtn = root.querySelector('.gifv-split');
  const ocrBtn = root.querySelector('.gifv-ocr');
  const framesBox = root.querySelector('.gifv-frames');

  let frames = [];          // [{ canvas, delayMs }]
  let idx = 0;              // current frame index
  let playing = true;       // autoplay once decoded
  let timer = null;         // setTimeout handle for the next frame
  let destroyed = false;

  // Paint frame `i` to the on-screen canvas and sync the scrubber/counter.
  function show(i) {
    if (!frames.length) return;
    idx = ((i % frames.length) + frames.length) % frames.length;
    cx.clearRect(0, 0, canvas.width, canvas.height);
    cx.drawImage(frames[idx].canvas, 0, 0);
    scrub.value = String(idx);
    count.textContent = `${idx + 1}/${frames.length}`;
  }

  // Advance to the next frame after the current frame's delay. Stops at the end
  // unless loop is on; a single-frame GIF never schedules.
  function tick() {
    if (destroyed || !playing || frames.length < 2) return;
    timer = setTimeout(() => {
      const next = idx + 1;
      if (next >= frames.length && !loopChk.checked) { setPlaying(false); return; }
      show(next);
      tick();
    }, Math.max(20, frames[idx].delayMs));   // clamp absurdly-fast GIFs to a visible floor
  }

  function setPlaying(on) {
    playing = on && frames.length > 1;
    playBtn.textContent = playing ? '❚❚' : '▶';
    clearTimeout(timer);
    if (playing) tick();
  }

  playBtn.addEventListener('click', () => setPlaying(!playing));
  scrub.addEventListener('input', () => { setPlaying(false); show(Number(scrub.value)); });
  loopChk.addEventListener('change', () => { if (loopChk.checked && !playing) setPlaying(true); });
  splitBtn.addEventListener('click', () => splitFrames());
  // OCR each decoded frame into a timestamped transcript (heavy engine lazy-loads on click, behind a consent gate).
  ocrBtn.addEventListener('click', () => openGifOcrPanel({ host: root, getFrames: () => frames }));

  // ── Decode + start ──────────────────────────────────────────────────────────
  (async () => {
    let decoded;
    try {
      decoded = await decodeGifFrames(bytes);
    } catch (e) {
      if (destroyed) return;
      count.textContent = 'decode failed';
      return;
    }
    if (destroyed) return;
    frames = decoded.frames;
    canvas.width = decoded.width;
    canvas.height = decoded.height;
    scrub.max = String(Math.max(0, frames.length - 1));
    show(0);
    // Buttons make sense only for real animations; a single frame is just a still.
    const animated = frames.length > 1;
    playBtn.disabled = !animated;
    scrub.disabled = !animated;
    splitBtn.disabled = frames.length < 1;
    ocrBtn.disabled = frames.length < 1;
    if (animated) setPlaying(true);
    else { playBtn.textContent = '▶'; count.textContent = `1/1`; }
  })();

  // ── Split: each frame → a PNG blob, listed with Download + Open-as-image ──────
  let splitting = false;
  async function splitFrames() {
    if (splitting || !frames.length) return;
    splitting = true;
    splitBtn.disabled = true;
    framesBox.hidden = false;
    framesBox.innerHTML = '<span class="gifv-frames-h">Frames</span>';
    for (let i = 0; i < frames.length; i++) {
      const blob = await frameToPngBlob(frames[i].canvas);
      if (destroyed) return;
      framesBox.appendChild(buildFrameRow(i, blob));
    }
    splitting = false;
    splitBtn.disabled = false;
  }

  // One frame row: a thumbnail + Download (object-URL anchor) + Open (re-enters the
  // viewer as a standalone PNG so the frame can be edited on its own).
  function buildFrameRow(i, blob) {
    const name = `frame-${String(i + 1).padStart(3, '0')}.png`;
    const url = URL.createObjectURL(blob);
    const row = document.createElement('div');
    row.className = 'gifv-frame';
    const thumb = document.createElement('img');
    thumb.className = 'gifv-thumb';
    thumb.src = url;
    thumb.alt = name;
    const label = document.createElement('span');
    label.className = 'gifv-frame-n';
    label.textContent = name;
    const dl = document.createElement('a');
    dl.className = 'gifv-dl';
    dl.href = url;
    dl.download = name;
    dl.textContent = '⬇ Download';
    const open = document.createElement('button');
    open.className = 'gifv-open';
    open.textContent = '↗ Open';
    open.disabled = typeof openBlob !== 'function';
    open.addEventListener('click', () => openBlob(blob, name, { mime: 'image/png' }));
    row.append(thumb, label, dl, open);
    objectUrls.push(url);
    return row;
  }

  const objectUrls = [];
  return {
    destroy() {
      destroyed = true;
      clearTimeout(timer);
      objectUrls.forEach((u) => URL.revokeObjectURL(u));
      root.remove();
    },
  };
}

// One-time scoped stylesheet (keeps the player self-contained — no edit to the
// shared image CSS, which another lane owns). Idempotent via a marker id.
function injectStyle() {
  if (document.getElementById('gifv-style')) return;
  const s = document.createElement('style');
  s.id = 'gifv-style';
  s.textContent = `
    .gifv-root { position:relative; display:flex; flex-direction:column; gap:.5rem; height:100%; min-height:0; }
    .gifv-stage { flex:1; min-height:0; display:flex; align-items:center; justify-content:center; overflow:auto; background:#0000000d; }
    .gifv-canvas { max-width:100%; max-height:100%; image-rendering:auto; }
    .gifv-bar { display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; padding:.25rem .25rem; }
    .gifv-bar button { cursor:pointer; }
    .gifv-bar button:disabled { cursor:default; opacity:.5; }
    .gifv-scrub { flex:1; min-width:120px; }
    .gifv-count { font-variant-numeric:tabular-nums; min-width:3.5em; text-align:center; }
    .gifv-loop { display:inline-flex; align-items:center; gap:.25rem; font-size:.85em; }
    .gifv-frames { display:flex; flex-direction:column; gap:.25rem; max-height:30%; overflow:auto; padding:.25rem; }
    .gifv-frames-h { font-weight:600; font-size:.85em; opacity:.8; }
    .gifv-frame { display:flex; align-items:center; gap:.5rem; }
    .gifv-thumb { width:40px; height:40px; object-fit:contain; background:#0000000d; border:1px solid #8884; }
    .gifv-frame-n { flex:1; font-size:.8em; font-variant-numeric:tabular-nums; }
    .gifv-dl, .gifv-open { font-size:.8em; cursor:pointer; }`;
  document.head.appendChild(s);
}
