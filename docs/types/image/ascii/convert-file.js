// "Convert file → ASCII": pick a GIF or video, convert it frame-by-frame to ASCII
// (off the main thread via the engine's worker), show progress + a throttled live
// preview, then download the result in its base format (GIF → GIF, video → WebM) or
// add it back into the studio. Lazy-loaded from studio.js on demand.
import { makeFloatingPanel } from './floating-panel.js';
import { createAsciiEngine } from './engine.js';
import { gifFrames, imageDecoderFrames, videoFrameStream } from './video-frames.js';
import { createGifSink, createWebmSink } from './encode.js';

let cssDone = false;
function injectStyle() {
  if (cssDone) return; cssDone = true;
  const s = document.createElement('style');
  s.id = 'asx-conv-css';
  s.textContent = `
    .asx-conv { position: fixed; z-index: 45; top: 12vh; left: 50%; transform: translateX(-50%);
      width: min(380px, 92vw); max-height: min(86vh, 640px); display: flex; flex-direction: column;
      background: rgba(13,13,13,.98); border: 1px solid #2a2a2a; border-radius: 8px;
      box-shadow: 0 10px 40px #0008; overflow: hidden; }
    .asx-conv-body { display: flex; flex-direction: column; gap: 10px; padding: 12px; }
    .asx-conv-status { margin: 0; font: 12px ui-monospace, monospace; color: #9ab; min-height: 1.2em; }
    .asx-conv-prog { width: 100%; height: 10px; }
    /* Checkerboard so a transparent-bg ASCII preview reads as transparent — matching the output GIF. */
    .asx-conv-preview { width: 100%; max-height: 220px; object-fit: contain; border-radius: 4px; image-rendering: auto;
      background-color: #1a1a1a;
      background-image: linear-gradient(45deg,#333 25%,transparent 25%),linear-gradient(-45deg,#333 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#333 75%),linear-gradient(-45deg,transparent 75%,#333 75%);
      background-size: 16px 16px; background-position: 0 0,0 8px,8px -8px,-8px 0; }
    .asx-conv-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .asx-conv-actions button { cursor: pointer; }
    .asx-conv-url { display: flex; gap: 6px; }
    .asx-conv-url-input { flex: 1; min-width: 0; font: 12px ui-monospace, monospace; padding: 3px 6px;
      background: #000; color: #cde; border: 1px solid #2a2a2a; border-radius: 4px; }
    .asx-conv-url-go { cursor: pointer; }
    .asx-conv-warn { margin: 0; font: 10px ui-monospace, monospace; color: #c97; opacity: .85; }`;
  document.head.appendChild(s);
}

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// openConverter({ host, options, baseName, onAddToStudio(blob,name,mime) })
export function openConverter({ host, options = {}, baseName = 'image', onAddToStudio } = {}) {
  injectStyle();
  host.querySelector('.asx-conv')?.remove();
  const panel = document.createElement('div');
  panel.className = 'asx-conv';
  panel.innerHTML = `
    <div class="asx-conv-body">
      <p class="asx-conv-status">Choose a GIF or video to convert to ASCII.</p>
      <progress class="asx-conv-prog" value="0" max="1" hidden></progress>
      <canvas class="asx-conv-preview" hidden></canvas>
      <div class="asx-conv-actions">
        <button class="asx-conv-pick">Choose file…</button>
        <button class="asx-conv-cancel" hidden>Cancel</button>
        <button class="asx-conv-dl" hidden>⬇ Download</button>
        <button class="asx-conv-studio" hidden>Add to studio</button>
      </div>
      <div class="asx-conv-url">
        <input class="asx-conv-url-input" type="url" placeholder="…or paste a GIF / WebP / video URL">
        <button class="asx-conv-url-go">Load URL</button>
      </div>
      <p class="asx-conv-warn">URL loading fetches from another site (off-origin) and only works if that site permits it.</p>
    </div>
    <input class="asx-conv-input" type="file" accept="image/gif,image/webp,image/apng,video/*" hidden>`;
  host.appendChild(panel);

  const q = (s) => panel.querySelector(s);
  const status = q('.asx-conv-status'), prog = q('.asx-conv-prog'), preview = q('.asx-conv-preview');
  const pick = q('.asx-conv-pick'), cancelBtn = q('.asx-conv-cancel');
  const dlBtn = q('.asx-conv-dl'), studioBtn = q('.asx-conv-studio'), input = q('.asx-conv-input');
  const urlInput = q('.asx-conv-url-input'), urlGo = q('.asx-conv-url-go');
  let aborter = null;
  const float = makeFloatingPanel(panel, { title: 'Convert file → ASCII', onClose: () => { aborter?.abort(); float.destroy(); panel.remove(); } });

  function showPreview(canvas) {
    const max = 240, scale = Math.min(1, max / canvas.width, max / canvas.height);
    preview.width = Math.max(1, Math.round(canvas.width * scale));
    preview.height = Math.max(1, Math.round(canvas.height * scale));
    preview.getContext('2d').drawImage(canvas, 0, 0, preview.width, preview.height);
  }

  async function run(file, ab = new AbortController()) {
    aborter = ab;
    const signal = ab.signal;
    pick.hidden = true; cancelBtn.hidden = false; prog.hidden = false; preview.hidden = false;
    dlBtn.hidden = true; studioBtn.hidden = true;
    const fps = 12;
    const engine = createAsciiEngine(options);
    engine.setRenderMode('bitmap');
    // Pick a decoder by type. GIF + animated-image (WebP/APNG) are image sequences → GIF
    // out (delays preserved); video → WebM out (real-time MediaRecorder). Stream decode →
    // convert → encode → release, one frame at a time (flat memory, any length).
    const lower = (file.name || '').toLowerCase(), type = file.type || '';
    const isGif = /gif/.test(type) || lower.endsWith('.gif');
    const isWebp = /webp/.test(type) || lower.endsWith('.webp');
    const isApng = /apng/.test(type) || lower.endsWith('.apng');
    const imageSeq = isGif || isWebp || isApng;
    const bytes = imageSeq ? new Uint8Array(await file.arrayBuffer()) : null;
    const source = isGif ? gifFrames(bytes, { signal })
      : isWebp ? imageDecoderFrames(bytes, 'image/webp', { signal })
      : isApng ? imageDecoderFrames(bytes, 'image/png', { signal })
      : videoFrameStream(file, { fps, signal });
    // GIF preserves a transparent ASCII background (WebM has no alpha).
    const sink = imageSeq ? await createGifSink({ transparent: !!options.transparentBackground }) : createWebmSink({ fps });
    const name = `${baseName}-ascii.${imageSeq ? 'gif' : 'webm'}`;
    const mime = imageSeq ? 'image/gif' : 'video/webm';
    const conv = document.createElement('canvas');     // reused: rendered ASCII frame → sink
    const cctx = conv.getContext('2d');
    const it = source;
    // Kick off one frame's conversion: snapshot the source as a bitmap (so the next seek
    // can't overwrite it) and POST it to the worker. Returns the in-flight result promise.
    const start = async (meta) => {
      engine.setSource(meta.canvas);
      const bmp = await createImageBitmap(engine.sourceCanvas);
      return { resultP: engine.convertBitmap(bmp, 'bitmap'), delayMs: meta.delayMs, index: meta.index, total: meta.total };
    };
    try {
      let count = 0, lastPreview = 0;
      if (!imageSeq) status.textContent = 'Recording in real time…';
      const first = await it.next();
      if (first.done) throw new Error('no frames decoded');
      let cur = await start(first.value);
      while (cur) {
        if (signal.aborted) throw new DOMException('aborted', 'AbortError');
        // Prefetch the NEXT frame's conversion BEFORE encoding the current one, so the
        // worker converts it concurrently with this (blocking GIF quantize / WebM record).
        const nxt = await it.next();
        const next = nxt.done ? null : await start(nxt.value);
        const drawable = await cur.resultP;
        if (conv.width !== drawable.width || conv.height !== drawable.height) { conv.width = drawable.width; conv.height = drawable.height; }
        cctx.clearRect(0, 0, conv.width, conv.height);
        cctx.drawImage(drawable, 0, 0);
        drawable.close?.();
        await sink.addFrame(conv, cur.delayMs);   // worker converts `next` during this
        count++;
        if (cur.total) prog.value = Math.min(0.99, (cur.index + 1) / cur.total);
        status.textContent = `Converting frame ${cur.index + 1}${cur.total ? '/' + cur.total : ''}…`;
        const t = performance.now();
        if (t - lastPreview > 500) { lastPreview = t; showPreview(conv); }
        cur = next;
      }
      status.textContent = 'Encoding…';
      const blob = await sink.finish();
      engine.terminate();
      prog.value = 1;
      status.textContent = `Done — ${count} frames, ${(blob.size / 1024).toFixed(0)} KB.`;
      cancelBtn.hidden = true; dlBtn.hidden = false; studioBtn.hidden = !onAddToStudio;
      dlBtn.onclick = () => download(blob, name);
      studioBtn.onclick = () => onAddToStudio?.(blob, name, mime);
    } catch (err) {
      try { await it.return?.(); } catch { /* close the frame stream → revoke its blob URL */ }
      try { await sink.finish?.(); } catch { /* discard partial */ }
      engine.terminate();
      status.textContent = err && err.name === 'AbortError' ? 'Cancelled.' : 'Failed: ' + ((err && err.message) || err);
      cancelBtn.hidden = true; pick.hidden = false; prog.hidden = true;
    }
  }

  // Fetch a remote file then convert it. OFF-ORIGIN by nature (opt-in, warned in the UI);
  // works only where the host sends permissive CORS headers — fails clearly otherwise.
  async function loadUrl(url) {
    const ab = new AbortController(); aborter = ab;
    pick.hidden = true; cancelBtn.hidden = false; prog.hidden = true;
    status.textContent = 'Fetching URL…';
    try {
      const res = await fetch(url, { signal: ab.signal, mode: 'cors' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const blob = await res.blob();
      const name = decodeURIComponent((url.split('/').pop() || 'remote').split('?')[0]) || 'remote';
      await run(new File([blob], name, { type: blob.type }), ab);
    } catch (err) {
      status.textContent = err && err.name === 'AbortError' ? 'Cancelled.'
        : 'Could not load URL (the site may block off-origin access): ' + ((err && err.message) || err);
      cancelBtn.hidden = true; pick.hidden = false;
    }
  }

  pick.addEventListener('click', () => input.click());
  input.addEventListener('change', () => { const f = input.files?.[0]; if (f) run(f); });
  const goUrl = () => { const u = urlInput.value.trim(); if (u) loadUrl(u); };
  urlGo.addEventListener('click', goUrl);
  urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') goUrl(); });
  cancelBtn.addEventListener('click', () => aborter?.abort());
  // Do NOT auto-open the file dialog — the user chooses Choose file… or the URL field.
  return { destroy() { aborter?.abort(); float.destroy(); panel.remove(); } };
}
