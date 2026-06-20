const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.memos-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.memos-doc .mm-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#3b82f6;color:#fff;vertical-align:middle;margin-right:8px;}
.memos-doc .mm-title{font-size:20px;font-weight:700;margin:0 0 2px;font-family:ui-monospace,monospace;}
.memos-doc .mm-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.memos-doc .mm-sec{margin:14px 0;}
.memos-doc .mm-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.memos-doc .mm-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.memos-doc .mm-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.memos-doc .mm-kv-k{color:var(--fg-2,#888);min-width:240px;flex-shrink:0;}
.memos-doc .mm-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.memos-doc .mm-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);font-style:italic;}
.memos-doc .mm-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 3px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.memos-doc .mm-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.memos-doc .mm-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.memos-doc .mm-chip-blue{background:#eff6ff;border-color:#3b82f6;color:#1d4ed8;}
.memos-doc .mm-chip-orange{background:#fff7ed;border-color:#f97316;color:#9a3412;}
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

/** Returns true if a key name looks sensitive */
function isSensitiveKey(key) {
  const upper = key.toUpperCase();
  return upper.includes('SECRET') || upper.includes('PASSWORD') || upper.includes('TOKEN') || upper.includes('KEY');
}

function kv(label, value, masked) {
  if (value == null || value === '') return '';
  const valHtml = masked
    ? `<span class="mm-masked">[configured]</span>`
    : `<span class="mm-kv-v">${esc(String(value))}</span>`;
  return `<div class="mm-kv"><span class="mm-kv-k">${esc(label)}</span>${valHtml}</div>`;
}

function modeChip(value) {
  if (value == null || value === '') return '';
  const v = String(value).trim().toLowerCase();
  const cls = v === 'prod' ? 'mm-chip mm-chip-blue' : 'mm-chip mm-chip-orange';
  return `<div class="mm-kv"><span class="mm-kv-k">MEMOS_MODE</span><span class="${cls}">${esc(value)}</span></div>`;
}

function boolChip(label, value, trueIsGood) {
  if (value == null || value === '') return '';
  const lower = String(value).trim().toLowerCase();
  const on = lower === 'true' || lower === '1' || lower === 'yes';
  // For MEMOS_DISABLE_PASSWORD_LOGIN: true means disabled (bad), false means enabled (good)
  const good = trueIsGood ? on : !on;
  const html = on
    ? `<span class="mm-chip ${good ? 'mm-chip-green' : 'mm-chip-gray'}">true</span>`
    : `<span class="mm-chip ${good ? 'mm-chip-green' : 'mm-chip-gray'}">false</span>`;
  return `<div class="mm-kv"><span class="mm-kv-k">${esc(label)}</span>${html}</div>`;
}

function enabledChip(label, value) {
  if (value == null || value === '') return '';
  const lower = String(value).trim().toLowerCase();
  const on = lower === 'true' || lower === '1' || lower === 'yes';
  const html = on
    ? `<span class="mm-chip mm-chip-green">enabled</span>`
    : `<span class="mm-chip mm-chip-gray">disabled</span>`;
  return `<div class="mm-kv"><span class="mm-kv-k">${esc(label)}</span>${html}</div>`;
}

/** Parse a DSN like driver://user:pass@host/path or /path/to/file.db */
function parseDSN(dsn) {
  if (!dsn) return null;
  if (dsn.includes('://')) {
    try {
      const colonSlash = dsn.indexOf('://');
      const driver = dsn.slice(0, colonSlash);
      const rest = dsn.slice(colonSlash + 3);
      // rest is [user:pass@]host/path
      const atIdx = rest.indexOf('@');
      let hostPath = atIdx === -1 ? rest : rest.slice(atIdx + 1);
      return { driver, display: `${driver}://${esc(hostPath)}`, masked: atIdx !== -1 };
    } catch {
      return { driver: 'unknown', display: '[configured]', masked: true };
    }
  }
  // bare file path
  return { driver: 'sqlite3', display: dsn, masked: false };
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'memos-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const env = parseKV(text);

  // Header
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="mm-badge">Memos</span>
      <span class="mm-title">Memos Config</span>
    </div>
    <div class="mm-sub">Memos self-hosted lightweight note-taking server configuration</div>
  `;
  host.appendChild(header);

  let body = '';

  // Server
  const serverRows = [
    env.MEMOS_PORT ? kv('MEMOS_PORT', env.MEMOS_PORT) : '',
    env.MEMOS_ADDR ? kv('MEMOS_ADDR', env.MEMOS_ADDR) : '',
    env.MEMOS_PUBLIC_URL ? kv('MEMOS_PUBLIC_URL', env.MEMOS_PUBLIC_URL) : '',
    env.MEMOS_MODE != null ? modeChip(env.MEMOS_MODE) : '',
  ].filter(Boolean).join('');
  if (serverRows) body += `<div class="mm-sec"><h3>Server</h3><div class="mm-card">${serverRows}</div></div>`;

  // Database
  let dbRows = '';
  if (env.MEMOS_DRIVER) {
    dbRows += `<div class="mm-kv"><span class="mm-kv-k">MEMOS_DRIVER</span><span class="mm-chip">${esc(env.MEMOS_DRIVER)}</span></div>`;
  }
  if (env.MEMOS_DSN) {
    const parsed = parseDSN(env.MEMOS_DSN);
    if (parsed) {
      if (!env.MEMOS_DRIVER) {
        dbRows += `<div class="mm-kv"><span class="mm-kv-k">MEMOS_DSN (driver)</span><span class="mm-chip">${esc(parsed.driver)}</span></div>`;
      }
      if (parsed.masked) {
        dbRows += `<div class="mm-kv"><span class="mm-kv-k">MEMOS_DSN</span><span class="mm-kv-v">${parsed.display}</span> <span class="mm-masked">(credentials hidden)</span></div>`;
      } else {
        dbRows += kv('MEMOS_DSN', parsed.display);
      }
    }
  }
  if (dbRows) body += `<div class="mm-sec"><h3>Database</h3><div class="mm-card">${dbRows}</div></div>`;

  // Auth
  const authRows = [
    env.MEMOS_SECRET_SESSION_KEY != null ? kv('MEMOS_SECRET_SESSION_KEY', null, true) : '',
    env.MEMOS_DISABLE_PASSWORD_LOGIN != null ? boolChip('MEMOS_DISABLE_PASSWORD_LOGIN', env.MEMOS_DISABLE_PASSWORD_LOGIN, false) : '',
    // Mask any other sensitive keys not already covered
    ...Object.keys(env)
      .filter((k) => isSensitiveKey(k) && k !== 'MEMOS_SECRET_SESSION_KEY' && k.startsWith('MEMOS_'))
      .map((k) => kv(k, null, true)),
  ].filter(Boolean).join('');
  if (authRows) body += `<div class="mm-sec"><h3>Auth</h3><div class="mm-card">${authRows}</div></div>`;

  // Metrics
  const metricsRows = [
    env.MEMOS_METRIC != null ? enabledChip('MEMOS_METRIC', env.MEMOS_METRIC) : '',
  ].filter(Boolean).join('');
  if (metricsRows) body += `<div class="mm-sec"><h3>Metrics</h3><div class="mm-card">${metricsRows}</div></div>`;

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No Memos configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
