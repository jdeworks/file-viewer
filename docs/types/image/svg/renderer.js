// SVG visual renderer. Source editing remains available through the app-level Raw and
// Split modes; Preview itself contains only the sandboxed SVG surface and its controls.
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
  host.className = 'svg-viewer';

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

  const previewPane = document.createElement('div');
  previewPane.className = 'svg-preview-pane';

  // ── Preview iframe ────────────────────────────────────────────────────────
  const previewIframe = document.createElement('iframe');
  previewIframe.className = 'svg-preview-iframe';
  previewIframe.setAttribute('sandbox', 'allow-same-origin');
  previewIframe.setAttribute('title', 'SVG preview');
  previewIframe.srcdoc = wrapForIframe(svgSource);
  previewPane.appendChild(previewIframe);

  host.append(toolbar, previewPane);

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
  copyBtn.addEventListener('click', () => {
    navigator.clipboard?.writeText(svgSource).catch(() => {});
  });

  return { parentNode: host };
}
