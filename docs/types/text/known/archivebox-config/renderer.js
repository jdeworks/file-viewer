const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.archivebox-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.archivebox-doc .ab-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#5850ec;color:#fff;vertical-align:middle;margin-right:8px;}
.archivebox-doc .ab-title{font-size:20px;font-weight:700;margin:0 0 2px;font-family:ui-monospace,monospace;}
.archivebox-doc .ab-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.archivebox-doc .ab-sec{margin:14px 0;}
.archivebox-doc .ab-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.archivebox-doc .ab-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.archivebox-doc .ab-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.archivebox-doc .ab-kv-k{color:var(--fg-2,#888);min-width:220px;flex-shrink:0;}
.archivebox-doc .ab-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.archivebox-doc .ab-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);font-style:italic;}
.archivebox-doc .ab-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 3px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.archivebox-doc .ab-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.archivebox-doc .ab-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.archivebox-doc .ab-formats{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;}
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

function kv(label, value, masked) {
  if (value == null || value === '') return '';
  const valHtml = masked
    ? `<span class="ab-masked">[configured]</span>`
    : `<span class="ab-kv-v">${esc(String(value))}</span>`;
  return `<div class="ab-kv"><span class="ab-kv-k">${esc(label)}</span>${valHtml}</div>`;
}

function boolChip(label, value) {
  if (value == null || value === '') return '';
  const lower = String(value).trim().toLowerCase();
  const on = lower === 'true' || lower === '1' || lower === 'yes';
  const html = on
    ? `<span class="ab-chip ab-chip-green">enabled</span>`
    : `<span class="ab-chip ab-chip-gray">disabled</span>`;
  return `<div class="ab-kv"><span class="ab-kv-k">${esc(label)}</span>${html}</div>`;
}

function formatChip(key, value) {
  if (value == null || value === '') return '';
  const lower = String(value).trim().toLowerCase();
  const on = lower === 'true' || lower === '1' || lower === 'yes';
  const cls = on ? 'ab-chip ab-chip-green' : 'ab-chip ab-chip-gray';
  return `<span class="${cls}" title="${esc(key)}">${esc(key.replace(/^SAVE_/, ''))}</span>`;
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'archivebox-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const env = parseKV(text);

  // Header
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="ab-badge">ArchiveBox</span>
      <span class="ab-title">ArchiveBox Config</span>
    </div>
    <div class="ab-sub">ArchiveBox web archiving tool configuration</div>
  `;
  host.appendChild(header);

  let body = '';

  // General
  const generalRows = [
    env.ALLOWED_HOSTS ? kv('ALLOWED_HOSTS', env.ALLOWED_HOSTS) : '',
    env.MEDIA_MAX_SIZE ? kv('MEDIA_MAX_SIZE', env.MEDIA_MAX_SIZE) : '',
    env.TIMEOUT ? kv('TIMEOUT', env.TIMEOUT) : '',
    env.CHECK_SSL_VALIDITY != null ? boolChip('CHECK_SSL_VALIDITY', env.CHECK_SSL_VALIDITY) : '',
    env.PUBLIC_INDEX != null ? boolChip('PUBLIC_INDEX', env.PUBLIC_INDEX) : '',
    env.PUBLIC_SNAPSHOTS != null ? boolChip('PUBLIC_SNAPSHOTS', env.PUBLIC_SNAPSHOTS) : '',
    env.PUBLIC_ADD_VIEW != null ? boolChip('PUBLIC_ADD_VIEW', env.PUBLIC_ADD_VIEW) : '',
  ].filter(Boolean).join('');
  if (generalRows) body += `<div class="ab-sec"><h3>General</h3><div class="ab-card">${generalRows}</div></div>`;

  // Save Methods — grid of chips
  const saveKeys = [
    'SAVE_WGET', 'SAVE_WGET_REQUISITES', 'SAVE_PDF', 'SAVE_SCREENSHOT', 'SAVE_DOM',
    'SAVE_SINGLEFILE', 'SAVE_READABILITY', 'SAVE_MERCURY', 'SAVE_GIT', 'SAVE_MEDIA',
    'SAVE_ARCHIVE_DOT_ORG', 'SAVE_TITLE', 'SAVE_FAVICON',
  ];
  const saveChips = saveKeys
    .filter((k) => env[k] != null)
    .map((k) => formatChip(k, env[k]))
    .filter(Boolean)
    .join('');
  if (saveChips) {
    body += `<div class="ab-sec"><h3>Save Methods</h3><div class="ab-card"><div class="ab-formats">${saveChips}</div></div></div>`;
  }

  // Search
  const searchRows = [
    env.SEARCH_BACKEND_ENGINE ? `<div class="ab-kv"><span class="ab-kv-k">SEARCH_BACKEND_ENGINE</span><span class="ab-chip">${esc(env.SEARCH_BACKEND_ENGINE)}</span></div>` : '',
    env.SEARCH_BACKEND_HOST_NAME ? kv('SEARCH_BACKEND_HOST_NAME', env.SEARCH_BACKEND_HOST_NAME) : '',
  ].filter(Boolean).join('');
  if (searchRows) body += `<div class="ab-sec"><h3>Search</h3><div class="ab-card">${searchRows}</div></div>`;

  // Auth
  const authRows = [
    env.ADMIN_USERNAME ? kv('ADMIN_USERNAME', env.ADMIN_USERNAME) : '',
    env.ADMIN_EMAIL ? kv('ADMIN_EMAIL', env.ADMIN_EMAIL) : '',
    env.ADMIN_PASSWORD != null ? kv('ADMIN_PASSWORD', null, true) : '',
    env.SECRET_KEY != null ? kv('SECRET_KEY', null, true) : '',
  ].filter(Boolean).join('');
  if (authRows) body += `<div class="ab-sec"><h3>Auth</h3><div class="ab-card">${authRows}</div></div>`;

  // Database
  const dbRows = [
    env.SQLITE_DATABASE ? kv('SQLITE_DATABASE', env.SQLITE_DATABASE) : '',
  ].filter(Boolean).join('');
  if (dbRows) body += `<div class="ab-sec"><h3>Database</h3><div class="ab-card">${dbRows}</div></div>`;

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No ArchiveBox configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
