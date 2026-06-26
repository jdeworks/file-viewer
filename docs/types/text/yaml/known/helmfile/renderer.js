import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
import { ensureKnownUiStyle, issueList, maskedValue, sourcePreview, wireSourceLinks } from '../../../../../core/known-ui.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SECRETISH = /password|passwd|pwd|secret|token|api[_-]?key|private[_-]?key|client[_-]?secret|credential|auth|access[_-]?key/i;

const CSS = `
.helmfile-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.helmfile-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#3b82f6;color:#fff;vertical-align:middle;margin-right:8px;}
.helmfile-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.helmfile-sec{margin:14px 0;}
.helmfile-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.helmfile-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px;}
.helmfile-pill.warn{background:#fff7ed;border-color:#fed7aa;color:#c2410c;}
.helmfile-table{width:100%;border-collapse:collapse;font-size:13px;}
.helmfile-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:4px 8px 4px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.helmfile-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.helmfile-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:6px 0;}
.helmfile-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.helmfile-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;}
.helmfile-dim{font-size:11px;color:var(--fg-2,#888);}
.helmfile-mono{font-family:ui-monospace,monospace;font-size:12px;}
.helmfile-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
.helmfile-link{border:0;background:transparent;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;}
.helmfile-link:hover{color:#3b82f6;}
.helmfile-mask-reason{font-size:11px;color:var(--fg-2,#888);font-family:system-ui,sans-serif;margin-left:4px;}
.helmfile-source-key{color:#2563eb;font-weight:700;}
.helmfile-source-comment{color:#6e7781;font-style:italic;}
`;

const HELP = {
  repositories: 'Helm chart repository definitions used by releases.',
  releases: 'Helm releases to install or sync.',
  chart: 'Chart reference. Repository/chart uses a configured repository; ./ paths are local charts.',
  version: 'Chart version pinned for reproducible release selection.',
  namespace: 'Kubernetes namespace targeted by the release.',
  values: 'Values files or inline values merged into the release.',
  environments: 'Environment-specific value and secret sets.',
  helmfiles: 'Nested Helmfile definitions.',
  defaults: 'Defaults applied across releases unless overridden.',
  secrets: 'Environment secret files or secret-looking values.',
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
  return HELP[key] || 'Open this Helmfile item in source.';
}

function lineButton(label, line, key = label) {
  const title = `${helpFor(key)} Open line ${line || 1} in source.`;
  return `<button class="helmfile-link" type="button" data-source-line="${line || 1}" title="${esc(title)}">${esc(label)}</button>`;
}

function itemLine(text, key, value, fallbackLine) {
  if (!value) return fallbackLine;
  return lineContaining(text, new RegExp(`${escapeRegExp(key)}:\\s*${escapeRegExp(value)}\\b`), fallbackLine);
}

function maskSecret(val) {
  if (!val) return '';
  const s = String(val);
  if (s.length <= 4) return '****';
  return s.slice(0, 2) + '****';
}

function valNames(vals) {
  return vals.map((v) => {
    if (typeof v === 'string') return v.split('/').pop();
    if (v && typeof v === 'object') return Object.keys(v).join(',');
    return String(v);
  }).join(', ');
}

function modelRepositories(repos, text, lineMap) {
  return repos.map((repo) => ({
    ...repo,
    line: itemLine(text, 'name', repo.name, lineFor(lineMap, 'repositories')),
    urlLine: itemLine(text, 'url', repo.url, lineFor(lineMap, 'repositories')),
  }));
}

function modelReleases(releases, text, lineMap) {
  return releases.map((release) => {
    const line = itemLine(text, 'name', release.name, lineFor(lineMap, 'releases'));
    return {
      ...release,
      line,
      chartLine: itemLine(text, 'chart', release.chart, line),
      versionLine: itemLine(text, 'version', release.version, line),
      namespaceLine: itemLine(text, 'namespace', release.namespace, line),
      valuesLine: lineContaining(text, /values:\s*$/, line),
    };
  });
}

