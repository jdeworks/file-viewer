const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.fbrowser-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.fbrowser-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#3d72d7;color:#fff;vertical-align:middle;margin-right:8px;}
.fbrowser-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.fbrowser-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.fbrowser-sec{margin:12px 0;}
.fbrowser-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.fbrowser-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.fbrowser-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;}
.fbrowser-key{color:var(--fg-2,#888);font-size:12px;min-width:160px;flex-shrink:0;}
.fbrowser-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.fbrowser-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:#dbeafe;border:1px solid #93c5fd;color:#1e3a8a;font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.fbrowser-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
`;

function chip(val) {
  if (val == null || val === '') return '';
  return `<span class="fbrowser-chip">${esc(String(val))}</span>`;
}

function masked() {
  return '<span class="fbrowser-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="fbrowser-row"><span class="fbrowser-key">${esc(label)}</span><span class="fbrowser-val">${html}</span></div>`;
}

function isSensitive(key) {
  return /secret|password|passwd|token|api[_-]?key|private/i.test(key);
}

export function render(intake) {
  let cfg = {};
  try { cfg = intake.parsed || JSON.parse(intake.text || '{}'); } catch { cfg = {}; }

  const host = document.createElement('div');
  host.className = 'fbrowser-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  // ── Server section ──
  const addr = cfg.address != null ? String(cfg.address) : '';
  const port = cfg.port != null ? String(cfg.port) : '';
  const baseURL = cfg.baseURL != null ? String(cfg.baseURL) : '';
  const root = cfg.root != null ? String(cfg.root) : '';

  const serverRows = [
    row('address', addr ? esc(addr) : ''),
    row('port', port ? esc(port) : ''),
    row('baseURL', baseURL ? esc(baseURL) : ''),
    row('root', root ? esc(root) : ''),
  ].filter(Boolean).join('');

  const serverHtml = serverRows ? `
<div class="fbrowser-sec"><h3>Server</h3>
<div class="fbrowser-card">${serverRows}</div>
</div>` : '';

  // ── Database section ──
  const database = cfg.database != null ? String(cfg.database) : '';
  const databaseHtml = database ? `
<div class="fbrowser-sec"><h3>Database</h3>
<div class="fbrowser-card">${row('database', esc(database))}</div>
</div>` : '';

  // ── Auth section ──
  const auth = cfg.auth || {};
  const authMethod = auth.method != null ? String(auth.method) : '';
  const authHeader = auth.header != null ? String(auth.header) : '';

  const authRows = [
    authMethod ? row('method', chip(authMethod)) : '',
    (authMethod === 'proxy' && authHeader) ? row('header', esc(authHeader)) : '',
  ].filter(Boolean).join('');

  const authHtml = authRows ? `
<div class="fbrowser-sec"><h3>Auth</h3>
<div class="fbrowser-card">${authRows}</div>
</div>` : '';

  // ── TLS section ──
  const tls = cfg.tls || {};
  const tlsCert = tls.cert != null ? String(tls.cert) : '';
  const tlsKey = tls.key != null ? String(tls.key) : '';

  const tlsRows = [
    tlsCert ? row('cert', esc(tlsCert)) : '',
    tlsKey ? row('key', esc(tlsKey)) : '',
  ].filter(Boolean).join('');

  const tlsHtml = tlsRows ? `
<div class="fbrowser-sec"><h3>TLS</h3>
<div class="fbrowser-card">${tlsRows}</div>
</div>` : '';

  // ── Settings section ──
  const username = cfg.username != null ? String(cfg.username) : '';
  const password = cfg.password != null ? cfg.password : null;
  const log = cfg.log != null ? String(cfg.log) : '';

  const settingsRows = [
    username ? row('username', esc(username)) : '',
    password != null ? row('password', masked()) : '',
    log ? row('log', chip(log)) : '',
  ].filter(Boolean).join('');

  const settingsHtml = settingsRows ? `
<div class="fbrowser-sec"><h3>Settings</h3>
<div class="fbrowser-card">${settingsRows}</div>
</div>` : '';

  // ── Recaptcha section ──
  const recaptcha = cfg.recaptcha || {};
  const recaptchaKey = recaptcha.key != null ? recaptcha.key : null;
  const recaptchaSecret = recaptcha.secret != null ? recaptcha.secret : null;

  const recaptchaRows = [
    recaptchaKey != null ? row('recaptcha.key', masked()) : '',
    recaptchaSecret != null ? row('recaptcha.secret', masked()) : '',
  ].filter(Boolean).join('');

  const recaptchaHtml = recaptchaRows ? `
<div class="fbrowser-sec"><h3>Recaptcha</h3>
<div class="fbrowser-card">${recaptchaRows}</div>
</div>` : '';

  // ── Build subtitle ──
  const subParts = [];
  if (addr || port) subParts.push(`${addr || ''}${port ? ':' + port : ''}`);
  if (root) subParts.push(root);
  if (authMethod) subParts.push(`auth: ${authMethod}`);

  const inner = document.createElement('div');
  inner.innerHTML = `
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="fbrowser-badge">File Browser</span>
  <span class="fbrowser-title">Web File Manager Configuration</span>
</div>
<div class="fbrowser-sub">${esc(subParts.join(' · '))}</div>
${serverHtml}${databaseHtml}${authHtml}${tlsHtml}${settingsHtml}${recaptchaHtml}`.trim();

  host.appendChild(inner);
  return { parentNode: host };
}
