const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.abox-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.abox-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a237e;color:#fff;vertical-align:middle;margin-right:8px;}
.abox-title{font-size:20px;font-weight:700;margin:0 0 2px;font-family:ui-monospace,monospace;}
.abox-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.abox-sec{margin:14px 0;}
.abox-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.abox-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.abox-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.abox-kv-k{color:var(--fg-2,#888);min-width:220px;flex-shrink:0;}
.abox-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.abox-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);font-style:italic;}
.abox-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 3px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.abox-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.abox-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.abox-formats{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;}
`;

/** Parse KEY=VALUE config, skip # comments and blank lines. Handles optional `export ` prefix. */
function parseKV(text) {
  const out = {};
  for (const raw of text.split('\n')) {
    let line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('export ')) line = line.slice(7).trim();
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key && !(key in out)) out[key] = val;
  }
  return out;
}

function kv(label, value, masked) {
  if (value == null || value === '') return '';
  const valHtml = masked
    ? `<span class="abox-masked">[configured]</span>`
    : `<span class="abox-kv-v">${esc(String(value))}</span>`;
  return `<div class="abox-kv"><span class="abox-kv-k">${esc(label)}</span>${valHtml}</div>`;
}

function boolChip(label, value) {
  if (value == null || value === '') return '';
  const lower = String(value).trim().toLowerCase();
  const on = lower === 'true' || lower === '1' || lower === 'yes';
  const html = on
    ? `<span class="abox-chip abox-chip-green">enabled</span>`
    : `<span class="abox-chip abox-chip-gray">disabled</span>`;
  return `<div class="abox-kv"><span class="abox-kv-k">${esc(label)}</span>${html}</div>`;
}

function formatChip(key, value) {
  if (value == null || value === '') return '';
  const lower = String(value).trim().toLowerCase();
  const on = lower === 'true' || lower === '1' || lower === 'yes';
  const cls = on ? 'abox-chip-green' : 'abox-chip-gray';
  return `<span class="abox-chip ${cls}" title="${esc(key)}">${esc(key.replace(/^SAVE_/, ''))}</span>`;
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'abox-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const env = parseKV(text);

  // Header
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="abox-badge">ArchiveBox</span>
      <span class="abox-title">ArchiveBox Config</span>
    </div>
    <div class="abox-sub">ArchiveBox web archiving tool configuration</div>
  `;
  host.appendChild(header);

  let body = '';

  // Server
  const serverRows = [
    env.ALLOWED_HOSTS ? kv('ALLOWED_HOSTS', env.ALLOWED_HOSTS) : '',
    env.PUBLIC_INDEX != null ? boolChip('PUBLIC_INDEX', env.PUBLIC_INDEX) : '',
    env.PUBLIC_SNAPSHOTS != null ? boolChip('PUBLIC_SNAPSHOTS', env.PUBLIC_SNAPSHOTS) : '',
    env.PUBLIC_ADD_VIEW != null ? boolChip('PUBLIC_ADD_VIEW', env.PUBLIC_ADD_VIEW) : '',
  ].filter(Boolean).join('');
  if (serverRows) body += `<div class="abox-sec"><h3>Server</h3><div class="abox-card">${serverRows}</div></div>`;

  // Security
  if (env.SECRET_KEY != null) {
    body += `<div class="abox-sec"><h3>Security</h3><div class="abox-card">${kv('SECRET_KEY', null, true)}</div></div>`;
  }

  // Admin
  const adminRows = [
    env.ADMIN_USERNAME ? kv('ADMIN_USERNAME', env.ADMIN_USERNAME) : '',
    env.ADMIN_EMAIL ? kv('ADMIN_EMAIL', env.ADMIN_EMAIL) : '',
    env.ADMIN_PASSWORD != null ? kv('ADMIN_PASSWORD', null, true) : '',
  ].filter(Boolean).join('');
  if (adminRows) body += `<div class="abox-sec"><h3>Admin</h3><div class="abox-card">${adminRows}</div></div>`;

  // Archiving formats — colored chips
  const formatKeys = [
    'SAVE_TITLE', 'SAVE_FAVICON', 'SAVE_WGET', 'SAVE_SCREENSHOT', 'SAVE_PDF',
    'SAVE_DOM', 'SAVE_SINGLEFILE', 'SAVE_READABILITY', 'SAVE_MEDIA', 'SAVE_GIT',
  ];
  const formatChips = formatKeys
    .filter((k) => env[k] != null)
    .map((k) => formatChip(k, env[k]))
    .filter(Boolean)
    .join('');
  if (formatChips) {
    body += `<div class="abox-sec"><h3>Archiving Formats</h3><div class="abox-card"><div class="abox-formats">${formatChips}</div></div></div>`;
  }

  // Limits
  const limitRows = [
    env.MEDIA_MAX_SIZE ? kv('MEDIA_MAX_SIZE', env.MEDIA_MAX_SIZE) : '',
    env.RESOLUTION ? kv('RESOLUTION', env.RESOLUTION) : '',
  ].filter(Boolean).join('');
  if (limitRows) body += `<div class="abox-sec"><h3>Limits</h3><div class="abox-card">${limitRows}</div></div>`;

  // Binaries
  const binRows = [
    env.CHROME_BINARY ? kv('CHROME_BINARY', env.CHROME_BINARY) : '',
    env.WGET_BINARY ? kv('WGET_BINARY', env.WGET_BINARY) : '',
    env.CURL_BINARY ? kv('CURL_BINARY', env.CURL_BINARY) : '',
  ].filter(Boolean).join('');
  if (binRows) body += `<div class="abox-sec"><h3>Binaries</h3><div class="abox-card">${binRows}</div></div>`;

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No ArchiveBox configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
