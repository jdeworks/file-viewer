const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.wmill-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.wmill-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1d4ed8;color:#fff;vertical-align:middle;margin-right:8px;}
.wmill-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.wmill-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.wmill-sec{margin:12px 0;}
.wmill-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.wmill-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.wmill-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap;}
.wmill-key{color:var(--fg-2,#888);font-size:12px;min-width:180px;flex-shrink:0;}
.wmill-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.wmill-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
.wmill-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.wmill-chip-blue{background:#e0f2fe;border-color:#38bdf8;color:#0c4a6e;}
.wmill-chip-green{background:#dcfce7;border-color:#4ade80;color:#166534;}
.wmill-chip-red{background:#fee2e2;border-color:#f87171;color:#991b1b;}
.wmill-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.wmill-runtime-list{list-style:none;margin:4px 0;padding:0;}
.wmill-runtime-list li{font-family:ui-monospace,monospace;font-size:12px;padding:2px 0;}
`;

/** Parse KEY=VALUE env config, skip # comments, strip optional 'export ' prefix */
function parseKV(text) {
  const out = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim().replace(/^export\s+/, '');
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !(key in out)) out[key] = val;
  }
  return out;
}

/** Mask credentials in a DSN/URL: postgres://user:pass@host/db → postgres://user:[configured]@host/db */
function maskDsn(val) {
  if (!val) return '';
  return val.replace(/(\/\/[^:@]*):([^@]*)@/, '$1:[configured]@');
}

const masked = () => '<span class="wmill-masked">[configured]</span>';
const chip = (val, cls = '') => val != null && val !== '' ? `<span class="wmill-chip${cls ? ' wmill-chip-' + cls : ''}">${esc(val)}</span>` : '';

function row(label, html) {
  if (!html) return '';
  return `<div class="wmill-row"><span class="wmill-key">${esc(label)}</span><span class="wmill-val">${html}</span></div>`;
}

export function render(intake) {
  const text = intake.text || '';
  const cfg = parseKV(text);

  const host = document.createElement('div');
  host.className = 'wmill-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const title = cfg.BASE_URL || 'Windmill Config';

  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="wmill-badge">Windmill</span>
      <span class="wmill-title">${esc(title)}</span>
    </div>
    <div class="wmill-sub">Windmill workflow automation platform</div>
  `;
  host.appendChild(header);

  let body = '';

  // Server section
  const modeChip = cfg.MODE ? chip(cfg.MODE, cfg.MODE === 'server' ? 'blue' : cfg.MODE === 'worker' ? 'green' : 'gray') : '';
  const serverRows = [
    cfg.BASE_URL ? row('BASE_URL', chip(cfg.BASE_URL, 'blue')) : '',
    cfg.COOKIE_DOMAIN ? row('COOKIE_DOMAIN', chip(cfg.COOKIE_DOMAIN)) : '',
    cfg.MODE ? row('MODE', modeChip) : '',
    cfg.METRICS_ADDR ? row('METRICS_ADDR', chip(cfg.METRICS_ADDR)) : '',
  ].filter(Boolean).join('');
  if (serverRows) body += `<div class="wmill-sec"><h3>Server</h3><div class="wmill-card">${serverRows}</div></div>`;

  // Security section
  if (cfg.JWT_SECRET != null) {
    body += `<div class="wmill-sec"><h3>Security</h3><div class="wmill-card">${row('JWT_SECRET', masked())}</div></div>`;
  }

  // Database section
  if (cfg.DATABASE_URL) {
    const display = maskDsn(cfg.DATABASE_URL);
    body += `<div class="wmill-sec"><h3>Database</h3><div class="wmill-card">${row('DATABASE_URL', chip(display))}</div></div>`;
  }

  // Workers section
  const disableNsjailVal = cfg.DISABLE_NSJAIL != null
    ? chip(cfg.DISABLE_NSJAIL === 'true' || cfg.DISABLE_NSJAIL === '1' ? 'disabled' : 'enabled',
           cfg.DISABLE_NSJAIL === 'true' || cfg.DISABLE_NSJAIL === '1' ? 'red' : 'green')
    : '';
  const keepJobDirVal = cfg.KEEP_JOB_DIR != null
    ? chip(cfg.KEEP_JOB_DIR === 'true' || cfg.KEEP_JOB_DIR === '1' ? 'true' : 'false',
           cfg.KEEP_JOB_DIR === 'true' || cfg.KEEP_JOB_DIR === '1' ? 'blue' : 'gray')
    : '';
  const workerRows = [
    cfg.NUM_WORKERS ? row('NUM_WORKERS', chip(cfg.NUM_WORKERS, 'gray')) : '',
    cfg.WORKER_TAGS ? row('WORKER_TAGS', chip(cfg.WORKER_TAGS)) : '',
    disableNsjailVal ? row('DISABLE_NSJAIL', disableNsjailVal) : '',
    keepJobDirVal ? row('KEEP_JOB_DIR', keepJobDirVal) : '',
  ].filter(Boolean).join('');
  if (workerRows) body += `<div class="wmill-sec"><h3>Workers</h3><div class="wmill-card">${workerRows}</div></div>`;

  // Runtimes section
  const runtimeKeys = ['DENO_PATH', 'PYTHON_PATH', 'GO_PATH', 'RUST_PATH', 'BASH_PATH'];
  const runtimeItems = runtimeKeys
    .filter((k) => cfg[k])
    .map((k) => `<li><span style="color:var(--fg-2,#888);min-width:110px;display:inline-block;">${esc(k)}</span> ${esc(cfg[k])}</li>`);
  if (runtimeItems.length) {
    body += `<div class="wmill-sec"><h3>Runtimes</h3><div class="wmill-card"><ul class="wmill-runtime-list">${runtimeItems.join('')}</ul></div></div>`;
  }

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No Windmill configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
