const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.minio-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.minio-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#c0202c;color:#fff;vertical-align:middle;margin-right:8px;}
.minio-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.minio-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.minio-sec{margin:12px 0;}
.minio-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.minio-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.minio-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;}
.minio-key{color:var(--fg-2,#888);font-size:12px;min-width:240px;flex-shrink:0;}
.minio-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.minio-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.minio-chip.on{background:#e6f4ea;border-color:#81c784;color:#2e7d32;}
.minio-chip.off{background:#fce8e6;border-color:#e57373;color:#c62828;}
.minio-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
`;

/** Parse KEY=VALUE config, skip # comments and blank lines, strip optional 'export ' prefix */
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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (key && !(key in out)) out[key] = val;
  }
  return out;
}

function chip(val) {
  if (val == null || val === '') return '';
  const s = String(val);
  return `<span class="minio-chip">${esc(s.length > 80 ? s.slice(0, 77) + '…' : s)}</span>`;
}

function boolChip(val) {
  if (val == null || val === '') return '';
  const on = /^(on|true|1|yes|enable|enabled)$/i.test(String(val).trim());
  const label = esc(String(val));
  return `<span class="minio-chip ${on ? 'on' : 'off'}">${label}</span>`;
}

function masked() {
  return '<span class="minio-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="minio-row"><span class="minio-key">${esc(label)}</span><span class="minio-val">${html}</span></div>`;
}

/** Return masked() if key looks sensitive, else chip(val) */
function safeChip(key, val) {
  if (val == null || val === '') return '';
  if (/SECRET|PASSWORD|TOKEN|KEY|API|PRIVATE/i.test(key)) return masked();
  return chip(val);
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'minio-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const text = intake.text || '';
  const cfg = parseKV(text);

  const title = cfg.MINIO_SITE_NAME || cfg.MINIO_VOLUMES || 'MinIO Config';

  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:12px;">
      <span class="minio-badge">MinIO</span>
      <span class="minio-title">${esc(title)}</span>
    </div>
    <p class="minio-sub">MinIO object storage environment-variable configuration</p>
  `;
  host.appendChild(header);

  let body = '';

  // Identity
  const identityRows = [
    cfg.MINIO_VOLUMES != null ? row('MINIO_VOLUMES', chip(cfg.MINIO_VOLUMES)) : '',
    cfg.MINIO_SITE_NAME != null ? row('MINIO_SITE_NAME', chip(cfg.MINIO_SITE_NAME)) : '',
    cfg.MINIO_SITE_REGION != null ? row('MINIO_SITE_REGION', chip(cfg.MINIO_SITE_REGION)) : '',
  ].filter(Boolean).join('');
  if (identityRows) body += `<div class="minio-sec"><h3>Identity</h3><div class="minio-card">${identityRows}</div></div>`;

  // Auth
  const authRows = [
    cfg.MINIO_ROOT_USER != null ? row('MINIO_ROOT_USER', chip(cfg.MINIO_ROOT_USER)) : '',
    cfg.MINIO_ROOT_PASSWORD != null ? row('MINIO_ROOT_PASSWORD', masked()) : '',
  ].filter(Boolean).join('');
  if (authRows) body += `<div class="minio-sec"><h3>Auth</h3><div class="minio-card">${authRows}</div></div>`;

  // Console
  const consoleRows = [
    cfg.MINIO_CONSOLE_ADDRESS != null ? row('MINIO_CONSOLE_ADDRESS', chip(cfg.MINIO_CONSOLE_ADDRESS)) : '',
    cfg.MINIO_BROWSER != null ? row('MINIO_BROWSER', boolChip(cfg.MINIO_BROWSER)) : '',
  ].filter(Boolean).join('');
  if (consoleRows) body += `<div class="minio-sec"><h3>Console</h3><div class="minio-card">${consoleRows}</div></div>`;

  // TLS
  const tlsRows = [
    cfg.MINIO_CERT_FILE != null ? row('MINIO_CERT_FILE', chip(cfg.MINIO_CERT_FILE)) : '',
    cfg.MINIO_KEY_FILE != null ? row('MINIO_KEY_FILE', masked()) : '',
  ].filter(Boolean).join('');
  if (tlsRows) body += `<div class="minio-sec"><h3>TLS</h3><div class="minio-card">${tlsRows}</div></div>`;

  // Erasure Coding
  const erasureRows = [
    cfg.MINIO_ERASURE_SET_DRIVE_COUNT != null ? row('MINIO_ERASURE_SET_DRIVE_COUNT', chip(cfg.MINIO_ERASURE_SET_DRIVE_COUNT)) : '',
  ].filter(Boolean).join('');
  if (erasureRows) body += `<div class="minio-sec"><h3>Erasure Coding</h3><div class="minio-card">${erasureRows}</div></div>`;

  // KMS
  const kmsRows = [
    cfg.MINIO_KMS_SECRET_KEY != null ? row('MINIO_KMS_SECRET_KEY', masked()) : '',
    cfg.MINIO_KMS_KES_ENDPOINT != null ? row('MINIO_KMS_KES_ENDPOINT', chip(cfg.MINIO_KMS_KES_ENDPOINT)) : '',
  ].filter(Boolean).join('');
  if (kmsRows) body += `<div class="minio-sec"><h3>KMS</h3><div class="minio-card">${kmsRows}</div></div>`;

  // Notification
  const notifRows = [
    cfg.MINIO_NOTIFY_WEBHOOK_ENABLE != null ? row('MINIO_NOTIFY_WEBHOOK_ENABLE', boolChip(cfg.MINIO_NOTIFY_WEBHOOK_ENABLE)) : '',
    cfg.MINIO_NOTIFY_KAFKA_ENABLE != null ? row('MINIO_NOTIFY_KAFKA_ENABLE', boolChip(cfg.MINIO_NOTIFY_KAFKA_ENABLE)) : '',
  ].filter(Boolean).join('');
  if (notifRows) body += `<div class="minio-sec"><h3>Notification</h3><div class="minio-card">${notifRows}</div></div>`;

  // Prometheus
  const promRows = [
    cfg.MINIO_PROMETHEUS_AUTH_TYPE != null ? row('MINIO_PROMETHEUS_AUTH_TYPE', chip(cfg.MINIO_PROMETHEUS_AUTH_TYPE)) : '',
  ].filter(Boolean).join('');
  if (promRows) body += `<div class="minio-sec"><h3>Prometheus</h3><div class="minio-card">${promRows}</div></div>`;

  // Other settings (keys not already handled above)
  const knownKeys = new Set([
    'MINIO_VOLUMES', 'MINIO_SITE_NAME', 'MINIO_SITE_REGION',
    'MINIO_ROOT_USER', 'MINIO_ROOT_PASSWORD',
    'MINIO_CONSOLE_ADDRESS', 'MINIO_BROWSER',
    'MINIO_CERT_FILE', 'MINIO_KEY_FILE',
    'MINIO_ERASURE_SET_DRIVE_COUNT',
    'MINIO_KMS_SECRET_KEY', 'MINIO_KMS_KES_ENDPOINT',
    'MINIO_NOTIFY_WEBHOOK_ENABLE', 'MINIO_NOTIFY_KAFKA_ENABLE',
    'MINIO_PROMETHEUS_AUTH_TYPE',
  ]);
  const otherRows = Object.entries(cfg)
    .filter(([k]) => !knownKeys.has(k))
    .map(([k, v]) => row(k, safeChip(k, v)))
    .filter(Boolean)
    .join('');
  if (otherRows) body += `<div class="minio-sec"><h3>Other Settings</h3><div class="minio-card">${otherRows}</div></div>`;

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
