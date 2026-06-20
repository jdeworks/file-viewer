const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.n8n-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.n8n-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e74c3c;color:#fff;vertical-align:middle;margin-right:8px;}
.n8n-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.n8n-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.n8n-sec{margin:12px 0;}
.n8n-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.n8n-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.n8n-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap;}
.n8n-key{color:var(--fg-2,#888);font-size:12px;min-width:220px;flex-shrink:0;}
.n8n-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.n8n-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.n8n-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.n8n-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.n8n-chip-red{background:#ffebee;border-color:#f44336;color:#b71c1c;}
.n8n-chip-orange{background:#fff3e0;border-color:#ff9800;color:#e65100;}
.n8n-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.n8n-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
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

function chip(val, cls) {
  if (val == null || val === '') return '';
  return `<span class="n8n-chip${cls ? ' n8n-chip-' + cls : ''}">${esc(val)}</span>`;
}

function masked() {
  return '<span class="n8n-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="n8n-row"><span class="n8n-key">${esc(label)}</span><span class="n8n-val">${html}</span></div>`;
}

function boolChip(v, trueLabel, trueColor, falseLabel, falseColor) {
  const lower = (v || '').trim().toLowerCase();
  if (lower === 'true' || lower === '1' || lower === 'yes') return chip(trueLabel || 'true', trueColor || 'green');
  if (lower === 'false' || lower === '0' || lower === 'no') return chip(falseLabel || 'false', falseColor || 'gray');
  return chip(v, 'gray');
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'n8n-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const cfg = parseKV(text);

  const title = cfg.WEBHOOK_URL || (cfg.N8N_HOST
    ? `${cfg.N8N_PROTOCOL || 'http'}://${cfg.N8N_HOST}:${cfg.N8N_PORT || 5678}`
    : 'n8n Workflow Automation');

  // Header
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="n8n-badge">n8n</span>
      <span class="n8n-title">${esc(title)}</span>
    </div>
    <div class="n8n-sub">n8n workflow automation server configuration</div>
  `;
  host.appendChild(header);

  let body = '';

  // Server
  const serverRows = [
    cfg.N8N_HOST ? row('N8N_HOST', chip(cfg.N8N_HOST, 'blue')) : '',
    cfg.N8N_PORT ? row('N8N_PORT', chip(cfg.N8N_PORT, 'blue')) : '',
    cfg.N8N_PROTOCOL ? row('N8N_PROTOCOL', chip(cfg.N8N_PROTOCOL)) : '',
    cfg.WEBHOOK_URL ? row('WEBHOOK_URL', chip(cfg.WEBHOOK_URL, 'blue')) : '',
  ].filter(Boolean).join('');
  if (serverRows) body += `<div class="n8n-sec"><h3>Server</h3><div class="n8n-card">${serverRows}</div></div>`;

  // Auth
  const authRows = [
    cfg.N8N_BASIC_AUTH_ACTIVE != null ? row('N8N_BASIC_AUTH_ACTIVE', boolChip(cfg.N8N_BASIC_AUTH_ACTIVE, 'enabled', 'orange', 'disabled', 'gray')) : '',
    cfg.N8N_BASIC_AUTH_USER ? row('N8N_BASIC_AUTH_USER', chip(cfg.N8N_BASIC_AUTH_USER)) : '',
    cfg.N8N_BASIC_AUTH_PASSWORD != null ? row('N8N_BASIC_AUTH_PASSWORD', masked()) : '',
    cfg.N8N_ENCRYPTION_KEY != null ? row('N8N_ENCRYPTION_KEY', masked()) : '',
  ].filter(Boolean).join('');
  if (authRows) body += `<div class="n8n-sec"><h3>Auth</h3><div class="n8n-card">${authRows}</div></div>`;

  // Database
  const dbRows = [
    cfg.DB_TYPE ? row('DB_TYPE', chip(cfg.DB_TYPE, 'blue')) : '',
    cfg.DB_POSTGRESDB_HOST ? row('DB_POSTGRESDB_HOST', chip(cfg.DB_POSTGRESDB_HOST)) : '',
    cfg.DB_POSTGRESDB_PORT ? row('DB_POSTGRESDB_PORT', chip(cfg.DB_POSTGRESDB_PORT, 'blue')) : '',
    cfg.DB_POSTGRESDB_DATABASE ? row('DB_POSTGRESDB_DATABASE', chip(cfg.DB_POSTGRESDB_DATABASE)) : '',
    cfg.DB_POSTGRESDB_USER ? row('DB_POSTGRESDB_USER', chip(cfg.DB_POSTGRESDB_USER)) : '',
    cfg.DB_POSTGRESDB_PASSWORD != null ? row('DB_POSTGRESDB_PASSWORD', masked()) : '',
  ].filter(Boolean).join('');
  if (dbRows) body += `<div class="n8n-sec"><h3>Database</h3><div class="n8n-card">${dbRows}</div></div>`;

  // Execution
  const execRows = [
    cfg.EXECUTIONS_PROCESS ? row('EXECUTIONS_PROCESS', chip(cfg.EXECUTIONS_PROCESS)) : '',
    cfg.EXECUTIONS_DATA_MAX_AGE ? row('EXECUTIONS_DATA_MAX_AGE', chip(cfg.EXECUTIONS_DATA_MAX_AGE)) : '',
    cfg.EXECUTIONS_DATA_PRUNE != null ? row('EXECUTIONS_DATA_PRUNE', boolChip(cfg.EXECUTIONS_DATA_PRUNE, 'enabled', 'green', 'disabled', 'gray')) : '',
  ].filter(Boolean).join('');
  if (execRows) body += `<div class="n8n-sec"><h3>Execution</h3><div class="n8n-card">${execRows}</div></div>`;

  // Logging
  const logRows = [
    cfg.N8N_LOG_LEVEL ? row('N8N_LOG_LEVEL', chip(cfg.N8N_LOG_LEVEL, 'blue')) : '',
    cfg.N8N_LOG_OUTPUT ? row('N8N_LOG_OUTPUT', chip(cfg.N8N_LOG_OUTPUT)) : '',
  ].filter(Boolean).join('');
  if (logRows) body += `<div class="n8n-sec"><h3>Logging</h3><div class="n8n-card">${logRows}</div></div>`;

  // Features
  const featRows = [
    cfg.N8N_METRICS != null ? row('N8N_METRICS', boolChip(cfg.N8N_METRICS, 'enabled', 'green', 'disabled', 'gray')) : '',
    cfg.N8N_PUSH_BACKEND ? row('N8N_PUSH_BACKEND', chip(cfg.N8N_PUSH_BACKEND)) : '',
  ].filter(Boolean).join('');
  if (featRows) body += `<div class="n8n-sec"><h3>Features</h3><div class="n8n-card">${featRows}</div></div>`;

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No n8n configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
