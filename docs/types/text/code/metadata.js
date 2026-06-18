import { languageFor, languageLabelFor } from './langmap.js';
import { analyze } from './metrics.js';

export function extract(intake) {
  const text = intake.text || '';
  const lines = text.split('\n');
  const nonEmpty = lines.filter((l) => l.trim()).length;
  const blank = lines.length - nonEmpty;
  const commentLines = countCommentLines(lines);
  const codeLines = Math.max(0, nonEmpty - commentLines);
  const todos = (text.match(/\b(TODO|FIXME|XXX)\b/gi) || []).length;
  const lang = languageFor(intake);
  const out = [
    { label: 'Language', value: languageLabelFor(lang) },
    { label: 'Lines of code', value: String(codeLines) },
    { label: 'Non-empty lines', value: String(nonEmpty) },
    { label: 'Blank lines', value: String(blank) },
    { label: 'Comment lines', value: String(commentLines) },
    { label: 'Comment density', value: percent(commentLines, nonEmpty) },
    { label: 'Characters', value: String(text.length) },
    { label: 'Max indentation', value: String(maxIndent(lines)) },
    { label: 'Max nesting', value: String(maxNesting(text, lang)) },
  ];
  if (todos) out.push({ label: 'TODO/FIXME markers', value: String(todos) });
  const moduleFacts = moduleMetrics(text, lang);
  if (moduleFacts.imports) out.push({ label: 'Imports/includes', value: String(moduleFacts.imports) });
  if (moduleFacts.entrypoints) out.push({ label: 'Entrypoints', value: String(moduleFacts.entrypoints) });
  if (lang === 'javascript' || lang === 'typescript') {
    const exports = moduleFacts.exports;
    const classes = (text.match(/^\s*(?:export\s+)?(?:default\s+)?class\s+[A-Za-z_$]/gm) || []).length;
    out.push(
      { label: 'Exports', value: String(exports) },
      { label: 'Classes', value: String(classes) },
    );
  }
  // File-level code metrics summary (per-function detail shows as a CodeLens in the editor).
  const { functions, summary } = analyze(text, lang);
  if (summary && summary.count > 0) {
    const largest = functions.reduce((best, fn) => !best || fn.loc > best.loc ? fn : best, null);
    const mostComplex = functions.reduce((best, fn) => !best || fn.complexity > best.complexity ? fn : best, null);
    const avgLoc = Math.round((functions.reduce((sum, fn) => sum + fn.loc, 0) / functions.length) * 10) / 10;
    const complexFns = functions.filter((fn) => fn.complexity >= 10).length;
    out.push(
      { label: 'Functions', value: String(summary.count) },
      { label: 'Avg complexity', value: String(summary.avgComplexity) },
      { label: 'Max complexity', value: String(summary.maxComplexity) },
      { label: 'Complex functions', value: String(complexFns) },
      { label: 'Avg function LOC', value: String(avgLoc) },
      { label: 'Max function LOC', value: String(largest?.loc || 0) },
      { label: 'Largest function', value: largest ? `${largest.name} (${largest.loc} LOC)` : 'none' },
      { label: 'Most complex function', value: mostComplex ? `${mostComplex.name} (${mostComplex.complexity})` : 'none' },
    );
  }
  return out;
}

function percent(part, total) {
  if (!total) return '0%';
  return Math.round((part / total) * 1000) / 10 + '%';
}

function maxIndent(lines) {
  return lines.reduce((max, line) => {
    if (!line.trim()) return max;
    const indent = (line.match(/^[\t ]*/) || [''])[0].replace(/\t/g, '  ').length;
    return Math.max(max, indent);
  }, 0);
}

function maxNesting(text, lang) {
  if (lang === 'python') {
    return text.split('\n').reduce((max, line) => {
      if (!line.trim()) return max;
      const indent = (line.match(/^ */) || [''])[0].length;
      return Math.max(max, Math.floor(indent / 4));
    }, 0);
  }
  let depth = 0;
  let max = 0;
  for (const char of stripStringsAndComments(text)) {
    if (char === '{') max = Math.max(max, ++depth);
    else if (char === '}') depth = Math.max(0, depth - 1);
  }
  return max;
}

function moduleMetrics(text, lang) {
  const imports = [
    /^\s*import(?:\s|["{*])/gm,
    /\brequire\s*\(/g,
    /^\s*#include\s+[<"]/gm,
    /^\s*use\s+[\w:]+/gm,
    /^\s*from\s+\S+\s+import\s+/gm,
    /^\s*import\s+\S+/gm,
    /^\s*require\s+['"]/gm,
  ].reduce((sum, re) => sum + ((text.match(re) || []).length), 0);
  const exports = (text.match(/^\s*export\s+/gm) || []).length
    + (text.match(/\bmodule\.exports\b/g) || []).length;
  const entrypoints = [
    /\bif\s*\(\s*require\.main\s*===\s*module\s*\)/g,
    /\bif\s+__name__\s*==\s*['"]__main__['"]/g,
    /\bfunc\s+main\s*\(/g,
    /\bfn\s+main\s*\(/g,
    /\bpublic\s+static\s+void\s+main\s*\(/g,
    /\bint\s+main\s*\(/g,
    /\bstatic\s+void\s+Main\s*\(/g,
    /@main\b/g,
  ].reduce((sum, re) => sum + ((text.match(re) || []).length), 0);
  return { imports, exports, entrypoints, lang };
}

function stripStringsAndComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/#.*$/gm, '')
    .replace(/(['"`])(?:\\.|(?!\1)[\s\S])*\1/g, '');
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
