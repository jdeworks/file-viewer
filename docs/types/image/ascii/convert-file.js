// "Convert file → ASCII": pick a GIF or video, convert it frame-by-frame to ASCII
// (off the main thread via the engine's worker), show progress + a throttled live
// preview, then download the result in its base format (GIF → GIF, video → WebM) or
// add it back into the studio. Lazy-loaded from studio.js on demand.
import { makeFloatingPanel } from './floating-panel.js';
import { createAsciiEngine } from './engine.js';
import { gifFrames, videoFrames } from './video-frames.js';
import { encodeGif, encodeWebm } from './encode.js';

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
    const engine = createAsciiEngine(options);
    engine.setRenderMode('bitmap');
    try {
      const isGif = /gif/i.test(file.type) || /\.gif$/i.test(file.name);
      status.textContent = 'Decoding…';
      const src = isGif
        ? await gifFrames(new Uint8Array(await file.arrayBuffer()))
        : await videoFrames(file, { fps: 12, signal, onProgress: () => {} });
      const { frames, kind } = src;
      if (!frames.length) throw new Error('no frames decoded');
      const out = [];
      let lastPreview = 0;
      for (let i = 0; i < frames.length; i++) {
        if (signal.aborted) throw new DOMException('aborted', 'AbortError');
        engine.setSource(frames[i].canvas);
        const drawable = await engine.convertFrame('bitmap');
        const c = document.createElement('canvas'); c.width = drawable.width; c.height = drawable.height;
        c.getContext('2d').drawImage(drawable, 0, 0);
        drawable.close?.();
        out.push({ canvas: c, delayMs: frames[i].delayMs });
        prog.value = ((i + 1) / frames.length) * 0.8;
        status.textContent = `Converting frame ${i + 1}/${frames.length}…`;
        const t = performance.now();
        if (t - lastPreview > 500) { lastPreview = t; showPreview(c); }
      }
      engine.terminate();
      showPreview(out[out.length - 1].canvas);
      status.textContent = 'Encoding…';
      const onP = (e) => { prog.value = 0.8 + (e.done / e.total) * 0.2; };
      let blob, name, mime;
      if (kind === 'gif') { blob = await encodeGif(out, { signal, onProgress: onP }); name = `${baseName}-ascii.gif`; mime = 'image/gif'; }
      else { blob = await encodeWebm(out, { fps: 12, signal, onProgress: onP }); name = `${baseName}-ascii.webm`; mime = 'video/webm'; }
      prog.value = 1;
      status.textContent = `Done — ${frames.length} frames, ${(blob.size / 1024).toFixed(0)} KB.`;
      cancelBtn.hidden = true; dlBtn.hidden = false; studioBtn.hidden = !onAddToStudio;
      dlBtn.onclick = () => download(blob, name);
      studioBtn.onclick = () => onAddToStudio?.(blob, name, mime);
    } catch (err) {
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
