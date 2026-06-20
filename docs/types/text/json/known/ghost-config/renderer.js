const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ghost-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.ghost-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#15171a;color:#fff;vertical-align:middle;margin-right:8px;}
.ghost-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ghost-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ghost-sec{margin:12px 0;}
.ghost-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.ghost-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.ghost-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;}
.ghost-key{color:var(--fg-2,#888);font-size:12px;min-width:180px;flex-shrink:0;}
.ghost-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.ghost-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.ghost-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
`;

function chip(val) {
  if (val == null || val === '') return '';
  return `<span class="ghost-chip">${esc(String(val))}</span>`;
}

function masked() {
  return '<span class="ghost-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="ghost-row"><span class="ghost-key">${esc(label)}</span><span class="ghost-val">${html}</span></div>`;
}

function isSensitive(key) {
  return /password|pass$|^pass/i.test(key);
}

function getDeep(obj, ...keys) {
  let cur = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[k];
  }
  return cur;
}

export function render(intake) {
  let cfg = {};
  try { cfg = intake.parsed || JSON.parse(intake.text || '{}'); } catch { cfg = {}; }

  const host = document.createElement('div');
  host.className = 'ghost-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const server = cfg.server || {};
  const db = cfg.database || {};
  const mail = cfg.mail || {};
  const storage = cfg.storage || {};
  const logging = cfg.logging || {};
  const privacy = cfg.privacy || {};

  const siteUrl = server.url || cfg.url || '';
  const title = siteUrl || 'Ghost CMS Config';

  // Header
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:12px;">
      <span class="ghost-badge">Ghost</span>
      <span class="ghost-title">${esc(title)}</span>
    </div>
    <p class="ghost-sub">Ghost CMS configuration</p>
  `;
  host.appendChild(header);

  let body = '';

  // Server section
  const serverRows = [
    server.host != null ? row('host', chip(server.host)) : '',
    server.port != null ? row('port', chip(server.port)) : '',
    (server.url || cfg.url) ? row('url', chip(server.url || cfg.url)) : '',
  ].filter(Boolean).join('');
  if (serverRows) body += `<div class="ghost-sec"><h3>Server</h3><div class="ghost-card">${serverRows}</div></div>`;

  // Database section
  const dbConn = db.connection || {};
  const dbClient = db.client || '';
  const dbRows = [
    dbClient ? row('client / type', chip(dbClient)) : '',
    dbConn.database || dbConn.filename ? row('database', chip(dbConn.database || dbConn.filename)) : '',
    dbConn.host ? row('host', chip(dbConn.host)) : '',
    dbConn.port != null ? row('port', chip(dbConn.port)) : '',
    dbConn.user ? row('user', chip(dbConn.user)) : '',
    dbConn.password != null ? row('password', masked()) : '',
    (dbConn.pass != null && dbConn.password == null) ? row('pass', masked()) : '',
  ].filter(Boolean).join('');
  if (dbRows) body += `<div class="ghost-sec"><h3>Database</h3><div class="ghost-card">${dbRows}</div></div>`;

  // Mail section
  const mailOpts = mail.options || {};
  const mailAuth = mailOpts.auth || {};
  const mailRows = [
    mail.transport ? row('transport', chip(mail.transport)) : '',
    mailOpts.host ? row('host', chip(mailOpts.host)) : '',
    mailOpts.port != null ? row('port', chip(mailOpts.port)) : '',
    mailAuth.user ? row('user', chip(mailAuth.user)) : '',
    mailAuth.pass != null ? row('pass', masked()) : '',
    (mailOpts.password != null) ? row('password', masked()) : '',
  ].filter(Boolean).join('');
  if (mailRows) body += `<div class="ghost-sec"><h3>Mail</h3><div class="ghost-card">${mailRows}</div></div>`;

  // Storage section
  const activeAdapter = storage.active || '';
  if (activeAdapter) {
    body += `<div class="ghost-sec"><h3>Storage</h3><div class="ghost-card">${row('active storage adapter', chip(activeAdapter))}</div></div>`;
  }

  // Logging section
  const logRows = [
    logging.level ? row('level', chip(logging.level)) : '',
    logging.rotation != null ? row('rotation', chip(JSON.stringify(logging.rotation))) : '',
    (Array.isArray(logging.transports) && logging.transports.length) ? row('transports', logging.transports.map(chip).join('')) : '',
  ].filter(Boolean).join('');
  if (logRows) body += `<div class="ghost-sec"><h3>Logging</h3><div class="ghost-card">${logRows}</div></div>`;

  // Privacy section
  const privacyKeys = Object.keys(privacy);
  if (privacyKeys.length) {
    const privRows = privacyKeys.map((k) => {
      const v = privacy[k];
      return row(k, chip(typeof v === 'boolean' ? String(v) : JSON.stringify(v)));
    }).join('');
    body += `<div class="ghost-sec"><h3>Privacy</h3><div class="ghost-card">${privRows}</div></div>`;
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
