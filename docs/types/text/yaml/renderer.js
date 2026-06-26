// YAML preview: parse with vendored js-yaml and render a live tree with path
// breadcrumbs, source jumps, lightweight structure diagnostics, and collapsed source.
import { ensureKnownUiStyle, issueList, maskedValue, sourcePreview, wireSourceLinks } from '../../../core/known-ui.js';
import { loadGlobal, vendor } from '../../../core/script-loader.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.yaml-preview{padding:12px 14px;font:13px/1.5 system-ui,sans-serif;color:var(--fg,#24292f)}
.yaml-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 10px}
.yaml-badge{display:inline-block;padding:2px 8px;border-radius:8px;background:#ecfdf5;border:1px solid #86efac;color:#166534;font-size:11px;font-weight:700}
.yaml-note{font-size:12px;color:var(--fg-2,#6b7280)}
.yaml-doc-sep{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#6b7280);margin:8px 0 4px}
.yaml-path{margin-left:8px;color:var(--fg-2,#6b7280);font:11px/1.4 ui-monospace,monospace}
.yaml-link{border:0;background:transparent;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px}
.yaml-link:hover{color:var(--accent,#2563eb)}
.yaml-masked{color:var(--fg-2,#6b7280);font-style:italic}
.yaml-steps{border:1px solid var(--border,#e0e0e0);border-radius:8px;margin:0 0 12px;overflow:hidden;background:var(--bg,#fff)}
.yaml-steps h3{margin:0;padding:8px 12px;background:var(--bg-2,#f6f8fa);border-bottom:1px solid var(--border,#e0e0e0);font-size:13px}
.yaml-step-list{margin:0;padding:0;list-style:none}
.yaml-step{display:grid;grid-template-columns:minmax(120px,1fr) minmax(160px,2fr) max-content;gap:8px;align-items:baseline;padding:8px 12px;border-bottom:1px solid var(--border,#eaecf0)}
.yaml-step:last-child{border-bottom:0}
.yaml-step-name{font-weight:700;min-width:0;overflow-wrap:anywhere}
.yaml-step-detail{font-family:ui-monospace,monospace;font-size:12px;min-width:0;overflow-wrap:anywhere;color:var(--fg-2,#5a6678)}
.yaml-chip{display:inline-block;font-size:10px;padding:1px 6px;border-radius:5px;background:#e0f2fe;color:#075985;font-weight:700;margin-right:5px}
.yaml-src-key{color:#0550ae;font-weight:700}
.yaml-src-string{color:#0a7f38}
`;

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

function keyAndRest(line) {
  let quote = '';
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quote) {
      if (ch === '\\') i += 1;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === ':') {
      const key = line.slice(0, i).trim().replace(/^["']|["']$/g, '');
      return { key, rest: line.slice(i + 1).trim() };
    }
  }
  return null;
}

function collectSourceInfo(text) {
  const lines = String(text || '').split(/\r?\n/);
  const lineMap = new Map();
  const issues = [];
  const stack = [];
  const seenByParent = new Map();
  let doc = 0;
  let multiDoc = false;
  for (let i = 0; i < lines.length; i += 1) {
    const lineNo = i + 1;
    const raw = lines[i];
    const stripped = stripComment(raw);
    const trimmed = stripped.trim();
    if (!trimmed) continue;
    if (/^---\s*$/.test(trimmed)) {
      if (lineNo > 1) multiDoc = true;
      doc += 1;
      stack.length = 0;
      continue;
    }
    if (/^\.\.\.\s*$/.test(trimmed)) continue;
    const indent = raw.match(/^\s*/)?.[0].length || 0;
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    let body = trimmed;
    if (body.startsWith('- ')) body = body.slice(2).trim();
    const pair = keyAndRest(body);
    if (!pair || !pair.key) continue;
    const parent = stack.map((item) => item.key);
    const pathParts = [...parent, pair.key];
    const path = pathParts.join('.');
    const key = parent.join('.') || '<root>';
    const seen = seenByParent.get(key) || new Map();
    if (seen.has(pair.key)) {
      issues.push({ severity: 'warning', label: 'duplicate key', line: lineNo, message: `${path} repeats a mapping key from line ${seen.get(pair.key)}.` });
    }
    seen.set(pair.key, lineNo);
    seenByParent.set(key, seen);
    if (!lineMap.has(path)) lineMap.set(path, lineNo);
    if (maskedValue(pair.key, pair.rest.replace(/^["']|["']$/g, '')).masked && pair.rest) {
      issues.push({ severity: 'warning', label: 'secret', line: lineNo, message: `${path} looks sensitive and is redacted in the source preview.` });
    }
    if (!pair.rest || pair.rest === '|' || pair.rest === '>') stack.push({ indent, key: pair.key });
  }
  return { lineMap, issues, multiDoc };
}

function lineFor(path, sourceInfo) {
  const normalized = String(path || '').replace(/^document \d+\./, '');
  const direct = sourceInfo.lineMap.get(normalized);
  if (direct) return direct;
  const parts = normalized.split('.');
  while (parts.length) {
    const line = sourceInfo.lineMap.get(parts.join('.'));
    if (line) return line;
    parts.pop();
  }
  return 1;
}

function sourceButton(label, path, sourceInfo) {
  const line = lineFor(path, sourceInfo);
  const title = `Open YAML path ${path || 'root'} at line ${line}.`;
  return `<button class="yaml-link" type="button" data-source-line="${line}" title="${esc(title)}">${esc(label)}</button>`;
}

function pathBadge(path) {
  if (!path) return '';
  return `<span class="yaml-path" title="YAML path">${esc(path)}</span>`;
}

function lineButton(label, line, title = '') {
  const safeLine = Number(line || 1);
  const hint = title || `Open source line ${safeLine}.`;
  return `<button class="yaml-link" type="button" data-source-line="${safeLine}" title="${esc(hint)}">${esc(label)}</button>`;
}

function displayScalar(key, val) {
  const cls = typeof val === 'number' ? 'j-num' : typeof val === 'boolean' ? 'j-bool' : 'j-str';
  if (typeof val === 'string') {
    const masked = maskedValue(key, val);
    if (masked.masked) return `<span class="yaml-masked" title="${esc(masked.reason)}">"[configured]"</span>`;
    return `<span class="${cls}">"${esc(val)}"</span>`;
  }
  return `<span class="${cls}">${esc(String(val))}</span>`;
}

function valueNode(key, val, path, sourceInfo) {
  const keyHtml = key !== null ? '<span class="j-key">' + sourceButton(key, path, sourceInfo) + '</span>: ' : '';
  const pathHtml = pathBadge(path);
  if (val === null || val === undefined) return '<div class="j-row" data-yaml-path="' + esc(path) + '">' + keyHtml + '<span class="j-null">null</span>' + pathHtml + '</div>';
  if (val instanceof Date) return '<div class="j-row" data-yaml-path="' + esc(path) + '">' + keyHtml + '<span class="j-str">' + esc(val.toISOString()) + '</span>' + pathHtml + '</div>';
  const t = typeof val;
  if (t === 'object') {
    const isArr = Array.isArray(val);
    const entries = isArr ? val.map((v, i) => [i, v]) : Object.entries(val);
    const open = isArr ? '[' : '{', close = isArr ? ']' : '}';
    if (!entries.length) return '<div class="j-row" data-yaml-path="' + esc(path) + '">' + keyHtml + '<span class="j-punc">' + open + close + '</span>' + pathHtml + '</div>';
    const children = entries.map(([k, v]) => valueNode(isArr ? null : k, v, path ? path + '.' + k : String(k), sourceInfo)).join('');
    return '<details class="j-node" open data-yaml-path="' + esc(path) + '"><summary>' + keyHtml
      + '<span class="j-punc">' + open + '</span><span class="j-count">' + entries.length + (isArr ? ' items' : ' keys') + '</span>' + pathHtml + '</summary>'
      + '<div class="j-children">' + children + '</div><div class="j-row j-close">' + close + '</div></details>';
  }
  return '<div class="j-row" data-yaml-path="' + esc(path) + '">' + keyHtml + displayScalar(key, val) + pathHtml + '</div>';
}

function collectStepsFromDocs(docs, text, sourceInfo) {
  const found = [];
  const visit = (node, pathParts = []) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach((item, index) => visit(item, [...pathParts, String(index)]));
      return;
    }
    for (const [key, value] of Object.entries(node)) {
      const childPath = [...pathParts, key];
      if (key === 'steps' && Array.isArray(value)) {
        value.forEach((step, index) => {
          const info = summarizeStep(step, childPath, index, text, sourceInfo);
          if (info) found.push(info);
        });
      }
      visit(value, childPath);
    }
  };
  docs.forEach((doc, docIndex) => visit(doc, docs.length > 1 ? [`document ${docIndex + 1}`] : []));
  return found;
}

function summarizeStep(step, stepsPath, index, text, sourceInfo) {
  const path = [...stepsPath, String(index)].join('.');
  const fallbackLine = lineFor(stepsPath.join('.'), sourceInfo);
  if (typeof step === 'string') {
    return {
      name: step,
      kind: 'step',
      detail: step,
      path,
      line: findStepLine(text, step, fallbackLine),
    };
  }
  if (!step || typeof step !== 'object' || Array.isArray(step)) return null;
  const name = stringValue(step.name) || stringValue(step.id) || stringValue(step.label)
    || stringValue(step.uses) || stringValue(step.task) || stringValue(step.pipe)
    || firstCommand(step) || `step ${index + 1}`;
  const detail = stringValue(step.uses) || stringValue(step.run) || stringValue(step.task)
    || stringValue(step.pipe) || stringValue(step.image) || firstCommand(step) || 'configured step';
  const kind = step.uses ? 'uses' : step.run ? 'run' : step.task ? 'task' : step.pipe ? 'pipe' : step.image ? 'image' : 'step';
  return {
    name,
    kind,
    detail,
    path,
    line: findStepLine(text, name, findStepLine(text, detail, fallbackLine)),
  };
}

function stringValue(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function firstCommand(step) {
  if (typeof step.command === 'string') return step.command;
  if (Array.isArray(step.commands) && step.commands.length) return String(step.commands[0]);
  if (Array.isArray(step.script) && step.script.length) return String(step.script[0]);
  if (typeof step.script === 'string') return step.script;
  return '';
}

function findStepLine(text, needle, fallback) {
  const rawNeedle = String(needle || '').trim();
  if (!rawNeedle) return fallback || 1;
  const lines = String(text || '').split(/\r?\n/);
  const escaped = rawNeedle.replace(/^["']|["']$/g, '');
  for (let i = 0; i < lines.length; i += 1) {
    if (stripComment(lines[i]).includes(escaped)) return i + 1;
  }
  return fallback || 1;
}

function stepsPanel(steps) {
  if (!steps.length) return '';
  const shown = steps.slice(0, 30);
  const rows = shown.map((step) => `<li class="yaml-step" data-yaml-path="${esc(step.path)}">
    <span class="yaml-step-name">${lineButton(step.name, step.line, `Open step "${step.name}" in source.`)}</span>
    <span class="yaml-step-detail"><span class="yaml-chip" title="Step detail type">${esc(step.kind)}</span>${esc(step.detail)}</span>
    <span>${lineButton('source', step.line, 'Open this step in source.')}</span>
  </li>`).join('');
  const more = steps.length > shown.length ? `<li class="yaml-step"><span class="yaml-note">and ${steps.length - shown.length} more steps</span></li>` : '';
  return `<section class="yaml-steps"><h3>Steps (${steps.length})</h3><ul class="yaml-step-list">${rows}${more}</ul></section>`;
}

function redactSource(text) {
  return String(text || '').split(/\r?\n/).map((line) => {
    const pair = keyAndRest(stripComment(line).trim().replace(/^- /, ''));
    if (!pair || !pair.rest) return line;
    const value = pair.rest.replace(/^["']|["']$/g, '');
    const masked = maskedValue(pair.key, value);
    if (!masked.masked) return line;
    const idx = line.indexOf(':');
    return idx >= 0 ? `${line.slice(0, idx + 1)} [configured]` : line;
  }).join('\n');
}

function highlightYamlLine(line) {
  const raw = esc(line);
  return raw
    .replace(/^(\s*-?\s*)([A-Za-z0-9_.-]+)(\s*:)/, `$1<span class="yaml-src-key">$2</span>$3`)
    .replace(/(:\s*)("[^"]*"|'[^']*')/, `$1<span class="yaml-src-string">$2</span>`);
}

export async function render(intake, _ctx) {
  const text = intake.text || '';
  const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
  let docs;
  try {
    docs = jsyaml.loadAll(text);
  } catch (err) {
    return { bodyHtml: '<div class="json-error"><strong>Invalid YAML</strong><br>' + esc(err.message) + '</div>', hadUnsafe: false };
  }
  if (!docs.length || (docs.length === 1 && docs[0] === undefined)) {
    return { bodyHtml: '<div class="json-tree"><div class="j-row"><span class="j-null">empty document</span></div></div>', hadUnsafe: false };
  }

  const sourceInfo = collectSourceInfo(text);
  const steps = collectStepsFromDocs(docs, text, sourceInfo);
  const bodyHtml = '<div class="json-tree yaml-tree">' + docs.map((d, i) => {
    const head = docs.length > 1 ? '<div class="yaml-doc-sep">document ' + (i + 1) + '</div>' : '';
    const path = docs.length > 1 ? `document ${i + 1}` : '';
    return head + valueNode(null, d, path, sourceInfo);
  }).join('') + '</div>';

  const host = document.createElement('div');
  host.className = 'yaml-preview';
  ensureKnownUiStyle(host);
  host.innerHTML = `<style>${CSS}</style>
    <div class="yaml-tools"><span class="yaml-badge">YAML</span><span class="yaml-note">Click keys or paths to open source lines.</span></div>
    ${stepsPanel(steps)}
    ${bodyHtml}`;
  const review = issueList(sourceInfo.issues, { title: 'YAML Structure Review' });
  if (review) host.appendChild(review);
  host.appendChild(sourcePreview(redactSource(text), {
    title: 'Redacted source',
    collapsed: true,
    idPrefix: 'yaml-line',
    highlighter: highlightYamlLine,
  }));
  wireSourceLinks(host, { idPrefix: 'yaml-line' });

  return { parentNode: host, bodyHtml, hadUnsafe: false };
}
