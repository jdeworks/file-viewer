// TOML preview: parse with the hand-rolled parser and render a live tree with
// path breadcrumbs, source jumps, duplicate-key/secret diagnostics, and collapsed source.
import { issueList, maskedValue, sourcePreview, wireSourceLinks } from '../../../core/known-ui.js';
import { createQueryPanel, jsonPathQuery } from '../../../core/query-panel.js';
import { parseTOML } from './toml.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.toml-preview{padding:12px 14px;font:13px/1.5 system-ui,sans-serif;color:var(--fg,#24292f)}
.toml-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 10px}
.toml-badge{display:inline-block;padding:2px 8px;border-radius:8px;background:#f5f3ff;border:1px solid #c4b5fd;color:#5b21b6;font-size:11px;font-weight:700}
.toml-note{font-size:12px;color:var(--fg-2,#6b7280)}
.toml-path{margin-left:8px;color:var(--fg-2,#6b7280);font:11px/1.4 ui-monospace,monospace}
.toml-link{border:0;background:transparent;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px}
.toml-link:hover{color:var(--accent,#2563eb)}
.toml-masked{color:var(--fg-2,#6b7280);font-style:italic}
.toml-src-key{color:#0550ae;font-weight:700}
.toml-src-string{color:#0a7f38}
`;

function splitTomlKey(raw) {
  const out = [];
  let token = '';
  let quote = '';
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (quote) {
      if (ch === quote) quote = '';
      else token += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '.') {
      if (token.trim()) out.push(token.trim());
      token = '';
      continue;
    }
    token += ch;
  }
  if (token.trim()) out.push(token.trim());
  return out;
}

function stripComment(line) {
  let quote = '';
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quote) {
      if (ch === '\\') i += 1;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '#') return line.slice(0, i);
  }
  return line;
}

function firstEquals(line) {
  let quote = '';
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quote) {
      if (ch === '\\') i += 1;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '=') return i;
  }
  return -1;
}

function collectSourceInfo(text) {
  const lines = String(text || '').split(/\r?\n/);
  const lineMap = new Map();
  const issues = [];
  const secretLines = new Map();
  const seenKeys = new Map();
  const seenTables = new Map();
  const arrayIndexes = new Map();
  let tablePath = [];
  for (let i = 0; i < lines.length; i += 1) {
    const lineNo = i + 1;
    const trimmed = stripComment(lines[i]).trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('[')) {
      const isArray = trimmed.startsWith('[[');
      const close = trimmed.lastIndexOf(isArray ? ']]' : ']');
      if (close < 0) continue;
      const path = splitTomlKey(trimmed.slice(isArray ? 2 : 1, close));
      const base = path.join('.');
      if (isArray) {
        const idx = arrayIndexes.get(base) || 0;
        arrayIndexes.set(base, idx + 1);
        tablePath = [...path, String(idx)];
      } else {
        tablePath = path;
        if (seenTables.has(base)) {
          issues.push({ severity: 'warning', label: 'duplicate table', line: lineNo, message: `${base} is declared more than once; later keys merge into the same table.` });
        }
        seenTables.set(base, lineNo);
      }
      lineMap.set(tablePath.join('.'), lineNo);
      continue;
    }
    const eq = firstEquals(trimmed);
    if (eq < 0) continue;
    const keyPath = splitTomlKey(trimmed.slice(0, eq));
    if (!keyPath.length) continue;
    const full = [...tablePath, ...keyPath].join('.');
    const key = keyPath[keyPath.length - 1];
    const rawValue = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (seenKeys.has(full)) {
      issues.push({ severity: 'warning', label: 'duplicate key', line: lineNo, message: `${full} overwrites an earlier value from line ${seenKeys.get(full)}.` });
    } else {
      seenKeys.set(full, lineNo);
    }
    if (!lineMap.has(full)) lineMap.set(full, lineNo);
    const masked = maskedValue(key, rawValue);
    if (masked.masked) {
      secretLines.set(lineNo, key);
      issues.push({ severity: 'warning', label: 'secret', line: lineNo, message: `${full} looks sensitive and is redacted in the preview.` });
    }
  }
  return { lineMap, issues, secretLines };
}

function lineFor(path, sourceInfo) {
  const direct = sourceInfo.lineMap.get(path);
  if (direct) return direct;
  const parts = String(path || '').split('.');
  while (parts.length) {
    const line = sourceInfo.lineMap.get(parts.join('.'));
    if (line) return line;
    parts.pop();
  }
  return 1;
}

function sourceButton(label, path, sourceInfo, role = 'setting') {
  const line = lineFor(path, sourceInfo);
  const title = `${role === 'section' ? 'Open TOML section' : 'Open TOML setting'} ${path || 'root'} at line ${line}.`;
  return `<button class="toml-link" type="button" data-source-line="${line}" title="${esc(title)}">${esc(label)}</button>`;
}

function pathBadge(path) {
  if (!path) return '';
  return `<span class="toml-path" title="TOML path">${esc(path)}</span>`;
}

function valueNode(key, val, path, sourceInfo) {
  const keyHtml = key !== null ? '<span class="j-key">' + sourceButton(key, path, sourceInfo) + '</span>: ' : '';
  const pathHtml = pathBadge(path);
  const pathAttrs = ' data-toml-path="' + esc(path) + '" data-qp-path="' + esc(path) + '"';
  if (val === null || val === undefined) return '<div class="j-row"' + pathAttrs + '>' + keyHtml + '<span class="j-null">null</span>' + pathHtml + '</div>';
  if (val instanceof Date) return '<div class="j-row"' + pathAttrs + '>' + keyHtml + '<span class="j-str">' + esc(val.toISOString()) + '</span>' + pathHtml + '</div>';
  const t = typeof val;
  if (t === 'object') {
    const isArr = Array.isArray(val);
    const entries = isArr ? val.map((v, i) => [i, v]) : Object.entries(val);
    const open = isArr ? '[' : '{', close = isArr ? ']' : '}';
    if (!entries.length) return '<div class="j-row"' + pathAttrs + '>' + keyHtml + '<span class="j-punc">' + open + close + '</span>' + pathHtml + '</div>';
    const children = entries.map(([k, v]) => valueNode(isArr ? null : k, v, path ? path + '.' + k : String(k), sourceInfo)).join('');
    return '<details class="j-node" open' + pathAttrs + '><summary>' + keyHtml
      + '<span class="j-punc">' + open + '</span><span class="j-count">' + entries.length + (isArr ? ' items' : ' keys') + '</span>' + pathHtml + '</summary>'
      + '<div class="j-children">' + children + '</div><div class="j-row j-close">' + close + '</div></details>';
  }
  const cls = t === 'number' ? 'j-num' : t === 'boolean' ? 'j-bool' : 'j-str';
  const masked = maskedValue(key, val);
  if (masked.masked) {
    return '<div class="j-row"' + pathAttrs + '>' + keyHtml + '<span class="toml-masked" title="' + esc(masked.reason) + '">"[configured]"</span>' + pathHtml + '</div>';
  }
  const disp = t === 'string' ? '"' + esc(val) + '"' : esc(String(val));
  return '<div class="j-row"' + pathAttrs + '>' + keyHtml + '<span class="' + cls + '">' + disp + '</span>' + pathHtml + '</div>';
}

function redactedSource(text, sourceInfo) {
  if (!sourceInfo.secretLines?.size) return text || '';
  return String(text || '').split(/\r?\n/).map((line, idx) => {
    const key = sourceInfo.secretLines.get(idx + 1);
    if (!key) return line;
    const eq = firstEquals(line);
    if (eq < 0) return line;
    return `${line.slice(0, eq + 1)} "[configured]"`;
  }).join('\n');
}

function highlightTomlLine(line) {
  const raw = esc(line);
  return raw
    .replace(/^(\s*)([A-Za-z0-9_.-]+)(\s*=)/, `$1<span class="toml-src-key">$2</span>$3`)
    .replace(/(=\s*)("[^"]*"|'[^']*')/, `$1<span class="toml-src-string">$2</span>`);
}

export async function render(intake, _ctx) {
  const text = intake.text || '';
  let data;
  try { data = parseTOML(text); }
  catch (err) { return { bodyHtml: '<div class="json-error"><strong>Invalid TOML</strong><br>' + esc(err.message) + '</div>', hadUnsafe: false }; }

  const sourceInfo = collectSourceInfo(text);
  const treeHtml = '<div class="json-tree toml-tree">' + valueNode(null, data, '', sourceInfo) + '</div>';
  const bodyHtml = treeHtml;

  const host = document.createElement('div');
  host.className = 'toml-preview qp-preview toml-qp';
  host.innerHTML = `<style>${CSS}</style>
    <div class="toml-tools"><span class="toml-badge">TOML</span><span class="toml-note">Click keys or paths to open source lines.</span></div>
    ${treeHtml}`;
  const treeRoot = host.querySelector('.toml-tree');
  const panel = createQueryPanel({
    placeholder: "TOMLPath… e.g. $..name or types[*].id",
    hint: 'JSONPath-style TOML queries: $.table.key · $..key · $.array[*] · bare key',
    root: treeRoot,
    filterUnit: '.j-node, .j-row',
    evaluate(query) {
      let results;
      try { results = jsonPathQuery(data, query); }
      catch (e) { return { error: e.message || 'bad query' }; }
      const set = new Set();
      for (const r of results) {
        const sel = '[data-qp-path="' + (window.CSS?.escape ? window.CSS.escape(r.path) : r.path) + '"]';
        const node = treeRoot.querySelector(sel);
        if (node) set.add(node);
      }
      return set;
    },
  });
  host.prepend(panel.el);
  const review = issueList(sourceInfo.issues, { title: 'TOML Structure Review' });
  if (review) host.appendChild(review);
  host.appendChild(sourcePreview(redactedSource(text, sourceInfo), {
    title: sourceInfo.secretLines.size ? 'Redacted source' : 'Source',
    collapsed: true,
    idPrefix: 'toml-line',
    highlighter: highlightTomlLine,
  }));
  wireSourceLinks(host, { idPrefix: 'toml-line' });

  return { parentNode: host, bodyHtml, hadUnsafe: false };
}
