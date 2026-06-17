// DjVu document renderer using djvu.js (RussCoder/djvujs).
// The library is self-contained: DjVu.Worker() spawns an internal Blob-URL worker
// from the same script, so no separate djvu_worker.js is needed.
//
// Worker proxy API:
//   const worker = new DjVu.Worker();
//   await worker.createDocument(buffer);        // transfers buffer to worker
//   const n = await worker.doc.getPagesQuantity().run();
//   const imgData = await worker.doc.getPage(p).getImageData().run(); // returns ImageData
//   const text    = await worker.doc.getPage(p).getText().run();       // OCR text or ""

import { vendor } from '../../../core/script-loader.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let djvuLoadPromise = null;

async function loadDjVu() {
  if (window.DjVu) return window.DjVu;
  if (djvuLoadPromise) return djvuLoadPromise;
  djvuLoadPromise = (async () => {
    const res = await fetch(vendor('djvu/djvu.js'));
    if (!res.ok) throw new Error('Failed to load DjVu library (' + res.status + ')');
    const code = await res.text();
    const DjVu = new Function('window', 'self', code + '\nreturn DjVu;')(window, window);
    if (!DjVu) throw new Error('DjVu missing after load');
    window.DjVu = DjVu;
    return DjVu;
  })();
  return djvuLoadPromise;
}

export async function render(intake, _ctx) {
  const host = document.createElement('div');
  host.className = 'djvu-viewer';

  // Loading state
  host.innerHTML = '<div class="djvu-loading">Loading DjVu library…</div>';

  // Load the DjVu library (self-contained, exports window.DjVu)
  let DjVu;
  try {
    DjVu = await loadDjVu();
  } catch (e) {
    host.innerHTML = '<div class="djvu-error"><strong>DjVu preview is partially supported</strong><br>The document was detected, but the in-browser DjVu decoder could not start: ' + esc(e.message) + '</div>';
    return { parentNode: host, revoke() {} };
  }

  // Create worker and parse document
  let djvuWorker;
  try {
    djvuWorker = new DjVu.Worker();
    // createDocument transfers (consumes) the buffer — clone it so the intake stays valid
    const buffer = intake.bytes.buffer.slice(0);
    host.querySelector('.djvu-loading').textContent = 'Parsing document…';
    await djvuWorker.createDocument(buffer);
  } catch (e) {
    host.innerHTML = '<div class="djvu-error"><strong>Could not parse DjVu document</strong><br>' + esc(e.message) + '</div>';
    return { parentNode: host, revoke() { djvuWorker && djvuWorker.terminate(); } };
  }

  // Get page count
  let pageCount = 1;
  try {
    pageCount = await djvuWorker.doc.getPagesQuantity().run();
  } catch {
    pageCount = 1;
  }

  // Build UI
  host.innerHTML = `
    <div class="djvu-toolbar">
      <button class="djvu-btn djvu-prev" title="Previous page">&#8249; Prev</button>
      <span class="djvu-page-indicator">Page 1 / ${esc(String(pageCount))}</span>
      <button class="djvu-btn djvu-next" title="Next page">Next &#8250;</button>
      <span class="djvu-sep">|</span>
      <label class="djvu-zoom-label">Zoom:
        <select class="djvu-zoom">
          <option value="0.5">50%</option>
          <option value="0.75">75%</option>
          <option value="1" selected>100%</option>
          <option value="1.5">150%</option>
          <option value="2">200%</option>
        </select>
      </label>
      <button class="djvu-btn djvu-text-btn" title="Show OCR text layer">Text layer</button>
    </div>
    <div class="djvu-canvas-wrap">
      <canvas class="djvu-canvas"></canvas>
      <div class="djvu-page-loading" style="display:none">Rendering…</div>
    </div>
    <pre class="djvu-text-pane" style="display:none"></pre>
  `;

  applyStyles(host);

  const prevBtn       = host.querySelector('.djvu-prev');
  const nextBtn       = host.querySelector('.djvu-next');
  const pageIndicator = host.querySelector('.djvu-page-indicator');
  const zoomSelect    = host.querySelector('.djvu-zoom');
  const textBtn       = host.querySelector('.djvu-text-btn');
  const canvas        = host.querySelector('.djvu-canvas');
  const loadingMsg    = host.querySelector('.djvu-page-loading');
  const textPane      = host.querySelector('.djvu-text-pane');
  const ctx2d         = canvas.getContext('2d');

  let currentPage = 1;
  let currentZoom = 1;
  let textVisible = false;
  let rendering = false;

  async function renderPage(pageNum) {
    if (rendering) return;
    rendering = true;
    loadingMsg.style.display = 'block';
    canvas.style.opacity = '0.4';
    try {
      // getImageData() returns an ImageData object (transferred from worker)
      const imageData = await djvuWorker.doc.getPage(pageNum).getImageData().run();
      const w = imageData.width;
      const h = imageData.height;
      const scaledW = Math.round(w * currentZoom);
      const scaledH = Math.round(h * currentZoom);

      // Draw at native size first, then scale via CSS or via offscreen canvas
      canvas.width  = scaledW;
      canvas.height = scaledH;

      if (currentZoom === 1) {
        ctx2d.putImageData(imageData, 0, 0);
      } else {
        // Draw native into offscreen, then drawImage to scale
        const offscreen = document.createElement('canvas');
        offscreen.width  = w;
        offscreen.height = h;
        offscreen.getContext('2d').putImageData(imageData, 0, 0);
        ctx2d.drawImage(offscreen, 0, 0, scaledW, scaledH);
      }

      // Fit canvas to container width (maintain aspect ratio)
      canvas.style.maxWidth = '100%';
      canvas.style.height   = 'auto';

      pageIndicator.textContent = `Page ${pageNum} / ${pageCount}`;
      prevBtn.disabled = pageNum <= 1;
      nextBtn.disabled = pageNum >= pageCount;

      // If text pane is visible, update text too
      if (textVisible) await showText(pageNum);
    } catch (e) {
      loadingMsg.textContent = 'Error rendering page: ' + esc(e.message);
      loadingMsg.style.display = 'block';
    } finally {
      rendering = false;
      canvas.style.opacity = '1';
      loadingMsg.style.display = 'none';
    }
  }

  async function showText(pageNum) {
    try {
      const text = await djvuWorker.doc.getPage(pageNum).getText().run();
      textPane.textContent = text || '(No text layer on this page)';
    } catch {
      textPane.textContent = '(Could not extract text)';
    }
  }

  prevBtn.addEventListener('click', async () => {
    if (currentPage > 1) { currentPage--; await renderPage(currentPage); }
  });
  nextBtn.addEventListener('click', async () => {
    if (currentPage < pageCount) { currentPage++; await renderPage(currentPage); }
  });
  zoomSelect.addEventListener('change', async () => {
    currentZoom = parseFloat(zoomSelect.value);
    await renderPage(currentPage);
  });
  textBtn.addEventListener('click', async () => {
    textVisible = !textVisible;
    textPane.style.display = textVisible ? 'block' : 'none';
    textBtn.textContent = textVisible ? 'Hide text' : 'Text layer';
    if (textVisible) await showText(currentPage);
  });

  // Keyboard navigation
  host.setAttribute('tabindex', '0');
  host.addEventListener('keydown', async (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentPage < pageCount) { currentPage++; await renderPage(currentPage); }
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentPage > 1) { currentPage--; await renderPage(currentPage); }
    }
  });

  // Render first page
  await renderPage(1);

  return {
    parentNode: host,
    revoke() {
      if (djvuWorker) {
        try { djvuWorker.terminate(); } catch { /* ignore */ }
        djvuWorker = null;
      }
      // Clear canvas to free memory
      canvas.width = 1;
      canvas.height = 1;
    },
  };
}

