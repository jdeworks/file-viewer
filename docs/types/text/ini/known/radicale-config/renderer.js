import { parseIni } from '../../renderer.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.radicale-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.radicale-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#8B4513;color:#fff;vertical-align:middle;margin-right:8px;}
.radicale-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.radicale-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.radicale-sec{margin:14px 0;}
.radicale-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.radicale-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.radicale-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.radicale-kv-k{color:var(--fg-2,#888);min-width:200px;flex-shrink:0;font:12px/1.6 ui-monospace,monospace;}
.radicale-kv-v{font:12px/1.6 ui-monospace,monospace;word-break:break-all;}
.radicale-masked{color:var(--fg-2,#888);font-style:italic;}
.radicale-flag-on{display:inline-block;padding:1px 8px;border-radius:8px;font-size:11px;font-weight:600;background:#d4edda;color:#155724;border:1px solid #c3e6cb;}
.radicale-flag-off{display:inline-block;padding:1px 8px;border-radius:8px;font-size:11px;font-weight:600;background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;}
`;

function masked() {
  return `<span class="radicale-masked">[configured]</span>`;
}

function kv(label, value, isSecret = false) {
  if (value == null || value === '') return '';
  const display = isSecret ? masked() : `<span class="radicale-kv-v">${esc(value)}</span>`;
  return `<div class="radicale-kv"><span class="radicale-kv-k">${esc(label)}</span>${display}</div>`;
}

function boolFlag(label, value) {
  if (value == null || value === '') return '';
  const on = /^(true|yes|1)$/i.test(value.trim());
  const cls = on ? 'radicale-flag-on' : 'radicale-flag-off';
  return `<div class="radicale-kv"><span class="radicale-kv-k">${esc(label)}</span><span class="${cls}">${esc(value)}</span></div>`;
}

function sectionMap(sections) {
  const m = {};
  for (const s of sections) {
    const key = (s.name || '').toLowerCase();
    const pairs = {};
    for (const p of s.pairs) {
      pairs[p.key.toLowerCase()] = p.value;
    }
    m[key] = pairs;
  }
  return m;
}

export function render(intake) {
  const sections = parseIni(intake.text || '');
  const cfg = sectionMap(sections);

  const server = cfg['server'] || {};
  const auth = cfg['auth'] || {};
  const storage = cfg['storage'] || {};
  const logging = cfg['logging'] || {};

  const hosts = server['hosts'] || '';
  const maxConn = server['max_connections'] || '';
  const ssl = server['ssl'] || '';
  const cert = server['certificate'] || '';
  const key = server['key'] || '';

  const serverHtml = (hosts || maxConn || ssl || cert || key) ? `
<div class="radicale-sec"><h3>Server</h3><div class="radicale-card">
${kv('hosts', hosts)}
${kv('max_connections', maxConn)}
${boolFlag('ssl', ssl)}
${kv('certificate', cert)}
${kv('key', key)}
</div></div>` : '';

  const authType = auth['type'] || '';
  const htpasswdFile = auth['htpasswd_filename'] || '';
  const htpasswdEnc = auth['htpasswd_encryption'] || '';
  const ldapPass = auth['ldap_password'] || auth['password'] || '';

  const authHtml = (authType || htpasswdFile || htpasswdEnc) ? `
<div class="radicale-sec"><h3>Auth</h3><div class="radicale-card">
${kv('type', authType)}
${kv('htpasswd_filename', htpasswdFile)}
${kv('htpasswd_encryption', htpasswdEnc)}
${ldapPass ? kv('ldap_password', ldapPass, true) : ''}
</div></div>` : '';

  const folder = storage['filesystem_folder'] || '';
  const hook = storage['hook'] || '';

  const storageHtml = (folder || hook) ? `
<div class="radicale-sec"><h3>Storage</h3><div class="radicale-card">
${kv('filesystem_folder', folder)}
${kv('hook', hook)}
</div></div>` : '';

  const logLevel = logging['level'] || '';
  const logMask = logging['mask'] || '';

  const loggingHtml = (logLevel || logMask) ? `
<div class="radicale-sec"><h3>Logging</h3><div class="radicale-card">
${kv('level', logLevel)}
${kv('mask', logMask)}
</div></div>` : '';

  const subParts = [];
  if (hosts) subParts.push(`hosts: ${hosts}`);
  if (authType) subParts.push(`auth: ${authType}`);
  if (folder) subParts.push(`storage: ${folder}`);
  const sub = subParts.join(' · ') || 'Radicale CalDAV/CardDAV server configuration';

  const host = document.createElement('div');
  host.className = 'radicale-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="radicale-badge">Radicale</span>
  <span class="radicale-title">Radicale CalDAV/CardDAV</span>
</div>
<div class="radicale-sub">${esc(sub)}</div>
${serverHtml}${authHtml}${storageHtml}${loggingHtml}`;

  return { parentNode: host };
}
