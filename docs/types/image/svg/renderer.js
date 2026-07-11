// SVG dual-pane renderer — Monaco editor (left) + live sandboxed-iframe preview (right).
// Returned as { parentNode } so it mounts directly in the preview host (not the sandboxed
// iframe).  The right pane uses an iframe with srcdoc so SVG script tags are isolated.
// Script tags are also stripped from the srcdoc content for defence-in-depth.
//
// Falls back to a <textarea> if Monaco doesn't load (offline / slow network).

import { loadMonaco } from '../../../core/monaco-loader.js';
import { sanitizeSvg } from '../svg-sanitize.js';

// Extract width × height from an SVG string (viewBox / width / height attributes).
function svgDimensions(svg) {
  const vb = svg.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (vb) {
    const parts = vb[1].trim().split(/[\s,]+/);
    if (parts.length === 4) {
      const w = Math.round(parseFloat(parts[2]));
      const h = Math.round(parseFloat(parts[3]));
      if (w > 0 && h > 0) return `${w}×${h}`;
    }
  }
  const w = svg.match(/\bwidth\s*=\s*["']([^"']+)["']/i);
  const h = svg.match(/\bheight\s*=\s*["']([^"']+)["']/i);
  if (w && h) {
    const wv = parseFloat(w[1]);
    const hv = parseFloat(h[1]);
    if (wv > 0 && hv > 0) return `${Math.round(wv)}×${Math.round(hv)}`;
  }
  return null;
}

// Wrap SVG in a minimal HTML shell for iframe srcdoc.
function wrapForIframe(svgContent) {
  const safe = sanitizeSvg(svgContent);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  html,body{margin:0;padding:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:transparent;overflow:auto;}
  svg{max-width:100%;max-height:100%;}
</style>
</head>
<body>${safe}</body>
</html>`;
}

export async function render(intake, _ctx) {
  const svgSource = intake.text || '';

  // ── Container ────────────────────────────────────────────────────────────
  const host = document.createElement('div');
  host.className = 'svg-editor';

  // ── Toolbar ──────────────────────────────────────────────────────────────
  const toolbar = document.createElement('div');
  toolbar.className = 'svg-toolbar';

  const dimBadge = document.createElement('span');
  dimBadge.className = 'svg-dim-badge';
  const dims = svgDimensions(svgSource);
  dimBadge.textContent = dims ? dims + ' px' : '';
  dimBadge.hidden = !dims;

  const copyBtn = document.createElement('button');
  copyBtn.className = 'svg-toolbar-btn';
  copyBtn.type = 'button';
  copyBtn.textContent = 'Copy SVG';
  copyBtn.title = 'Copy SVG source to clipboard';

  const zoomLabel = document.createElement('label');
  zoomLabel.className = 'svg-zoom-label';
  zoomLabel.textContent = 'Zoom: ';

  const zoomSel = document.createElement('select');
  zoomSel.className = 'svg-zoom-select';
  for (const [label, val] of [['Fit', 'fit'], ['100%', '1'], ['75%', '0.75'], ['50%', '0.5'], ['150%', '1.5'], ['200%', '2']]) {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = label;
    zoomSel.appendChild(opt);
  }

  zoomLabel.appendChild(zoomSel);
  toolbar.append(dimBadge, copyBtn, zoomLabel);

  // ── Split panes ───────────────────────────────────────────────────────────
  const panes = document.createElement('div');
  panes.className = 'svg-panes';

  const editorPane = document.createElement('div');
  editorPane.className = 'svg-editor-pane';

  const previewPane = document.createElement('div');
  previewPane.className = 'svg-preview-pane';

  // ── Preview iframe ────────────────────────────────────────────────────────
  const previewIframe = document.createElement('iframe');
  previewIframe.className = 'svg-preview-iframe';
  previewIframe.setAttribute('sandbox', 'allow-same-origin');
  previewIframe.setAttribute('title', 'SVG preview');
  previewIframe.srcdoc = wrapForIframe(svgSource);
  previewPane.appendChild(previewIframe);

  panes.append(editorPane, previewPane);
  host.append(toolbar, panes);

  // ── Update preview when content changes ───────────────────────────────────
  function updatePreview(newSvg) {
    previewIframe.srcdoc = wrapForIframe(newSvg);
    const d = svgDimensions(newSvg);
    if (d) { dimBadge.textContent = d + ' px'; dimBadge.hidden = false; }
    else dimBadge.hidden = true;
  }

  // Apply zoom to the preview iframe via CSS transform
  function applyZoom(val) {
    if (val === 'fit') {
      previewIframe.style.transform = '';
      previewIframe.style.width = '100%';
      previewIframe.style.height = '100%';
    } else {
      const scale = parseFloat(val);
      previewIframe.style.transform = `scale(${scale})`;
      previewIframe.style.transformOrigin = 'top left';
      const pct = (1 / scale * 100).toFixed(2) + '%';
      previewIframe.style.width = pct;
      previewIframe.style.height = pct;
    }
  }

  zoomSel.addEventListener('change', () => applyZoom(zoomSel.value));

  // ── Monaco editor (or textarea fallback) ──────────────────────────────────
  let monacoInstance = null;

  try {
    const monaco = await loadMonaco();

    const editorEl = document.createElement('div');
    editorEl.style.cssText = 'position:absolute;inset:0;';
    editorPane.style.position = 'relative';
    editorPane.appendChild(editorEl);

    // Follow the IN-APP theme toggle, not the OS. The app marks dark mode with
    // `body.fv-dark` (parent-pane renderers) / `[data-theme="dark"]` on <html>.
    const isAppDark = () => document.body.classList.contains('fv-dark') ||
      document.documentElement.getAttribute('data-theme') === 'dark';

    const model = monaco.editor.createModel(svgSource, 'xml');
    monacoInstance = monaco.editor.create(editorEl, {
      model,
      automaticLayout: true,
      theme: isAppDark() ? 'vs-dark' : 'vs',
      minimap: { enabled: false },
      lineNumbers: 'on',
      wordWrap: 'off',
      scrollBeyondLastLine: false,
      fontSize: 13,
    });

    let updateTimer = null;
    model.onDidChangeContent(() => {
      clearTimeout(updateTimer);
      updateTimer = setTimeout(() => updatePreview(model.getValue()), 300);
    });

    copyBtn.addEventListener('click', () => {
      navigator.clipboard?.writeText(model.getValue()).catch(() => {});
    });

    // Dispose Monaco when removed from the DOM; also re-theme live when the user
    // flips the in-app light/dark toggle (body.fv-dark / <html data-theme>).
    let lastDark = isAppDark();
    const observer = new MutationObserver(() => {
      if (!host.isConnected) {
        model.dispose();
        monacoInstance.dispose();
        themeObserver.disconnect();
        observer.disconnect();
        return;
      }
    });
    observer.observe(document, { childList: true, subtree: true });
    const themeObserver = new MutationObserver(() => {
      const dark = isAppDark();
      if (dark !== lastDark) { lastDark = dark; monaco.editor.setTheme(dark ? 'vs-dark' : 'vs'); }
    });
    themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  } catch (_err) {
    // Monaco unavailable — use a plain textarea
    const ta = document.createElement('textarea');
    ta.className = 'svg-fallback-textarea';
    ta.spellcheck = false;
    ta.value = svgSource;
    ta.addEventListener('input', () => updatePreview(ta.value));
    editorPane.appendChild(ta);

    copyBtn.addEventListener('click', () => {
      navigator.clipboard?.writeText(ta.value).catch(() => {});
    });
  }

  return { parentNode: host };
}
