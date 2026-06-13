// Pragmatic TOML parser (covers the common real-world surface: tables, arrays-of-tables,
// dotted/quoted keys, basic + literal strings incl. multiline, integers (dec/hex/oct/bin
// with _), floats (incl inf/nan), booleans, datetimes, arrays incl. multiline, and inline
// tables). Pure client-side, no dependency. Not a byte-perfect TOML 1.0 implementation, but
// good enough to render Cargo.toml / pyproject.toml / netlify.toml and the like.

class NeedMore extends Error {}

const isWs = (c) => c === ' ' || c === '\t';
function skipWs(s, i) { while (isWs(s[i])) i++; return i; }
function skipWsNL(s, i) {           // inside arrays: skip spaces, newlines, and comments
  for (;;) {
    while (isWs(s[i]) || s[i] === '\n' || s[i] === '\r') i++;
    if (s[i] === '#') { while (i < s.length && s[i] !== '\n') i++; continue; }
    return i;
  }
}

const ESCAPES = { n: '\n', t: '\t', r: '\r', '"': '"', '\\': '\\', b: '\b', f: '\f' };
function unescape(s, i, end, out) {
  // s[i] === '\\'
  const c = s[i + 1];
  if (c === 'u' || c === 'U') {
    const len = c === 'u' ? 4 : 8;
    const hex = s.slice(i + 2, i + 2 + len);
    out.push(String.fromCodePoint(parseInt(hex, 16)));
    return i + 2 + len;
  }
  if (c in ESCAPES) { out.push(ESCAPES[c]); return i + 2; }
  if (c === '\n' || (c === '\r' && s[i + 2] === '\n')) {   // line-ending backslash (ML basic)
    let j = i + 1; while (isWs(s[j]) || s[j] === '\n' || s[j] === '\r') j++; return j;
  }
  out.push(c); return i + 2;
}

function parseBasic(s, i) {
  const out = []; i++;
  while (i < s.length) {
    const c = s[i];
    if (c === '"') return { val: out.join(''), i: i + 1 };
    if (c === '\n') throw new NeedMore();
    if (c === '\\') { i = unescape(s, i, s.length, out); continue; }
    out.push(c); i++;
  }
  throw new NeedMore();
}
function parseLiteral(s, i) {
  i++; const start = i;
  while (i < s.length) {
    if (s[i] === "'") return { val: s.slice(start, i), i: i + 1 };
    if (s[i] === '\n') throw new NeedMore();
    i++;
  }
  throw new NeedMore();
}
function parseMLBasic(s, i) {
  i += 3; if (s[i] === '\n') i++; else if (s[i] === '\r' && s[i + 1] === '\n') i += 2;
  const out = [];
  while (i < s.length) {
    if (s.startsWith('"""', i)) return { val: out.join(''), i: i + 3 };
    if (s[i] === '\\') { i = unescape(s, i, s.length, out); continue; }
    out.push(s[i]); i++;
  }
  throw new NeedMore();
}
function parseMLLiteral(s, i) {
  i += 3; if (s[i] === '\n') i++; else if (s[i] === '\r' && s[i + 1] === '\n') i += 2;
  const start = i;
  while (i < s.length) {
    if (s.startsWith("'''", i)) return { val: s.slice(start, i), i: i + 3 };
    i++;
  }
  throw new NeedMore();
}

const DT_RE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;
const TIME_RE = /^\d{2}:\d{2}:\d{2}(\.\d+)?$/;
function parseScalarToken(tok) {
  if (tok === 'true') return true;
  if (tok === 'false') return false;
  if (tok === 'inf' || tok === '+inf') return Infinity;
  if (tok === '-inf') return -Infinity;
  if (tok === 'nan' || tok === '+nan' || tok === '-nan') return NaN;
  if (DT_RE.test(tok)) { const d = new Date(tok.replace(' ', 'T')); return isNaN(+d) ? tok : d; }
  if (TIME_RE.test(tok)) return tok;
  const u = tok.replace(/_/g, '');
  if (/^[+-]?0x[0-9a-fA-F]+$/.test(u)) return parseInt(u, 16);
  if (/^[+-]?0o[0-7]+$/.test(u)) return parseInt(u.replace('0o', ''), 8);
  if (/^[+-]?0b[01]+$/.test(u)) return parseInt(u.replace('0b', ''), 2);
  if (/^[+-]?\d+$/.test(u)) return parseInt(u, 10);
  if (/^[+-]?(\d+(\.\d+)?([eE][+-]?\d+)?|\.\d+)$/.test(u)) return parseFloat(u);
  return tok;   // fallback: bare string
}
function parseScalar(s, i) {
  const start = i;
  while (i < s.length && !',]}#\n\r'.includes(s[i])) i++;
  const raw = s.slice(start, i).trim();
  if (raw === '') throw new NeedMore();
  return { val: parseScalarToken(raw), i };
}

