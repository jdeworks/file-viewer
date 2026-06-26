import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
import { ensureKnownUiStyle, issueList, sourcePreview, wireSourceLinks } from '../../../../../core/known-ui.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.helmchart-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.helmchart-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0f1689;color:#fff;vertical-align:middle;margin-right:8px;}
.helmchart-title{font-size:18px;font-weight:700;margin:0 0 2px;}
.helmchart-desc{font-size:13px;color:var(--fg,#24292f);margin:8px 0 12px;max-width:600px;}
.helmchart-sec{margin:14px 0;}
.helmchart-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.helmchart-meta{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0;}
.helmchart-pill{font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);color:var(--fg,#24292f);}
.helmchart-pill.type-app{background:#eff6ff;border-color:#bfdbfe;color:#1e40af;}
.helmchart-pill.type-lib{background:#f3f4f6;border-color:#d1d5db;color:#374151;}
.helmchart-pill.warn{background:#fff7ed;border-color:#fed7aa;color:#c2410c;}
.helmchart-table{width:100%;border-collapse:collapse;font-size:13px;}
.helmchart-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.helmchart-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.helmchart-mono{font:12px ui-monospace,monospace;}
.helmchart-dim{font-size:11px;color:var(--fg-2,#888);}
.helmchart-kv{display:grid;grid-template-columns:max-content 1fr;gap:3px 14px;font-size:13px;}
.helmchart-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.helmchart-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;}
.helmchart-link{border:0;background:transparent;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;}
.helmchart-link:hover{color:#0f1689;}
.helmchart-source-key{color:#0f1689;font-weight:700;}
.helmchart-source-comment{color:#6e7781;font-style:italic;}
`;

const HELP = {
  identity: 'Chart identity and compatibility metadata.',
  version: 'Chart package version. SemVer is expected for chart releases.',
  appVersion: 'Application version packaged by this chart.',
  kubeVersion: 'Kubernetes version constraint for this chart.',
  maintainers: 'People or teams responsible for the chart.',
  dependencies: 'Other charts pulled when dependency conditions are enabled.',
  repository: 'Chart repository URL used to fetch a dependency.',
  annotations: 'Metadata consumed by chart repositories such as Artifact Hub.',
  keywords: 'Search tags for chart discovery.',
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
    const m = rawLine.match(/^(\s*)(?:-\s*)?([A-Za-z_.$][\w:.$/-]*)\s*:\s*(.*)$/);
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
  return HELP[key] || 'Open this Helm chart item in source.';
}

function lineButton(label, line, key = label) {
  const title = `${helpFor(key)} Open line ${line || 1} in source.`;
  return `<button class="helmchart-link" type="button" data-source-line="${line || 1}" title="${esc(title)}">${esc(label)}</button>`;
}

function itemLine(text, key, value, fallbackLine) {
  if (!value) return fallbackLine;
  return lineContaining(text, new RegExp(`${escapeRegExp(key)}:\\s*["']?${escapeRegExp(value)}\\b`), fallbackLine);
}

function shortRepo(repo) {
  return repo ? repo.replace(/^https?:\/\//, '').replace(/\/$/, '') : '-';
}

function versionIsBroad(version) {
  return /[xX*]|\|\||>=|<=|~|\^/.test(String(version || ''));
}

function semverish(version) {
  return /^\d+\.\d+\.\d+([+-][0-9A-Za-z.-]+)?$/.test(String(version || '').replace(/^v/, ''));
}

function modelDependencies(deps, text, lineMap) {
  return deps.map((dep) => {
    const line = itemLine(text, 'name', dep.name, lineFor(lineMap, 'dependencies'));
    return {
      ...dep,
      line,
      versionLine: itemLine(text, 'version', dep.version, line),
      repositoryLine: itemLine(text, 'repository', dep.repository, line),
      conditionLine: itemLine(text, 'condition', dep.condition, line),
    };
  });
}

function collectIssues(model) {
  const issues = [];
  if (!model.name) issues.push({ severity: 'warning', label: 'name', line: 1, message: 'Chart has no name.' });
  if (!model.version) {
    issues.push({ severity: 'warning', label: 'version', line: lineFor(model.lineMap, 'version'), message: 'Chart has no package version.' });
  } else if (!semverish(model.version)) {
    issues.push({ severity: 'warning', label: 'version', line: lineFor(model.lineMap, 'version'), message: `${model.version} is not a strict SemVer chart version.` });
  }
  if (!model.appVersion) {
    issues.push({ severity: 'info', label: 'appVersion', line: lineFor(model.lineMap, 'appVersion', 'version'), message: 'No appVersion is declared; users cannot easily map chart package to app release.' });
  }
  if (!model.maintainers.length) {
    issues.push({ severity: 'info', label: 'maintainer', line: lineFor(model.lineMap, 'maintainers', 'name'), message: 'No chart maintainer is listed.' });
  }
  for (const dep of model.deps) {
    if (versionIsBroad(dep.version)) {
      issues.push({ severity: 'warning', label: 'dependency range', line: dep.versionLine, message: `${dep.name} uses broad version ${dep.version}; lock dependencies before packaging if reproducibility matters.` });
    }
    if (!/^https:\/\//i.test(dep.repository || '')) {
      issues.push({ severity: 'warning', label: 'repository', line: dep.repositoryLine, message: `${dep.name} repository is not HTTPS.` });
    }
    if (!dep.condition) {
      issues.push({ severity: 'info', label: 'condition', line: dep.line, message: `${dep.name} has no condition; dependency is always included when dependencies are built.` });
    }
  }
  return issues;
}

function highlightYamlLine(line) {
  const raw = esc(line);
  return raw.replace(/^(\s*(?:-\s*)?)([A-Za-z_.$/-][\w:.$/-]*)(\s*:)/, `$1<span class="helmchart-source-key">$2</span>$3`)
    .replace(/(#.*)$/, '<span class="helmchart-source-comment">$1</span>');
}

export async function render(intake) {
  let cfg = {};
  const text = intake.text || '';
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = jsyaml.load(text) || {};
  } catch { cfg = {}; }

  ensureKnownUiStyle(document);
  const lineMap = buildLineMap(text);
  const name = cfg.name || '';
  const version = String(cfg.version || '');
  const appVersion = String(cfg.appVersion || '');
  const description = cfg.description || '';
  const chartType = cfg.type || 'application';
  const apiVersion = cfg.apiVersion || '';
  const kubeVersion = cfg.kubeVersion || '';
  const keywords = Array.isArray(cfg.keywords) ? cfg.keywords : [];
  const maintainers = Array.isArray(cfg.maintainers) ? cfg.maintainers : [];
  const deps = modelDependencies(Array.isArray(cfg.dependencies) ? cfg.dependencies : [], text, lineMap);
  const annotations = cfg.annotations && typeof cfg.annotations === 'object' ? cfg.annotations : null;

  const versionChips = [
    version ? `<span class="helmchart-pill">${lineButton(`v${version}`, lineFor(lineMap, 'version'), 'version')}</span>` : '',
    appVersion ? `<span class="helmchart-pill">${lineButton(`app v${appVersion}`, lineFor(lineMap, 'appVersion'), 'appVersion')}</span>` : '',
  ].filter(Boolean).join('');

  const identityHtml = `<div class="helmchart-sec"><h3>${lineButton('Identity', lineFor(lineMap, 'name'), 'identity')}</h3><div class="helmchart-meta">
    ${chartType === 'library' ? `<span class="helmchart-pill type-lib">${lineButton('library', lineFor(lineMap, 'type'), 'identity')}</span>` : `<span class="helmchart-pill type-app">${lineButton('application', lineFor(lineMap, 'type'), 'identity')}</span>`}
    ${kubeVersion ? `<span class="helmchart-pill">${lineButton(`kube ${kubeVersion}`, lineFor(lineMap, 'kubeVersion'), 'kubeVersion')}</span>` : ''}
    ${apiVersion ? `<span class="helmchart-pill"><span class="helmchart-mono">${lineButton(apiVersion, lineFor(lineMap, 'apiVersion'), 'identity')}</span></span>` : ''}
  </div>${description ? `<div class="helmchart-desc">${lineButton(description, lineFor(lineMap, 'description'), 'identity')}</div>` : ''}</div>`;

  const maintainersHtml = maintainers.length
    ? `<div class="helmchart-sec"><h3>${lineButton(`Maintainers (${maintainers.length})`, lineFor(lineMap, 'maintainers'), 'maintainers')}</h3><div class="helmchart-kv">${maintainers.map((maintainer) => {
        const line = itemLine(text, 'name', maintainer.name, lineFor(lineMap, 'maintainers'));
        const label = maintainer.name || maintainer.email || '?';
        const email = maintainer.email && maintainer.name ? `<span class="helmchart-dim">&lt;${lineButton(maintainer.email, itemLine(text, 'email', maintainer.email, line), 'maintainers')}&gt;</span>` : '';
        return `<span class="helmchart-k">${lineButton(label, line, 'maintainers')}</span><span class="helmchart-v">${email || lineButton(maintainer.email || '', itemLine(text, 'email', maintainer.email, line), 'maintainers')}</span>`;
      }).join('')}</div></div>`
    : '';

  const keywordsHtml = keywords.length
    ? `<div class="helmchart-sec"><h3>${lineButton('Keywords', lineFor(lineMap, 'keywords'), 'keywords')}</h3><div class="helmchart-meta">${keywords.map((keyword) => `<span class="helmchart-pill">${lineButton(keyword, lineContaining(text, new RegExp(`-\\s*${escapeRegExp(keyword)}\\b`), lineFor(lineMap, 'keywords')), 'keywords')}</span>`).join('')}</div></div>`
    : '';

  const depsHtml = deps.length
    ? `<div class="helmchart-sec"><h3>${lineButton(`Dependencies (${deps.length})`, lineFor(lineMap, 'dependencies'), 'dependencies')}</h3><table class="helmchart-table">
<thead><tr><th>Chart</th><th>Version</th><th>Repository</th><th>Condition</th></tr></thead>
<tbody>${deps.map((dep) => `<tr>
  <td><span class="helmchart-mono">${lineButton(dep.name || '', dep.line, 'dependencies')}</span></td>
  <td>${lineButton(String(dep.version || '-'), dep.versionLine, 'version')}</td>
  <td><span class="helmchart-dim">${lineButton(shortRepo(dep.repository), dep.repositoryLine, 'repository')}</span></td>
  <td><span class="helmchart-dim">${lineButton(dep.condition || '-', dep.conditionLine, 'dependencies')}</span></td>
</tr>`).join('')}</tbody></table></div>`
    : '';

  const annotationsHtml = annotations
    ? `<div class="helmchart-sec"><h3>${lineButton('Annotations', lineFor(lineMap, 'annotations'), 'annotations')}</h3><div class="helmchart-kv">${Object.entries(annotations).map(([key, value]) =>
        `<span class="helmchart-k">${lineButton(key, lineFor(lineMap, `annotations.${key}`, 'annotations'), 'annotations')}</span><span class="helmchart-v">${lineButton(String(value), lineFor(lineMap, `annotations.${key}`, 'annotations'), 'annotations')}</span>`
      ).join('')}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'helmchart-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="helmchart-badge">Helm</span>
  <span class="helmchart-title">${lineButton(name || 'Chart', lineFor(lineMap, 'name'), 'identity')}</span>
  ${versionChips}
</div>
${identityHtml}${maintainersHtml}${keywordsHtml}${depsHtml}${annotationsHtml}`;

  const review = issueList(collectIssues({ name, version, appVersion, maintainers, deps, lineMap }), { title: 'Helm Chart Review' });
  if (review) host.insertBefore(review, host.querySelector('.helmchart-sec') || null);
  host.appendChild(sourcePreview(text, {
    title: 'Source',
    collapsed: true,
    idPrefix: 'helmchart-line',
    highlighter: highlightYamlLine,
  }));
  wireSourceLinks(host, { idPrefix: 'helmchart-line' });
  return { parentNode: host };
}
