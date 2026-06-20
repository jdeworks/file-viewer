const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.linkwarden-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.linkwarden-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0047BD;color:#fff;vertical-align:middle;margin-right:8px;}
.linkwarden-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.linkwarden-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.linkwarden-sec{margin:12px 0;}
.linkwarden-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.linkwarden-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.linkwarden-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap;}
.linkwarden-key{color:var(--fg-2,#888);font-size:12px;min-width:260px;flex-shrink:0;}
.linkwarden-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.linkwarden-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.linkwarden-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.linkwarden-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.linkwarden-chip-red{background:#ffebee;border-color:#f44336;color:#b71c1c;}
.linkwarden-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.linkwarden-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
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

function maskDbUrl(url) {
  if (!url) return '';
  return url.replace(/^([a-z]+:\/\/)([^@]+)@/, '$1[credentials]@');
}

function chip(val, cls) {
  if (val == null || val === '') return '';
  const s = String(val);
  const display = s.length > 80 ? s.slice(0, 77) + '…' : s;
  return `<span class="linkwarden-chip${cls ? ' linkwarden-chip-' + cls : ''}">${esc(display)}</span>`;
}

function masked() {
  return '<span class="linkwarden-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="linkwarden-row"><span class="linkwarden-key">${esc(label)}</span><span class="linkwarden-val">${html}</span></div>`;
}

function boolChip(v, trueLabel, trueColor, falseLabel, falseColor) {
  const lower = (v || '').trim().toLowerCase();
  if (lower === 'true' || lower === '1' || lower === 'yes') return chip(trueLabel || 'true', trueColor || 'green');
  if (lower === 'false' || lower === '0' || lower === 'no') return chip(falseLabel || 'false', falseColor || 'gray');
  return chip(v, 'gray');
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'linkwarden-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const kv = parseKV(text);

  const title = kv['NEXTAUTH_URL'] || 'Linkwarden Config';

  // Header
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="linkwarden-badge">Linkwarden</span>
      <span class="linkwarden-title">${esc(title)}</span>
    </div>
    <div class="linkwarden-sub">Linkwarden self-hosted bookmark manager and link archiver configuration</div>
  `;
  host.appendChild(header);

  let body = '';

  // App section
  const appRows = [
    kv['NEXTAUTH_URL'] ? row('NEXTAUTH_URL', chip(kv['NEXTAUTH_URL'])) : '',
    kv['NEXT_PUBLIC_DISABLE_REGISTRATION'] != null ? row('NEXT_PUBLIC_DISABLE_REGISTRATION', boolChip(kv['NEXT_PUBLIC_DISABLE_REGISTRATION'], 'disabled', 'red', 'enabled', 'green')) : '',
    kv['STORAGE_FOLDER'] ? row('STORAGE_FOLDER', chip(kv['STORAGE_FOLDER'])) : '',
  ].filter(Boolean).join('');
  if (appRows) body += `<div class="linkwarden-sec"><h3>App</h3><div class="linkwarden-card">${appRows}</div></div>`;

  // Auth section
  const authRows = [
    kv['NEXTAUTH_SECRET'] != null ? row('NEXTAUTH_SECRET', masked()) : '',
    kv['NEXT_PUBLIC_CREDENTIALS_ENABLED'] != null ? row('NEXT_PUBLIC_CREDENTIALS_ENABLED', boolChip(kv['NEXT_PUBLIC_CREDENTIALS_ENABLED'], 'enabled', 'green', 'disabled', 'gray')) : '',
  ].filter(Boolean).join('');
  if (authRows) body += `<div class="linkwarden-sec"><h3>Auth</h3><div class="linkwarden-card">${authRows}</div></div>`;

  // Database section
  const dbUrl = kv['DATABASE_URL'];
  if (dbUrl != null) {
    const maskedUrl = maskDbUrl(dbUrl);
    const dbRows = row('DATABASE_URL', chip(maskedUrl));
    body += `<div class="linkwarden-sec"><h3>Database</h3><div class="linkwarden-card">${dbRows}</div></div>`;
  }

  // Pagination section
  const paginationRows = [
    kv['PAGINATION_TAKE_COUNT'] ? row('PAGINATION_TAKE_COUNT', chip(kv['PAGINATION_TAKE_COUNT'], 'blue')) : '',
  ].filter(Boolean).join('');
  if (paginationRows) body += `<div class="linkwarden-sec"><h3>Pagination</h3><div class="linkwarden-card">${paginationRows}</div></div>`;

  // SSO/OAuth section — detect NEXT_PUBLIC_*_ENABLED provider vars
  const ssoProviders = [];
  for (const [k, v] of Object.entries(kv)) {
    if (/^NEXT_PUBLIC_(.+)_ENABLED$/.test(k) && k !== 'NEXT_PUBLIC_CREDENTIALS_ENABLED' && k !== 'NEXT_PUBLIC_DISABLE_REGISTRATION') {
      const match = k.match(/^NEXT_PUBLIC_(.+)_ENABLED$/);
      const providerName = match ? match[1].charAt(0) + match[1].slice(1).toLowerCase() : k;
      const enabled = (v || '').trim().toLowerCase();
      if (enabled === 'true' || enabled === '1') {
        ssoProviders.push(chip(providerName, 'blue'));
      } else {
        ssoProviders.push(chip(providerName, 'gray'));
      }
    }
  }
  if (ssoProviders.length) {
    const ssoRows = `<div class="linkwarden-row"><span class="linkwarden-key">Providers</span><span class="linkwarden-val">${ssoProviders.join('')}</span></div>`;
    body += `<div class="linkwarden-sec"><h3>SSO / OAuth</h3><div class="linkwarden-card">${ssoRows}</div></div>`;
  }

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No Linkwarden configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
