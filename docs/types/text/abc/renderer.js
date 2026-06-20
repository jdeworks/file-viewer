// ABC notation viewer — renders sheet music via abcjs (lazy-loaded). Shows a structured header
// summary immediately; replaces each card's placeholder with rendered SVG notation on load.
// "Export PNG" downloads a rasterized canvas snapshot of the rendered score.
import { loadGlobal, vendor } from '../../../core/script-loader.js';

const FIELD_LABELS = {
  X: 'Index', T: 'Title', C: 'Composer', Z: 'Transcriber', O: 'Origin',
  A: 'Area', S: 'Source', N: 'Notes', G: 'Group', H: 'History',
  R: 'Rhythm', M: 'Meter', L: 'Default Note Length', Q: 'Tempo', K: 'Key',
  V: 'Voice', F: 'File URL', W: 'Words (inline)', B: 'Book',
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function parseTunes(text) {
  const tunes = [];
  let current = null;
  let bodyLines = [];

  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    if (!line || line.startsWith('%')) {
      if (current && bodyLines.length) { current.body = bodyLines.join('\n'); bodyLines = []; }
      continue;
    }

    const m = line.match(/^([A-Za-z+]):\s*(.*)/);
    if (m) {
      const [, key, value] = m;
      if (key === 'X') {
        if (current && bodyLines.length) current.body = bodyLines.join('\n');
        bodyLines = [];
        // Collect the full ABC source block for this tune
        const xIdx = text.indexOf(line);
        current = { index: value.trim(), fields: [], src: '' };
        tunes.push(current);
      } else if (current) {
        current.fields.push({ key, value: value.trim() });
      }
    } else if (current) {
      bodyLines.push(line);
    }
  }
  if (current && bodyLines.length) current.body = bodyLines.join('\n');
  return tunes;
}

// Reconstruct the full ABC source for a single tune
function tuneSrc(tune) {
  const lines = ['X:' + tune.index];
  for (const f of tune.fields) lines.push(f.key + ':' + f.value);
  if (tune.body) lines.push(tune.body);
  return lines.join('\n');
}

export async function render(intake) {
  const text = intake.text || '';
  const tunes = parseTunes(text);

  const host = document.createElement('div');
  host.className = 'abc-preview';

  if (!tunes.length) {
    host.innerHTML = '<p class="abc-note">No ABC tune headers found.</p>';
    return { parentNode: host };
  }

  const badge = '<span class="abc-badge">ABC</span>';
  const subtitle = '<span class="abc-subtitle">' + tunes.length + ' tune' + (tunes.length !== 1 ? 's' : '') + '</span>';

  const SHOW = Math.min(tunes.length, 30);
  const cardDivs = tunes.slice(0, SHOW).map((tune, i) => {
    const title = tune.fields.find((f) => f.key === 'T')?.value || '(untitled)';
    const composer = tune.fields.find((f) => f.key === 'C')?.value || null;
    const key = tune.fields.find((f) => f.key === 'K')?.value || null;
    const meter = tune.fields.find((f) => f.key === 'M')?.value || null;
    const rhythm = tune.fields.find((f) => f.key === 'R')?.value || null;
    const tempo = tune.fields.find((f) => f.key === 'Q')?.value || null;

    const pills = [key && 'Key: ' + key, meter && 'Meter: ' + meter, rhythm, tempo && 'Tempo: ' + tempo]
      .filter(Boolean).map((p) => '<span class="abc-pill">' + esc(p) + '</span>').join('');

    return '<div class="abc-tune" data-tune-idx="' + i + '">'
      + '<div class="abc-tune-header">'
      + '<span class="abc-index">X:' + esc(tune.index) + '</span>'
      + '<span class="abc-tune-title">' + esc(title) + '</span>'
      + '<button class="abc-export-png" data-idx="' + i + '" title="Export score as PNG" hidden>PNG</button>'
      + '</div>'
      + (composer ? '<div class="abc-composer">' + esc(composer) + '</div>' : '')
      + (pills ? '<div class="abc-pills">' + pills + '</div>' : '')
      + '<div class="abc-score-wrap" data-score-idx="' + i + '"><span class="abc-loading">Loading score…</span></div>'
      + '</div>';
  });

  host.innerHTML = '<div class="abc-header">' + badge + subtitle + '</div>'
    + '<div class="abc-tunes">' + cardDivs.join('') + '</div>'
    + (tunes.length > SHOW ? '<p class="abc-note">Showing first ' + SHOW + ' of ' + tunes.length + ' tunes.</p>' : '');

  // Load abcjs lazily and render all visible tunes
  let ABCJS = null;
  try {
    ABCJS = await loadGlobal(vendor('abcjs/abcjs-basic-min.js'), 'ABCJS');
  } catch {
    for (const wrap of host.querySelectorAll('.abc-score-wrap')) {
      wrap.innerHTML = '<span class="abc-note">Score rendering unavailable.</span>';
    }
    return { parentNode: host };
  }

  for (let i = 0; i < SHOW; i++) {
    const wrap = host.querySelector('[data-score-idx="' + i + '"]');
    const btn = host.querySelector('.abc-export-png[data-idx="' + i + '"]');
    if (!wrap) continue;
    try {
      wrap.innerHTML = '';
      // renderAbc(element, abcString, params) → returns array of tune objects
      ABCJS.renderAbc(wrap, tuneSrc(tunes[i]), {
        responsive: 'resize',
        add_classes: true,
        staffwidth: wrap.clientWidth || 600,
      });
      if (btn) btn.hidden = false;
    } catch (err) {
      wrap.innerHTML = '<span class="abc-note">Could not render tune: ' + esc(String(err.message || err)) + '</span>';
    }
  }

  // PNG export: rasterize the SVG via canvas
  for (const btn of host.querySelectorAll('.abc-export-png')) {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx, 10);
      const wrap = host.querySelector('[data-score-idx="' + idx + '"]');
      const svg = wrap && wrap.querySelector('svg');
      if (!svg) return;

      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(svg);
      const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = img.naturalWidth * dpr;
        canvas.height = img.naturalHeight * dpr;
        const ctx2d = canvas.getContext('2d');
        ctx2d.scale(dpr, dpr);
        ctx2d.fillStyle = '#ffffff';
        ctx2d.fillRect(0, 0, img.naturalWidth, img.naturalHeight);
        ctx2d.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob) => {
          if (!blob) return;
          const a = document.createElement('a');
          const tuneTitle = (tunes[idx]?.fields?.find((f) => f.key === 'T')?.value || 'tune-' + idx)
            .replace(/[^a-z0-9_\- ]/gi, '_').trim();
          a.download = tuneTitle + '.png';
          a.href = URL.createObjectURL(blob);
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        }, 'image/png');
      };
      img.src = url;
    });
  }

  return { parentNode: host };
}
