// Image preview. Raster images render in the PARENT pane from a blob: URL (efficient, no base64
// inflation) with fit-to-screen + zoom controls — zoom changes the real pixel size, not a CSS
// transform, so it stays crisp. SVG is text that can carry scripts, so it is DOMPurify-sanitized
// (SVG profile) and shown inside the sandboxed iframe.
import { loadGlobal, vendor } from '../../core/script-loader.js';
import { isSvg, mimeFor, dimensions } from './imglib.js';
import { recordStage3AsciiActivation } from '../../games/metagame/viewer-actions.js';

const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function render(intake, _ctx) {
  if (isSvg(intake)) {
    const DOMPurify = await loadGlobal(vendor('dompurify/purify.min.js'), 'DOMPurify');
    DOMPurify.removed = [];
    const clean = DOMPurify.sanitize(intake.text || '', { USE_PROFILES: { svg: true, svgFilters: true } });
    return { bodyHtml: '<div class="img-doc">' + clean + '</div>', hadUnsafe: DOMPurify.removed.length > 0 };
  }

  // Raster: parent pane + blob URL + fit/zoom controls + ASCII toggle.
  const mime = mimeFor(intake);
  const url = URL.createObjectURL(new Blob([intake.bytes], { type: mime }));
  const host = document.createElement('div');
  host.className = 'imgv-doc';
  host.innerHTML =
    '<div class="imgv-bar">'
    + '<button class="imgv-fit active" title="Fit to screen">Fit</button>'
    + '<button class="imgv-100" title="Actual size">100%</button>'
    + '<button class="imgv-dn" title="Zoom out">−</button>'
    + '<button class="imgv-up" title="Zoom in">+</button>'
    + '<span class="imgv-zoom"></span>'
    + '<span class="imgv-sep"></span>'
    + '<button class="imgv-ascii-btn" title="Toggle ASCII art view">ASCII</button>'
    + '<select class="imgv-ascii-cols" title="Width (columns)" hidden>'
    + '<option value="40">40 cols</option><option value="80" selected>80 cols</option><option value="160">160 cols</option>'
    + '</select>'
    + '<select class="imgv-ascii-color" title="Color mode" hidden>'
    + '<option value="mono" selected>Mono</option><option value="ansi">Color</option>'
    + '</select>'
    + '<select class="imgv-ascii-charset" title="Character set" hidden>'
    + '<option value="blocks" selected>Blocks</option><option value="classic">Classic</option><option value="braille">Braille</option>'
    + '</select>'
    + '<button class="imgv-ascii-copy" title="Copy ASCII text" hidden>Copy</button>'
    + '</div>'
    + '<div class="imgv-stage"><img class="imgv-img" alt="' + esc(intake.filename) + '"></div>'
    + '<div class="imgv-ascii-out" hidden></div>';

  const img = host.querySelector('.imgv-img');
  const zoomLabel = host.querySelector('.imgv-zoom');
  const asciiBtn = host.querySelector('.imgv-ascii-btn');
  const asciiCols = host.querySelector('.imgv-ascii-cols');
  const asciiColor = host.querySelector('.imgv-ascii-color');
  const asciiCharset = host.querySelector('.imgv-ascii-charset');
  const asciiCopy = host.querySelector('.imgv-ascii-copy');
  const asciiOut = host.querySelector('.imgv-ascii-out');
  let natural = 0, fit = true, zoom = 1, asciiMode = false, asciiText = '';

  function apply() {
    host.querySelector('.imgv-fit').classList.toggle('active', fit);
    if (fit || !natural) { img.style.width = ''; img.style.maxWidth = ''; img.style.maxHeight = ''; zoomLabel.textContent = 'fit'; }
    else { img.style.maxWidth = 'none'; img.style.maxHeight = 'none'; img.style.width = Math.round(natural * zoom) + 'px'; zoomLabel.textContent = Math.round(zoom * 100) + '%'; }
  }
  host.querySelector('.imgv-fit').addEventListener('click', () => { fit = true; apply(); });
  host.querySelector('.imgv-100').addEventListener('click', () => { fit = false; zoom = 1; apply(); });
  host.querySelector('.imgv-up').addEventListener('click', () => { fit = false; zoom = Math.min(16, zoom * 1.25); apply(); });
  host.querySelector('.imgv-dn').addEventListener('click', () => { fit = false; zoom = Math.max(0.1, zoom / 1.25); apply(); });

  img.src = url;
  apply();
  dimensions(url).then((d) => { if (d) { natural = d.w; apply(); } });

  // ASCII controls — lazy import to not block initial render
  async function renderAscii() {
    asciiBtn.textContent = 'Loading…';
    asciiBtn.disabled = true;
    try {
      const { imageToAscii } = await import('./ascii-converter.js');
      const cols = parseInt(asciiCols.value, 10) || 80;
      const colorMode = asciiColor.value || 'mono';
      const charset = asciiCharset.value || 'blocks';
      const result = await imageToAscii(intake.bytes, mime, { cols, colorMode, charset });
      asciiText = result.lines.map((l) => (result.isHtml ? l.replace(/<[^>]+>/g, '') : l)).join('\n');
      if (result.isHtml) {
        asciiOut.innerHTML = '<pre class="imgv-ascii-pre">' + result.lines.join('\n') + '</pre>';
      } else {
        asciiOut.textContent = '';
        const pre = document.createElement('pre');
        pre.className = 'imgv-ascii-pre';
        pre.textContent = result.lines.join('\n');
        asciiOut.appendChild(pre);
      }
    } catch (e) {
      asciiOut.textContent = 'ASCII conversion failed: ' + (e.message || e);
    }
    asciiBtn.textContent = 'Image';
    asciiBtn.disabled = false;
  }

  function toggleAscii() {
    asciiMode = !asciiMode;
    asciiBtn.textContent = asciiMode ? 'Image' : 'ASCII';
    asciiBtn.classList.toggle('active', asciiMode);
    host.querySelector('.imgv-stage').hidden = asciiMode;
    asciiOut.hidden = !asciiMode;
    [asciiCols, asciiColor, asciiCharset, asciiCopy].forEach((el) => { el.hidden = !asciiMode; });
    if (asciiMode) {
      renderAscii();
      // Metagame hook
      recordStage3AsciiActivation({ file: intake.filename });

      // Screensaver
      import('./ascii-screensaver.js').then(({ installScreensaver }) => {
        if (!host._ss) {
          host._ss = installScreensaver(host, () => asciiMode);
        }
        host._ss.start();
      });
    } else {
      host._ss?.stop();
    }
  }

  asciiBtn.addEventListener('click', toggleAscii);

  const rerender = () => { if (asciiMode) renderAscii(); };
  asciiCols.addEventListener('change', rerender);
  asciiColor.addEventListener('change', rerender);
  asciiCharset.addEventListener('change', rerender);

  asciiCopy.addEventListener('click', () => {
    if (asciiText) navigator.clipboard?.writeText(asciiText);
  });

  return { parentNode: host, revoke: () => { URL.revokeObjectURL(url); host._ss?.stop(); } };
}
