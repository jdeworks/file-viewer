// ASCII / ANSI art renderer — plain <pre> with ANSI escape parser.
// Returns bodyHtml for the sandboxed iframe (no external deps).

const ANSI_SIZE_LIMIT = 500 * 1024; // 500KB char limit

// 256-color ANSI palette: derive algorithmically (no lookup table).
function ansi256ToHex(n) {
  if (n < 16) {
    // Standard 16 colors (terminal defaults)
    const STD = ['#000000','#aa0000','#00aa00','#aa5500','#0000aa','#aa00aa','#00aaaa','#aaaaaa',
                 '#555555','#ff5555','#55ff55','#ffff55','#5555ff','#ff55ff','#55ffff','#ffffff'];
    return STD[n];
  }
  if (n < 232) {
    // 6×6×6 RGB cube: indices 16–231
    const idx = n - 16;
    const b = idx % 6, g = Math.floor(idx / 6) % 6, r = Math.floor(idx / 36);
    const c = (v) => v === 0 ? 0 : v * 40 + 55;
    return '#' + [r, g, b].map((v) => c(v).toString(16).padStart(2, '0')).join('');
  }
  // Grayscale ramp: indices 232–255 (10-step from 8 to 238)
  const v = 8 + (n - 232) * 10;
  const h = v.toString(16).padStart(2, '0');
  return '#' + h + h + h;
}

