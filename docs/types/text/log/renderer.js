// Log preview: colorize lines by severity (ERROR / WARN / INFO / DEBUG), render embedded ANSI
// color escapes, highlight leading timestamps, and offer a client-side severity filter. Plain
// presentation — large logs stay in the editor; this is a readable overlay. Markup lives in
// sibling .html templates (container/row); the container carries the filter bar + filter script.
import { loadTemplate, fill, esc, fillEach } from '../../../core/template.js';

const CONTAINER = new URL('./container.html', import.meta.url);
const ROW = new URL('./row.html', import.meta.url);

const TS = /^(\[?\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?(?:Z|[+-]\d{2}:?\d{2})?\]?|\[?\d{2}:\d{2}:\d{2}(?:[.,]\d+)?\]?)/;
const ANSI_SGR = /\x1b\[([0-9;]*)m/g;
const ANSI_ANY = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;   // any CSI sequence (to strip non-color ones)

// Standard + bright 16-colour foreground palette (theme-neutral, readable on light & dark).
const ANSI_FG = {
  30: '#3b4048', 31: '#cf222e', 32: '#2ea043', 33: '#bf8700', 34: '#4c9aff', 35: '#a371f7', 36: '#1b7c83', 37: '#9aa0a8',
  90: '#6e7781', 91: '#ff7b72', 92: '#3fb950', 93: '#d29922', 94: '#79c0ff', 95: '#d2a8ff', 96: '#56d4dd', 97: '#d0d7de',
};

// xterm 256-colour → #rrggbb (16 base, 6×6×6 cube, 24-step grayscale).
function xterm256(n) {
  if (n < 16) return ANSI_FG[n < 8 ? 30 + n : 82 + n] || '#9aa0a8';
  if (n >= 232) { const v = 8 + (n - 232) * 10; return rgb(v, v, v); }
  const c = n - 16, r = Math.floor(c / 36), g = Math.floor((c % 36) / 6), b = c % 6;
  const lvl = (x) => (x === 0 ? 0 : 55 + x * 40);
  return rgb(lvl(r), lvl(g), lvl(b));
}
const hex2 = (x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0');
const rgb = (r, g, b) => '#' + hex2(r) + hex2(g) + hex2(b);

function levelOf(line) {
  if (/\b(ERROR|ERR|FATAL|CRITICAL|SEVERE)\b/.test(line)) return 'l-error';
  if (/\b(WARN(?:ING)?)\b/.test(line)) return 'l-warn';
  if (/\b(INFO|NOTICE)\b/.test(line)) return 'l-info';
  if (/\b(DEBUG|TRACE|VERBOSE)\b/.test(line)) return 'l-debug';
  return '';
}

// Convert a line containing ANSI SGR escapes into escaped HTML with <span style> colour runs.
// Text segments are always esc()'d; non-colour CSI sequences are stripped from emitted text.
function ansiToHtml(str) {
  let out = '', idx = 0, m, spanOpen = false;
  let style = { color: null, bold: false };
  const emit = (t) => { if (t) out += esc(t.replace(ANSI_ANY, '')); };
  const reopen = () => {
    if (spanOpen) { out += '</span>'; spanOpen = false; }
    const css = [];
    if (style.color) css.push('color:' + style.color);
    if (style.bold) css.push('font-weight:bold');
    if (css.length) { out += '<span style="' + css.join(';') + '">'; spanOpen = true; }
  };
  ANSI_SGR.lastIndex = 0;
  while ((m = ANSI_SGR.exec(str))) {
    emit(str.slice(idx, m.index));
    idx = ANSI_SGR.lastIndex;
    const codes = (m[1] || '0').split(';').map(Number);
    for (let i = 0; i < codes.length; i++) {
      const c = codes[i];
      if (c === 0) style = { color: null, bold: false };
      else if (c === 1) style.bold = true;
      else if (c === 22) style.bold = false;
      else if (c === 39) style.color = null;
      else if (ANSI_FG[c] != null) style.color = ANSI_FG[c];
      else if (c === 38 && codes[i + 1] === 5) { style.color = xterm256(codes[i + 2] | 0); i += 2; }
      else if (c === 38 && codes[i + 1] === 2) { style.color = rgb(codes[i + 2] | 0, codes[i + 3] | 0, codes[i + 4] | 0); i += 4; }
    }
    reopen();
  }
  emit(str.slice(idx));
  if (spanOpen) out += '</span>';
  return out || '&nbsp;';
}

export async function render(intake, _ctx) {
  const lines = (intake.text || '').split(/\r?\n/);
  const [containerTpl, rowTpl] = await Promise.all([loadTemplate(CONTAINER), loadTemplate(ROW)]);
  const counts = { 'l-error': 0, 'l-warn': 0, 'l-info': 0, 'l-debug': 0 };
  const rows = fillEach(rowTpl, lines, (l) => {
    const hasAnsi = /\x1b\[/.test(l);
    // Classify on the ANSI-stripped text so a colour-wrapped level word (\x1b[31mERROR\x1b[0m)
    // still matches the \b…\b level regexes (the escape's trailing letter would otherwise abut it).
    const lv = levelOf(hasAnsi ? l.replace(ANSI_ANY, '') : l);
    if (lv) counts[lv]++;
    const cls = lv ? 'll ' + lv : 'll';
    let line;
    if (hasAnsi) {
      line = ansiToHtml(l);                          // ANSI line: render colours (no ts highlight)
    } else {
      const m = l.match(TS);
      if (m) line = '<span class="l-ts">' + esc(m[0]) + '</span>' + esc(l.slice(m[0].length));
      else line = esc(l) || '&nbsp;';
    }
    return { cls, line };
  });

  // Severity filter chips (All + each present level), driven by the container's inline script.
  const LABELS = { 'l-error': 'Error', 'l-warn': 'Warn', 'l-info': 'Info', 'l-debug': 'Debug' };
  const chip = (sev, label, n) =>
    `<button type="button" class="logv-filter${sev === 'all' ? ' active' : ''}" data-sev="${sev}">${label}${n != null ? ' ' + n : ''}</button>`;
  const filters = [chip('all', 'All', lines.length)]
    .concat(Object.keys(LABELS).filter((k) => counts[k]).map((k) => chip(k, LABELS[k], counts[k])))
    .join('');

  return { bodyHtml: fill(containerTpl, { filters, rows }), hadUnsafe: false };
}

export function logStats(text) {
  const lines = (text || '').split(/\r?\n/);
  let error = 0, warn = 0, info = 0, debug = 0, timestamped = 0;
  for (const l of lines) {
    const lv = levelOf(l);
    if (lv === 'l-error') error++;
    else if (lv === 'l-warn') warn++;
    else if (lv === 'l-info') info++;
    else if (lv === 'l-debug') debug++;
    if (TS.test(l)) timestamped++;
  }
  return { lines: lines.length, error, warn, info, debug, timestamped };
}
