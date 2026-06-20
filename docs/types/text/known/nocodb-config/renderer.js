const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.noco-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.noco-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7c3aed;color:#fff;vertical-align:middle;margin-right:8px;}
.noco-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.noco-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.noco-sec{margin:12px 0;}
.noco-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.noco-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.noco-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap;}
.noco-key{color:var(--fg-2,#888);font-size:12px;min-width:200px;flex-shrink:0;}
.noco-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.noco-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.noco-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.noco-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.noco-chip-red{background:#ffebee;border-color:#f44336;color:#b71c1c;}
.noco-chip-violet{background:#f3e8ff;border-color:#7c3aed;color:#4c1d95;}
.noco-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.noco-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
`;

/** Parse KEY=VALUE config, skip # comments and blank lines, strip optional `export ` prefix */
function parseKV(text) {
  const out = {};
  for (const raw of text.split('\n')) {
    let line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('export ')) line = line.slice(7).trimStart();
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim();
    if (key && !(key in out)) out[key] = val;
  }
  return out;
}

/** Mask credentials in a DSN/URL: postgres://user:pass@host/db → postgres://user:[configured]@host/db */
function maskDsn(val) {
  if (!val) return '';
  return val.replace(/(\/\/[^:@]*):([^@]*)@/, '$1:[configured]@');
}

function chip(val, cls) {
  if (val == null || val === '') return '';
  return `<span class="noco-chip${cls ? ' noco-chip-' + cls : ''}">${esc(val)}</span>`;
}

function masked() {
  return '<span class="noco-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="noco-row"><span class="noco-key">${esc(label)}</span><span class="noco-val">${html}</span></div>`;
}

function boolChip(v, trueLabel, trueColor, falseLabel, falseColor) {
  const lower = (v || '').trim().toLowerCase();
  if (lower === 'true' || lower === '1' || lower === 'yes') return chip(trueLabel || 'true', trueColor || 'green');
  if (lower === 'false' || lower === '0' || lower === 'no') return chip(falseLabel || 'false', falseColor || 'gray');
  return chip(v, 'gray');
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'noco-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const cfg = parseKV(text);

  const title = cfg.NC_PUBLIC_URL || 'NocoDB Config';

  // Header
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="noco-badge">NocoDB</span>
      <span class="noco-title">${esc(title)}</span>
    </div>
    <div class="noco-sub">NocoDB open-source Airtable alternative configuration</div>
  `;
  host.appendChild(header);

  let body = '';

  // Server
  const serverRows = [
    cfg.NC_PUBLIC_URL ? row('NC_PUBLIC_URL', chip(cfg.NC_PUBLIC_URL, 'blue')) : '',
    cfg.PORT ? row('PORT', chip(cfg.PORT, 'blue')) : '',
  ].filter(Boolean).join('');
  if (serverRows) body += `<div class="noco-sec"><h3>Server</h3><div class="noco-card">${serverRows}</div></div>`;

  // Security
  const secRows = [
    cfg.NC_AUTH_JWT_SECRET != null ? row('NC_AUTH_JWT_SECRET', masked()) : '',
  ].filter(Boolean).join('');
  if (secRows) body += `<div class="noco-sec"><h3>Security</h3><div class="noco-card">${secRows}</div></div>`;

  // Database
  if (cfg.NC_DB) {
    const masked = maskDsn(cfg.NC_DB);
    const display = masked.length > 80 ? masked.slice(0, 77) + '…' : masked;
    body += `<div class="noco-sec"><h3>Database</h3><div class="noco-card">${row('NC_DB', chip(display))}</div></div>`;
  }

  // Redis
  if (cfg.NC_REDIS_URL) {
    const maskedUrl = maskDsn(cfg.NC_REDIS_URL);
    const display = maskedUrl.length > 80 ? maskedUrl.slice(0, 77) + '…' : maskedUrl;
    body += `<div class="noco-sec"><h3>Redis</h3><div class="noco-card">${row('NC_REDIS_URL', chip(display))}</div></div>`;
  }

  // Email
  const emailRows = [
    cfg.NC_SMTP_HOST ? row('NC_SMTP_HOST', chip(cfg.NC_SMTP_HOST)) : '',
    cfg.NC_SMTP_PORT ? row('NC_SMTP_PORT', chip(cfg.NC_SMTP_PORT, 'blue')) : '',
    cfg.NC_SMTP_FROM ? row('NC_SMTP_FROM', chip(cfg.NC_SMTP_FROM)) : '',
    cfg.NC_SMTP_SENDER_NAME ? row('NC_SMTP_SENDER_NAME', chip(cfg.NC_SMTP_SENDER_NAME)) : '',
    cfg.NC_SMTP_USERNAME ? row('NC_SMTP_USERNAME', chip(cfg.NC_SMTP_USERNAME)) : '',
    cfg.NC_SMTP_PASSWORD != null ? row('NC_SMTP_PASSWORD', masked()) : '',
  ].filter(Boolean).join('');
  if (emailRows) body += `<div class="noco-sec"><h3>Email</h3><div class="noco-card">${emailRows}</div></div>`;

  // Features
  const featRows = [
    cfg.NC_DISABLE_TELE != null ? row('NC_DISABLE_TELE', boolChip(cfg.NC_DISABLE_TELE, 'disabled', 'green', 'enabled', 'gray')) : '',
    cfg.NC_INVITE_ONLY_SIGNUP != null ? row('NC_INVITE_ONLY_SIGNUP', boolChip(cfg.NC_INVITE_ONLY_SIGNUP, 'invite-only', 'violet', 'open', 'gray')) : '',
    cfg.NC_TOOL_DIR ? row('NC_TOOL_DIR', chip(cfg.NC_TOOL_DIR)) : '',
  ].filter(Boolean).join('');
  if (featRows) body += `<div class="noco-sec"><h3>Features</h3><div class="noco-card">${featRows}</div></div>`;

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No NocoDB configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
