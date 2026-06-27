import { parseTOML } from '../../toml.js';
import { ensureKnownUiStyle, issueList, maskedValue, sourcePreview, wireSourceLinks } from '../../../../../core/known-ui.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.wgl-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-wgl{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f48120;color:#fff;vertical-align:middle;margin-right:8px;}
.wgl-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.wgl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.wgl-sec{margin:12px 0;}
.wgl-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.wgl-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0;}
.wgl-pill{display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.wgl-pill.route{background:#fff7ed;border-color:#fed7aa;color:#9a3412;}
.wgl-pill.kv{background:#eff6ff;border-color:#bfdbfe;color:#1e40af;}
.wgl-pill.env{background:#f0fdf4;border-color:#bbf7d0;color:#166534;}
.wgl-kv{font-size:12px;display:flex;gap:8px;align-items:baseline;margin:3px 0;}
.wgl-key{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#888);}
.wgl-val{font:12px/1.4 ui-monospace,monospace;font-weight:600;}
.wgl-redacted{font-size:11px;background:var(--bg-3,#eee);padding:1px 6px;border-radius:4px;color:var(--fg-2,#888);}
.wgl-table{width:100%;border-collapse:collapse;font-size:13px;}
.wgl-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.wgl-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.wgl-link{border:0;background:transparent;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;}
.wgl-link:hover{color:var(--accent,#2563eb);}
.wgl-src-key{color:#0550ae;font-weight:700;}
.wgl-src-section{color:#8250df;font-weight:700;}
.wgl-src-comment{color:#6e7781;font-style:italic;}
`;

const HELP = {
  identity: 'Worker identity and entrypoint used by Wrangler deploys.',
  compatibility: 'Compatibility date pins Workers runtime behavior. Older dates may miss platform fixes or behavior changes.',
  account: 'Cloudflare account identifier; useful for deploy targeting but not needed in most previews.',
  routes: 'Public route patterns that bind this Worker to hostnames and paths.',
  kv: 'KV namespace bindings exposed to Worker code.',
  durableObjects: 'Durable Object bindings exposed to Worker code.',
  env: 'Named Wrangler environments and their environment-specific vars or bindings.',
  vars: 'Plain variables available to Worker code. Secret-like values should use Wrangler secrets.',
  source: 'Open this Wrangler setting in source.',
};

const KNOWN_TOP_LEVEL_KEYS = new Set([
  'account_id', 'assets', 'build', 'compatibility_date', 'compatibility_flags',
  'd1_databases', 'durable_objects', 'env', 'kv_namespaces', 'main', 'migrations',
  'name', 'observability', 'placement', 'queues', 'r2_buckets', 'route', 'routes',
  'site', 'tail_consumers', 'triggers', 'vars', 'vectorize',
]);

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function lineContaining(text, pattern, fallbackLine = 1) {
  const rx = pattern instanceof RegExp ? pattern : new RegExp(escapeRegExp(pattern));
  const lines = String(text || '').split(/\r?\n/);
  const idx = lines.findIndex((line) => rx.test(line));
  return idx >= 0 ? idx + 1 : fallbackLine;
}

function sectionLine(text, section, fallbackLine = 1) {
  return lineContaining(text, new RegExp(`^\\s*\\[\\[?${escapeRegExp(section)}\\]?\\]\\s*$`), fallbackLine);
}

function valueLine(text, key, value, fallbackLine = 1) {
  if (value == null || value === '') return lineContaining(text, new RegExp(`^\\s*${escapeRegExp(key)}\\s*=`), fallbackLine);
  return lineContaining(text, new RegExp(`^\\s*${escapeRegExp(key)}\\s*=\\s*["']?${escapeRegExp(value)}\\b`), fallbackLine);
}

function helpFor(key) {
  return HELP[key] || HELP.source;
}

function lineButton(label, line, key = 'source') {
  const title = `${helpFor(key)} Open line ${line || 1} in source.`;
  return `<button class="wgl-link" type="button" data-source-line="${line || 1}" title="${esc(title)}">${esc(label)}</button>`;
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  return value == null ? [] : [value];
}

function routePattern(route) {
  if (typeof route === 'string') return route;
  return route?.pattern || route?.custom_domain || route?.zone_name || JSON.stringify(route);
}

function daysSince(dateText) {
  const time = Date.parse(`${dateText}T00:00:00Z`);
  if (!Number.isFinite(time)) return null;
  return Math.floor((Date.now() - time) / 86400000);
}

function envVarsFor(envCfg) {
  if (!envCfg || typeof envCfg !== 'object') return [];
  const vars = envCfg.vars && typeof envCfg.vars === 'object' ? envCfg.vars : {};
  return Object.entries(vars).map(([key, value]) => ({ key, value }));
}

function collectIssues(model, text) {
  const issues = [];
  for (const item of model.unknownTopLevel || []) {
    issues.push({ severity: 'info', label: 'unknown key', line: item.line, message: `"${item.key}" is not a common Wrangler top-level key or section; check for a typo or unsupported setting.` });
  }
  if (!model.main) {
    issues.push({ severity: 'warning', label: 'main', line: 1, message: 'No Worker entrypoint is configured.' });
  }
  if (!model.compatDate) {
    issues.push({ severity: 'warning', label: 'compatibility', line: 1, message: 'No compatibility_date is configured; runtime behavior is not pinned.' });
  } else {
    const age = daysSince(model.compatDate);
    if (age != null && age > 365) {
      issues.push({ severity: 'warning', label: 'compatibility', line: valueLine(text, 'compatibility_date', model.compatDate), message: `${model.compatDate} is more than a year old; review Workers compatibility changes before deploy.` });
    }
  }
  for (const route of model.routes) {
    const pattern = routePattern(route);
    const line = valueLine(text, 'pattern', pattern, sectionLine(text, 'routes'));
    if (/\*/.test(pattern)) {
      issues.push({ severity: 'warning', label: 'route', line, message: `${pattern} is a wildcard route; confirm it does not capture unrelated traffic.` });
    }
    if (!/^https?:\/\//i.test(pattern) && !/^[^/]+\//.test(pattern)) {
      issues.push({ severity: 'info', label: 'route', line, message: `${pattern} has no explicit scheme; Wrangler treats it as a route pattern.` });
    }
  }
  for (const kv of model.kvNamespaces) {
    if (!kv.id && !kv.preview_id) {
      issues.push({ severity: 'warning', label: 'kv', line: valueLine(text, 'binding', kv.binding, sectionLine(text, 'kv_namespaces')), message: `${kv.binding || 'KV binding'} has no namespace id or preview_id.` });
    }
  }
  for (const env of model.envs) {
    for (const variable of env.vars) {
      const masked = maskedValue(variable.key, variable.value);
      if (masked.masked) {
        issues.push({ severity: 'warning', label: 'secret', line: valueLine(text, variable.key, variable.value, env.line), message: `${variable.key} looks sensitive; use wrangler secret for deploy-time secrets.` });
      }
    }
  }
  return issues;
}

function redactSource(text) {
  return String(text || '').split(/\r?\n/).map((line) => {
    const inline = line.replace(/([A-Za-z0-9_.-]+)\s*=\s*"([^"]*)"/g, (match, key, value) => {
      const masked = maskedValue(key, value);
      return masked.masked ? `${key} = "********"` : match;
    });
    const m = inline.match(/^(\s*)([A-Za-z0-9_.-]+)(\s*=\s*)(['"]?)(.*?)(\4)(\s*(?:#.*)?)$/);
    if (!m) return inline;
    const masked = maskedValue(m[2], m[5]);
    return masked.masked ? `${m[1]}${m[2]}${m[3]}${m[4]}********${m[6]}${m[7]}` : inline;
  }).join('\n');
}

function highlightTomlLine(line) {
  const raw = esc(line);
  return raw
    .replace(/^(\s*\[+)([^\]]+)(\]+\s*)$/, `$1<span class="wgl-src-section">$2</span>$3`)
    .replace(/^(\s*)([A-Za-z0-9_.-]+)(\s*=)/, `$1<span class="wgl-src-key">$2</span>$3`)
    .replace(/(#.*)$/, '<span class="wgl-src-comment">$1</span>');
}

function envModel(cfg, text) {
  return Object.entries(cfg.env || {}).map(([name, envCfg]) => ({
    name,
    line: sectionLine(text, `env.${name}`, 1),
    vars: envVarsFor(envCfg),
  }));
}

function accountLabel(accountId) {
  return accountId ? `${String(accountId).slice(0, 8)}...` : '';
}

function topLevelKeys(text) {
  const out = [];
  for (const [idx, raw] of String(text || '').split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const section = /^\[\[?([^\]]+)\]?\]$/.exec(line);
    if (section) {
      const root = section[1].split('.')[0];
      out.push({ key: root, line: idx + 1 });
      continue;
    }
    const kv = /^([A-Za-z0-9_.-]+)\s*=/.exec(line);
    if (kv) out.push({ key: kv[1].split('.')[0], line: idx + 1 });
  }
  return out;
}

export function render(intake) {
  const text = intake.text || '';
  let cfg = {};
  try { cfg = parseTOML(text) || {}; } catch { cfg = {}; }
  ensureKnownUiStyle(document);

  const model = {
    name: cfg.name || '',
    main: cfg.main || '',
    compatDate: cfg.compatibility_date || '',
    accountId: cfg.account_id || '',
    routes: Array.isArray(cfg.routes) ? cfg.routes : toArray(cfg.route),
    kvNamespaces: Array.isArray(cfg.kv_namespaces) ? cfg.kv_namespaces : [],
    durableObjects: cfg.durable_objects && Array.isArray(cfg.durable_objects.bindings) ? cfg.durable_objects.bindings : [],
    envs: envModel(cfg, text),
    unknownTopLevel: topLevelKeys(text).filter((item, idx, arr) => !KNOWN_TOP_LEVEL_KEYS.has(item.key) && arr.findIndex((other) => other.key === item.key) === idx),
  };

  const metaHtml = [
    model.main && `<div class="wgl-kv"><span class="wgl-key">${lineButton('main', valueLine(text, 'main', model.main), 'identity')}</span><span class="wgl-val">${lineButton(model.main, valueLine(text, 'main', model.main), 'identity')}</span></div>`,
    model.compatDate && `<div class="wgl-kv"><span class="wgl-key">${lineButton('compatibility_date', valueLine(text, 'compatibility_date', model.compatDate), 'compatibility')}</span><span class="wgl-val">${lineButton(model.compatDate, valueLine(text, 'compatibility_date', model.compatDate), 'compatibility')}</span></div>`,
    model.accountId && `<div class="wgl-kv"><span class="wgl-key">${lineButton('account_id', valueLine(text, 'account_id', model.accountId), 'account')}</span><span class="wgl-redacted" title="Account id shortened for display">${lineButton(accountLabel(model.accountId), valueLine(text, 'account_id', model.accountId), 'account')}</span></div>`,
  ].filter(Boolean).join('');

  const routesHtml = model.routes.length
    ? `<div class="wgl-sec"><h3>${lineButton(`Routes (${model.routes.length})`, sectionLine(text, 'routes'), 'routes')}</h3><div class="wgl-pills">${model.routes.slice(0, 10).map((route) => {
        const pattern = routePattern(route);
        return `<span class="wgl-pill route">${lineButton(pattern, valueLine(text, 'pattern', pattern, sectionLine(text, 'routes')), 'routes')}</span>`;
      }).join('')}</div></div>` : '';

  const kvHtml = model.kvNamespaces.length
    ? `<div class="wgl-sec"><h3>${lineButton(`KV Namespaces (${model.kvNamespaces.length})`, sectionLine(text, 'kv_namespaces'), 'kv')}</h3><table class="wgl-table"><thead><tr><th>Binding</th><th>Namespace</th></tr></thead><tbody>${model.kvNamespaces.map((kv) => {
        const line = valueLine(text, 'binding', kv.binding, sectionLine(text, 'kv_namespaces'));
        const id = kv.id || kv.preview_id || '-';
        return `<tr><td>${lineButton(kv.binding || '?', line, 'kv')}</td><td><span class="wgl-redacted">${lineButton(id, valueLine(text, kv.id ? 'id' : 'preview_id', id, line), 'kv')}</span></td></tr>`;
      }).join('')}</tbody></table></div>` : '';

  const doHtml = model.durableObjects.length
    ? `<div class="wgl-sec"><h3>${lineButton('Durable Objects', sectionLine(text, 'durable_objects.bindings'), 'durableObjects')}</h3><div class="wgl-pills">${model.durableObjects.map((binding) => `<span class="wgl-pill">${lineButton(binding.name || binding.class_name || '?', valueLine(text, 'name', binding.name, sectionLine(text, 'durable_objects.bindings')), 'durableObjects')}</span>`).join('')}</div></div>` : '';

  const envsHtml = model.envs.length
    ? `<div class="wgl-sec"><h3>${lineButton('Environments', model.envs[0].line, 'env')}</h3><div class="wgl-pills">${model.envs.map((env) => `<span class="wgl-pill env">${lineButton(env.name, env.line, 'env')}${env.vars.length ? ` <span>${env.vars.map((v) => esc(v.key)).join(', ')}</span>` : ''}</span>`).join('')}</div></div>` : '';

  const host = document.createElement('div');
  host.className = 'wgl-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="wgl-title"><span class="badge-wgl">${lineButton('Wrangler', 1, 'source')}</span>${lineButton(model.name || 'Worker', valueLine(text, 'name', model.name), 'identity')}</div>
<div class="wgl-sub">Cloudflare Worker${model.routes.length ? ` · ${model.routes.length} route${model.routes.length !== 1 ? 's' : ''}` : ''}${model.kvNamespaces.length ? ` · ${model.kvNamespaces.length} KV binding${model.kvNamespaces.length !== 1 ? 's' : ''}` : ''}</div>
${metaHtml ? `<div class="wgl-sec">${metaHtml}</div>` : ''}
${routesHtml}
${kvHtml}
${doHtml}
${envsHtml}`;

  const review = issueList(collectIssues(model, text), { title: 'Wrangler Review' });
  if (review) host.appendChild(review);
  host.appendChild(sourcePreview(redactSource(text), {
    title: 'Redacted source',
    collapsed: true,
    idPrefix: 'wrangler-line',
    highlighter: highlightTomlLine,
  }));
  wireSourceLinks(host, { idPrefix: 'wrangler-line' });
  return { parentNode: host };
}
