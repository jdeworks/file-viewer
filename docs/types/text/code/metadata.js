import { languageFor } from './langmap.js';
import { analyze } from './metrics.js';

export function extract(intake) {
  const text = intake.text || '';
  const lines = text.split('\n');
  const nonEmpty = lines.filter((l) => l.trim()).length;
  const blank = lines.length - nonEmpty;
  const commentLines = countCommentLines(lines);
  const todos = (text.match(/\b(TODO|FIXME|XXX)\b/gi) || []).length;
  const lang = languageFor(intake);
  const out = [
    { label: 'Language', value: lang },
    { label: 'Lines', value: String(lines.length) },
    { label: 'Non-empty lines', value: String(nonEmpty) },
    { label: 'Blank lines', value: String(blank) },
    { label: 'Comment lines', value: String(commentLines) },
    { label: 'Characters', value: String(text.length) },
  ];
  if (todos) out.push({ label: 'TODO/FIXME markers', value: String(todos) });
  if (lang === 'javascript' || lang === 'typescript') {
    const imports = (text.match(/^\s*import(?:\s|["{*])/gm) || []).length
      + (text.match(/\brequire\s*\(/g) || []).length;
    const exports = (text.match(/^\s*export\s+/gm) || []).length
      + (text.match(/\bmodule\.exports\b/g) || []).length;
    const classes = (text.match(/^\s*(?:export\s+)?(?:default\s+)?class\s+[A-Za-z_$]/gm) || []).length;
    out.push(
      { label: 'Imports/requires', value: String(imports) },
      { label: 'Exports', value: String(exports) },
      { label: 'Classes', value: String(classes) },
    );
  }
  // File-level code metrics summary (per-function detail shows as a CodeLens in the editor).
  const { summary } = analyze(text, lang);
  if (summary && summary.count > 0) {
    out.push(
      { label: 'Functions', value: String(summary.count) },
      { label: 'Avg complexity', value: String(summary.avgComplexity) },
      { label: 'Max complexity', value: String(summary.maxComplexity) },
    );
  }
  return out;
}

function countCommentLines(lines) {
  let inBlock = false;
  let count = 0;
  for (const raw of lines) {
    let line = raw.trim();
    if (!line) continue;
    let counted = false;
    while (line) {
      if (inBlock) {
        counted = true;
        const end = line.indexOf('*/');
        if (end < 0) break;
        inBlock = false;
        line = line.slice(end + 2).trim();
        continue;
      }
      if (line.startsWith('//') || line.startsWith('#')) { counted = true; break; }
      const start = line.indexOf('/*');
      if (start < 0) break;
      counted = true;
      const end = line.indexOf('*/', start + 2);
      if (end < 0) { inBlock = true; break; }
      line = line.slice(end + 2).trim();
    }
    if (counted) count++;
  }
  return count;
}
