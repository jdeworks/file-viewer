const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rallly-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.rallly-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#4f46e5;color:#fff;vertical-align:middle;margin-right:8px;}
.rallly-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.rallly-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.rallly-sec{margin:12px 0;}
.rallly-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.rallly-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.rallly-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap;}
.rallly-key{color:var(--fg-2,#888);font-size:12px;min-width:220px;flex-shrink:0;}
.rallly-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.rallly-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.rallly-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.rallly-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.rallly-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.rallly-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
`;

function parseKV(text) {
  const out = {};
  for (const raw of (text || '').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const stripped = line.startsWith('export ') ? line.slice(7).trim() : line;
    const eq = stripped.indexOf('=');
    if (eq < 1) continue;
    const key = stripped.slice(0, eq).trim();
    let val = stripped.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key && !(key in out)) out[key] = val;
  }
  return out;
}

function maskDbUrl(url) {
  if (!url) return '';
  return url.replace(/(\/\/[^:@]*):([^@]*)@/, '$1:[configured]@');
}

function chip(val, cls) {
  if (val == null || val === '') return '';
  return `<span class="rallly-chip${cls ? ' rallly-chip-' + cls : ''}">${esc(val)}</span>`;
}

function masked() {
  return '<span class="rallly-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="rallly-row"><span class="rallly-key">${esc(label)}</span><span class="rallly-val">${html}</span></div>`;
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'rallly-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const kv = parseKV(intake.text || '');

  const title = kv.NEXT_PUBLIC_BASE_URL || 'Rallly Config';

  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="rallly-badge">Rallly</span>
      <span class="rallly-title">${esc(title)}</span>
    </div>
    <div class="rallly-sub">Rallly scheduling app configuration</div>
  `;
  host.appendChild(header);

  let body = '';

  // App
  const appRows = [
    kv.NEXT_PUBLIC_BASE_URL ? row('NEXT_PUBLIC_BASE_URL', chip(kv.NEXT_PUBLIC_BASE_URL, 'blue')) : '',
    kv.PORT ? row('PORT', chip(kv.PORT, 'blue')) : '',
  ].filter(Boolean).join('');
  if (appRows) body += `<div class="rallly-sec"><h3>App</h3><div class="rallly-card">${appRows}</div></div>`;

  // Auth
  const authRows = [
    kv.SECRET_PASSWORD != null ? row('SECRET_PASSWORD', masked()) : '',
  ].filter(Boolean).join('');
  if (authRows) body += `<div class="rallly-sec"><h3>Auth</h3><div class="rallly-card">${authRows}</div></div>`;

  // Database
  if (kv.DATABASE_URL) {
    const maskedUrl = maskDbUrl(kv.DATABASE_URL);
    const display = maskedUrl.length > 80 ? maskedUrl.slice(0, 77) + '…' : maskedUrl;
    body += `<div class="rallly-sec"><h3>Database</h3><div class="rallly-card">${row('DATABASE_URL', chip(display))}</div></div>`;
  }

  // Email
  const emailRows = [
    kv.SMTP_HOST ? row('SMTP_HOST', chip(kv.SMTP_HOST)) : '',
    kv.SMTP_PORT ? row('SMTP_PORT', chip(kv.SMTP_PORT, 'blue')) : '',
    kv.SMTP_USER ? row('SMTP_USER', chip(kv.SMTP_USER)) : '',
    kv.SMTP_PWD != null ? row('SMTP_PWD', masked()) : '',
    kv.NOREPLY_EMAIL ? row('NOREPLY_EMAIL', chip(kv.NOREPLY_EMAIL)) : '',
    kv.SUPPORT_EMAIL ? row('SUPPORT_EMAIL', chip(kv.SUPPORT_EMAIL)) : '',
  ].filter(Boolean).join('');
  if (emailRows) body += `<div class="rallly-sec"><h3>Email</h3><div class="rallly-card">${emailRows}</div></div>`;

  // Admin
  const adminRows = [
    kv.ALLOWED_EMAILS ? row('ALLOWED_EMAILS', chip(kv.ALLOWED_EMAILS)) : '',
  ].filter(Boolean).join('');
  if (adminRows) body += `<div class="rallly-sec"><h3>Admin</h3><div class="rallly-card">${adminRows}</div></div>`;

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No Rallly configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
