import { parseIni } from '../../renderer.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.gf-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-gf{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e0141e;color:#fff;vertical-align:middle;margin-right:8px;}
.gf-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.gf-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.gf-sec{margin:14px 0;}
.gf-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.gf-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.gf-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.gf-kv-k{color:var(--fg-2,#888);min-width:160px;font-family:ui-monospace,monospace;}
.gf-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.gf-pills{display:flex;flex-wrap:wrap;gap:6px;}
.gf-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.gf-pill.on{background:#dcfce7;border-color:#86efac;color:#166534;}
.gf-pill.warn{background:#fff7ed;border-color:#fed7aa;color:#c2410c;}
.gf-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#fff1f2;border:1px solid #fecdd3;color:#be123c;margin-left:4px;}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="gf-kv"><span class="gf-kv-k">${esc(label)}</span><span class="gf-kv-v">${esc(value)}</span></div>`;
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
<div class="gf-sec"><h3>Server</h3><div class="gf-card">
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
  const dbHtml = (dbType || dbHost || dbName) ? `
<div class="gf-sec"><h3>Database</h3><div class="gf-card">
${kv('type', dbType)}
${kv('host', dbHost)}
${kv('name', dbName)}
</div></div>` : '';

  // [auth] and auth providers
  const auth = cfg['auth'] || {};
  const authAnonymous = cfg['auth.anonymous'] || {};
  const authGithub = cfg['auth.github'] || {};
  const authGoogle = cfg['auth.google'] || {};
  const authGenericOauth = cfg['auth.generic_oauth'] || {};
  const authSaml = cfg['auth.saml'] || {};
  const authLdap = cfg['auth.ldap'] || {};

  const anonEnabled = authAnonymous['enabled'];
  const disableLogin = auth['disable_login_form'];
  const disableSignup = auth['disable_signout_menu'];

  const authProviders = [
    { name: 'GitHub', cfg: authGithub },
    { name: 'Google', cfg: authGoogle },
    { name: 'Generic OAuth', cfg: authGenericOauth },
    { name: 'SAML', cfg: authSaml },
    { name: 'LDAP', cfg: authLdap },
  ].filter((p) => p.cfg['enabled'] === 'true' || Object.keys(p.cfg).length > 0);

  const enabledProviders = authProviders.filter((p) => p.cfg['enabled'] === 'true').map((p) => p.name);

  const authHtml = (anonEnabled || disableLogin || enabledProviders.length) ? `
<div class="gf-sec"><h3>Auth</h3><div class="gf-card">
${disableLogin ? kv('disable_login_form', disableLogin) : ''}
${anonEnabled ? kv('anonymous.enabled', anonEnabled) : ''}
${enabledProviders.length ? `<div class="gf-kv"><span class="gf-kv-k">OAuth providers</span><span class="gf-pills">${enabledProviders.map((p) => `<span class="gf-pill on">${esc(p)}</span>`).join('')}</span></div>` : ''}
</div></div>` : '';

  // [paths]
  const paths = cfg['paths'] || {};
  const dataPath = paths['data'] || '';
  const logsPath = paths['logs'] || '';
  const pluginsPath = paths['plugins'] || '';
  const pathsHtml = (dataPath || logsPath || pluginsPath) ? `
<div class="gf-sec"><h3>Paths</h3><div class="gf-card">
${kv('data', dataPath)}
${kv('logs', logsPath)}
${kv('plugins', pluginsPath)}
</div></div>` : '';

  // [smtp]
  const smtp = cfg['smtp'] || {};
  const smtpEnabled = smtp['enabled'];
  const smtpHost = smtp['host'] || '';
  const smtpFrom = smtp['from_address'] || '';
  const smtpHtml = smtpEnabled === 'true' ? `
<div class="gf-sec"><h3>SMTP</h3><div class="gf-card">
${kv('host', smtpHost)}
${kv('from_address', smtpFrom)}
</div></div>` : '';

  // Sub-summary
  const subParts = [];
  if (protocol || httpPort) subParts.push(`${protocol || 'http'}:${httpPort || '3000'}`);
  if (dbType) subParts.push(`db: ${dbType}`);
  if (enabledProviders.length) subParts.push(`auth: ${enabledProviders.join(', ')}`);
  const sub = subParts.join(' · ');

  const host = document.createElement('div');
  host.className = 'gf-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-gf">Grafana</span>
  <span class="gf-title">Server Configuration</span>
  ${httpPort ? `<span class="gf-tag">:${esc(httpPort)}</span>` : ''}
</div>
<div class="gf-sub">${esc(sub)}</div>
${serverHtml}${dbHtml}${authHtml}${pathsHtml}${smtpHtml}`;
  return { parentNode: host };
}