// Parse ANSI SGR escape sequences and emit HTML spans.
// State machine: NORMAL → AFTER_ESC → IN_CSI
function parseAnsi(text) {
  const out = [];
  let state = 'NORMAL';
  let csiParams = '';
  let fg = null, bg = null, bold = false, dim = false;

  function openSpan() {
    const styles = [];
    if (fg) styles.push('color:' + fg);
    if (bg) styles.push('background:' + bg);
    if (bold) styles.push('font-weight:700');
    if (dim) styles.push('opacity:0.6');
    if (!styles.length) return '';
    return '<span style="' + styles.join(';') + '">';
  }

  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  let spanOpen = false;

  function flushSpan() {
    if (spanOpen) { out.push('</span>'); spanOpen = false; }
  }

  function applyStyle() {
    flushSpan();
    const s = openSpan();
    if (s) { out.push(s); spanOpen = true; }
  }

  function applySgr(params) {
    const ns = params.split(';').map((p) => parseInt(p || '0', 10));
    let i = 0;
    while (i < ns.length) {
      const n = ns[i++];
      if (n === 0) { fg = null; bg = null; bold = false; dim = false; }
      else if (n === 1) bold = true;
      else if (n === 2) dim = true;
      else if (n === 22) { bold = false; dim = false; }
      else if (n === 39) fg = null;
      else if (n === 49) bg = null;
      else if (n >= 30 && n <= 37) fg = ansi256ToHex(n - 30);
      else if (n >= 90 && n <= 97) fg = ansi256ToHex(n - 90 + 8);
      else if (n >= 40 && n <= 47) bg = ansi256ToHex(n - 40);
      else if (n >= 100 && n <= 107) bg = ansi256ToHex(n - 100 + 8);
      else if (n === 38 && ns[i] === 5) { fg = ansi256ToHex(ns[i + 1] || 0); i += 2; }
      else if (n === 48 && ns[i] === 5) { bg = ansi256ToHex(ns[i + 1] || 0); i += 2; }
      else if (n === 38 && ns[i] === 2) { fg = '#' + [ns[i+1],ns[i+2],ns[i+3]].map((v) => (v||0).toString(16).padStart(2,'0')).join(''); i += 4; }
      else if (n === 48 && ns[i] === 2) { bg = '#' + [ns[i+1],ns[i+2],ns[i+3]].map((v) => (v||0).toString(16).padStart(2,'0')).join(''); i += 4; }
    }
    applyStyle();
  }

  for (let ci = 0; ci < text.length; ci++) {
    const ch = text[ci];
    if (state === 'NORMAL') {
      if (ch === '\x1b') { state = 'AFTER_ESC'; }
      else { out.push(esc(ch)); }
    } else if (state === 'AFTER_ESC') {
      if (ch === '[') { state = 'IN_CSI'; csiParams = ''; }
      else { state = 'NORMAL'; out.push(esc(ch)); }
    } else if (state === 'IN_CSI') {
      if (ch >= '0' && ch <= '9' || ch === ';') { csiParams += ch; }
      else {
        if (ch === 'm') applySgr(csiParams);
        // Ignore other CSI sequences (cursor movement etc.)
        state = 'NORMAL'; csiParams = '';
      }
    }
  }
  flushSpan();
  return out.join('');
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

function parseSauce(text) {
  const idx = text.lastIndexOf('SAUCE00');
  if (idx === -1 || idx < text.length - 200) return null;
  const r = text.slice(idx, idx + 128);
  const clean = (s) => s.replace(/\0/g, '').trim();
  return {
    title: clean(r.slice(7, 42)),
    author: clean(r.slice(42, 62)),
    group: clean(r.slice(62, 82)),
  };
}

const CSS = `
<style>
body { margin: 0; padding: 0; background: #0d0d0d; color: #ccc; font: 13px/1.2 "Courier New", Courier, monospace; }
body:not(.fv-dark) { background: #f8f8f8; color: #222; }
.aa-notice { font-family: system-ui, sans-serif; font-size: 12px; color: #888; padding: 6px 10px;
  border-bottom: 1px solid #333; background: #1a1a1a; }
body:not(.fv-dark) .aa-notice { background: #eee; border-color: #ccc; }
.aa-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 10px;
  border-bottom: 1px solid #333; background: #151515; font-family: system-ui, sans-serif; font-size: 12px; }
.aa-sauce { color: #ccc; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.aa-copy { border: 1px solid #444; border-radius: 4px; background: #222; color: #ddd; padding: 4px 8px; font: inherit; cursor: pointer; }
.aa-copy:hover { background: #2d2d2d; }
body:not(.fv-dark) .aa-head { background: #eee; border-color: #ccc; }
body:not(.fv-dark) .aa-sauce { color: #333; }
body:not(.fv-dark) .aa-copy { background: #fff; color: #222; border-color: #bbb; }
.aa-wrap { overflow: auto; padding: 12px; }
.aa-pre { white-space: pre; font: 13px/1.2 "Courier New", Courier, monospace;
  tab-size: 8; -moz-tab-size: 8; }
</style>
`;

export async function render(intake, _ctx) {
  let text = intake.text || '';
  const rawText = text;
  let notice = '';
  const sauce = parseSauce(text);

  const sauceIdx = text.lastIndexOf('SAUCE00');
  if (sauceIdx !== -1 && sauceIdx > text.length - 200) {
    text = text.slice(0, sauceIdx).replace(/\x1a$/, '');
  }

  if (text.length > ANSI_SIZE_LIMIT) {
    text = text.slice(0, ANSI_SIZE_LIMIT);
    notice = `<div class="aa-notice">⚠ Truncated at ${(ANSI_SIZE_LIMIT / 1024).toFixed(0)} KB</div>`;
  }

  const hasAnsi = /\x1b\[/.test(text);
  const content = hasAnsi ? parseAnsi(text) : esc(text);
  const sauceBits = sauce ? [sauce.title, sauce.author, sauce.group].filter(Boolean).join(' · ') : '';
  const header = '<div class="aa-head"><div class="aa-sauce">' + (sauceBits ? esc(sauceBits) : 'ASCII / ANSI art') + '</div><button class="aa-copy" type="button">Copy</button></div>';
  const script = `<script>
(() => {
  const raw = ${JSON.stringify(rawText)};
  const btn = document.querySelector('.aa-copy');
  btn?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(raw); btn.textContent = 'Copied'; }
    catch {
      const ta = document.createElement('textarea');
      ta.value = raw; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove(); btn.textContent = 'Copied';
    }
    setTimeout(() => { btn.textContent = 'Copy'; }, 1200);
  });
})();
</script>`;

  const bodyHtml = CSS + header + notice + '<div class="aa-wrap"><pre class="aa-pre">' + content + '</pre></div>' + script;
  return { bodyHtml, hadUnsafe: false };
}
