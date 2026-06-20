import { parseIni } from '../../renderer.js';
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
.grafana-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;}
.grafana-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.grafana-pill.on{background:#dcfce7;border-color:#86efac;color:#166534;}
.grafana-pill.pg{background:#dbeafe;border-color:#93c5fd;color:#1e40af;}
.grafana-pill.mysql{background:#fff7ed;border-color:#fed7aa;color:#c2410c;}
.grafana-pill.sqlite{background:#dcfce7;border-color:#86efac;color:#166534;}
.grafana-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#fff7ed;border:1px solid #fed7aa;color:#c2410c;margin-left:4px;}
.grafana-masked{color:var(--fg-2,#888);font-style:italic;}
`;

const SECRET_KEYS = new Set(['password', 'admin_password', 'secret_key', 'client_secret', 'passwd']);

function masked() {
  return `<span class="grafana-masked">[configured]</span>`;
}

function kv(label, value, isSecret = false) {
  if (value == null || value === '') return '';
  const display = isSecret ? masked() : `<span class="grafana-kv-v">${esc(value)}</span>`;
  return `<div class="grafana-kv"><span class="grafana-kv-k">${esc(label)}</span>${display}</div>`;
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

function dbTypeClass(t) {
  if (!t) return '';
  if (t === 'postgres' || t === 'postgresql') return 'pg';
  if (t === 'mysql') return 'mysql';
  if (t === 'sqlite3' || t === 'sqlite') return 'sqlite';
  return '';
}

export function render(intake) {
  const sections = parseIni(intake.text || '');
  const cfg = sectionMap(sections);

  // [server]
  const server = cfg['server'] || {};
  const protocol = server['protocol'] || '';
  const httpPort = server['http_port'] || '';
  const domain = server['domain'] || '';
  const rootUrl = server['root_url'] || '';
  const serverHtml = (protocol || httpPort || domain || rootUrl) ? `
<div class="grafana-sec"><h3>Server</h3><div class="grafana-card">
${kv('protocol', protocol)}
${kv('http_port', httpPort)}
${kv('domain', domain)}
${kv('root_url', rootUrl)}
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
<div class="grafana-kv"><span class="grafana-kv-k">type</span><span>${dbTypeChip}</span></div>
${kv('host', dbHost)}
${kv('name', dbName)}
${kv('user', dbUser)}
${dbPass ? kv('password', dbPass, true) : ''}
${kv('ssl_mode', dbSsl)}
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
${kv('host', smtpHost)}
${kv('from_address', smtpFrom)}
${smtpPass ? kv('password', smtpPass, true) : ''}
</div></div>` : '';

  // [security]
  const sec = cfg['security'] || {};
  const adminUser = sec['admin_user'] || '';
  const adminPass = sec['admin_password'] || '';
  const secretKey = sec['secret_key'] || '';
  const secHtml = (adminUser || adminPass || secretKey) ? `
<div class="grafana-sec"><h3>Security</h3><div class="grafana-card">
${kv('admin_user', adminUser)}
${adminPass ? kv('admin_password', adminPass, true) : ''}
${secretKey ? kv('secret_key', secretKey, true) : ''}
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
${kv('data', dataPath)}
${kv('logs', logsPath)}
${kv('plugins', pluginsPath)}
</div></div>` : '';

  // Sub-summary
  const subParts = [];
  if (httpPort) subParts.push(`port ${httpPort}`);
  if (domain) subParts.push(domain);
  if (dbType) subParts.push(`db: ${dbType}`);
  if (authSections.length) subParts.push(`auth: ${authSections.join(', ')}`);
  const sub = subParts.join(' · ');

  const host = document.createElement('div');
  host.className = 'grafanaini-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-grafana">Grafana</span>
  <span class="grafana-title">grafana.ini</span>
  ${httpPort ? `<span class="grafana-tag">:${esc(httpPort)}</span>` : ''}
</div>
<div class="grafana-sub">${esc(sub)}</div>
${serverHtml}${dbHtml}${authHtml}${smtpHtml}${secHtml}${logHtml}${alertingHtml}${pathsHtml}`;
  return { parentNode: host };
}
