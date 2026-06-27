import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
import { ensureKnownUiStyle, issueList, sourcePreview, wireSourceLinks } from '../../../../../core/known-ui.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.fkust-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;}
.fkust-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#5468FF;color:#fff;margin-right:8px;vertical-align:middle;}
.fkust-title{font-size:19px;font-weight:700;margin:0;vertical-align:middle;}
.fkust-meta{font-size:12px;color:var(--fg-2,#888);margin:4px 0 12px;}
.fkust-sec{margin:14px 0;}
.fkust-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.fkust-table{width:100%;border-collapse:collapse;font-size:13px;}
.fkust-label{color:var(--fg-2,#888);font-size:12px;padding:4px 16px 4px 0;white-space:nowrap;vertical-align:top;min-width:130px;}
.fkust-val{font:13px ui-monospace,monospace;padding:4px 0;word-break:break-all;}
.fkust-table tr{border-bottom:1px solid var(--border,#e0e0e0);}
.fkust-table tr:last-child{border-bottom:none;}
.fkust-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;}
.fkust-pill{padding:3px 10px;border-radius:10px;font-size:12px;font-weight:600;border:1px solid var(--border,#e0e0e0);}
.fkust-pill-on{background:#d4edda;color:#155724;border-color:#c3e6cb;}
.fkust-pill-off{background:#f8d7da;color:#721c24;border-color:#f5c6cb;}
.fkust-pill-neutral{background:var(--bg-2,#f5f5f5);color:var(--fg,#333);}
.fkust-pill-warn{background:#fff7ed;border-color:#fed7aa;color:#c2410c;}
.fkust-list{list-style:none;padding:0;margin:4px 0 0;display:flex;flex-direction:column;gap:4px;}
.fkust-list-item{font:12px ui-monospace,monospace;background:var(--bg-2,#f5f5f5);border:1px solid var(--border,#e0e0e0);padding:3px 8px;border-radius:4px;}
.fkust-link{border:0;background:transparent;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;}
.fkust-link:hover{color:var(--accent,#2563eb);}
.fkust-source-key{color:#5468FF;font-weight:700;}
.fkust-source-comment{color:#6e7781;font-style:italic;}
`;

const HELP = {
  identity: 'Flux Kustomization resource identity.',
  source: 'Flux source reference that supplies manifests for this Kustomization.',
  path: 'Repository path reconciled by the controller.',
  sync: 'Sync behavior flags. prune removes orphaned objects, force may recreate immutable resources, wait blocks on readiness.',
  health: 'Resources Flux waits on when checking readiness.',
  depends: 'Other Kustomizations that must reconcile first.',
  interval: 'Reconciliation interval for polling source changes.',
};

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function lineContaining(text, pattern, fallbackLine = 1) {
  const rx = pattern instanceof RegExp ? pattern : new RegExp(escapeRegExp(pattern));
  const lines = String(text || '').split(/\r?\n/);
  const idx = lines.findIndex((line) => rx.test(line));
  return idx >= 0 ? idx + 1 : fallbackLine;
}

function buildLineMap(text) {
  const entries = new Map();
  const stack = [];
  for (const [idx, rawLine] of String(text || '').split(/\r?\n/).entries()) {
    if (!rawLine.trim() || /^\s*#/.test(rawLine)) continue;
    const m = rawLine.match(/^(\s*)(?:-\s*)?([A-Za-z_.$][\w:.$-]*)\s*:\s*(.*)$/);
    if (!m) continue;
    const indent = m[1].replace(/\t/g, '  ').length + (rawLine.trimStart().startsWith('- ') ? 2 : 0);
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const path = [...stack.map((item) => item.key), m[2]].join('.');
    if (!entries.has(path)) entries.set(path, { line: idx + 1, raw: m[3] });
    if (m[3].trim() === '') stack.push({ indent, key: m[2] });
  }
  return entries;
}

function lineFor(map, ...paths) {
  for (const path of paths) {
    const hit = map.get(path);
    if (hit) return hit.line;
  }
  return 1;
}

function helpFor(key) {
  return HELP[key] || 'Open this Flux Kustomization item in source.';
}

function lineButton(label, line, key = label) {
  const title = `${helpFor(key)} Open line ${line || 1} in source.`;
  return `<button class="fkust-link" type="button" data-source-line="${line || 1}" title="${esc(title)}">${esc(label)}</button>`;
}

function boolPill(label, value, line) {
  if (value == null) return '';
  const cls = value ? 'fkust-pill-on' : 'fkust-pill-off';
  return `<span class="fkust-pill ${cls}" title="${esc(helpFor('sync'))}">${lineButton(`${label}: ${value ? 'yes' : 'no'}`, line, 'sync')}</span>`;
}

function namedListItems(items, text, baseLine, key) {
  return items.map((item) => {
    const name = item.name || '';
    const kind = item.kind || '';
    const line = name
      ? lineContaining(text, new RegExp(`name:\\s*${escapeRegExp(name)}\\b`), baseLine)
      : baseLine;
    return { ...item, label: `${kind ? `${kind} / ` : ''}${name || '?'}`, line, key };
  });
}

function collectIssues(model) {
  const issues = [];
  if (model.prune === true) {
    issues.push({ severity: 'info', label: 'prune', line: model.pruneLine, message: 'prune is enabled; Flux may delete objects no longer present at the target path.' });
  }
  if (model.force === true) {
    issues.push({ severity: 'warning', label: 'force apply', line: model.forceLine, message: 'force is enabled; immutable field changes may recreate resources.' });
  }
  if (model.wait !== true) {
    issues.push({ severity: 'warning', label: 'wait disabled', line: model.waitLine, message: 'wait is not enabled; reconciliation may report success before workloads become ready.' });
  }
  if (!model.healthChecks.length) {
    issues.push({ severity: 'warning', label: 'health checks', line: model.specLine, message: 'No explicit healthChecks are configured; consider key workloads for readiness gating.' });
  }
  for (const dep of model.dependsOn) {
    issues.push({ severity: 'info', label: 'dependency', line: dep.line, message: `${model.name || 'Kustomization'} waits for ${dep.name || 'another Kustomization'} before applying.` });
  }
  if (model.path && !String(model.path).startsWith('./')) {
    issues.push({ severity: 'info', label: 'path', line: model.pathLine, message: `${model.path} is not a relative ./ path; confirm this is intentional.` });
  }
  if (model.sourceKind && !/GitRepository|Bucket|OCIRepository/i.test(model.sourceKind)) {
    issues.push({ severity: 'info', label: 'source kind', line: model.sourceLine, message: `${model.sourceKind} is an uncommon Flux Kustomization source kind.` });
  }
  return issues;
}

function highlightYamlLine(line) {
  const raw = esc(line);
  return raw.replace(/^(\s*(?:-\s*)?)([A-Za-z_.$][\w:.$-]*)(\s*:)/, `$1<span class="fkust-source-key">$2</span>$3`)
    .replace(/(#.*)$/, '<span class="fkust-source-comment">$1</span>');
}

export async function render(intake) {
  const jsYaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
  const text = intake.text || '';
  let doc = {};
  try { doc = (jsYaml.loadAll(text) || [])[0] || {}; } catch { /* ignore parse errors */ }

  ensureKnownUiStyle(document);
  const lineMap = buildLineMap(text);
  const meta = doc.metadata || {};
  const name = meta.name || '';
  const namespace = meta.namespace || '';
  const apiVersion = doc.apiVersion || '';
  const spec = doc.spec || {};

  const interval = spec.interval || '';
  const path = spec.path || '';
  const prune = spec.prune;
  const force = spec.force;
  const wait = spec.wait;

  const sourceRef = spec.sourceRef || {};
  const srcKind = sourceRef.kind || '';
  const srcName = sourceRef.name || '';
  const srcNamespace = sourceRef.namespace || '';

  const healthChecks = namedListItems(Array.isArray(spec.healthChecks) ? spec.healthChecks : [], text, lineFor(lineMap, 'spec.healthChecks'), 'health');
  const dependsOn = namedListItems(Array.isArray(spec.dependsOn) ? spec.dependsOn : [], text, lineFor(lineMap, 'spec.dependsOn'), 'depends');
  const model = {
    name,
    path,
    pathLine: lineFor(lineMap, 'spec.path'),
    prune,
    pruneLine: lineFor(lineMap, 'spec.prune'),
    force,
    forceLine: lineFor(lineMap, 'spec.force'),
    wait,
    waitLine: lineFor(lineMap, 'spec.wait'),
    specLine: lineFor(lineMap, 'spec'),
    healthChecks,
    dependsOn,
    sourceKind: srcKind,
    sourceLine: lineFor(lineMap, 'spec.sourceRef.kind', 'spec.sourceRef'),
  };

  const sourceHtml = (srcName || srcKind || path) ? `<div class="fkust-sec"><h3>${lineButton('Source & Path', lineFor(lineMap, 'spec.sourceRef', 'spec.path'), 'source')}</h3><table class="fkust-table">
${srcKind || srcName ? `<tr><td class="fkust-label">${lineButton('sourceRef', lineFor(lineMap, 'spec.sourceRef'), 'source')}</td><td class="fkust-val">${lineButton(srcKind || 'source', lineFor(lineMap, 'spec.sourceRef.kind', 'spec.sourceRef'), 'source')}${srcName ? ` / ${lineButton(srcName, lineFor(lineMap, 'spec.sourceRef.name', 'spec.sourceRef'), 'source')}` : ''}${srcNamespace ? ` (${lineButton(srcNamespace, lineFor(lineMap, 'spec.sourceRef.namespace', 'spec.sourceRef'), 'source')})` : ''}</td></tr>` : ''}
${path ? `<tr><td class="fkust-label">${lineButton('path', lineFor(lineMap, 'spec.path'), 'path')}</td><td class="fkust-val">${lineButton(path, lineFor(lineMap, 'spec.path'), 'path')}</td></tr>` : ''}
</table></div>` : '';

  const syncHtml = (prune != null || force != null || wait != null) ? `<div class="fkust-sec"><h3>${lineButton('Sync Settings', lineFor(lineMap, 'spec.prune', 'spec.force', 'spec.wait'), 'sync')}</h3><div class="fkust-pills">
  ${boolPill('prune', prune, lineFor(lineMap, 'spec.prune'))}
  ${boolPill('force', force, lineFor(lineMap, 'spec.force'))}
  ${boolPill('wait', wait, lineFor(lineMap, 'spec.wait'))}
</div></div>` : '';

  const healthHtml = healthChecks.length > 0 ? `<div class="fkust-sec"><h3>${lineButton(`Health Checks (${healthChecks.length})`, lineFor(lineMap, 'spec.healthChecks'), 'health')}</h3><ul class="fkust-list">${healthChecks.map((hc) => {
    const hcNs = hc.namespace || '';
    return `<li class="fkust-list-item">${lineButton(hc.label, hc.line, 'health')}${hcNs ? ` · ${lineButton(hcNs, lineContaining(text, new RegExp(`namespace:\\s*${escapeRegExp(hcNs)}\\b`), hc.line), 'health')}` : ''}</li>`;
  }).join('')}</ul></div>` : '';

  const dependsHtml = dependsOn.length > 0 ? `<div class="fkust-sec"><h3>${lineButton(`Depends On (${dependsOn.length})`, lineFor(lineMap, 'spec.dependsOn'), 'depends')}</h3><ul class="fkust-list">${dependsOn.map((dep) => {
    const depNs = dep.namespace || '';
    return `<li class="fkust-list-item">${lineButton(dep.name || '?', dep.line, 'depends')}${depNs ? ` · ${lineButton(depNs, lineContaining(text, new RegExp(`namespace:\\s*${escapeRegExp(depNs)}\\b`), dep.line), 'depends')}` : ''}</li>`;
  }).join('')}</ul></div>` : '';

  const host = document.createElement('div');
  host.className = 'fkust-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="fkust-badge">Flux Kustomization</span>
  ${name ? `<span class="fkust-title">${lineButton(name, lineFor(lineMap, 'metadata.name'), 'identity')}</span>` : ''}
</div>
${(namespace || apiVersion) ? `<div class="fkust-meta">${namespace ? `namespace: ${lineButton(namespace, lineFor(lineMap, 'metadata.namespace'), 'identity')}` : ''}${namespace && apiVersion ? ' · ' : ''}${apiVersion ? `apiVersion: ${lineButton(apiVersion, lineFor(lineMap, 'apiVersion'), 'identity')}` : ''}</div>` : ''}

${interval ? `<div class="fkust-pills"><span class="fkust-pill fkust-pill-neutral">${lineButton(`interval: ${interval}`, lineFor(lineMap, 'spec.interval'), 'interval')}</span></div>` : ''}

${sourceHtml}
${syncHtml}
${healthHtml}
${dependsHtml}`;

  const review = issueList(collectIssues(model), { title: 'Flux Kustomization Review' });
  if (review) host.insertBefore(review, host.querySelector('.fkust-sec') || null);
  host.appendChild(sourcePreview(text, {
    title: 'Source',
    collapsed: true,
    idPrefix: 'fkust-line',
    highlighter: highlightYamlLine,
  }));
  wireSourceLinks(host, { idPrefix: 'fkust-line' });
  return { parentNode: host };
}