function parseArray(s, i) {
  i++; const arr = [];
  for (;;) {
    i = skipWsNL(s, i);
    if (s[i] === undefined) throw new NeedMore();
    if (s[i] === ']') return { val: arr, i: i + 1 };
    const r = parseValue(s, i); arr.push(r.val); i = skipWsNL(s, r.i);
    if (s[i] === ',') i++;
    else if (s[i] === ']') return { val: arr, i: i + 1 };
    else if (s[i] === undefined) throw new NeedMore();
  }
}
function parseInlineTable(s, i) {
  i++; const obj = {};
  i = skipWs(s, i);
  if (s[i] === '}') return { val: obj, i: i + 1 };
  for (;;) {
    i = skipWs(s, i);
    const k = parseKey(s, i); i = k.i;
    i = skipWs(s, i);
    if (s[i] !== '=') throw new Error('expected = in inline table');
    const r = parseValue(s, i + 1);
    assignPath(obj, k.path, r.val);
    i = skipWs(s, r.i);
    if (s[i] === ',') { i++; continue; }
    if (s[i] === '}') return { val: obj, i: i + 1 };
    if (s[i] === undefined) throw new NeedMore();
    throw new Error('unexpected char in inline table: ' + s[i]);
  }
}

function parseValue(s, i) {
  i = skipWs(s, i);
  const c = s[i];
  if (c === undefined || c === '\n' || c === '\r' || c === '#') throw new NeedMore();
  if (c === '"') return s.startsWith('"""', i) ? parseMLBasic(s, i) : parseBasic(s, i);
  if (c === "'") return s.startsWith("'''", i) ? parseMLLiteral(s, i) : parseLiteral(s, i);
  if (c === '[') return parseArray(s, i);
  if (c === '{') return parseInlineTable(s, i);
  return parseScalar(s, i);
}

// Key parsing: dotted path, each segment bare / "basic" / 'literal'.
function parseKey(s, i) {
  const path = [];
  for (;;) {
    i = skipWs(s, i);
    if (s[i] === '"') { const r = parseBasic(s, i); path.push(r.val); i = r.i; }
    else if (s[i] === "'") { const r = parseLiteral(s, i); path.push(r.val); i = r.i; }
    else { const start = i; while (i < s.length && /[A-Za-z0-9_-]/.test(s[i])) i++; path.push(s.slice(start, i)); }
    i = skipWs(s, i);
    if (s[i] === '.') { i++; continue; }
    return { path, i };
  }
}
function parseKeyPath(str) { return parseKey(str, 0).path; }

function assignPath(obj, path, val) {
  let o = obj;
  for (let k = 0; k < path.length - 1; k++) { if (typeof o[path[k]] !== 'object' || o[path[k]] === null) o[path[k]] = {}; o = o[path[k]]; }
  o[path[path.length - 1]] = val;
}
function enterTable(root, path, isArray) {
  let o = root;
  for (let k = 0; k < path.length - 1; k++) {
    if (o[path[k]] === undefined) o[path[k]] = {};
    o = Array.isArray(o[path[k]]) ? o[path[k]][o[path[k]].length - 1] : o[path[k]];
  }
  const last = path[path.length - 1];
  if (isArray) { if (!Array.isArray(o[last])) o[last] = []; const t = {}; o[last].push(t); return t; }
  if (o[last] === undefined) o[last] = {};
  return o[last];
}

export function parseTOML(src) {
  const root = {};
  let ctx = root;
  const lines = (src || '').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed[0] === '#') continue;
    if (trimmed[0] === '[') {
      const isArray = trimmed.startsWith('[[');
      const close = trimmed.lastIndexOf(isArray ? ']]' : ']');
      ctx = enterTable(root, parseKeyPath(trimmed.slice(isArray ? 2 : 1, close)), isArray);
      continue;
    }
    // key = value; value may span lines (multiline string/array). Accumulate until parseable.
    let buf = lines[i];
    const eq = buf.indexOf('=');
    if (eq < 0) throw new Error('invalid line ' + (i + 1) + ': ' + trimmed);
    const key = parseKeyPath(buf.slice(0, eq));
    let valueStr = buf.slice(eq + 1);
    for (;;) {
      try { const r = parseValue(valueStr, 0); assignPath(ctx, key, r.val); break; }
      catch (e) {
        if (e instanceof NeedMore && i + 1 < lines.length) { i++; valueStr += '\n' + lines[i]; continue; }
        throw new Error('parse error near line ' + (i + 1) + ': ' + (e.message || e));
      }
    }
  }
  return root;
}
