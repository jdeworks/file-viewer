const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SENSITIVE_RE = /SECRET|PASSWORD|TOKEN|KEY|API|PRIVATE|HASH/;

function isSensitive(k) {
  return SENSITIVE_RE.test(k);
}

const CSS = `
.freshrss-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-freshrss{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#3c7bbb;color:#fff;vertical-align:middle;margin-right:8px;}
.freshrss-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.freshrss-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.freshrss-sec{margin:14px 0;}
.freshrss-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.freshrss-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.freshrss-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.freshrss-kv-k{color:var(--fg-2,#888);min-width:200px;flex-shrink:0;}
.freshrss-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.freshrss-badge{display:inline-block;font-size:11px;padding:2px 8px;border-radius:5px;font-weight:600;vertical-align:middle;}
.freshrss-badge-masked{background:#fef3c7;border:1px solid #fcd34d;color:#92400e;font-style:italic;}
.freshrss-chip{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
`;

function parseKV(text) {
  const result = {};
  for (const line of (text || '').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    result[t.slice(0, eq).trim()] = val;
  }
  return result;
}

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="freshrss-kv"><span class="freshrss-kv-k">${esc(label)}</span><span class="freshrss-kv-v">${esc(String(value))}</span></div>`;
}

function kvMasked(label, value) {
  if (value == null || value === '') return '';
  return `<div class="freshrss-kv"><span class="freshrss-kv-k">${esc(label)}</span><span class="freshrss-kv-v"><span class="freshrss-badge freshrss-badge-masked">[configured]</span></span></div>`;
}

function kvChip(label, value) {
  if (value == null || value === '') return '';
  return `<div class="freshrss-kv"><span class="freshrss-kv-k">${esc(label)}</span><span class="freshrss-kv-v"><span class="freshrss-chip">${esc(String(value))}</span></span></div>`;
}

function row(key, cfg) {
  if (!(key in cfg)) return '';
  return isSensitive(key) ? kvMasked(key, cfg[key]) : kv(key, cfg[key]);
}

export function render(intake) {
  const cfg = parseKV(intake.text || '');

  const title = cfg['BASE_URL'] || 'FreshRSS Config';

  // App section
  const appItems = [
    row('FRESHRSS_ENV', cfg),
    row('BASE_URL', cfg),
    row('CRON_MIN', cfg),
    row('LANG', cfg),
  ].filter(Boolean).join('');

  // Data section
  const dataItems = [
    row('DATA_PATH', cfg),
    row('ALLOW_ANONYMOUS', cfg),
  ].filter(Boolean).join('');

  // Auth section
  const authItems = [
    row('ADMIN_EMAIL', cfg),
    'ADMIN_API_PASSWORD_MD5' in cfg ? kvMasked('ADMIN_API_PASSWORD_MD5', cfg['ADMIN_API_PASSWORD_MD5']) : '',
    'ADMIN_PASSWORD_HASH' in cfg ? kvMasked('ADMIN_PASSWORD_HASH', cfg['ADMIN_PASSWORD_HASH']) : '',
  ].filter(Boolean).join('');

  // Database section
  const dbItems = [
    'DB_TYPE' in cfg ? kvChip('DB_TYPE', cfg['DB_TYPE']) : '',
    row('DB_HOST', cfg),
    row('DB_PORT', cfg),
    row('DB_NAME', cfg),
    row('DB_USER', cfg),
    'DB_PASSWORD' in cfg ? kvMasked('DB_PASSWORD', cfg['DB_PASSWORD']) : '',
  ].filter(Boolean).join('');

  const appHtml = appItems
    ? `<div class="freshrss-sec"><h3>App</h3><div class="freshrss-card">${appItems}</div></div>`
    : '';
  const dataHtml = dataItems
    ? `<div class="freshrss-sec"><h3>Data</h3><div class="freshrss-card">${dataItems}</div></div>`
    : '';
  const authHtml = authItems
    ? `<div class="freshrss-sec"><h3>Auth</h3><div class="freshrss-card">${authItems}</div></div>`
    : '';
  const dbHtml = dbItems
    ? `<div class="freshrss-sec"><h3>Database</h3><div class="freshrss-card">${dbItems}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'freshrss-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-freshrss">FreshRSS</span>
  <span class="freshrss-title">${esc(title)}</span>
</div>
<div class="freshrss-sub">FreshRSS self-hosted RSS feed aggregator configuration</div>
${appHtml}${dataHtml}${authHtml}${dbHtml}`;
  return { parentNode: host };
}
