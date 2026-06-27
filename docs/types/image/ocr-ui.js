// Shared OCR UI for the image lane. Wraps the heavy, offline OCR engine
// (docs/core/ocr) behind a one-time download consent gate, then drives two flows:
//   • openImageOcrPanel — extract text from a single image canvas (editor / still).
//   • openGifOcrPanel   — OCR every animated-GIF frame into a timestamped transcript.
// The engine (~11 MB tesseract.js + wasm + traineddata) is DYNAMIC-imported only
// inside the click handlers, so nothing heavy loads at editor/player mount and the
// renderer bundle keeps it as a lazy external chunk. Zero off-origin (vendored).

const OCR = '../../core/ocr/index.js';
const CONSENT_KEY = 'imgv-ocr-consent';
let consented = false;   // process-wide: ask once, then remembered across reloads
const remembered = () => { try { return localStorage.getItem(CONSENT_KEY) === '1'; } catch { return false; } };

// One-time opt-in confirming the heavy download (mirrors ruffle/renderer.js's gate).
// Once accepted it's remembered (localStorage) so later runs/reloads don't re-ask.
function ocrConsent(host, approxMB) {
  if (consented || remembered()) { consented = true; return Promise.resolve(true); }
  injectOcrStyle();
  return new Promise((resolve) => {
    const back = document.createElement('div');
    back.className = 'imgv-ocr-backdrop';
    back.innerHTML = `
      <div class="imgv-ocr-dialog" role="dialog" aria-modal="true">
        <div class="imgv-ocr-h"><span style="font-size:20px">&#9888;</span> Extract text (OCR)</div>
        <p class="imgv-ocr-p">Text recognition runs fully offline in your browser, but the first
        run downloads the OCR engine (~${approxMB} MB: the recognizer + English language data).
        It is cached afterwards. Continue?</p>
        <div class="imgv-ocr-btns">
          <button class="imgv-ocr-go">Download &amp; run OCR</button>
          <button class="imgv-ocr-cancel">Cancel</button>
        </div>
      </div>`;
    (host.ownerDocument?.body || document.body).appendChild(back);
    const done = (ok) => { back.remove(); if (ok) { consented = true; try { localStorage.setItem(CONSENT_KEY, '1'); } catch { /* private mode */ } } resolve(ok); };
    back.querySelector('.imgv-ocr-go').addEventListener('click', () => done(true));
    back.querySelector('.imgv-ocr-cancel').addEventListener('click', () => done(false));
    back.addEventListener('click', (e) => { if (e.target === back) done(false); });
  });
}

// A small floating result panel anchored top-right of `host` (which must be
// position:relative — the editor stageHost and gif root both are). Returns the
// elements the flows fill in. A second open reuses the same panel.
function makePanel(host, title) {
  injectOcrStyle();
  host.querySelector('.imgv-ocr-panel')?.remove();
  const panel = document.createElement('div');
  panel.className = 'imgv-ocr-panel';
  panel.innerHTML = `
    <div class="imgv-ocr-bar">
      <strong class="imgv-ocr-title">${title}</strong>
      <span class="imgv-ocr-status" aria-live="polite"></span>
      <button class="imgv-ocr-x" title="Close">✕</button>
    </div>
    <div class="imgv-ocr-controls"></div>
    <div class="imgv-ocr-body"></div>`;
  host.appendChild(panel);
  panel.querySelector('.imgv-ocr-x').addEventListener('click', () => panel.remove());
  return {
    panel,
    status: panel.querySelector('.imgv-ocr-status'),
    controls: panel.querySelector('.imgv-ocr-controls'),
    body: panel.querySelector('.imgv-ocr-body'),
  };
}

// ── Still image ───────────────────────────────────────────────────────────────
// getCanvas() must return a canvas of the CURRENT image (the editor's
// flattenToCanvas, or an <img> drawn to a canvas). A "digits only" checkbox
// re-runs with the numbers preset.
export async function openImageOcrPanel({ host, getCanvas }) {
  if (!(await ocrConsent(host, 11))) return;
  const { status, controls, body } = makePanel(host, 'Extract text (OCR)');
  controls.innerHTML = `
    <label class="imgv-ocr-chk"><input type="checkbox" class="imgv-ocr-digits"> Digits only</label>`;
  const digits = controls.querySelector('.imgv-ocr-digits');

  async function run() {
    status.textContent = 'Recognizing…';
    body.innerHTML = '';
    digits.disabled = true;
    let result;
    try {
      const { recognize } = await import(OCR);
      result = await recognize(getCanvas(), { digits: digits.checked });
    } catch (e) {
      status.textContent = 'OCR failed';
      body.innerHTML = `<div class="imgv-ocr-err">${(e && e.message) || e}</div>`;
      digits.disabled = false;
      return;
    }
    const text = result.text || '';
    status.textContent = text ? `${Math.round(result.confidence || 0)}% confidence` : 'No text found';
    body.innerHTML = `
      <textarea class="imgv-ocr-out" readonly placeholder="(no text recognized)"></textarea>
      <div class="imgv-ocr-acts">
        <button class="imgv-ocr-copy">Copy</button>
        <button class="imgv-ocr-dl">Download .txt</button>
      </div>`;
    body.querySelector('.imgv-ocr-out').value = text;
    body.querySelector('.imgv-ocr-copy').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(text); status.textContent = 'Copied'; } catch {}
    });
    body.querySelector('.imgv-ocr-dl').addEventListener('click', async () => {
      const { download } = await import(OCR);
      download('extracted-text.txt', text, 'text/plain');
    });
    digits.disabled = false;
  }
  digits.addEventListener('change', run);
  run();
}

