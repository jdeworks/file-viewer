// Animated GIF player UI. The image editor's static path only ever paints a GIF's
// first frame; this mounts a real player — play/pause, a frame scrubber, a "frame
// N/total" counter, loop, and an opt-in "✂ Split frames" button — over a canvas
// driven by each frame's own delay. The heavy decoder (gif-decode.js + the vendored
// gifuct bundle) is lazy-imported only when a GIF actually animates or is split, so
// the editor's first paint pays nothing.
//
// mountGifPlayer({ host, bytes, name, openBlob }) -> { destroy() }
//   host     — element to render the player into (its content is replaced).
//   bytes    — the GIF's Uint8Array.
//   name     — the GIF's filename (used as the sidebar frames-folder label).
//   openBlob — optional (blob, name, {mime}) => Promise; the host wires this to
//              window.__fv.openBlobFile so a split frame opens as its own image.

import { decodeGifFrames, frameToPngBlob } from './gif-decode.js';
import { openGifOcrPanel } from './ocr-ui.js';
import { loadGlobal, vendor } from '../../core/script-loader.js';
import { intakeFromFile } from '../../core/intake.js';

export function mountGifPlayer({ host, bytes, name, openBlob }) {
  const baseName = (name || 'animation.gif').replace(/\.[^.]+$/, '');
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
      <button class="gifv-dl-gif" title="Download this GIF">⬇ Download</button>
      <button class="gifv-split" title="Show the frames as a folder in the sidebar" disabled>✂ Split frames</button>
      <button class="gifv-dl-all" title="Download all frames as a ZIP" disabled>⬇ Download all</button>
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
  const dlAllBtn = root.querySelector('.gifv-dl-all');
  const ocrBtn = root.querySelector('.gifv-ocr');
  const framesBox = root.querySelector('.gifv-frames');
  const frameName = (i) => `frame-${String(i + 1).padStart(3, '0')}.png`;

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
  // Plain download of the GIF itself (the player bar otherwise only had Split / Download-all).
  root.querySelector('.gifv-dl-gif').addEventListener('click', () => {
    const blob = new Blob([bytes], { type: 'image/gif' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name || `${baseName}.gif`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  splitBtn.addEventListener('click', () => splitFrames());
  dlAllBtn.addEventListener('click', () => downloadAll());
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
    dlAllBtn.disabled = frames.length < 1;
    ocrBtn.disabled = frames.length < 1;
    if (animated) setPlaying(true);
    else { playBtn.textContent = '▶'; count.textContent = `1/1`; }
  })();

  // PNG blobs are encoded once (on first Split / Download-all) and reused for the sidebar
  // entry SIZES, opening a frame, and the zip — so frames aren't re-encoded repeatedly.
  let frameBlobs = null;
  async function ensureFrameBlobs(onProgress) {
    if (frameBlobs) return frameBlobs;
    const out = [];
    for (let i = 0; i < frames.length; i++) {
      if (destroyed) return out;
      out.push(await frameToPngBlob(frames[i].canvas));
      onProgress?.(i + 1, frames.length);
    }
    frameBlobs = out;
    return frameBlobs;
  }

  // ── Split: expand the GIF's OWN sidebar item into a folder — the frames appear nested
  // underneath the existing gif entry (no new sidebar root), each a persistent, selectable
  // entry with a real size (click → opens that frame as its own image). Reuses the app's
  // expandFileRootToFolder; falls back to the inline thumbnail list when that hook isn't
  // available or the gif isn't a standalone sidebar item (e.g. opened from inside a folder).
  let splitting = false;
  async function splitFrames() {
    if (splitting || !frames.length) return;
    const expand = window.__fv?.expandFileRootToFolder;
    if (typeof expand !== 'function') { return splitFramesInline(); }
    splitting = true; splitBtn.disabled = true;
    const orig = splitBtn.textContent;
    try {
      const blobs = await ensureFrameBlobs((d, t) => { splitBtn.textContent = `✂ Encoding ${d}/${t}…`; });
      if (destroyed) return;
      const getIntake = async (innerPath) => {
        const i = frames.findIndex((_, n) => frameName(n) === innerPath);
        if (i < 0) return null;
        const blob = blobs[i] || await frameToPngBlob(frames[i].canvas);
        return intakeFromFile(new File([blob], frameName(i), { type: 'image/png' }));
      };
      const ok = expand({ entries: frames.map((_, i) => ({ name: frameName(i), size: blobs[i].size })), getIntake });
      if (!ok) splitFramesInline();   // the gif isn't a standalone sidebar item — fall back
    } finally { splitting = false; splitBtn.disabled = false; splitBtn.textContent = orig; }
  }

  // Download every frame as a single ZIP (lazy JSZip; reuses the encoded blobs).
  async function downloadAll() {
    if (!frames.length) return;
    dlAllBtn.disabled = true;
    const prev = dlAllBtn.textContent; dlAllBtn.textContent = '⏳ Zipping…';
    try {
      const [JSZip, blobs] = await Promise.all([loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip'), ensureFrameBlobs()]);
      if (destroyed) return;
      const zip = new JSZip();
      blobs.forEach((b, i) => zip.file(frameName(i), b));
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${baseName}-frames.zip`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally { dlAllBtn.disabled = false; dlAllBtn.textContent = prev; }
  }

  // Fallback: the old inline thumbnail list (Download + Open per row) when there's no sidebar.
  async function splitFramesInline() {
    splitting = true; splitBtn.disabled = true;
    framesBox.hidden = false;
    framesBox.innerHTML = '<span class="gifv-frames-h">Frames</span>';
    for (let i = 0; i < frames.length; i++) {
      const blob = await frameToPngBlob(frames[i].canvas);
      if (destroyed) return;
      const url = URL.createObjectURL(blob);
      const row = document.createElement('div'); row.className = 'gifv-frame';
      const thumb = document.createElement('img'); thumb.className = 'gifv-thumb'; thumb.src = url; thumb.alt = frameName(i);
      const label = document.createElement('span'); label.className = 'gifv-frame-n'; label.textContent = frameName(i);
      const dl = document.createElement('a'); dl.className = 'gifv-dl'; dl.href = url; dl.download = frameName(i); dl.textContent = '⬇ Download';
      const open = document.createElement('button'); open.className = 'gifv-open'; open.textContent = '↗ Open';
      open.disabled = typeof openBlob !== 'function';
      open.addEventListener('click', () => openBlob(blob, frameName(i), { mime: 'image/png' }));
      row.append(thumb, label, dl, open);
      objectUrls.push(url);
      framesBox.appendChild(row);
    }
    splitting = false; splitBtn.disabled = false;
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
    .gifv-scrub { flex:1; min-width:64px; }
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
