const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.concourse-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.concourse-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1e1e2e;color:#f9e2af;vertical-align:middle;margin-right:8px;border:1px solid #f9e2af;}
.concourse-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.concourse-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.concourse-sec{margin:12px 0;}
.concourse-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.concourse-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.concourse-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap;}
.concourse-key{color:var(--fg-2,#888);font-size:12px;min-width:280px;flex-shrink:0;}
.concourse-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.concourse-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.concourse-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.concourse-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.concourse-chip-yellow{background:#fffde7;border-color:#f9a825;color:#7b5800;}
.concourse-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
`;

/** Parse KEY=VALUE env file; skip # comments and blank lines. Handles optional `export ` prefix. */
function parseKV(text) {
  const out = {};
  for (const raw of (text || '').split('\n')) {
    let line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('export ')) line = line.slice(7).trim();
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (key && !(key in out)) out[key] = v;
  }
  return out;
}

function masked() {
  return '<span class="concourse-masked">[configured]</span>';
}

function chip(v, cls) {
  if (v == null || v === '') return '';
  const s = String(v);
  return `<span class="concourse-chip${cls ? ' concourse-chip-' + cls : ''}">${esc(s.length > 80 ? s.slice(0, 77) + '…' : s)}</span>`;
}

function val(v) {
  if (v == null || v === '') return '';
  const s = String(v);
  return `<span class="concourse-val">${esc(s.length > 120 ? s.slice(0, 117) + '…' : s)}</span>`;
}

function row(label, html) {
  if (!html) return '';
  return `<div class="concourse-row"><span class="concourse-key">${esc(label)}</span><span>${html}</span></div>`;
}

/** Mask the password portion of a local user entry: "username:password" → "username:[configured]" */
function maskLocalUser(entry) {
  if (!entry) return '';
  const colon = entry.indexOf(':');
  if (colon === -1) return esc(entry);
  return `${esc(entry.slice(0, colon))}:<span class="concourse-masked">[configured]</span>`;
}

/** Returns true if the key name suggests it is a secret. */
function isSensitive(key) {
  return /SECRET|PASSWORD|PASS\b|TOKEN|API_?KEY|PRIVATE/i.test(key);
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'concourse-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const kv = parseKV(intake.text || '');

  const externalUrl = kv.CONCOURSE_EXTERNAL_URL || '';
  const titleText = externalUrl || 'Concourse CI';

  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="concourse-badge">Concourse</span>
      <span class="concourse-title">${esc(titleText)}</span>
    </div>
    <div class="concourse-sub">Concourse CI server environment configuration</div>
  `;
  host.appendChild(header);

  let body = '';

  // Server
  const serverRows = [
    kv.CONCOURSE_EXTERNAL_URL ? row('CONCOURSE_EXTERNAL_URL', val(kv.CONCOURSE_EXTERNAL_URL)) : '',
    kv.CONCOURSE_BIND_IP ? row('CONCOURSE_BIND_IP', val(kv.CONCOURSE_BIND_IP)) : '',
    kv.CONCOURSE_BIND_PORT ? row('CONCOURSE_BIND_PORT', chip(kv.CONCOURSE_BIND_PORT, 'blue')) : '',
  ].filter(Boolean).join('');
  if (serverRows) body += `<div class="concourse-sec"><h3>Server</h3><div class="concourse-card">${serverRows}</div></div>`;

  // Database
  const sslmode = kv.CONCOURSE_POSTGRES_SSLMODE;
  const dbRows = [
    kv.CONCOURSE_POSTGRES_HOST ? row('CONCOURSE_POSTGRES_HOST', val(kv.CONCOURSE_POSTGRES_HOST)) : '',
    kv.CONCOURSE_POSTGRES_PORT ? row('CONCOURSE_POSTGRES_PORT', chip(kv.CONCOURSE_POSTGRES_PORT, 'blue')) : '',
    kv.CONCOURSE_POSTGRES_DATABASE ? row('CONCOURSE_POSTGRES_DATABASE', val(kv.CONCOURSE_POSTGRES_DATABASE)) : '',
    kv.CONCOURSE_POSTGRES_USER ? row('CONCOURSE_POSTGRES_USER', val(kv.CONCOURSE_POSTGRES_USER)) : '',
    kv.CONCOURSE_POSTGRES_PASSWORD != null ? row('CONCOURSE_POSTGRES_PASSWORD', masked()) : '',
    sslmode ? row('CONCOURSE_POSTGRES_SSLMODE', chip(sslmode, sslmode === 'disable' ? '' : 'green')) : '',
  ].filter(Boolean).join('');
  if (dbRows) body += `<div class="concourse-sec"><h3>Database</h3><div class="concourse-card">${dbRows}</div></div>`;

  // Auth - Local
  const localUser = kv.CONCOURSE_ADD_LOCAL_USER;
  if (localUser) {
    const localHtml = maskLocalUser(localUser);
    body += `<div class="concourse-sec"><h3>Auth — Local</h3><div class="concourse-card">${row('CONCOURSE_ADD_LOCAL_USER', localHtml)}</div></div>`;
  }

  // Auth - GitHub
  const ghRows = [
    kv.CONCOURSE_GITHUB_CLIENT_ID ? row('CONCOURSE_GITHUB_CLIENT_ID', val(kv.CONCOURSE_GITHUB_CLIENT_ID)) : '',
    kv.CONCOURSE_GITHUB_CLIENT_SECRET != null ? row('CONCOURSE_GITHUB_CLIENT_SECRET', masked()) : '',
  ].filter(Boolean).join('');
  if (ghRows) body += `<div class="concourse-sec"><h3>Auth — GitHub</h3><div class="concourse-card">${ghRows}</div></div>`;

  // Auth - OIDC
  const oidcRows = [
    kv.CONCOURSE_OIDC_CLIENT_ID ? row('CONCOURSE_OIDC_CLIENT_ID', val(kv.CONCOURSE_OIDC_CLIENT_ID)) : '',
    kv.CONCOURSE_OIDC_CLIENT_SECRET != null ? row('CONCOURSE_OIDC_CLIENT_SECRET', masked()) : '',
    kv.CONCOURSE_OIDC_ISSUER ? row('CONCOURSE_OIDC_ISSUER', val(kv.CONCOURSE_OIDC_ISSUER)) : '',
  ].filter(Boolean).join('');
  if (oidcRows) body += `<div class="concourse-sec"><h3>Auth — OIDC</h3><div class="concourse-card">${oidcRows}</div></div>`;

  // Keys
  const keyRows = [
    kv.CONCOURSE_SESSION_SIGNING_KEY ? row('CONCOURSE_SESSION_SIGNING_KEY', `${val(kv.CONCOURSE_SESSION_SIGNING_KEY)} ${masked()}`) : '',
    kv.CONCOURSE_TSA_HOST_KEY ? row('CONCOURSE_TSA_HOST_KEY', `${val(kv.CONCOURSE_TSA_HOST_KEY)} ${masked()}`) : '',
    kv.CONCOURSE_TSA_AUTHORIZED_KEYS ? row('CONCOURSE_TSA_AUTHORIZED_KEYS', val(kv.CONCOURSE_TSA_AUTHORIZED_KEYS)) : '',
  ].filter(Boolean).join('');
  if (keyRows) body += `<div class="concourse-sec"><h3>Keys</h3><div class="concourse-card">${keyRows}</div></div>`;

  // Worker
  const runtime = kv.CONCOURSE_RUNTIME;
  const workerRows = [
    kv.CONCOURSE_WORK_DIR ? row('CONCOURSE_WORK_DIR', val(kv.CONCOURSE_WORK_DIR)) : '',
    runtime ? row('CONCOURSE_RUNTIME', chip(runtime, 'yellow')) : '',
  ].filter(Boolean).join('');
  if (workerRows) body += `<div class="concourse-sec"><h3>Worker</h3><div class="concourse-card">${workerRows}</div></div>`;

  // TLS
  const tlsRows = [
    kv.CONCOURSE_TLS_CERT ? row('CONCOURSE_TLS_CERT', val(kv.CONCOURSE_TLS_CERT)) : '',
    kv.CONCOURSE_TLS_KEY != null ? row('CONCOURSE_TLS_KEY', `${val(kv.CONCOURSE_TLS_KEY)} ${masked()}`) : '',
  ].filter(Boolean).join('');
  if (tlsRows) body += `<div class="concourse-sec"><h3>TLS</h3><div class="concourse-card">${tlsRows}</div></div>`;

  // Catch any remaining CONCOURSE_* keys that are sensitive and weren't already handled
  const handledKeys = new Set([
    'CONCOURSE_EXTERNAL_URL', 'CONCOURSE_BIND_IP', 'CONCOURSE_BIND_PORT',
    'CONCOURSE_POSTGRES_HOST', 'CONCOURSE_POSTGRES_PORT', 'CONCOURSE_POSTGRES_DATABASE',
    'CONCOURSE_POSTGRES_USER', 'CONCOURSE_POSTGRES_PASSWORD', 'CONCOURSE_POSTGRES_SSLMODE',
    'CONCOURSE_ADD_LOCAL_USER',
    'CONCOURSE_GITHUB_CLIENT_ID', 'CONCOURSE_GITHUB_CLIENT_SECRET',
    'CONCOURSE_OIDC_CLIENT_ID', 'CONCOURSE_OIDC_CLIENT_SECRET', 'CONCOURSE_OIDC_ISSUER',
    'CONCOURSE_SESSION_SIGNING_KEY', 'CONCOURSE_TSA_HOST_KEY', 'CONCOURSE_TSA_AUTHORIZED_KEYS',
    'CONCOURSE_WORK_DIR', 'CONCOURSE_RUNTIME',
    'CONCOURSE_TLS_CERT', 'CONCOURSE_TLS_KEY',
  ]);
  const extraRows = Object.entries(kv)
    .filter(([k]) => k.startsWith('CONCOURSE_') && !handledKeys.has(k) && isSensitive(k))
    .map(([k]) => row(k, masked()))
    .join('');
  if (extraRows) body += `<div class="concourse-sec"><h3>Secrets</h3><div class="concourse-card">${extraRows}</div></div>`;

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No Concourse CI configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
