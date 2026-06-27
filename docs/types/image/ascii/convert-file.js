// "Convert file → ASCII": pick a GIF or video, convert it frame-by-frame to ASCII
// (off the main thread via the engine's worker), show progress + a throttled live
// preview, then download the result in its base format (GIF → GIF, video → WebM) or
// add it back into the studio. Lazy-loaded from studio.js on demand.
import { makeFloatingPanel } from './floating-panel.js';
import { createAsciiEngine } from './engine.js';
import { gifFrames, videoFrameStream } from './video-frames.js';
import { createGifSink, createWebmSink } from './encode.js';

let cssDone = false;
function injectStyle() {
  if (cssDone) return; cssDone = true;
  const s = document.createElement('style');
  s.id = 'asx-conv-css';
  s.textContent = `
    .asx-conv { position: fixed; z-index: 45; top: 12vh; left: 50%; transform: translateX(-50%);
      width: min(380px, 92vw); display: flex; flex-direction: column; background: rgba(13,13,13,.98);
      border: 1px solid #2a2a2a; border-radius: 8px; box-shadow: 0 10px 40px #0008; overflow: hidden; }
    .asx-conv-body { display: flex; flex-direction: column; gap: 10px; padding: 12px; }
    .asx-conv-status { margin: 0; font: 12px ui-monospace, monospace; color: #9ab; min-height: 1.2em; }
    .asx-conv-prog { width: 100%; height: 10px; }
    .asx-conv-preview { width: 100%; max-height: 220px; object-fit: contain; background: #000; border-radius: 4px; image-rendering: auto; }
    .asx-conv-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .asx-conv-actions button { cursor: pointer; }`;
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
    </div>
    <input class="asx-conv-input" type="file" accept="image/gif,video/*" hidden>`;
  host.appendChild(panel);

  const q = (s) => panel.querySelector(s);
  const status = q('.asx-conv-status'), prog = q('.asx-conv-prog'), preview = q('.asx-conv-preview');
  const pick = q('.asx-conv-pick'), cancelBtn = q('.asx-conv-cancel');
  const dlBtn = q('.asx-conv-dl'), studioBtn = q('.asx-conv-studio'), input = q('.asx-conv-input');
  let aborter = null;
  const float = makeFloatingPanel(panel, { title: 'Convert file → ASCII', onClose: () => { aborter?.abort(); float.destroy(); panel.remove(); } });

  function showPreview(canvas) {
    const max = 240, scale = Math.min(1, max / canvas.width, max / canvas.height);
    preview.width = Math.max(1, Math.round(canvas.width * scale));
    preview.height = Math.max(1, Math.round(canvas.height * scale));
    preview.getContext('2d').drawImage(canvas, 0, 0, preview.width, preview.height);
  }

  async function run(file) {
    aborter = new AbortController();
    const signal = aborter.signal;
    pick.hidden = true; cancelBtn.hidden = false; prog.hidden = false; preview.hidden = false;
    dlBtn.hidden = true; studioBtn.hidden = true;
    const fps = 12;
    const engine = createAsciiEngine(options);
    engine.setRenderMode('bitmap');
    // Stream decode → convert → encode → release, one frame at a time (flat memory, any
    // length). gif-in → GIF (delays preserved); video-in → WebM (real-time MediaRecorder).
    const isGif = /gif/i.test(file.type) || /\.gif$/i.test(file.name);
    const source = isGif ? gifFrames(new Uint8Array(await file.arrayBuffer()), { signal })
      : videoFrameStream(file, { fps, signal });
    const sink = isGif ? await createGifSink() : createWebmSink({ fps });
    const name = `${baseName}-ascii.${isGif ? 'gif' : 'webm'}`;
    const mime = isGif ? 'image/gif' : 'video/webm';
    const conv = document.createElement('canvas');     // reused: rendered ASCII frame → sink
    const cctx = conv.getContext('2d');
    try {
      let count = 0, lastPreview = 0;
      if (!isGif) status.textContent = 'Recording in real time…';
      for await (const frame of source) {
        if (signal.aborted) throw new DOMException('aborted', 'AbortError');
        engine.setSource(frame.canvas);
        const drawable = await engine.convertFrame('bitmap');   // off the main thread (worker)
        if (conv.width !== drawable.width || conv.height !== drawable.height) { conv.width = drawable.width; conv.height = drawable.height; }
        cctx.clearRect(0, 0, conv.width, conv.height);
        cctx.drawImage(drawable, 0, 0);
        drawable.close?.();
        await sink.addFrame(conv, frame.delayMs);
        count++;
        if (frame.total) prog.value = Math.min(0.99, (frame.index + 1) / frame.total);
        status.textContent = `Converting frame ${frame.index + 1}${frame.total ? '/' + frame.total : ''}…`;
        const t = performance.now();
        if (t - lastPreview > 500) { lastPreview = t; showPreview(conv); }
      }
      if (!count) throw new Error('no frames decoded');
      status.textContent = 'Encoding…';
      const blob = await sink.finish();
      engine.terminate();
      prog.value = 1;
      status.textContent = `Done — ${count} frames, ${(blob.size / 1024).toFixed(0)} KB.`;
      cancelBtn.hidden = true; dlBtn.hidden = false; studioBtn.hidden = !onAddToStudio;
      dlBtn.onclick = () => download(blob, name);
      studioBtn.onclick = () => onAddToStudio?.(blob, name, mime);
    } catch (err) {
      try { await sink.finish?.(); } catch { /* discard partial */ }
      engine.terminate();
      status.textContent = err && err.name === 'AbortError' ? 'Cancelled.' : 'Failed: ' + ((err && err.message) || err);
      cancelBtn.hidden = true; pick.hidden = false; prog.hidden = true;
    }
  }

  pick.addEventListener('click', () => input.click());
  input.addEventListener('change', () => { const f = input.files?.[0]; if (f) run(f); });
  cancelBtn.addEventListener('click', () => aborter?.abort());
  input.click();   // open the picker immediately
  return { destroy() { aborter?.abort(); float.destroy(); panel.remove(); } };
}