function collectEnvironmentSecretFiles(cfg, text, lineMap) {
  const out = [];
  for (const [envName, env] of Object.entries(cfg.environments || {})) {
    const secrets = Array.isArray(env?.secrets) ? env.secrets : [];
    for (const secret of secrets) {
      out.push({
        envName,
        secret,
        line: lineContaining(text, new RegExp(`-\\s*${escapeRegExp(secret)}\\b`), lineFor(lineMap, `environments.${envName}`)),
      });
    }
  }
  return out;
}

function collectIssues(model) {
  const issues = [];
  for (const repo of model.repos) {
    if (/charts\.helm\.sh\/stable/i.test(repo.url || '') || repo.name === 'stable') {
      issues.push({ severity: 'warning', label: 'stable repo', line: repo.line, message: `${repo.name || repo.url} references the legacy stable chart repository; verify the charts are still maintained.` });
    }
    if (!/^https:\/\//i.test(repo.url || '')) {
      issues.push({ severity: 'warning', label: 'repo url', line: repo.urlLine, message: `${repo.name || 'repository'} does not use an HTTPS URL.` });
    }
  }
  for (const release of model.releases) {
    if (!release.version) {
      issues.push({ severity: 'warning', label: 'version', line: release.line, message: `${release.name || release.chart || 'release'} has no explicit chart version.` });
    }
    if (String(release.chart || '').startsWith('./')) {
      issues.push({ severity: 'info', label: 'local chart', line: release.chartLine, message: `${release.name} uses local chart ${release.chart}; chart content is controlled by the repository checkout.` });
    }
    const valueText = JSON.stringify(release.values || []) + JSON.stringify(release.set || []);
    if (/default\s+"latest"|:\s*latest\b|latest"/i.test(valueText)) {
      issues.push({ severity: 'warning', label: 'latest fallback', line: release.line, message: `${release.name} can fall back to latest; prefer immutable image tags or digests.` });
    }
    if (/password|secret|token|key/i.test(valueText)) {
      issues.push({ severity: 'info', label: 'secret input', line: release.valuesLine, message: `${release.name} has secret-looking values; confirm they resolve from environment or encrypted secret files.` });
    }
  }
  if (model.defaults) {
    if (model.defaults.atomic === true) issues.push({ severity: 'info', label: 'atomic', line: model.defaultsLine, message: 'atomic is enabled; failed releases are rolled back automatically.' });
    if (model.defaults.wait !== true) issues.push({ severity: 'warning', label: 'wait', line: model.defaultsLine, message: 'wait is not enabled by default; releases may report success before workloads are ready.' });
    if (model.defaults.createNamespace === true) issues.push({ severity: 'info', label: 'namespace', line: model.defaultsLine, message: 'createNamespace is enabled; Helmfile may create missing namespaces during sync.' });
  }
  for (const secret of model.environmentSecrets) {
    issues.push({ severity: 'info', label: 'env secret', line: secret.line, message: `${secret.envName} environment loads ${secret.secret}; keep decrypted secret files out of source control.` });
  }
  return issues;
}

function redactSource(text) {
  return String(text || '').split(/\r?\n/).map((line) => {
    const m = line.match(/^(\s*)(?:-\s*)?([A-Za-z_.$][\w:.$-]*)\s*:\s*(.*)$/);
    if (!m) return line;
    const key = m[2];
    const raw = m[3].trim();
    if (SECRETISH.test(key) || maskedValue(key, raw).masked) {
      return `${m[1]}${line.trimStart().startsWith('- ') ? '- ' : ''}${key}: [configured]`;
    }
    return line;
  }).join('\n');
}

