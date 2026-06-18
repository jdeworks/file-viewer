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
    fact('Language', languageLabelFor(intake), 'Code metrics'),
    fact('Lines of code', codeLines, 'Code metrics'),
    { label: 'Blank lines', value: String(blank) },
    fact('Comment lines', commentLines, 'Code metrics'),
    fact('Comment density', percent(commentLines, nonEmpty), 'Code metrics'),
    fact('Non-empty lines', nonEmpty, 'Code shape'),
    fact('Characters', text.length, 'Code shape'),
    fact('Max indentation', maxIndent(lines), 'Code shape'),
    fact('Max nesting', maxNesting(text, lang), 'Code shape'),
  ];
  if (todos) out.push(fact('TODO/FIXME markers', todos, 'Code structure'));
  const moduleFacts = moduleMetrics(text, lang);
  if (moduleFacts.imports) out.push(fact('Imports/includes', moduleFacts.imports, 'Code structure'));
  if (moduleFacts.entrypoints) out.push(fact('Entrypoints', moduleFacts.entrypoints, 'Code structure'));
  if (lang === 'javascript' || lang === 'typescript') {
    const exports = moduleFacts.exports;
    const classes = (text.match(/^\s*(?:export\s+)?(?:default\s+)?class\s+[A-Za-z_$]/gm) || []).length;
    out.push(
      fact('Exports', exports, 'Code structure'),
      fact('Classes', classes, 'Code structure'),
    );
  }
  const { functions, summary } = analyze(text, lang);
  if (summary && summary.count > 0) {
    const largest = functions.reduce((best, fn) => !best || fn.loc > best.loc ? fn : best, null);
    const mostComplex = functions.reduce((best, fn) => !best || fn.complexity > best.complexity ? fn : best, null);
    const avgLoc = Math.round((functions.reduce((sum, fn) => sum + fn.loc, 0) / functions.length) * 10) / 10;
    const complexFns = functions.filter((fn) => fn.complexity >= 10).length;
    out.push(
      fact('Functions', summary.count, 'Code metrics'),
      fact('Avg complexity', summary.avgComplexity, 'Code metrics'),
      fact('Max complexity', summary.maxComplexity, 'Code metrics'),
      fact('Complex functions', complexFns, 'Code metrics'),
      fact('Avg function LOC', avgLoc, 'Code metrics'),
      fact('Max function LOC', largest?.loc || 0, 'Code metrics'),
      fact('Largest function', largest ? `${largest.name} (${largest.loc} LOC)` : 'none', 'Code metrics'),
      fact('Most complex function', mostComplex ? `${mostComplex.name} (${mostComplex.complexity})` : 'none', 'Code metrics'),
    );
  }
  return out;
}

function fact(label, value, section) {
  return { label, value: String(value), section };
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
