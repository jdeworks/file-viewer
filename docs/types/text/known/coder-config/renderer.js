const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.coder-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.coder-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a1a2e;color:#fff;vertical-align:middle;margin-right:8px;}
.coder-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.coder-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.coder-sec{margin:12px 0;}
.coder-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.coder-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.coder-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap;}
.coder-key{color:var(--fg-2,#888);font-size:12px;min-width:240px;flex-shrink:0;}
.coder-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.coder-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.coder-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.coder-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.coder-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.coder-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
`;

/** Parse KEY=VALUE env file; skip # comments; strip optional 'export ' prefix */
function parseKV(text) {
  const out = {};
  for (const raw of text.split('\n')) {
    let line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    // Strip optional 'export ' prefix
    if (line.startsWith('export ')) line = line.slice(7).trim();
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim();
    if (key && !(key in out)) out[key] = val;
  }
  return out;
}

/** Mask credentials in a DSN/URL */
function maskDsn(val) {
  if (!val) return '';
  return String(val).replace(/(\/\/[^:@]*):([^@]*)@/, '$1:[configured]@');
}

function chip(val, cls = '') {
  if (val == null || val === '') return '';
  return `<span class="coder-chip${cls ? ' coder-chip-' + cls : ''}">${esc(String(val))}</span>`;
}

function masked() {
  return '<span class="coder-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="coder-row"><span class="coder-key">${esc(label)}</span><span class="coder-val">${html}</span></div>`;
}

function boolChip(v) {
  const lower = (v || '').trim().toLowerCase();
  if (lower === 'true' || lower === '1' || lower === 'yes') return chip('true', 'green');
  if (lower === 'false' || lower === '0' || lower === 'no') return chip('false', 'gray');
  return chip(v, 'gray');
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'coder-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const cfg = parseKV(text);

  const title = cfg.CODER_ACCESS_URL || 'Coder Config';

  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="coder-badge">Coder</span>
      <span class="coder-title">${esc(title)}</span>
    </div>
    <div class="coder-sub">Coder cloud development environment platform configuration</div>
  `;
  host.appendChild(header);

  let body = '';

  // Server
  const serverRows = [
    cfg.CODER_ACCESS_URL ? row('CODER_ACCESS_URL', chip(cfg.CODER_ACCESS_URL, 'blue')) : '',
    cfg.CODER_WILDCARD_ACCESS_URL ? row('CODER_WILDCARD_ACCESS_URL', chip(cfg.CODER_WILDCARD_ACCESS_URL)) : '',
    cfg.CODER_HTTP_ADDRESS ? row('CODER_HTTP_ADDRESS', chip(cfg.CODER_HTTP_ADDRESS)) : '',
  ].filter(Boolean).join('');
  if (serverRows) body += `<div class="coder-sec"><h3>Server</h3><div class="coder-card">${serverRows}</div></div>`;

  // TLS
  const tlsRows = [
    cfg.CODER_TLS_ENABLE != null ? row('CODER_TLS_ENABLE', boolChip(cfg.CODER_TLS_ENABLE)) : '',
    cfg.CODER_TLS_CERT_FILE ? row('CODER_TLS_CERT_FILE', chip(cfg.CODER_TLS_CERT_FILE)) : '',
    cfg.CODER_TLS_KEY_FILE ? row('CODER_TLS_KEY_FILE', chip(cfg.CODER_TLS_KEY_FILE)) : '',
  ].filter(Boolean).join('');
  if (tlsRows) body += `<div class="coder-sec"><h3>TLS</h3><div class="coder-card">${tlsRows}</div></div>`;

  // Database
  if (cfg.CODER_PG_CONNECTION_URL) {
    const masked = maskDsn(cfg.CODER_PG_CONNECTION_URL);
    body += `<div class="coder-sec"><h3>Database</h3><div class="coder-card">${row('CODER_PG_CONNECTION_URL', chip(masked))}</div></div>`;
  }

  // Observability
  const obsRows = [
    cfg.CODER_PROMETHEUS_ENABLE != null ? row('CODER_PROMETHEUS_ENABLE', boolChip(cfg.CODER_PROMETHEUS_ENABLE)) : '',
    cfg.CODER_PROMETHEUS_ADDRESS ? row('CODER_PROMETHEUS_ADDRESS', chip(cfg.CODER_PROMETHEUS_ADDRESS)) : '',
    cfg.CODER_TELEMETRY != null ? row('CODER_TELEMETRY', boolChip(cfg.CODER_TELEMETRY)) : '',
  ].filter(Boolean).join('');
  if (obsRows) body += `<div class="coder-sec"><h3>Observability</h3><div class="coder-card">${obsRows}</div></div>`;

  // OAuth (GitHub)
  const ghRows = [
    cfg.CODER_OAUTH2_GITHUB_CLIENT_ID ? row('CODER_OAUTH2_GITHUB_CLIENT_ID', chip(cfg.CODER_OAUTH2_GITHUB_CLIENT_ID)) : '',
    cfg.CODER_OAUTH2_GITHUB_CLIENT_SECRET != null ? row('CODER_OAUTH2_GITHUB_CLIENT_SECRET', masked()) : '',
  ].filter(Boolean).join('');
  if (ghRows) body += `<div class="coder-sec"><h3>OAuth (GitHub)</h3><div class="coder-card">${ghRows}</div></div>`;

  // OIDC
  const oidcRows = [
    cfg.CODER_OIDC_ISSUER_URL ? row('CODER_OIDC_ISSUER_URL', chip(cfg.CODER_OIDC_ISSUER_URL)) : '',
    cfg.CODER_OIDC_CLIENT_ID ? row('CODER_OIDC_CLIENT_ID', chip(cfg.CODER_OIDC_CLIENT_ID)) : '',
    cfg.CODER_OIDC_CLIENT_SECRET != null ? row('CODER_OIDC_CLIENT_SECRET', masked()) : '',
  ].filter(Boolean).join('');
  if (oidcRows) body += `<div class="coder-sec"><h3>OIDC</h3><div class="coder-card">${oidcRows}</div></div>`;

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No Coder configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
