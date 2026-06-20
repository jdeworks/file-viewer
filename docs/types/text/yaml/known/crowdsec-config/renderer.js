import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.csec-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-csec{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1e3a5f;color:#fff;vertical-align:middle;margin-right:8px;}
.csec-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.csec-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.csec-sec{margin:14px 0;}
.csec-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.csec-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:6px 0;background:var(--bg,#fff);}
.csec-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.csec-kv-k{color:var(--fg-2,#888);min-width:150px;}
.csec-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.csec-badge-off{display:inline-block;padding:1px 6px;border-radius:4px;font-size:11px;background:#f1f5f9;border:1px solid #cbd5e1;color:#64748b;}
.csec-badge-on{display:inline-block;padding:1px 6px;border-radius:4px;font-size:11px;background:#dcfce7;border:1px solid #86efac;color:#16a34a;}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="csec-kv"><span class="csec-kv-k">${esc(label)}</span><span class="csec-kv-v">${esc(String(value))}</span></div>`;
}

function boolBadge(value) {
  if (value == null) return '';
  const on = value === true || value === 'true';
  return `<span class="${on ? 'csec-badge-on' : 'csec-badge-off'}">${on ? 'enabled' : 'disabled'}</span>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  const common = cfg.common || {};
  const commonHtml = `
<div class="csec-sec"><h3>Common</h3><div class="csec-card">
${kv('log_dir', common.log_dir)}
${kv('log_level', common.log_level)}
${kv('working_dir', common.working_dir)}
${common.daemonize != null ? `<div class="csec-kv"><span class="csec-kv-k">daemonize</span>${boolBadge(common.daemonize)}</div>` : ''}
</div></div>`;

  const db = cfg.db_config || {};
  const dbHtml = Object.keys(db).length ? `
<div class="csec-sec"><h3>Database</h3><div class="csec-card">
${kv('type', db.type)}
${kv('db_path', db.db_path)}
${kv('host', db.host)}
${kv('port', db.port)}
${kv('name', db.name)}
${kv('user', db.user)}
</div></div>` : '';

  const api = cfg.api || {};
  const apiClient = api.client || {};
  const apiClientHtml = Object.keys(apiClient).length ? `
<div class="csec-sec"><h3>API Client</h3><div class="csec-card">
${kv('credentials_path', apiClient.credentials_path)}
${apiClient.insecure_skip_verify != null ? `<div class="csec-kv"><span class="csec-kv-k">insecure_skip_verify</span>${boolBadge(apiClient.insecure_skip_verify)}</div>` : ''}
</div></div>` : '';

  const apiServer = api.server || {};
  const apiServerHtml = Object.keys(apiServer).length ? `
<div class="csec-sec"><h3>API Server</h3><div class="csec-card">
${kv('listen_uri', apiServer.listen_uri)}
${kv('profiles_path', apiServer.profiles_path)}
${kv('console_path', apiServer.console_path)}
</div></div>` : '';

  const prom = cfg.prometheus || {};
  const promHtml = Object.keys(prom).length ? `
<div class="csec-sec"><h3>Prometheus</h3><div class="csec-card">
${prom.enabled != null ? `<div class="csec-kv"><span class="csec-kv-k">enabled</span>${boolBadge(prom.enabled)}</div>` : ''}
${kv('level', prom.level)}
${kv('listen_addr', prom.listen_addr)}
${kv('listen_port', prom.listen_port)}
</div></div>` : '';

  const host = document.createElement('div');
  host.className = 'csec-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-csec">CrowdSec</span>
  <span class="csec-title">CrowdSec Configuration</span>
</div>
${commonHtml}${dbHtml}${apiClientHtml}${apiServerHtml}${promHtml}`;
  return { parentNode: host };
}
