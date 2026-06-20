const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.mm-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.mm-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1e2433;color:#fff;vertical-align:middle;margin-right:8px;}
.mm-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.mm-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.mm-sec{margin:12px 0;}
.mm-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.mm-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.mm-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;}
.mm-key{color:var(--fg-2,#888);font-size:12px;min-width:220px;flex-shrink:0;}
.mm-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.mm-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.mm-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
`;

function chip(val) {
  if (val == null || val === '') return '';
  const s = String(val);
  return `<span class="mm-chip">${esc(s.length > 80 ? s.slice(0, 77) + '…' : s)}</span>`;
}

function masked() {
  return '<span class="mm-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="mm-row"><span class="mm-key">${esc(label)}</span><span class="mm-val">${html}</span></div>`;
}

/** Mask password from a DSN like postgres://user:pass@host/db */
function maskDsn(val) {
  if (!val) return '';
  return val.replace(/(\/\/[^:@]*):([^@]*)@/, '$1:[configured]@');
}

/** Extract host+db from a DSN without exposing the password */
function dsnSummary(val) {
  if (!val) return '';
  const masked = maskDsn(val);
  return masked.length > 80 ? masked.slice(0, 77) + '…' : masked;
}

export function render(intake) {
  let parsed = {};
  try { parsed = intake.parsed || JSON.parse(intake.text || '{}'); } catch { parsed = {}; }

  const host = document.createElement('div');
  host.className = 'mm-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const svc = parsed.ServiceSettings || {};
  const sql = parsed.SqlSettings || {};
  const files = parsed.FileSettings || {};
  const email = parsed.EmailSettings || {};
  const team = parsed.TeamSettings || {};
  const log = parsed.LogSettings || {};

  const title = svc.SiteURL || team.SiteName || 'Mattermost Config';

  // Header
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:12px;">
      <span class="mm-badge">Mattermost</span>
      <span class="mm-title">${esc(title)}</span>
    </div>
    <p class="mm-sub">Mattermost team messaging server configuration</p>
  `;
  host.appendChild(header);

  let body = '';

  // Service section
  const svcRows = [
    svc.SiteURL ? row('SiteURL', chip(svc.SiteURL)) : '',
    svc.ListenAddress ? row('ListenAddress', chip(svc.ListenAddress)) : '',
    svc.EnableAPIv3 != null ? row('EnableAPIv3', chip(String(svc.EnableAPIv3))) : '',
    svc.ConnectionSecurity ? row('ConnectionSecurity', chip(svc.ConnectionSecurity)) : '',
  ].filter(Boolean).join('');
  if (svcRows) body += `<div class="mm-sec"><h3>Service</h3><div class="mm-card">${svcRows}</div></div>`;

  // Database section
  const dsn = sql.DataSource || '';
  const sqlRows = [
    sql.DriverName ? row('DriverName', chip(sql.DriverName)) : '',
    dsn ? row('DataSource', chip(dsnSummary(dsn))) : '',
  ].filter(Boolean).join('');
  if (sqlRows) body += `<div class="mm-sec"><h3>Database</h3><div class="mm-card">${sqlRows}</div></div>`;

  // Files section
  const filesRows = [
    files.DriverName ? row('DriverName', chip(files.DriverName)) : '',
    files.AmazonS3Bucket ? row('AmazonS3Bucket', chip(files.AmazonS3Bucket)) : '',
    files.AmazonS3AccessKeyId ? row('AmazonS3AccessKeyId', chip(files.AmazonS3AccessKeyId)) : '',
    files.AmazonS3SecretAccessKey != null ? row('AmazonS3SecretAccessKey', masked()) : '',
  ].filter(Boolean).join('');
  if (filesRows) body += `<div class="mm-sec"><h3>Files</h3><div class="mm-card">${filesRows}</div></div>`;

  // Email section
  const emailRows = [
    email.SMTPServer ? row('SMTPServer', chip(email.SMTPServer)) : '',
    email.SMTPPort != null ? row('SMTPPort', chip(email.SMTPPort)) : '',
    email.SMTPUsername ? row('SMTPUsername', chip(email.SMTPUsername)) : '',
    email.SMTPPassword != null ? row('SMTPPassword', masked()) : '',
    email.EnableSMTPAuth != null ? row('EnableSMTPAuth', chip(String(email.EnableSMTPAuth))) : '',
  ].filter(Boolean).join('');
  if (emailRows) body += `<div class="mm-sec"><h3>Email</h3><div class="mm-card">${emailRows}</div></div>`;

  // Team section
  const teamRows = [
    team.SiteName ? row('SiteName', chip(team.SiteName)) : '',
    team.MaxUsersPerTeam != null ? row('MaxUsersPerTeam', chip(team.MaxUsersPerTeam)) : '',
    team.EnableOpenServer != null ? row('EnableOpenServer', chip(String(team.EnableOpenServer))) : '',
  ].filter(Boolean).join('');
  if (teamRows) body += `<div class="mm-sec"><h3>Team</h3><div class="mm-card">${teamRows}</div></div>`;

  // Logging section
  const logRows = [
    log.EnableFile != null ? row('EnableFile', chip(String(log.EnableFile))) : '',
    log.FileLevel ? row('FileLevel', chip(log.FileLevel)) : '',
    log.FileLocation ? row('FileLocation', chip(log.FileLocation)) : '',
  ].filter(Boolean).join('');
  if (logRows) body += `<div class="mm-sec"><h3>Logging</h3><div class="mm-card">${logRows}</div></div>`;

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
