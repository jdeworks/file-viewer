const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.authentik-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.authentik-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#fd4b2d;color:#fff;vertical-align:middle;margin-right:8px;}
.authentik-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.authentik-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.authentik-sec{margin:12px 0;}
.authentik-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.authentik-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.authentik-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;}
.authentik-key{color:var(--fg-2,#888);font-size:12px;min-width:260px;flex-shrink:0;}
.authentik-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.authentik-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.authentik-chip-on{background:#d1fae5;border-color:#6ee7b7;color:#065f46;}
.authentik-chip-off{background:#fee2e2;border-color:#fca5a5;color:#991b1b;}
.authentik-chip-neutral{background:#e0f2fe;border-color:#7dd3fc;color:#075985;}
.authentik-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
`;

function parseKV(text) {
  const result = {};
  for (const line of (text || '').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const t2 = t.startsWith('export ') ? t.slice(7) : t;
    const eq = t2.indexOf('=');
    if (eq === -1) continue;
    let val = t2.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    result[t2.slice(0, eq).trim()] = val;
  }
  return result;
}

const SENSITIVE = /SECRET|PASSWORD|TOKEN|KEY|API|PRIVATE/i;

function isSensitive(key) {
  return SENSITIVE.test(key);
}

function masked() {
  return '<span class="authentik-masked">[configured]</span>';
}

function chip(val, cls = '') {
  if (val == null || val === '') return '';
  const s = String(val);
  return `<span class="authentik-chip${cls ? ' ' + cls : ''}">${esc(s.length > 80 ? s.slice(0, 77) + '…' : s)}</span>`;
}

function boolChip(val) {
  if (val === 'true' || val === '1' || val === 'yes') return chip('enabled', ' authentik-chip-on');
  if (val === 'false' || val === '0' || val === 'no') return chip('disabled', ' authentik-chip-off');
  if (val == null || val === '') return '';
  return chip(val, ' authentik-chip-neutral');
}

function row(label, html) {
  if (!html) return '';
  return `<div class="authentik-row"><span class="authentik-key">${esc(label)}</span><span class="authentik-val">${html}</span></div>`;
}

function valOrMasked(kv, key) {
  const val = kv[key];
  if (val == null || val === '') return '';
  return isSensitive(key) ? masked() : chip(val);
}

export function render(intake) {
  const kv = parseKV(intake.text || '');

  // Core section
  const coreRows = [
    kv['AUTHENTIK_SECRET_KEY'] != null ? row('AUTHENTIK_SECRET_KEY', masked()) : '',
  ].filter(Boolean).join('');

  // PostgreSQL section
  const pgRows = [
    kv['AUTHENTIK_POSTGRESQL__HOST'] != null ? row('AUTHENTIK_POSTGRESQL__HOST', chip(kv['AUTHENTIK_POSTGRESQL__HOST'])) : '',
    kv['AUTHENTIK_POSTGRESQL__NAME'] != null ? row('AUTHENTIK_POSTGRESQL__NAME', chip(kv['AUTHENTIK_POSTGRESQL__NAME'])) : '',
    kv['AUTHENTIK_POSTGRESQL__USER'] != null ? row('AUTHENTIK_POSTGRESQL__USER', chip(kv['AUTHENTIK_POSTGRESQL__USER'])) : '',
    kv['AUTHENTIK_POSTGRESQL__PASSWORD'] != null ? row('AUTHENTIK_POSTGRESQL__PASSWORD', masked()) : '',
    kv['AUTHENTIK_POSTGRESQL__PORT'] != null ? row('AUTHENTIK_POSTGRESQL__PORT', chip(kv['AUTHENTIK_POSTGRESQL__PORT'], ' authentik-chip-neutral')) : '',
  ].filter(Boolean).join('');

  // Redis section
  const redisRows = [
    kv['AUTHENTIK_REDIS__HOST'] != null ? row('AUTHENTIK_REDIS__HOST', chip(kv['AUTHENTIK_REDIS__HOST'])) : '',
    kv['AUTHENTIK_REDIS__PASSWORD'] != null ? row('AUTHENTIK_REDIS__PASSWORD', masked()) : '',
    kv['AUTHENTIK_REDIS__PORT'] != null ? row('AUTHENTIK_REDIS__PORT', chip(kv['AUTHENTIK_REDIS__PORT'], ' authentik-chip-neutral')) : '',
  ].filter(Boolean).join('');

  // Email section
  const emailRows = [
    kv['AUTHENTIK_EMAIL__HOST'] != null ? row('AUTHENTIK_EMAIL__HOST', chip(kv['AUTHENTIK_EMAIL__HOST'])) : '',
    kv['AUTHENTIK_EMAIL__PORT'] != null ? row('AUTHENTIK_EMAIL__PORT', chip(kv['AUTHENTIK_EMAIL__PORT'], ' authentik-chip-neutral')) : '',
    kv['AUTHENTIK_EMAIL__USERNAME'] != null ? row('AUTHENTIK_EMAIL__USERNAME', chip(kv['AUTHENTIK_EMAIL__USERNAME'])) : '',
    kv['AUTHENTIK_EMAIL__PASSWORD'] != null ? row('AUTHENTIK_EMAIL__PASSWORD', masked()) : '',
    kv['AUTHENTIK_EMAIL__FROM'] != null ? row('AUTHENTIK_EMAIL__FROM', chip(kv['AUTHENTIK_EMAIL__FROM'])) : '',
    kv['AUTHENTIK_EMAIL__USE_TLS'] != null ? row('AUTHENTIK_EMAIL__USE_TLS', boolChip(kv['AUTHENTIK_EMAIL__USE_TLS'])) : '',
    kv['AUTHENTIK_EMAIL__USE_SSL'] != null ? row('AUTHENTIK_EMAIL__USE_SSL', boolChip(kv['AUTHENTIK_EMAIL__USE_SSL'])) : '',
  ].filter(Boolean).join('');

  // Error reporting section
  const errorRows = [
    kv['AUTHENTIK_ERROR_REPORTING__ENABLED'] != null ? row('AUTHENTIK_ERROR_REPORTING__ENABLED', boolChip(kv['AUTHENTIK_ERROR_REPORTING__ENABLED'])) : '',
  ].filter(Boolean).join('');

  // Listen section
  const listenRows = [
    kv['AUTHENTIK_LISTEN__HTTP'] != null ? row('AUTHENTIK_LISTEN__HTTP', chip(kv['AUTHENTIK_LISTEN__HTTP'], ' authentik-chip-neutral')) : '',
    kv['AUTHENTIK_LISTEN__HTTPS'] != null ? row('AUTHENTIK_LISTEN__HTTPS', chip(kv['AUTHENTIK_LISTEN__HTTPS'], ' authentik-chip-neutral')) : '',
    kv['AUTHENTIK_LISTEN__METRICS'] != null ? row('AUTHENTIK_LISTEN__METRICS', chip(kv['AUTHENTIK_LISTEN__METRICS'], ' authentik-chip-neutral')) : '',
  ].filter(Boolean).join('');

  let body = '';
  if (coreRows) body += `<div class="authentik-sec"><h3>Core</h3><div class="authentik-card">${coreRows}</div></div>`;
  if (pgRows) body += `<div class="authentik-sec"><h3>PostgreSQL</h3><div class="authentik-card">${pgRows}</div></div>`;
  if (redisRows) body += `<div class="authentik-sec"><h3>Redis</h3><div class="authentik-card">${redisRows}</div></div>`;
  if (emailRows) body += `<div class="authentik-sec"><h3>Email</h3><div class="authentik-card">${emailRows}</div></div>`;
  if (errorRows) body += `<div class="authentik-sec"><h3>Error Reporting</h3><div class="authentik-card">${errorRows}</div></div>`;
  if (listenRows) body += `<div class="authentik-sec"><h3>Listen</h3><div class="authentik-card">${listenRows}</div></div>`;

  const host = document.createElement('div');
  host.className = 'authentik-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="margin-bottom:4px;"><span class="authentik-badge">Authentik</span><span class="authentik-title">Config</span></div>
<div class="authentik-sub">Authentik identity provider environment configuration</div>
${body || '<div style="color:var(--fg-2,#888);font-size:13px;">No configuration found.</div>'}`;

  return { parentNode: host };
}
