import { parseTOML } from '../../toml.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.lmonk-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.lmonk-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#18a34b;color:#fff;vertical-align:middle;margin-right:8px;}
.lmonk-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.lmonk-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.lmonk-sec{margin:12px 0;}
.lmonk-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.lmonk-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.lmonk-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap;}
.lmonk-key{color:var(--fg-2,#888);font-size:12px;min-width:180px;flex-shrink:0;}
.lmonk-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.lmonk-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
.lmonk-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.lmonk-chip-green{background:#dcfce7;border-color:#4ade80;color:#166534;}
.lmonk-chip-blue{background:#e0f2fe;border-color:#38bdf8;color:#0c4a6e;}
.lmonk-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
`;

const masked = () => '<span class="lmonk-masked">[configured]</span>';
const chip = (val, cls = '') => val != null && val !== '' ? `<span class="lmonk-chip${cls ? ' lmonk-chip-' + cls : ''}">${esc(val)}</span>` : '';

function row(label, html) {
  if (!html) return '';
  return `<div class="lmonk-row"><span class="lmonk-key">${esc(label)}</span><span class="lmonk-val">${html}</span></div>`;
}

export function render(intake) {
  // intake.parsed is never populated at detection/render time, so parse the TOML ourselves.
  let cfg;
  if (intake.parsed && typeof intake.parsed === 'object') {
    cfg = intake.parsed;
  } else {
    try { cfg = parseTOML(intake.text || '') || {}; } catch { cfg = {}; }
  }
  const app = cfg.app || {};
  const db = cfg.db || {};
  const smtpList = Array.isArray(cfg.smtp) ? cfg.smtp : (cfg.smtp ? [cfg.smtp] : []);

  const host = document.createElement('div');
  host.className = 'lmonk-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const title = app.address || 'Listmonk Mailing List';

  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="lmonk-badge">Listmonk</span>
      <span class="lmonk-title">${esc(title)}</span>
    </div>
    <div class="lmonk-sub">Listmonk self-hosted newsletter &amp; mailing list manager</div>
  `;
  host.appendChild(header);

  let body = '';

  // App section
  const appRows = [
    app.address ? row('address', chip(app.address, 'blue')) : '',
    app.batch_size != null ? row('batch_size', chip(String(app.batch_size), 'gray')) : '',
    app.concurrency != null ? row('concurrency', chip(String(app.concurrency), 'gray')) : '',
    app.admin_username ? row('admin_username', chip(app.admin_username)) : '',
    app.admin_password != null ? row('admin_password', masked()) : '',
  ].filter(Boolean).join('');
  if (appRows) body += `<div class="lmonk-sec"><h3>App</h3><div class="lmonk-card">${appRows}</div></div>`;

  // Database section
  const dbRows = [
    db.host ? row('host', chip(db.host, 'blue')) : '',
    db.port != null ? row('port', chip(String(db.port), 'blue')) : '',
    db.database ? row('database', chip(db.database)) : '',
    db.user ? row('user', chip(db.user)) : '',
    db.password != null ? row('password', masked()) : '',
    db.ssl_mode ? row('ssl_mode', chip(db.ssl_mode, 'gray')) : '',
  ].filter(Boolean).join('');
  if (dbRows) body += `<div class="lmonk-sec"><h3>Database</h3><div class="lmonk-card">${dbRows}</div></div>`;

  // SMTP section
  if (smtpList.length > 0) {
    const smtpCards = smtpList.map((s) => {
      const smtpRows = [
        s.enabled != null ? row('enabled', s.enabled ? chip('enabled', 'green') : chip('disabled', 'gray')) : '',
        s.host ? row('host', chip(s.host, 'blue')) : '',
        s.port != null ? row('port', chip(String(s.port), 'blue')) : '',
        s.tls_type ? row('tls_type', chip(s.tls_type, 'gray')) : '',
        s.username ? row('username', chip(s.username)) : '',
        s.password != null ? row('password', masked()) : '',
      ].filter(Boolean).join('');
      return smtpRows ? `<div class="lmonk-card">${smtpRows}</div>` : '';
    }).filter(Boolean).join('');
    if (smtpCards) body += `<div class="lmonk-sec"><h3>SMTP Servers</h3>${smtpCards}</div>`;
  }

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No Listmonk configuration found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
