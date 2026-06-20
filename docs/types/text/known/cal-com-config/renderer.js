const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.calcom-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.calcom-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#111827;color:#fff;vertical-align:middle;margin-right:8px;}
.calcom-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.calcom-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.calcom-sec{margin:12px 0;}
.calcom-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.calcom-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.calcom-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap;}
.calcom-key{color:var(--fg-2,#888);font-size:12px;min-width:240px;flex-shrink:0;}
.calcom-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.calcom-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.calcom-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.calcom-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.calcom-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.calcom-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
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
  return `<span class="calcom-chip${cls ? ' calcom-chip-' + cls : ''}">${esc(val)}</span>`;
}

function masked() {
  return '<span class="calcom-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="calcom-row"><span class="calcom-key">${esc(label)}</span><span class="calcom-val">${html}</span></div>`;
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'calcom-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const kv = parseKV(intake.text || '');

  const title = kv.NEXT_PUBLIC_WEBAPP_URL || 'Cal.com Config';

  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="calcom-badge">Cal.com</span>
      <span class="calcom-title">${esc(title)}</span>
    </div>
    <div class="calcom-sub">Cal.com self-hosted scheduling configuration</div>
  `;
  host.appendChild(header);

  let body = '';

  // Server
  const serverRows = [
    kv.NEXT_PUBLIC_WEBAPP_URL ? row('NEXT_PUBLIC_WEBAPP_URL', chip(kv.NEXT_PUBLIC_WEBAPP_URL, 'blue')) : '',
    kv.NEXTAUTH_URL ? row('NEXTAUTH_URL', chip(kv.NEXTAUTH_URL, 'blue')) : '',
    kv.PORT ? row('PORT', chip(kv.PORT, 'blue')) : '',
  ].filter(Boolean).join('');
  if (serverRows) body += `<div class="calcom-sec"><h3>Server</h3><div class="calcom-card">${serverRows}</div></div>`;

  // Auth
  const authRows = [
    kv.NEXTAUTH_SECRET != null ? row('NEXTAUTH_SECRET', masked()) : '',
    kv.CALENDSO_ENCRYPTION_KEY != null ? row('CALENDSO_ENCRYPTION_KEY', masked()) : '',
  ].filter(Boolean).join('');
  if (authRows) body += `<div class="calcom-sec"><h3>Auth</h3><div class="calcom-card">${authRows}</div></div>`;

  // Database
  if (kv.DATABASE_URL) {
    const maskedUrl = maskDbUrl(kv.DATABASE_URL);
    const display = maskedUrl.length > 80 ? maskedUrl.slice(0, 77) + '…' : maskedUrl;
    body += `<div class="calcom-sec"><h3>Database</h3><div class="calcom-card">${row('DATABASE_URL', chip(display))}</div></div>`;
  }

  // Email
  const emailRows = [
    kv.EMAIL_FROM ? row('EMAIL_FROM', chip(kv.EMAIL_FROM)) : '',
    kv.EMAIL_SERVER_HOST ? row('EMAIL_SERVER_HOST', chip(kv.EMAIL_SERVER_HOST)) : '',
    kv.EMAIL_SERVER_PORT ? row('EMAIL_SERVER_PORT', chip(kv.EMAIL_SERVER_PORT, 'blue')) : '',
    kv.EMAIL_SERVER_USER ? row('EMAIL_SERVER_USER', chip(kv.EMAIL_SERVER_USER)) : '',
    kv.EMAIL_SERVER_PASSWORD != null ? row('EMAIL_SERVER_PASSWORD', masked()) : '',
  ].filter(Boolean).join('');
  if (emailRows) body += `<div class="calcom-sec"><h3>Email</h3><div class="calcom-card">${emailRows}</div></div>`;

  // Storage
  const storageRows = [
    kv.STORAGE_ACCESS_KEY != null ? row('STORAGE_ACCESS_KEY', masked()) : '',
    kv.STORAGE_SECRET_KEY != null ? row('STORAGE_SECRET_KEY', masked()) : '',
    kv.STORAGE_S3_BUCKET ? row('STORAGE_S3_BUCKET', chip(kv.STORAGE_S3_BUCKET)) : '',
    kv.STORAGE_S3_REGION ? row('STORAGE_S3_REGION', chip(kv.STORAGE_S3_REGION, 'blue')) : '',
  ].filter(Boolean).join('');
  if (storageRows) body += `<div class="calcom-sec"><h3>Storage</h3><div class="calcom-card">${storageRows}</div></div>`;

  // Stripe
  const stripeRows = [
    kv.STRIPE_API_KEY != null ? row('STRIPE_API_KEY', masked()) : '',
    kv.STRIPE_WEBHOOK_SECRET != null ? row('STRIPE_WEBHOOK_SECRET', masked()) : '',
  ].filter(Boolean).join('');
  if (stripeRows) body += `<div class="calcom-sec"><h3>Stripe</h3><div class="calcom-card">${stripeRows}</div></div>`;

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No Cal.com configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
