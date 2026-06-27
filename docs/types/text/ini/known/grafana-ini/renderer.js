import { parseIni } from '../../renderer.js';
import { ensureKnownUiStyle, issueList, maskedValue, sourcePreview, wireSourceLinks } from '../../../../../core/known-ui.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.grafanaini-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-grafana{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f46800;color:#fff;vertical-align:middle;margin-right:8px;}
.grafana-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.grafana-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.grafana-sec{margin:14px 0;}
.grafana-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.grafana-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.grafana-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.grafana-kv-k{color:var(--fg-2,#888);min-width:160px;font-family:ui-monospace,monospace;}
.grafana-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.grafana-reason{font-size:11px;color:var(--fg-2,#888);font-family:system-ui,sans-serif;margin-left:6px;}
.grafana-line-btn{border:0;background:transparent;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;}
.grafana-line-btn:hover{color:var(--accent,#2563eb);}
.grafana-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;}
.grafana-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.grafana-pill.on{background:#dcfce7;border-color:#86efac;color:#166534;}
.grafana-pill.pg{background:#dbeafe;border-color:#93c5fd;color:#1e40af;}
.grafana-pill.mysql{background:#fff7ed;border-color:#fed7aa;color:#c2410c;}
.grafana-pill.sqlite{background:#dcfce7;border-color:#86efac;color:#166534;}
.grafana-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#fff7ed;border:1px solid #fed7aa;color:#c2410c;margin-left:4px;}
.grafana-masked{color:var(--fg-2,#888);font-style:italic;}
`;

function displayValue(key, value, { forceSecret = false } = {}) {
  if (forceSecret) return { text: '[configured]', masked: true, reason: `masked because "${key}" is a Grafana credential setting` };
  const result = maskedValue(key, value);
  if (result.masked) return { text: '[configured]', masked: true, reason: result.reason };
  return { text: String(value ?? ''), masked: false, reason: '' };
}

function lineButton(label, line, title = '') {
  return `<button class="grafana-line-btn" type="button" data-source-line="${line || 1}" title="${esc(title || `Open ${label} in source`)}">${esc(label)}</button>`;
}

function valueHtml(info) {
  if (info.masked) {
    return `<span class="grafana-masked" title="${esc(info.reason)}">${esc(info.text)}</span><span class="grafana-reason">${esc(info.reason)}</span>`;
  }
  return `<span class="grafana-kv-v">${esc(info.text)}</span>`;
}

function kv(label, value, lineMap, section = '', isSecret = false) {
  if (value == null || value === '') return '';
  const display = displayValue(label, value, { forceSecret: isSecret });
  const line = lineMap.get(`${section}.${label}`) || lineMap.get(label) || 1;
  return `<div class="grafana-kv"><span class="grafana-kv-k">${lineButton(label, line, `Open ${label} in source`)}</span>${valueHtml(display)}</div>`;
}

function sectionMap(sections) {
  const m = {};
  for (const s of sections) {
    const key = (s.name || '').toLowerCase();
    const pairs = {};
    for (const p of s.pairs) pairs[p.key.toLowerCase()] = p.value;
    m[key] = pairs;
  }
  return m;
}

function lineMap(text) {
  const map = new Map();
  let section = '';
  String(text || '').split(/\r?\n/).forEach((raw, idx) => {
    const line = idx + 1;
    const sec = raw.match(/^\s*\[([^\]]+)]/);
    if (sec) {
      section = sec[1].trim().toLowerCase();
      map.set(section, line);
      return;
    }
    const kvMatch = raw.match(/^\s*([^#;=\s][^=]*?)\s*=/);
    if (!kvMatch) return;
    const key = kvMatch[1].trim().toLowerCase();
    map.set(`${section}.${key}`, line);
    if (!map.has(key)) map.set(key, line);
  });
  return map;
}

function dbTypeClass(t) {
  if (!t) return '';
  if (t === 'postgres' || t === 'postgresql') return 'pg';
  if (t === 'mysql') return 'mysql';
  if (t === 'sqlite3' || t === 'sqlite') return 'sqlite';
  return '';
}

function collectIssues({ server, db, smtp, sec, authSections, lines }) {
  const issues = [];
  if (server.http_addr === '0.0.0.0') {
    issues.push({
      severity: 'warning',
      label: 'public bind',
      line: lines.get('server.http_addr') || lines.get('server') || 1,
      message: 'Grafana listens on 0.0.0.0. Confirm it is behind a reverse proxy, firewall, or private network boundary.',
    });
  }
  if (server.enforce_domain === 'false') {
    issues.push({
      severity: 'info',
      label: 'domain check',
      line: lines.get('server.enforce_domain') || lines.get('server') || 1,
      message: 'enforce_domain is false; enable it when root_url/domain should reject alternate Host headers.',
    });
  }
  for (const [section, pairs] of [['database', db], ['smtp', smtp], ['security', sec]]) {
    for (const key of ['password', 'admin_password', 'secret_key', 'client_secret']) {
      if (!pairs[key]) continue;
      issues.push({
        severity: 'warning',
        label: 'secret configured',
        line: lines.get(`${section}.${key}`) || lines.get(section) || 1,
        message: `${section}.${key} is configured and redacted in the preview and source.`,
      });
    }
  }
  if (authSections.length) {
    issues.push({
      severity: 'info',
      label: 'external auth',
      line: lines.get(`auth.${authSections[0]}`) || 1,
      message: `Enabled external auth provider${authSections.length === 1 ? '' : 's'}: ${authSections.join(', ')}.`,
    });
  }
  return issues;
}

function redactedSource(text) {
  const secretKey = /^(password|admin_password|secret_key|client_secret|passwd)\s*=/i;
  return String(text || '').split(/\r?\n/).map((line) => {
    const trimmed = line.trim();
    if (!secretKey.test(trimmed)) return line;
    const indent = line.match(/^\s*/)?.[0] || '';
    const key = trimmed.split('=')[0].trim();
    return `${indent}${key} = [configured]`;
  }).join('\n');
}

function highlightIniLine(line) {
  let out = esc(line);
  out = out.replace(/^(\s*\[[^\]]+])/, '<span style="color:#f46800;font-weight:700">$1</span>');
  out = out.replace(/^(\s*[^#;=\s][^=]*?)(\s*=)/, '<span style="color:#8250df">$1</span>$2');
  return out;
}

export function render(intake) {
  const sections = parseIni(intake.text || '');
  const cfg = sectionMap(sections);
  const lines = lineMap(intake.text || '');

  // [server]
  const server = cfg['server'] || {};
  const protocol = server['protocol'] || '';
  const httpAddr = server['http_addr'] || '';
  const httpPort = server['http_port'] || '';
  const domain = server['domain'] || '';
  const rootUrl = server['root_url'] || '';
  const enforceDomain = server['enforce_domain'] || '';
  const serverHtml = (protocol || httpAddr || httpPort || domain || rootUrl || enforceDomain) ? `
<div class="grafana-sec"><h3>Server</h3><div class="grafana-card">
${kv('protocol', protocol, lines, 'server')}
${kv('http_addr', httpAddr, lines, 'server')}
${kv('http_port', httpPort, lines, 'server')}
${kv('domain', domain, lines, 'server')}
${kv('root_url', rootUrl, lines, 'server')}
${kv('enforce_domain', enforceDomain, lines, 'server')}
</div></div>` : '';

  // [database]
  const db = cfg['database'] || {};
  const dbType = db['type'] || '';
  const dbHost = db['host'] || '';
  const dbName = db['name'] || '';
  const dbUser = db['user'] || '';
  const dbPass = db['password'] || '';
  const dbSsl = db['ssl_mode'] || '';
  const dbTypeChip = dbType ? `<span class="grafana-pill ${dbTypeClass(dbType)}">${esc(dbType)}</span>` : '';
  const dbHtml = (dbType || dbHost || dbName) ? `
<div class="grafana-sec"><h3>Database</h3><div class="grafana-card">
<div class="grafana-kv"><span class="grafana-kv-k">${lineButton('type', lines.get('database.type') || lines.get('database'), 'Open database type in source')}</span><span>${dbTypeChip}</span></div>
${kv('host', dbHost, lines, 'database')}
${kv('name', dbName, lines, 'database')}
${kv('user', dbUser, lines, 'database')}
${dbPass ? kv('password', dbPass, lines, 'database', true) : ''}
${kv('ssl_mode', dbSsl, lines, 'database')}
</div></div>` : '';

  // auth providers — [auth.*] sections with enabled = true
  const authSections = Object.entries(cfg)
    .filter(([k]) => k.startsWith('auth.') && k !== 'auth.anonymous')
    .filter(([, pairs]) => pairs['enabled'] === 'true')
    .map(([k]) => k.slice(5)); // strip "auth."
  const authHtml = authSections.length ? `
<div class="grafana-sec"><h3>Auth Providers</h3>
<div class="grafana-pills">${authSections.map((p) => `<span class="grafana-pill on">${esc(p)}</span>`).join('')}</div>
</div>` : '';

  // [smtp]
  const smtp = cfg['smtp'] || {};
  const smtpEnabled = smtp['enabled'] === 'true';
  const smtpHost = smtp['host'] || '';
  const smtpFrom = smtp['from_address'] || '';
  const smtpPass = smtp['password'] || '';
  const smtpHtml = smtpEnabled ? `
<div class="grafana-sec"><h3>SMTP</h3><div class="grafana-card">
${kv('host', smtpHost, lines, 'smtp')}
${kv('from_address', smtpFrom, lines, 'smtp')}
${smtpPass ? kv('password', smtpPass, lines, 'smtp', true) : ''}
</div></div>` : '';

  // [security]
  const sec = cfg['security'] || {};
  const adminUser = sec['admin_user'] || '';
  const adminPass = sec['admin_password'] || '';
  const secretKey = sec['secret_key'] || '';
  const secHtml = (adminUser || adminPass || secretKey) ? `
<div class="grafana-sec"><h3>Security</h3><div class="grafana-card">
${kv('admin_user', adminUser, lines, 'security')}
${adminPass ? kv('admin_password', adminPass, lines, 'security', true) : ''}
${secretKey ? kv('secret_key', secretKey, lines, 'security', true) : ''}
</div></div>` : '';

  // [log]
  const log = cfg['log'] || {};
  const logLevel = log['level'] || '';
  const logMode = log['mode'] || '';
  const logHtml = (logLevel || logMode) ? `
<div class="grafana-sec"><h3>Logging</h3>
<div class="grafana-pills">
${logLevel ? `<span class="grafana-pill">level: ${esc(logLevel)}</span>` : ''}
${logMode ? `<span class="grafana-pill">mode: ${esc(logMode)}</span>` : ''}
</div></div>` : '';

  // [alerting]
  const alerting = cfg['alerting'] || cfg['unified_alerting'] || {};
  const alertingEnabled = alerting['enabled'];
  const alertingHtml = alertingEnabled ? `
<div class="grafana-sec"><h3>Alerting</h3>
<div class="grafana-pills">
<span class="grafana-pill ${alertingEnabled === 'true' ? 'on' : ''}">${alertingEnabled === 'true' ? 'enabled' : 'disabled'}</span>
</div></div>` : '';

  // [paths]
  const paths = cfg['paths'] || {};
  const dataPath = paths['data'] || '';
  const logsPath = paths['logs'] || '';
  const pluginsPath = paths['plugins'] || '';
  const pathsHtml = (dataPath || logsPath || pluginsPath) ? `
<div class="grafana-sec"><h3>Paths</h3><div class="grafana-card">
${kv('data', dataPath, lines, 'paths')}
${kv('logs', logsPath, lines, 'paths')}
${kv('plugins', pluginsPath, lines, 'paths')}
</div></div>` : '';

  // Sub-summary
  const subParts = [];
  if (httpPort) subParts.push(`port ${httpPort}`);
  if (domain) subParts.push(domain);
  if (dbType) subParts.push(`db: ${dbType}`);
  if (authSections.length) subParts.push(`auth: ${authSections.join(', ')}`);
  const sub = subParts.join(' · ');

  const host = document.createElement('div');
  ensureKnownUiStyle(document);
  host.className = 'grafanaini-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-grafana">Grafana</span>
  <span class="grafana-title">grafana.ini</span>
  ${httpPort ? `<span class="grafana-tag">:${esc(httpPort)}</span>` : ''}
</div>
<div class="grafana-sub">${esc(sub)}</div>
${serverHtml}${dbHtml}${authHtml}${smtpHtml}${secHtml}${logHtml}${alertingHtml}${pathsHtml}`;
  const issues = issueList(collectIssues({ server, db, smtp, sec, authSections, lines }), { title: 'Grafana Review' });
  if (issues) host.insertBefore(issues, host.querySelector('.grafana-sec'));
  host.appendChild(sourcePreview(redactedSource(intake.text || ''), { title: 'Redacted source', collapsed: true, idPrefix: 'grafana-line', highlighter: highlightIniLine }));
  wireSourceLinks(host, { idPrefix: 'grafana-line' });
  return { parentNode: host };
}
