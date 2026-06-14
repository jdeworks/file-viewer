// Unified-diff / patch preview: colorize added / removed / hunk-header / file-header lines.
// Pure presentation of the text — no patching applied. Markup lives in sibling .html templates
// (doc/row) and is filled via core/template.js — line text is HTML-escaped before insertion.
import { loadTemplate, fill, esc, fillEach } from '../../../core/template.js';

const DOC = new URL('./doc.html', import.meta.url);
const ROW = new URL('./row.html', import.meta.url);

function classOf(line) {
  if (/^(diff --git|index |--- |\+\+\+ |new file|deleted file|rename |similarity )/.test(line)) return 'p-file';
  if (/^@@/.test(line)) return 'p-hunk';
  if (/^\+/.test(line)) return 'p-add';
  if (/^-/.test(line)) return 'p-del';
  return '';
}

export async function render(intake, _ctx) {
  const [docTpl, rowTpl] = await Promise.all([loadTemplate(DOC), loadTemplate(ROW)]);
  const lines = (intake.text || '').split(/\r?\n/);
  const rows = fillEach(rowTpl, lines, (l) => {
    const c = classOf(l);
    return { cls: 'pl' + (c ? ' ' + c : ''), content: esc(l) || '&nbsp;' };
  });
  return { bodyHtml: fill(docTpl, { rows }), hadUnsafe: false };
}

// Quick stats for the metadata panel.
export function patchStats(text) {
  const lines = (text || '').split(/\r?\n/);
  let added = 0, removed = 0, files = 0, hunks = 0;
  for (const l of lines) {
    if (/^\+(?!\+\+ )/.test(l)) added++;
    else if (/^-(?!-- )/.test(l)) removed++;
    if (/^diff --git|^--- /.test(l)) files++;
    if (/^@@/.test(l)) hunks++;
  }
  return { added, removed, files, hunks };
}