function highlightYamlLine(line) {
  const raw = esc(line);
  return raw.replace(/^(\s*(?:-\s*)?)([A-Za-z_.$][\w:.$-]*)(\s*:)/, `$1<span class="helmfile-source-key">$2</span>$3`)
    .replace(/(#.*)$/, '<span class="helmfile-source-comment">$1</span>');
}

export async function render(intake) {
  let cfg = {};
  const text = intake.text || '';
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(text) || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  ensureKnownUiStyle(document);
  const lineMap = buildLineMap(text);
  const repos = modelRepositories(Array.isArray(cfg.repositories) ? cfg.repositories : [], text, lineMap);
  const releases = modelReleases(Array.isArray(cfg.releases) ? cfg.releases : [], text, lineMap);
  const envs = cfg.environments ? Object.keys(cfg.environments) : [];
  const helmfiles = Array.isArray(cfg.helmfiles) ? cfg.helmfiles : [];
  const defaults = cfg.helmDefaults || null;
  const environmentSecrets = collectEnvironmentSecretFiles(cfg, text, lineMap);
  const defaultsLine = lineFor(lineMap, 'helmDefaults');

  const reposHtml = repos.length
    ? `<div class="helmfile-sec"><h3>${lineButton(`Repositories (${repos.length})`, lineFor(lineMap, 'repositories'), 'repositories')}</h3>
<table class="helmfile-table">
<thead><tr><th>Name</th><th>URL</th><th>Auth</th></tr></thead>
<tbody>${repos.map((r) => {
  const hasAuth = r.username || r.password || r.certFile || r.keyFile || r.caFile;
  return `<tr>
    <td><span class="helmfile-mono">${lineButton(r.name || '', r.line, 'repositories')}</span></td>
    <td><span class="helmfile-dim">${lineButton(r.url || '', r.urlLine, 'repositories')}</span></td>
    <td>${hasAuth ? `<span class="helmfile-masked">${r.username ? esc(maskSecret(r.username)) + '@...' : ''}${r.certFile ? 'cert' : ''}${r.password ? '****' : ''}</span>` : '<span class="helmfile-dim">-</span>'}</td>
  </tr>`;
}).join('')}</tbody></table></div>`
    : '';

  const releasesHtml = releases.length
    ? `<div class="helmfile-sec"><h3>${lineButton(`Releases (${releases.length})`, lineFor(lineMap, 'releases'), 'releases')}</h3>
<table class="helmfile-table">
<thead><tr><th>Name</th><th>Chart</th><th>Version</th><th>Namespace</th><th>Values</th></tr></thead>
<tbody>${releases.slice(0, 12).map((r) => {
  const vals = Array.isArray(r.values) ? r.values : [];
  return `<tr>
    <td><span class="helmfile-mono">${lineButton(r.name || '', r.line, 'releases')}</span></td>
    <td><span class="helmfile-dim">${lineButton(r.chart || '', r.chartLine, 'chart')}</span></td>
    <td><span class="helmfile-dim">${lineButton(r.version || '-', r.versionLine, 'version')}</span></td>
    <td><span class="helmfile-dim">${lineButton(r.namespace || '-', r.namespaceLine, 'namespace')}</span></td>
    <td><span class="helmfile-dim">${lineButton(valNames(vals) || '-', r.valuesLine, 'values')}</span></td>
  </tr>`;
}).join('')}${releases.length > 12 ? `<tr><td colspan="5" class="helmfile-dim">...and ${releases.length - 12} more</td></tr>` : ''}
</tbody></table></div>`
    : '';

  const envsHtml = envs.length
    ? `<div class="helmfile-sec"><h3>${lineButton(`Environments (${envs.length})`, lineFor(lineMap, 'environments'), 'environments')}</h3>
<div style="display:flex;flex-wrap:wrap;gap:4px;">${envs.map((env) => `<span class="helmfile-pill">${lineButton(env, lineFor(lineMap, `environments.${env}`, 'environments'), 'environments')}</span>`).join('')}</div></div>`
    : '';

  const helmfilesHtml = helmfiles.length
    ? `<div class="helmfile-sec"><h3>${lineButton(`Helmfiles (${helmfiles.length})`, lineFor(lineMap, 'helmfiles'), 'helmfiles')}</h3>
<div style="display:flex;flex-wrap:wrap;gap:4px;">${helmfiles.map((h) => {
  const path = typeof h === 'string' ? h : (h.path || JSON.stringify(h));
  return `<span class="helmfile-pill">${lineButton(path, lineContaining(text, path, lineFor(lineMap, 'helmfiles')), 'helmfiles')}</span>`;
}).join('')}</div></div>`
    : '';

  const defaultsHtml = defaults
    ? `<div class="helmfile-sec"><h3>${lineButton('Helm Defaults', defaultsLine, 'defaults')}</h3><div class="helmfile-kv">
${defaults.createNamespace != null ? `<span class="helmfile-k">${lineButton('createNamespace', lineFor(lineMap, 'helmDefaults.createNamespace'), 'defaults')}</span><span class="helmfile-v">${lineButton(String(defaults.createNamespace), lineFor(lineMap, 'helmDefaults.createNamespace'), 'defaults')}</span>` : ''}
${defaults.wait != null ? `<span class="helmfile-k">${lineButton('wait', lineFor(lineMap, 'helmDefaults.wait'), 'defaults')}</span><span class="helmfile-v">${lineButton(String(defaults.wait), lineFor(lineMap, 'helmDefaults.wait'), 'defaults')}</span>` : ''}
${defaults.atomic != null ? `<span class="helmfile-k">${lineButton('atomic', lineFor(lineMap, 'helmDefaults.atomic'), 'defaults')}</span><span class="helmfile-v">${lineButton(String(defaults.atomic), lineFor(lineMap, 'helmDefaults.atomic'), 'defaults')}</span>` : ''}
${defaults.timeout != null ? `<span class="helmfile-k">${lineButton('timeout', lineFor(lineMap, 'helmDefaults.timeout'), 'defaults')}</span><span class="helmfile-v">${lineButton(String(defaults.timeout), lineFor(lineMap, 'helmDefaults.timeout'), 'defaults')}</span>` : ''}
${defaults.recreatePods != null ? `<span class="helmfile-k">${lineButton('recreatePods', lineFor(lineMap, 'helmDefaults.recreatePods'), 'defaults')}</span><span class="helmfile-v">${lineButton(String(defaults.recreatePods), lineFor(lineMap, 'helmDefaults.recreatePods'), 'defaults')}</span>` : ''}
${defaults.cleanupOnFail != null ? `<span class="helmfile-k">${lineButton('cleanupOnFail', lineFor(lineMap, 'helmDefaults.cleanupOnFail'), 'defaults')}</span><span class="helmfile-v">${lineButton(String(defaults.cleanupOnFail), lineFor(lineMap, 'helmDefaults.cleanupOnFail'), 'defaults')}</span>` : ''}
</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'helmfile-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="helmfile-badge">Helmfile</span>
  <span class="helmfile-title">Helmfile</span>
  ${repos.length ? `<span class="helmfile-pill">${lineButton(`${repos.length} repo${repos.length !== 1 ? 's' : ''}`, lineFor(lineMap, 'repositories'), 'repositories')}</span>` : ''}
  ${releases.length ? `<span class="helmfile-pill">${lineButton(`${releases.length} release${releases.length !== 1 ? 's' : ''}`, lineFor(lineMap, 'releases'), 'releases')}</span>` : ''}
</div>
${defaultsHtml}${reposHtml}${releasesHtml}${envsHtml}${helmfilesHtml}`;

  const review = issueList(collectIssues({ repos, releases, defaults, defaultsLine, environmentSecrets }), { title: 'Helmfile Review' });
  if (review) host.insertBefore(review, host.querySelector('.helmfile-sec') || null);
  host.appendChild(sourcePreview(redactSource(text), {
    title: 'Redacted source',
    collapsed: true,
    idPrefix: 'helmfile-line',
    highlighter: highlightYamlLine,
  }));
  wireSourceLinks(host, { idPrefix: 'helmfile-line' });
  return { parentNode: host };
}
