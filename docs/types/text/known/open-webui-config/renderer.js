const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.openwebui-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.openwebui-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a1a2e;color:#e0e0ff;vertical-align:middle;margin-right:8px;}
.openwebui-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.openwebui-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.openwebui-sec{margin:12px 0;}
.openwebui-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.openwebui-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.openwebui-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap;}
.openwebui-key{color:var(--fg-2,#888);font-size:12px;min-width:260px;flex-shrink:0;}
.openwebui-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.openwebui-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.openwebui-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.openwebui-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.openwebui-chip-red{background:#ffebee;border-color:#f44336;color:#b71c1c;}
.openwebui-chip-orange{background:#fff3e0;border-color:#ff9800;color:#e65100;}
.openwebui-chip-purple{background:#f3e5f5;border-color:#9c27b0;color:#4a148c;}
.openwebui-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.openwebui-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
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

function maskUrl(url) {
  return String(url || '').replace(/(postgres(?:ql)?:\/\/|mysql:\/\/|redis:\/\/)[^@]*@/, '$1[configured]@');
}

function chip(val, cls) {
  if (val == null || val === '') return '';
  const s = String(val);
  return `<span class="openwebui-chip${cls ? ' openwebui-chip-' + cls : ''}">${esc(s.length > 80 ? s.slice(0, 77) + '…' : s)}</span>`;
}

function masked() {
  return '<span class="openwebui-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="openwebui-row"><span class="openwebui-key">${esc(label)}</span><span class="openwebui-val">${html}</span></div>`;
}

function boolChip(v, trueLabel, trueColor, falseLabel, falseColor) {
  const lower = (v || '').trim().toLowerCase();
  if (lower === 'true' || lower === '1' || lower === 'yes') return chip(trueLabel || 'true', trueColor || 'green');
  if (lower === 'false' || lower === '0' || lower === 'no') return chip(falseLabel || 'false', falseColor || 'gray');
  if (v != null && v !== '') return chip(v, 'gray');
  return '';
}

export function render(intake) {
  const kv = parseKV(intake.text || '');

  const host = document.createElement('div');
  host.className = 'openwebui-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const title = kv['WEBUI_URL'] || kv['WEBUI_NAME'] || 'Open WebUI Config';

  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="openwebui-badge">Open WebUI</span>
      <span class="openwebui-title">${esc(title)}</span>
    </div>
    <p class="openwebui-sub">Open WebUI self-hosted AI chat interface configuration</p>
  `;
  host.appendChild(header);

  let body = '';

  // Server
  const serverRows = [
    kv['WEBUI_URL'] ? row('WEBUI_URL', chip(kv['WEBUI_URL'], 'blue')) : '',
    kv['PORT'] ? row('PORT', chip(kv['PORT'], 'blue')) : '',
    kv['WEBUI_NAME'] ? row('WEBUI_NAME', chip(kv['WEBUI_NAME'])) : '',
  ].filter(Boolean).join('');
  if (serverRows) body += `<div class="openwebui-sec"><h3>Server</h3><div class="openwebui-card">${serverRows}</div></div>`;

  // Backend
  const backendRows = [
    kv['OLLAMA_BASE_URL'] ? row('OLLAMA_BASE_URL', chip(kv['OLLAMA_BASE_URL'], 'blue')) : '',
    kv['OLLAMA_BASE_URLS'] ? row('OLLAMA_BASE_URLS', chip(kv['OLLAMA_BASE_URLS'])) : '',
    kv['OPENAI_API_BASE_URL'] ? row('OPENAI_API_BASE_URL', chip(kv['OPENAI_API_BASE_URL'])) : '',
  ].filter(Boolean).join('');
  if (backendRows) body += `<div class="openwebui-sec"><h3>Backend</h3><div class="openwebui-card">${backendRows}</div></div>`;

  // Security
  const secRows = [
    kv['WEBUI_SECRET_KEY'] != null ? row('WEBUI_SECRET_KEY', masked()) : '',
    kv['WEBUI_AUTH'] != null ? row('WEBUI_AUTH', boolChip(kv['WEBUI_AUTH'], 'enabled', 'green', 'disabled', 'gray')) : '',
    kv['ENABLE_SIGNUP'] != null ? row('ENABLE_SIGNUP', boolChip(kv['ENABLE_SIGNUP'], 'true', 'orange', 'false', 'gray')) : '',
    kv['ENABLE_LOGIN_FORM'] != null ? row('ENABLE_LOGIN_FORM', boolChip(kv['ENABLE_LOGIN_FORM'], 'true', 'green', 'false', 'gray')) : '',
  ].filter(Boolean).join('');
  if (secRows) body += `<div class="openwebui-sec"><h3>Security</h3><div class="openwebui-card">${secRows}</div></div>`;

  // API Keys
  const apiRows = [
    kv['OPENAI_API_KEY'] != null ? row('OPENAI_API_KEY', masked()) : '',
    kv['ANTHROPIC_API_KEY'] != null ? row('ANTHROPIC_API_KEY', masked()) : '',
  ].filter(Boolean).join('');
  if (apiRows) body += `<div class="openwebui-sec"><h3>API Keys</h3><div class="openwebui-card">${apiRows}</div></div>`;

  // Database
  const dbVal = kv['DATABASE_URL'];
  const dbRows = [
    dbVal != null ? row('DATABASE_URL', chip(maskUrl(dbVal))) : '',
  ].filter(Boolean).join('');
  if (dbRows) body += `<div class="openwebui-sec"><h3>Database</h3><div class="openwebui-card">${dbRows}</div></div>`;

  // RAG (Retrieval)
  const ragRows = [
    kv['ENABLE_RAG_WEB_SEARCH'] != null ? row('ENABLE_RAG_WEB_SEARCH', boolChip(kv['ENABLE_RAG_WEB_SEARCH'], 'enabled', 'green', 'disabled', 'gray')) : '',
    kv['RAG_EMBEDDING_ENGINE'] ? row('RAG_EMBEDDING_ENGINE', chip(kv['RAG_EMBEDDING_ENGINE'], 'purple')) : '',
    kv['CHUNK_SIZE'] ? row('CHUNK_SIZE', chip(kv['CHUNK_SIZE'])) : '',
    kv['CHUNK_OVERLAP'] ? row('CHUNK_OVERLAP', chip(kv['CHUNK_OVERLAP'])) : '',
  ].filter(Boolean).join('');
  if (ragRows) body += `<div class="openwebui-sec"><h3>RAG (Retrieval)</h3><div class="openwebui-card">${ragRows}</div></div>`;

  // LDAP / OAuth
  const oauthRows = [
    kv['ENABLE_OAUTH_SIGNUP'] != null ? row('ENABLE_OAUTH_SIGNUP', boolChip(kv['ENABLE_OAUTH_SIGNUP'], 'enabled', 'green', 'disabled', 'gray')) : '',
    kv['OAUTH_CLIENT_ID'] ? row('OAUTH_CLIENT_ID', chip(kv['OAUTH_CLIENT_ID'])) : '',
    kv['OAUTH_CLIENT_SECRET'] != null ? row('OAUTH_CLIENT_SECRET', masked()) : '',
    kv['OAUTH_PROVIDER_NAME'] ? row('OAUTH_PROVIDER_NAME', chip(kv['OAUTH_PROVIDER_NAME'])) : '',
  ].filter(Boolean).join('');
  if (oauthRows) body += `<div class="openwebui-sec"><h3>LDAP / OAuth</h3><div class="openwebui-card">${oauthRows}</div></div>`;

  // Storage
  const storageRows = [
    kv['STORAGE_PROVIDER'] ? row('STORAGE_PROVIDER', chip(kv['STORAGE_PROVIDER'], 'blue')) : '',
    kv['S3_BUCKET_NAME'] ? row('S3_BUCKET_NAME', chip(kv['S3_BUCKET_NAME'])) : '',
    kv['S3_ACCESS_KEY'] != null ? row('S3_ACCESS_KEY', masked()) : '',
    kv['S3_SECRET_KEY'] != null ? row('S3_SECRET_KEY', masked()) : '',
  ].filter(Boolean).join('');
  if (storageRows) body += `<div class="openwebui-sec"><h3>Storage</h3><div class="openwebui-card">${storageRows}</div></div>`;

  // Admin
  const adminRows = [
    kv['DEFAULT_USER_ROLE'] ? row('DEFAULT_USER_ROLE', chip(kv['DEFAULT_USER_ROLE'], kv['DEFAULT_USER_ROLE'] === 'admin' ? 'orange' : kv['DEFAULT_USER_ROLE'] === 'user' ? 'green' : 'gray')) : '',
    kv['ADMIN_EMAIL'] ? row('ADMIN_EMAIL', chip(kv['ADMIN_EMAIL'])) : '',
  ].filter(Boolean).join('');
  if (adminRows) body += `<div class="openwebui-sec"><h3>Admin</h3><div class="openwebui-card">${adminRows}</div></div>`;

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No Open WebUI configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
