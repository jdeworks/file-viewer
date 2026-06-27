import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
import { ensureKnownUiStyle, issueList, maskedValue, sourcePreview, wireSourceLinks } from '../../../../../core/known-ui.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.helmvalues-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.helmvalues-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0f1689;color:#fff;vertical-align:middle;margin-right:8px;}
.helmvalues-title{font-size:18px;font-weight:700;margin:0 0 12px;}
.helmvalues-sec{margin:14px 0;}
.helmvalues-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.helmvalues-pills{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:4px;}
.helmvalues-pill{font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);color:var(--fg,#24292f);}
.helmvalues-pill.svc-clusterip{background:#eff6ff;border-color:#bfdbfe;color:#1e40af;}
.helmvalues-pill.svc-nodeport{background:#fef9c3;border-color:#fde047;color:#713f12;}
.helmvalues-pill.svc-lb{background:#f0fdf4;border-color:#86efac;color:#14532d;}
.helmvalues-pill.enabled{background:#f0fdf4;border-color:#86efac;color:#14532d;}
.helmvalues-pill.disabled{background:#f9fafb;border-color:#d1d5db;color:#6b7280;}
.helmvalues-table{width:100%;border-collapse:collapse;font-size:13px;}
.helmvalues-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.helmvalues-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.helmvalues-mono{font:12px ui-monospace,monospace;}
.helmvalues-kv{display:grid;grid-template-columns:max-content 1fr;gap:3px 14px;font-size:13px;}
.helmvalues-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.helmvalues-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;}
.helmvalues-dim{font-size:11px;color:var(--fg-2,#888);}
.helmvalues-link{border:0;background:transparent;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;}
.helmvalues-link:hover{color:#0f1689;}
.helmvalues-source-key{color:#0f1689;font-weight:700;}
.helmvalues-source-comment{color:#6e7781;font-style:italic;}
`;

const HELP = {
  overview: 'Top-level Helm values that usually affect deployment scale and global defaults.',
  image: 'Container image repository, tag, and pull policy used by the chart templates.',
  service: 'Kubernetes Service exposure settings rendered from values.',
  ingress: 'Ingress host, class, and TLS controls used to expose the workload.',
  resources: 'Container CPU and memory requests and limits.',
  autoscaling: 'Horizontal Pod Autoscaler values and fallback replica count.',
  env: 'Environment variables passed into the rendered workload.',
  persistence: 'Persistent volume claim values such as size, class, and access mode.',
  config: 'Application configuration values consumed by chart templates.',
  source: 'Open this Helm value in source.',
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

function itemLine(text, key, value, fallbackLine) {
  if (value == null || value === '') return fallbackLine;
  return lineContaining(text, new RegExp(`${escapeRegExp(key)}:\\s*["']?${escapeRegExp(value)}\\b`), fallbackLine);
}

function helpFor(key) {
  return HELP[key] || HELP.source;
}

function lineButton(label, line, key = 'source') {
  const title = `${helpFor(key)} Open line ${line || 1} in source.`;
  return `<button class="helmvalues-link" type="button" data-source-line="${line || 1}" title="${esc(title)}">${esc(label)}</button>`;
}

function svcPillClass(type) {
  if (!type) return 'helmvalues-pill';
  const t = String(type).toLowerCase();
  if (t === 'clusterip') return 'helmvalues-pill svc-clusterip';
  if (t === 'nodeport') return 'helmvalues-pill svc-nodeport';
  if (t === 'loadbalancer') return 'helmvalues-pill svc-lb';
  return 'helmvalues-pill';
}

function enabledPillClass(val) {
  return val ? 'helmvalues-pill enabled' : 'helmvalues-pill disabled';
}

function maskedText(key, value) {
  const masked = maskedValue(key, value);
  const title = masked.reason ? ` title="${esc(masked.reason)}"` : '';
  return `<span class="helmvalues-mono"${title}>${esc(masked.text)}</span>`;
}

function collectHosts(ing) {
  const hostList = [];
  if (ing.host) hostList.push(String(ing.host));
  if (Array.isArray(ing.hosts)) {
    for (const h of ing.hosts) {
      if (typeof h === 'string') hostList.push(h);
      else if (h && h.host) hostList.push(String(h.host));
    }
  }
  return [...new Set(hostList)];
}

function collectScalarRows(obj, parentPath, text, lineMap) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [];
  return Object.entries(obj).filter(([, value]) => value == null || typeof value !== 'object').map(([key, value]) => {
    const path = `${parentPath}.${key}`;
    const line = lineFor(lineMap, path, parentPath);
    return { key, value, line: itemLine(text, key, value, line) };
  });
}

function collectIssues(cfg, text, lineMap) {
  const issues = [];
  const image = cfg.image && typeof cfg.image === 'object' ? cfg.image : {};
  const tag = String(image.tag || image.imageTag || '');
  if (!tag) {
    issues.push({ severity: 'warning', label: 'image tag', line: lineFor(lineMap, 'image'), message: 'Image tag is not set; many charts default to latest or appVersion.' });
  } else if (/^(latest|main|master|edge|stable|dev)$/i.test(tag)) {
    issues.push({ severity: 'warning', label: 'image tag', line: lineFor(lineMap, 'image.tag'), message: `${tag} is mutable; pin a release tag or digest for repeatable deployments.` });
  }
  if (/^always$/i.test(image.pullPolicy || '')) {
    issues.push({ severity: 'info', label: 'pullPolicy', line: lineFor(lineMap, 'image.pullPolicy'), message: 'Always pulls on every start; useful for dev tags, noisy for stable releases.' });
  }

  const svc = cfg.service && typeof cfg.service === 'object' ? cfg.service : {};
  if (/^(nodeport|loadbalancer)$/i.test(svc.type || '')) {
    issues.push({ severity: 'warning', label: 'service', line: lineFor(lineMap, 'service.type'), message: `${svc.type} may expose the workload outside the cluster.` });
  }

  const ing = cfg.ingress && typeof cfg.ingress === 'object' ? cfg.ingress : {};
  const ingressEnabled = ing.enabled === true;
  const ingressTls = ing.tls === true || (Array.isArray(ing.tls) && ing.tls.length > 0);
  if (ingressEnabled && !ingressTls) {
    issues.push({ severity: 'warning', label: 'ingress tls', line: lineFor(lineMap, 'ingress.tls', 'ingress.enabled'), message: 'Ingress is enabled without TLS in values.' });
  }
  if (ingressEnabled && collectHosts(ing).length) {
    issues.push({ severity: 'info', label: 'public host', line: lineFor(lineMap, 'ingress.host', 'ingress.hosts'), message: 'Ingress hosts are deployment-facing values; confirm DNS and TLS match the target environment.' });
  }

  const resources = cfg.resources && typeof cfg.resources === 'object' ? cfg.resources : {};
  if (!resources.requests || !resources.limits) {
    issues.push({ severity: 'warning', label: 'resources', line: lineFor(lineMap, 'resources'), message: 'Requests and limits are not both configured; scheduling or runtime bounds may be unpredictable.' });
  }

  const autoscaling = cfg.autoscaling && typeof cfg.autoscaling === 'object' ? cfg.autoscaling : {};
  if (autoscaling.enabled === false) {
    issues.push({ severity: 'info', label: 'autoscaling', line: lineFor(lineMap, 'autoscaling.enabled'), message: 'Autoscaling is disabled; capacity follows replicaCount.' });
  }

  const env = cfg.env;
  const envRows = Array.isArray(env)
    ? env.map((item) => ({ key: item?.name || '', value: item?.value, line: itemLine(text, 'name', item?.name, lineFor(lineMap, 'env')) }))
    : collectScalarRows(env, 'env', text, lineMap);
  for (const row of envRows) {
    const masked = maskedValue(row.key, row.value);
    if (masked.masked) issues.push({ severity: 'warning', label: 'secret', line: row.line, message: `${row.key} looks sensitive; keep secrets in Kubernetes Secrets or external secret managers.` });
  }

  for (const row of collectScalarRows(cfg.config, 'config', text, lineMap)) {
    const masked = maskedValue(row.key, row.value);
    if (masked.masked) {
      issues.push({ severity: 'warning', label: 'secret', line: row.line, message: `${row.key} looks sensitive and should not be stored as a plain Helm value.` });
    } else if (/(url|uri|dsn|endpoint)$/i.test(row.key)) {
      issues.push({ severity: 'info', label: 'reference', line: row.line, message: `${row.key} points at another service; confirm it matches the release namespace and environment.` });
    }
  }

  return issues;
}

function redactSource(text) {
  return String(text || '').split(/\r?\n/).map((line) => {
    const m = line.match(/^(\s*)([A-Za-z_.$/-][\w:.$/-]*)(\s*:\s*)(.*)$/);
    if (!m) return line;
    const masked = maskedValue(m[2], m[4].replace(/^['"]|['"]$/g, ''));
    return masked.masked ? `${m[1]}${m[2]}${m[3]}"********"` : line;
  }).join('\n');
}

function highlightYamlLine(line) {
  const raw = esc(line);
  return raw.replace(/^(\s*(?:-\s*)?)([A-Za-z_.$/-][\w:.$/-]*)(\s*:)/, `$1<span class="helmvalues-source-key">$2</span>$3`)
    .replace(/(#.*)$/, '<span class="helmvalues-source-comment">$1</span>');
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
  const host = document.createElement('div');
  host.className = 'helmvalues-doc';

  const sections = [];

  // ── Overview pills ──
  const overviewPills = [];
  if (cfg.replicaCount != null) overviewPills.push(`<span class="helmvalues-pill">${lineButton(`replicas: ${cfg.replicaCount}`, lineFor(lineMap, 'replicaCount'), 'overview')}</span>`);
  if (overviewPills.length) {
    sections.push(`<div class="helmvalues-sec"><h3>${lineButton('Overview', lineFor(lineMap, 'replicaCount'), 'overview')}</h3><div class="helmvalues-pills">${overviewPills.join('')}</div></div>`);
  }

  // ── Image ──
  const img = cfg.image;
  if (img && typeof img === 'object') {
    const repo = img.repository || img.name || '';
    const tag = img.tag || img.imageTag || 'latest';
    const pull = img.pullPolicy || '';
    sections.push(`<div class="helmvalues-sec"><h3>${lineButton('Image', lineFor(lineMap, 'image'), 'image')}</h3><div class="helmvalues-kv">
      ${repo ? `<span class="helmvalues-k">${lineButton('repository', lineFor(lineMap, 'image.repository', 'image.name'), 'image')}</span><span class="helmvalues-v">${lineButton(repo, itemLine(text, 'repository', repo, lineFor(lineMap, 'image.repository')), 'image')}</span>` : ''}
      <span class="helmvalues-k">${lineButton('tag', lineFor(lineMap, 'image.tag', 'image.imageTag'), 'image')}</span><span class="helmvalues-v">${lineButton(tag, itemLine(text, img.tag ? 'tag' : 'imageTag', tag, lineFor(lineMap, 'image.tag', 'image.imageTag')), 'image')}</span>
      ${pull ? `<span class="helmvalues-k">${lineButton('pullPolicy', lineFor(lineMap, 'image.pullPolicy'), 'image')}</span><span class="helmvalues-v">${lineButton(pull, itemLine(text, 'pullPolicy', pull, lineFor(lineMap, 'image.pullPolicy')), 'image')}</span>` : ''}
    </div></div>`);
  }

  // ── Service ──
  const svc = cfg.service;
  if (svc && typeof svc === 'object') {
    const type = svc.type || '';
    const port = svc.port != null ? svc.port : '';
    const targetPort = svc.targetPort != null ? svc.targetPort : '';
    sections.push(`<div class="helmvalues-sec"><h3>${lineButton('Service', lineFor(lineMap, 'service'), 'service')}</h3><div class="helmvalues-pills" style="margin-bottom:6px;">
      ${type ? `<span class="${svcPillClass(type)}">${lineButton(type, itemLine(text, 'type', type, lineFor(lineMap, 'service.type')), 'service')}</span>` : ''}
      ${port ? `<span class="helmvalues-pill">${lineButton(`port: ${port}`, lineFor(lineMap, 'service.port'), 'service')}</span>` : ''}
      ${targetPort ? `<span class="helmvalues-pill">${lineButton(`targetPort: ${targetPort}`, lineFor(lineMap, 'service.targetPort'), 'service')}</span>` : ''}
    </div></div>`);
  }

  // ── Ingress ──
  const ing = cfg.ingress;
  if (ing && typeof ing === 'object') {
    const enabled = ing.enabled;
    const className = ing.className || ing.ingressClassName || '';
    const hostList = collectHosts(ing);
    const tls = ing.tls === true || (Array.isArray(ing.tls) && ing.tls.length > 0);
    sections.push(`<div class="helmvalues-sec"><h3>${lineButton('Ingress', lineFor(lineMap, 'ingress'), 'ingress')}</h3>
      <div class="helmvalues-pills" style="margin-bottom:6px;">
        <span class="${enabledPillClass(enabled)}">${lineButton(enabled ? 'enabled' : 'disabled', lineFor(lineMap, 'ingress.enabled'), 'ingress')}</span>
        ${tls ? `<span class="helmvalues-pill enabled">${lineButton('TLS', lineFor(lineMap, 'ingress.tls'), 'ingress')}</span>` : ''}
        ${className ? `<span class="helmvalues-pill"><span class="helmvalues-mono">${lineButton(className, itemLine(text, 'className', className, lineFor(lineMap, 'ingress.className', 'ingress.ingressClassName')), 'ingress')}</span></span>` : ''}
      </div>
      ${hostList.length ? `<div class="helmvalues-dim">${hostList.map(h => lineButton(h, itemLine(text, 'host', h, lineFor(lineMap, 'ingress.host', 'ingress.hosts')), 'ingress')).join(', ')}</div>` : ''}
    </div>`);
  }

  // ── Resources ──
  const res = cfg.resources;
  if (res && typeof res === 'object') {
    const lim = res.limits || {};
    const req = res.requests || {};
    const rows = [];
    const keys = new Set([...Object.keys(lim), ...Object.keys(req)]);
    for (const k of keys) {
      const line = lineFor(lineMap, `resources.limits.${k}`, `resources.requests.${k}`, 'resources');
      rows.push(`<tr>
        <td><span class="helmvalues-mono">${lineButton(k, line, 'resources')}</span></td>
        <td>${lim[k] != null ? `<span class="helmvalues-mono">${lineButton(lim[k], lineFor(lineMap, `resources.limits.${k}`, 'resources.limits'), 'resources')}</span>` : '<span class="helmvalues-dim">-</span>'}</td>
        <td>${req[k] != null ? `<span class="helmvalues-mono">${lineButton(req[k], lineFor(lineMap, `resources.requests.${k}`, 'resources.requests'), 'resources')}</span>` : '<span class="helmvalues-dim">-</span>'}</td>
      </tr>`);
    }
    if (rows.length) {
      sections.push(`<div class="helmvalues-sec"><h3>${lineButton('Resources', lineFor(lineMap, 'resources'), 'resources')}</h3>
        <table class="helmvalues-table">
          <thead><tr><th>Resource</th><th>Limit</th><th>Request</th></tr></thead>
          <tbody>${rows.join('')}</tbody>
        </table>
      </div>`);
    }
  }

  // ── Autoscaling ──
  const hpa = cfg.autoscaling;
  if (hpa && typeof hpa === 'object') {
    const enabled = hpa.enabled;
    const pills = [];
    pills.push(`<span class="${enabledPillClass(enabled)}">${lineButton(enabled ? 'enabled' : 'disabled', lineFor(lineMap, 'autoscaling.enabled'), 'autoscaling')}</span>`);
    if (hpa.minReplicas != null) pills.push(`<span class="helmvalues-pill">${lineButton(`min: ${hpa.minReplicas}`, lineFor(lineMap, 'autoscaling.minReplicas'), 'autoscaling')}</span>`);
    if (hpa.maxReplicas != null) pills.push(`<span class="helmvalues-pill">${lineButton(`max: ${hpa.maxReplicas}`, lineFor(lineMap, 'autoscaling.maxReplicas'), 'autoscaling')}</span>`);
    if (hpa.targetCPUUtilizationPercentage != null) pills.push(`<span class="helmvalues-pill">${lineButton(`CPU target: ${hpa.targetCPUUtilizationPercentage}%`, lineFor(lineMap, 'autoscaling.targetCPUUtilizationPercentage'), 'autoscaling')}</span>`);
    if (hpa.targetMemoryUtilizationPercentage != null) pills.push(`<span class="helmvalues-pill">${lineButton(`Mem target: ${hpa.targetMemoryUtilizationPercentage}%`, lineFor(lineMap, 'autoscaling.targetMemoryUtilizationPercentage'), 'autoscaling')}</span>`);
    sections.push(`<div class="helmvalues-sec"><h3>${lineButton('Autoscaling', lineFor(lineMap, 'autoscaling'), 'autoscaling')}</h3><div class="helmvalues-pills">${pills.join('')}</div></div>`);
  }

  // ── Env vars (mask secrets) ──
  const envVal = cfg.env;
  if (envVal && typeof envVal === 'object' && !Array.isArray(envVal)) {
    const envKeys = Object.keys(envVal);
    if (envKeys.length) {
      const rows = envKeys.map(k => {
        const line = lineFor(lineMap, `env.${k}`, 'env');
        return `<tr><td><span class="helmvalues-mono">${lineButton(k, line, 'env')}</span></td><td>${maskedText(k, envVal[k])}</td></tr>`;
      });
      sections.push(`<div class="helmvalues-sec"><h3>${lineButton(`Env Vars (${envKeys.length})`, lineFor(lineMap, 'env'), 'env')}</h3>
        <table class="helmvalues-table">
          <thead><tr><th>Name</th><th>Value</th></tr></thead>
          <tbody>${rows.join('')}</tbody>
        </table>
      </div>`);
    }
  } else if (Array.isArray(envVal) && envVal.length) {
    const rows = envVal.map(e => {
      const k = e.name || '';
      const line = itemLine(text, 'name', k, lineFor(lineMap, 'env'));
      const value = e.valueFrom ? '<span class="helmvalues-dim">valueFrom</span>' : maskedText(k, e.value);
      return `<tr><td><span class="helmvalues-mono">${lineButton(k, line, 'env')}</span></td><td>${value}</td></tr>`;
    });
    sections.push(`<div class="helmvalues-sec"><h3>${lineButton(`Env Vars (${envVal.length})`, lineFor(lineMap, 'env'), 'env')}</h3>
      <table class="helmvalues-table">
        <thead><tr><th>Name</th><th>Value</th></tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table>
    </div>`);
  }

  // ── Persistence ──
  const pers = cfg.persistence;
  if (pers && typeof pers === 'object') {
    const enabled = pers.enabled;
    const pills = [];
    pills.push(`<span class="${enabledPillClass(enabled)}">${lineButton(enabled ? 'enabled' : 'disabled', lineFor(lineMap, 'persistence.enabled'), 'persistence')}</span>`);
    if (pers.size) pills.push(`<span class="helmvalues-pill">${lineButton(`size: ${pers.size}`, lineFor(lineMap, 'persistence.size'), 'persistence')}</span>`);
    if (pers.storageClass) pills.push(`<span class="helmvalues-pill">${lineButton(`class: ${pers.storageClass}`, lineFor(lineMap, 'persistence.storageClass'), 'persistence')}</span>`);
    if (pers.accessMode || pers.accessModes) {
      const mode = pers.accessMode || (Array.isArray(pers.accessModes) ? pers.accessModes[0] : '');
      if (mode) pills.push(`<span class="helmvalues-pill">${lineButton(mode, lineFor(lineMap, 'persistence.accessMode', 'persistence.accessModes'), 'persistence')}</span>`);
    }
    sections.push(`<div class="helmvalues-sec"><h3>${lineButton('Persistence', lineFor(lineMap, 'persistence'), 'persistence')}</h3><div class="helmvalues-pills">${pills.join('')}</div></div>`);
  }

  const configRows = collectScalarRows(cfg.config, 'config', text, lineMap);
  if (configRows.length) {
    sections.push(`<div class="helmvalues-sec"><h3>${lineButton(`Config (${configRows.length})`, lineFor(lineMap, 'config'), 'config')}</h3>
      <table class="helmvalues-table">
        <thead><tr><th>Key</th><th>Value</th></tr></thead>
        <tbody>${configRows.map((row) => `<tr><td><span class="helmvalues-mono">${lineButton(row.key, row.line, 'config')}</span></td><td>${maskedText(row.key, row.value)}</td></tr>`).join('')}</tbody>
      </table>
    </div>`);
  }

  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
  <span class="helmvalues-badge">Helm Values</span>
  <span class="helmvalues-title">${lineButton('values.yaml', 1, 'overview')}</span>
</div>
${sections.join('')}`;

  const review = issueList(collectIssues(cfg, text, lineMap), { title: 'Helm Values Review' });
  if (review) host.insertBefore(review, host.querySelector('.helmvalues-sec') || null);
  host.appendChild(sourcePreview(redactSource(text), {
    title: 'Redacted source',
    collapsed: true,
    idPrefix: 'helmvalues-line',
    highlighter: highlightYamlLine,
  }));
  wireSourceLinks(host, { idPrefix: 'helmvalues-line' });
  return { parentNode: host };
}
