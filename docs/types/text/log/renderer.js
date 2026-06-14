// Log preview: colorize lines by severity (ERROR / WARN / INFO / DEBUG) and highlight leading
// timestamps. Plain presentation — large logs stay in the editor; this is a readable overlay.
// Markup lives in sibling .html templates (container/row) and is filled via core/template.js —
// the severity class and pre-sanitised timestamp HTML go through {{slot}} / {{&slot}} as appropriate.
import { loadTemplate, fill, esc, fillEach } from '../../../core/template.js';

const CONTAINER = new URL('./container.html', import.meta.url);
const ROW = new URL('./row.html', import.meta.url);

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
  const [containerTpl, rowTpl] = await Promise.all([loadTemplate(CONTAINER), loadTemplate(ROW)]);
  const rows = fillEach(rowTpl, lines, (l) => {
    const lv = levelOf(l);
    const cls = lv ? 'll ' + lv : 'll';
    const m = l.match(TS);
    let line;
    if (m) line = '<span class="l-ts">' + esc(m[0]) + '</span>' + esc(l.slice(m[0].length));
    else line = esc(l) || '&nbsp;';
    return { cls, line };
  });
  return { bodyHtml: fill(containerTpl, { rows }), hadUnsafe: false };
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
