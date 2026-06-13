// Per-function code metrics — LOC + an approximate cyclomatic complexity — computed with a
// lightweight heuristic scanner (no parser dependency). Two strategies:
//   • brace languages (C-family: JS/TS/Java/C/C++/C#/Go/Rust/PHP/Swift/Kotlin/Scala/Dart) —
//     find function headers (`name(...) { … }`) and brace-match the body.
//   • Python — `def`/`async def` with an indentation-delimited body.
// Cyclomatic complexity ≈ 1 + number of decision points (if/for/while/case/catch + && || ?).
// Intentionally approximate: it powers a display-only CodeLens overlay, never mutates the file.

const BRACE_LANGS = new Set(['javascript', 'typescript', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'php', 'swift', 'kotlin', 'scala', 'dart']);
const MAX_CHARS = 400_000;   // skip very large files — keep the editor responsive

export function analyze(text, lang) {
  if (!text || text.length > MAX_CHARS) return { functions: [], summary: null };
  let functions = [];
  if (lang === 'python') functions = analyzePython(text);
  else if (BRACE_LANGS.has(lang)) functions = analyzeBraces(text);
  return { functions, summary: summarize(text, functions) };
}

function summarize(text, fns) {
  const totalLoc = text.split('\n').length;
  if (!fns.length) return { totalLoc, count: 0, avgComplexity: 0, maxComplexity: 0 };
  const comps = fns.map((f) => f.complexity);
  return {
    totalLoc,
    count: fns.length,
    avgComplexity: Math.round((comps.reduce((a, b) => a + b, 0) / fns.length) * 10) / 10,
    maxComplexity: Math.max(...comps),
  };
}

// Build a line-number lookup from char offsets.
function lineIndexer(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
  return (idx) => {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (starts[m] <= idx) lo = m; else hi = m - 1; }
    return lo + 1;   // 1-based
  };
}

const NON_FN = /^(if|for|while|switch|catch|do|else|return|with|function|await|typeof|in|of|new|case)$/;

function analyzeBraces(text) {
  const lineAt = lineIndexer(text);
  const fns = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '{') continue;
    // Walk back over whitespace to the char that precedes the brace.
    let j = i - 1;
    while (j >= 0 && /\s/.test(text[j])) j--;
    if (j < 0) continue;
    // Arrow function: `… ) => {`  → step back over the `=>`.
    if (text[j] === '>' && text[j - 1] === '=') {
      let k = j - 2;
      while (k >= 0 && /\s/.test(text[k])) k--;
      if (text[k] !== ')') continue;   // a param-less / non-fn arrow body we can't name — skip
      j = k;
    }
    if (text[j] !== ')') continue;     // a function body always opens right after `)`
    // Match the parameter list back to its `(`.
    let depth = 0, k = j;
    for (; k >= 0; k--) { if (text[k] === ')') depth++; else if (text[k] === '(') { depth--; if (depth === 0) break; } }
    if (k < 0) continue;
    // Identifier immediately before `(` is the function name (anonymous if none / a keyword).
    let m = k - 1;
    while (m >= 0 && /\s/.test(text[m])) m--;
    let end = m;
    while (m >= 0 && /[\w$]/.test(text[m])) m--;
    const ident = text.slice(m + 1, end + 1);
    if (NON_FN.test(ident)) continue;  // control statement, not a function
    const name = ident || '(anonymous)';
    // Brace-match the body to find the end line.
    let d = 0, e = i;
    for (; e < text.length; e++) { if (text[e] === '{') d++; else if (text[e] === '}') { d--; if (d === 0) break; } }
    const startLine = lineAt(i), endLine = lineAt(e);
    fns.push({ name, line: startLine, endLine, loc: endLine - startLine + 1, complexity: complexityOf(text.slice(i, e + 1)) });
  }
  return fns;
}

function complexityOf(body) {
  let c = 1;
  c += (body.match(/\b(if|for|while|case|catch)\b/g) || []).length;
  c += (body.match(/&&|\|\|/g) || []).length;
  c += (body.match(/\?[^.?:]/g) || []).length;   // ternary (crude: avoid ?. and ?: and ??)
  return c;
}

function analyzePython(text) {
  const lines = text.split('\n');
  const fns = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*)(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(/);
    if (!m) continue;
    const indent = m[1].length;
    let j = i + 1;
    for (; j < lines.length; j++) {
      if (!lines[j].trim()) continue;                       // blank lines don't end a body
      if (lines[j].match(/^\s*/)[0].length <= indent) break; // dedent → body ended
    }
    let e = j - 1;
    while (e > i && !lines[e].trim()) e--;                   // trim trailing blanks
    fns.push({ name: m[2], line: i + 1, endLine: e + 1, loc: e - i + 1, complexity: complexityPy(lines.slice(i, e + 1).join('\n')) });
  }
  return fns;
}

function complexityPy(body) {
  let c = 1;
  c += (body.match(/\b(if|elif|for|while|except)\b/g) || []).length;
  c += (body.match(/\b(and|or)\b/g) || []).length;
  return c;
}