// ── Animated GIF ──────────────────────────────────────────────────────────────
// getFrames() returns [{ canvas, delayMs }] (the GIF player's decoded frames).
// Cumulative delay → each frame's timestamp; ocrFrames merges identical runs into
// cues, then download via the srt/vtt/txt/json serializers.
export async function openGifOcrPanel({ host, getFrames }) {
  const frames = getFrames();
  if (!frames || !frames.length) return;
  if (!(await ocrConsent(host, 11))) return;
  const { status, controls, body } = makePanel(host, 'GIF transcript (OCR)');

  const sources = [];
  let t = 0;
  for (const f of frames) { sources.push({ time: t, source: f.canvas }); t += Math.max(0, f.delayMs || 0) / 1000; }

  status.textContent = 'Recognizing…';
  let cues;
  try {
    const { ocrFrames } = await import(OCR);
    cues = await ocrFrames(sources, { onProgress: ({ index, total }) => {
      status.textContent = `Recognizing… frame ${index + 1}/${total}`;
    } });
  } catch (e) {
    status.textContent = 'OCR failed';
    body.innerHTML = `<div class="imgv-ocr-err">${(e && e.message) || e}</div>`;
    return;
  }
  const { FORMATS, toText, download } = await import(OCR);
  status.textContent = cues.length ? `${cues.length} cue${cues.length === 1 ? '' : 's'}` : 'No text found';
  const opts = Object.entries(FORMATS).map(([k, f]) => `<option value="${k}">${f.label}</option>`).join('');
  controls.innerHTML = `
    <label class="imgv-ocr-chk">Format <select class="imgv-ocr-fmt">${opts}</select></label>
    <button class="imgv-ocr-dl">Download</button>`;
  body.innerHTML = `<textarea class="imgv-ocr-out" readonly placeholder="(no text recognized)"></textarea>`;
  const out = body.querySelector('.imgv-ocr-out');
  out.value = toText(cues);
  controls.querySelector('.imgv-ocr-dl').addEventListener('click', () => {
    const fmt = FORMATS[controls.querySelector('.imgv-ocr-fmt').value];
    download('gif-transcript.' + fmt.ext, fmt.fn(cues), fmt.mime);
  });
}

function injectOcrStyle() {
  if (document.getElementById('imgv-ocr-style')) return;
  const s = document.createElement('style');
  s.id = 'imgv-ocr-style';
  s.textContent = `
    .imgv-ocr-backdrop { position:fixed; inset:0; z-index:50; display:flex; align-items:center; justify-content:center; background:#0008; }
    .imgv-ocr-dialog { max-width:460px; margin:16px; padding:20px; border-radius:8px; background:var(--bg-2,#252525); color:var(--fg,#ddd); border:1px solid var(--border,#444); font-family:var(--font-ui,sans-serif); }
    .imgv-ocr-h { display:flex; align-items:center; gap:8px; font-size:15px; font-weight:600; margin-bottom:10px; }
    .imgv-ocr-p { margin:0 0 16px; font-size:13px; line-height:1.6; opacity:.85; }
    .imgv-ocr-btns { display:flex; gap:10px; flex-wrap:wrap; }
    .imgv-ocr-go { padding:8px 16px; border:none; border-radius:5px; cursor:pointer; background:var(--accent,#4a8fff); color:#fff; font-size:13px; }
    .imgv-ocr-cancel { padding:8px 16px; border-radius:5px; cursor:pointer; background:transparent; border:1px solid var(--border,#444); color:var(--fg,#ccc); font-size:13px; }
    .imgv-ocr-panel { position:absolute; top:8px; right:8px; z-index:12; width:min(320px,calc(100% - 16px)); display:flex; flex-direction:column; gap:6px; padding:8px; border-radius:8px; background:var(--bg-2,#252525); color:var(--fg,#ddd); border:1px solid var(--border,#444); box-shadow:0 4px 16px #0006; font-family:var(--font-ui,sans-serif); font-size:12px; }
    .imgv-ocr-bar { display:flex; align-items:center; gap:8px; }
    .imgv-ocr-title { flex:0 0 auto; }
    .imgv-ocr-status { flex:1; opacity:.75; font-variant-numeric:tabular-nums; }
    .imgv-ocr-x { border:none; background:transparent; color:inherit; cursor:pointer; font-size:13px; }
    .imgv-ocr-controls { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .imgv-ocr-chk { display:inline-flex; align-items:center; gap:4px; }
    .imgv-ocr-out { width:100%; min-height:96px; box-sizing:border-box; resize:vertical; font-family:monospace; font-size:12px; }
    .imgv-ocr-acts { display:flex; gap:8px; margin-top:6px; }
    .imgv-ocr-panel button { cursor:pointer; }
    .imgv-ocr-err { color:#f88; }`;
  document.head.appendChild(s);
}
