const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.tandoor-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.tandoor-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#ed6d1e;color:#fff;vertical-align:middle;margin-right:8px;}
.tandoor-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.tandoor-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.tandoor-sec{margin:12px 0;}
.tandoor-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.tandoor-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.tandoor-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;}
.tandoor-key{color:var(--fg-2,#888);font-size:12px;min-width:240px;flex-shrink:0;}
.tandoor-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.tandoor-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.tandoor-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
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

function chip(val) {
  if (val == null || val === '') return '';
  const s = String(val);
  return `<span class="tandoor-chip">${esc(s.length > 80 ? s.slice(0, 77) + '…' : s)}</span>`;
}

function masked() {
  return '<span class="tandoor-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="tandoor-row"><span class="tandoor-key">${esc(label)}</span><span class="tandoor-val">${html}</span></div>`;
}

export function render(intake) {
  const kv = parseKV(intake.text || '');

  // App section
  const appRows = [
    kv['TANDOOR_PORT'] != null ? row('TANDOOR_PORT', chip(kv['TANDOOR_PORT'])) : '',
    kv['TIMEZONE'] != null ? row('TIMEZONE', chip(kv['TIMEZONE'])) : '',
    kv['DEBUG'] != null ? row('DEBUG', chip(kv['DEBUG'])) : '',
  ].filter(Boolean).join('');

  // Database section
  const dbRows = [
    kv['POSTGRES_HOST'] != null ? row('POSTGRES_HOST', chip(kv['POSTGRES_HOST'])) : '',
    kv['POSTGRES_PORT'] != null ? row('POSTGRES_PORT', chip(kv['POSTGRES_PORT'])) : '',
    kv['POSTGRES_DB'] != null ? row('POSTGRES_DB', chip(kv['POSTGRES_DB'])) : '',
    kv['POSTGRES_USER'] != null ? row('POSTGRES_USER', chip(kv['POSTGRES_USER'])) : '',
    kv['POSTGRES_PASSWORD'] != null ? row('POSTGRES_PASSWORD', masked()) : '',
  ].filter(Boolean).join('');

  // Django section
  const djangoRows = [
    kv['SECRET_KEY'] != null ? row('SECRET_KEY', masked()) : '',
    kv['ALLOWED_HOSTS'] != null ? row('ALLOWED_HOSTS', chip(kv['ALLOWED_HOSTS'])) : '',
    kv['ENABLE_SIGNUP'] != null ? row('ENABLE_SIGNUP', chip(kv['ENABLE_SIGNUP'])) : '',
    kv['ENABLE_SHARING'] != null ? row('ENABLE_SHARING', chip(kv['ENABLE_SHARING'])) : '',
  ].filter(Boolean).join('');

  // Storage/Media section
  const storageRows = [
    kv['MEDIA_ROOT'] != null ? row('MEDIA_ROOT', chip(kv['MEDIA_ROOT'])) : '',
    kv['STATIC_ROOT'] != null ? row('STATIC_ROOT', chip(kv['STATIC_ROOT'])) : '',
  ].filter(Boolean).join('');

  // Email section
  const emailRows = [
    kv['EMAIL_HOST'] != null ? row('EMAIL_HOST', chip(kv['EMAIL_HOST'])) : '',
    kv['EMAIL_PORT'] != null ? row('EMAIL_PORT', chip(kv['EMAIL_PORT'])) : '',
    kv['EMAIL_USE_TLS'] != null ? row('EMAIL_USE_TLS', chip(kv['EMAIL_USE_TLS'])) : '',
    kv['EMAIL_FROM'] != null ? row('EMAIL_FROM', chip(kv['EMAIL_FROM'])) : '',
    kv['EMAIL_HOST_USER'] != null ? row('EMAIL_HOST_USER', chip(kv['EMAIL_HOST_USER'])) : '',
    kv['EMAIL_HOST_PASSWORD'] != null ? row('EMAIL_HOST_PASSWORD', masked()) : '',
  ].filter(Boolean).join('');

  let body = '';
  if (appRows) body += `<div class="tandoor-sec"><h3>App</h3><div class="tandoor-card">${appRows}</div></div>`;
  if (dbRows) body += `<div class="tandoor-sec"><h3>Database</h3><div class="tandoor-card">${dbRows}</div></div>`;
  if (djangoRows) body += `<div class="tandoor-sec"><h3>Django</h3><div class="tandoor-card">${djangoRows}</div></div>`;
  if (storageRows) body += `<div class="tandoor-sec"><h3>Storage / Media</h3><div class="tandoor-card">${storageRows}</div></div>`;
  if (emailRows) body += `<div class="tandoor-sec"><h3>Email</h3><div class="tandoor-card">${emailRows}</div></div>`;

  const host = document.createElement('div');
  host.className = 'tandoor-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="margin-bottom:4px;"><span class="tandoor-badge">Tandoor</span><span class="tandoor-title">Config</span></div>
<div class="tandoor-sub">Tandoor self-hosted recipe manager configuration</div>
${body || '<div style="color:var(--fg-2,#888);font-size:13px;">No configuration found.</div>'}`;

  return { parentNode: host };
}