function applyStyles(host) {
  if (document.getElementById('djvu-viewer-styles')) return;
  const style = document.createElement('style');
  style.id = 'djvu-viewer-styles';
  style.textContent = `
    .djvu-viewer {
      display: flex;
      flex-direction: column;
      height: 100%;
      font-family: system-ui, sans-serif;
      overflow: hidden;
    }
    .djvu-toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      background: var(--toolbar-bg, #f5f5f5);
      border-bottom: 1px solid var(--border, #ddd);
      flex-shrink: 0;
      flex-wrap: wrap;
    }
    .djvu-btn {
      padding: 3px 10px;
      border: 1px solid var(--border, #ccc);
      border-radius: 4px;
      background: var(--btn-bg, #fff);
      color: var(--text, inherit);
      cursor: pointer;
      font-size: 13px;
    }
    .djvu-btn:hover:not(:disabled) { background: var(--btn-hover, #e8e8e8); }
    .djvu-btn:disabled { opacity: 0.4; cursor: default; }
    .djvu-page-indicator { font-size: 13px; color: var(--text-muted, #666); white-space: nowrap; }
    .djvu-sep { color: var(--border, #ccc); }
    .djvu-zoom-label { font-size: 13px; }
    .djvu-zoom { font-size: 13px; border: 1px solid var(--border, #ccc); border-radius: 3px; padding: 2px 4px; }
    .djvu-canvas-wrap {
      flex: 1;
      overflow: auto;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 16px;
      background: var(--canvas-bg, #888);
      position: relative;
    }
    .djvu-canvas {
      display: block;
      box-shadow: 0 2px 12px rgba(0,0,0,0.4);
      background: #fff;
      transition: opacity 0.15s;
    }
    .djvu-page-loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.6);
      color: #fff;
      padding: 8px 18px;
      border-radius: 6px;
      font-size: 13px;
      pointer-events: none;
    }
    .djvu-text-pane {
      max-height: 200px;
      overflow-y: auto;
      margin: 0;
      padding: 12px 16px;
      border-top: 1px solid var(--border, #ddd);
      font-size: 12px;
      line-height: 1.5;
      background: var(--pre-bg, #fafafa);
      white-space: pre-wrap;
      word-break: break-word;
      flex-shrink: 0;
    }
    .djvu-loading, .djvu-error {
      padding: 40px 24px;
      text-align: center;
      color: var(--text-muted, #666);
    }
    .djvu-error strong { color: var(--error, #c00); display: block; margin-bottom: 8px; }
  `;
  document.head.appendChild(style);
}
