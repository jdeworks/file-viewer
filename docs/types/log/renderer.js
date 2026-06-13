// Log preview: colorize lines by severity (ERROR / WARN / INFO / DEBUG) and highlight leading
// timestamps. Plain presentation — large logs stay in the editor; this is a readable overlay.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const TS = /^(\[?\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?(?:Z|[+-]\d{2}:?\d{2})?\]?|\[?\d{2}:\d{2}:\d{2}(?:[.,]\d+)?\]?)/;

function levelOf(line) {
  if (/\b(ERROR|ERR|FATAL|CRITICAL|SEVERE)\b/.test(line)) return 'l-error';
  if (/\b(WARN(?:ING)?)\b/.test(line)) return 'l-warn';
  if (/\b(INFO|NOTICE)\b/.test(line)) return 'l-info';
  if (/\b(DEBUG|TRACE|VERBOSE)\b/.test(line)) return 'l-debug';
  return '';
}

export async function render(intake, _ctx) {
  const lines = (intake.text || '').split(/\r?\n/);
  const html = lines.map((l) => {
    const cls = levelOf(l);
    const m = l.match(TS);
    let inner;
    if (m) inner = '<span class="l-ts">' + esc(m[0]) + '</span>' + esc(l.slice(m[0].length));
    else inner = esc(l) || '&nbsp;';
    return '<span class="ll' + (cls ? ' ' + cls : '') + '">' + inner + '</span>';
  }).join('');
  return { bodyHtml: '<div class="logv">' + html + '</div>', hadUnsafe: false };
}

export function logStats(text) {
  const lines = (text || '').split(/\r?\n/);
  let error = 0, warn = 0;
  for (const l of lines) {
    const lv = levelOf(l);
    if (lv === 'l-error') error++;
    else if (lv === 'l-warn') warn++;
  }
  return { lines: lines.length, error, warn };
}
