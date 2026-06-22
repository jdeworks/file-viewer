import { parseIni } from '../../renderer.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// intake.parsed is never populated at detection time, so flatten the INI ourselves into a key→value
// map (odoo.conf keeps everything under [options], but we merge all sections to be tolerant).
function flattenIni(text) {
  const out = {};
  for (const sec of parseIni(text || '')) for (const { key, value } of sec.pairs) out[key] = value;
  return out;
}

const CSS = `
.odoo-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-odoo{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#714B67;color:#fff;vertical-align:middle;margin-right:8px;}
.odoo-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.odoo-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.odoo-sec{margin:14px 0;}
.odoo-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.odoo-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.odoo-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.odoo-kv-k{color:var(--fg-2,#888);min-width:200px;flex-shrink:0;font:12px/1.6 ui-monospace,monospace;}
.odoo-kv-v{font:12px/1.6 ui-monospace,monospace;word-break:break-all;}
.odoo-masked{color:var(--fg-2,#888);font-style:italic;}
.odoo-pills{display:flex;flex-wrap:wrap;gap:6px;}
.odoo-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
`;

function masked() {
  return `<span class="odoo-masked">[configured]</span>`;
}

function kv(label, value, isSecret = false) {
  if (value == null || value === '') return '';
  const display = isSecret ? masked() : `<span class="odoo-kv-v">${esc(value)}</span>`;
  return `<div class="odoo-kv"><span class="odoo-kv-k">${esc(label)}</span>${display}</div>`;
}

function formatBytes(val) {
  if (!val) return val;
  const n = parseInt(val, 10);
  if (isNaN(n)) return val;
  if (n >= 1073741824) return `${(n / 1073741824).toFixed(1)} GB`;
  if (n >= 1048576) return `${(n / 1048576).toFixed(0)} MB`;
  return `${n} B`;
}

export function render(intake) {
  let opts = (intake.parsed && intake.parsed.options) || intake.parsed || {};
  if (!opts || !Object.keys(opts).length) opts = flattenIni(intake.text || '');

  const addonsPath = opts['addons_path'] || '';
  const dbHost = opts['db_host'] || '';
  const dbPort = opts['db_port'] || '';
  const dbName = opts['db_name'] || '';
  const dbUser = opts['db_user'] || '';
  const dbPassword = opts['db_password'] || '';
  const adminPasswd = opts['admin_passwd'] || '';
  const xmlrpcPort = opts['xmlrpc_port'] || opts['http_port'] || '8069';
  const longpollingPort = opts['longpolling_port'] || '';
  const logLevel = opts['log_level'] || '';
  const workers = opts['workers'] || '';
  const limitMemoryHard = opts['limit_memory_hard'] || '';
  const limitMemorySoft = opts['limit_memory_soft'] || '';
  const limitTimeCpu = opts['limit_time_cpu'] || '';
  const limitTimeReal = opts['limit_time_real'] || '';
  const dataDir = opts['data_dir'] || '';
  const listDb = opts['list_db'] || '';

  // Summary
  const subParts = [];
  if (dbHost) subParts.push(`db: ${dbHost}${dbPort ? ':' + dbPort : ''}`);
  if (xmlrpcPort) subParts.push(`http: :${xmlrpcPort}`);
  if (workers) subParts.push(`workers: ${workers}`);
  const sub = subParts.join(' · ');

  // Addons paths as pills
  const addonsPills = addonsPath
    ? `<div class="odoo-kv"><span class="odoo-kv-k">addons_path</span><div class="odoo-pills">${addonsPath.split(',').map(p => `<span class="odoo-pill">${esc(p.trim())}</span>`).join('')}</div></div>`
    : '';

  // Database section
  const dbHtml = (dbHost || dbPort || dbName || dbUser || dbPassword) ? `
<div class="odoo-sec"><h3>Database</h3><div class="odoo-card">
${kv('db_host', dbHost)}
${kv('db_port', dbPort)}
${kv('db_name', dbName)}
${kv('db_user', dbUser)}
${dbPassword ? `<div class="odoo-kv"><span class="odoo-kv-k">db_password</span>${masked()}</div>` : ''}
</div></div>` : '';

  // HTTP section
  const httpHtml = (xmlrpcPort || longpollingPort) ? `
<div class="odoo-sec"><h3>HTTP</h3><div class="odoo-card">
${kv('xmlrpc_port', xmlrpcPort)}
${kv('longpolling_port', longpollingPort)}
</div></div>` : '';

  // Workers & limits section
  const limHard = limitMemoryHard ? `${esc(formatBytes(limitMemoryHard))} (${esc(limitMemoryHard)})` : '';
  const limSoft = limitMemorySoft ? `${esc(formatBytes(limitMemorySoft))} (${esc(limitMemorySoft)})` : '';
  const workersHtml = (workers || limitMemoryHard || limitMemorySoft || limitTimeCpu || limitTimeReal) ? `
<div class="odoo-sec"><h3>Workers &amp; Limits</h3><div class="odoo-card">
${kv('workers', workers)}
${limitMemoryHard ? `<div class="odoo-kv"><span class="odoo-kv-k">limit_memory_hard</span><span class="odoo-kv-v">${limHard}</span></div>` : ''}
${limitMemorySoft ? `<div class="odoo-kv"><span class="odoo-kv-k">limit_memory_soft</span><span class="odoo-kv-v">${limSoft}</span></div>` : ''}
${kv('limit_time_cpu', limitTimeCpu)}
${kv('limit_time_real', limitTimeReal)}
</div></div>` : '';

  // General / paths section
  const generalHtml = (addonsPath || dataDir || logLevel || listDb || adminPasswd) ? `
<div class="odoo-sec"><h3>General</h3><div class="odoo-card">
${addonsPills}
${kv('data_dir', dataDir)}
${kv('log_level', logLevel)}
${kv('list_db', listDb)}
${adminPasswd ? `<div class="odoo-kv"><span class="odoo-kv-k">admin_passwd</span>${masked()}</div>` : ''}
</div></div>` : '';

  const host = document.createElement('div');
  host.className = 'odoo-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-odoo">Odoo</span>
  <span class="odoo-title">Odoo ERP Server</span>
</div>
<div class="odoo-sub">${esc(sub || 'Odoo ERP server configuration')}</div>
${dbHtml}${httpHtml}${workersHtml}${generalHtml}`;

  return { parentNode: host };
}
