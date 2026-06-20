// Enhanced liquibase.properties viewer.
// Shows database URL (host only), username, changeLogFile, driver. Masks password.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.lq-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-lq{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1565c0;color:#fff;vertical-align:middle;margin-right:8px}
.lq-title{font-size:18px;font-weight:700;margin:0 0 4px}
.lq-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.lq-sec{margin:12px 0}
.lq-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px}
.lq-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin-bottom:8px}
.lq-row{display:flex;gap:8px;font-size:13px;padding:3px 0;border-bottom:1px solid var(--border,#f0f0f0)}
.lq-row:last-child{border-bottom:none}
.lq-key{color:var(--fg-2,#888);min-width:160px;flex-shrink:0;font-size:12px}
.lq-val{font-family:ui-monospace,monospace;word-break:break-all}
.lq-val.masked{color:var(--fg-2,#aaa)}
.lq-warn{background:#fff8e1;border:1px solid #ffe082;border-radius:6px;padding:8px 12px;font-size:12px;color:#5d4037;margin-top:8px}
.lq-info{background:#e3f2fd;border:1px solid #90caf9;border-radius:6px;padding:8px 12px;font-size:12px;color:#0d47a1;margin-top:8px}
`;

function parseProps(text) {
  const props = new Map();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('!')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim();
    if (!props.has(key)) props.set(key, val);
  }
  return props;
}

function maskUrl(url) {
  if (!url) return url;
  // Mask password: jdbc:xxx://user:password@host or //user:pass@host
  return url.replace(/:\/\/([^:@/?]+):([^@/?]+)@/, '://$1:***@');
}

function extractHost(url) {
  if (!url) return null;
  // Extract host from jdbc:xxx://[user:pass@]host[:port]/db
  const m = url.match(/:\/\/(?:[^@/?]+@)?([^/:?]+)/);
  return m ? m[1] : null;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const name = (intake.filename || intake.name || 'liquibase.properties').split('/').pop();
  const props = parseProps(text);

  const rawUrl = props.get('url') || props.get('liquibase.url');
  const maskedUrl = maskUrl(rawUrl);
  const urlHost = extractHost(rawUrl);
  const hasPassword = rawUrl && /:\/\/[^:@/?]+:[^@/?]+@/.test(rawUrl);

  const username = props.get('username') || props.get('liquibase.username');
  const rawPassword = props.get('password') || props.get('liquibase.password');
  const changeLogFile = props.get('changeLogFile') || props.get('liquibase.changeLogFile');
  const driver = props.get('driver') || props.get('liquibase.driver');
  const referenceUrl = props.get('referenceUrl') || props.get('liquibase.referenceUrl');
  const defaultSchemaName = props.get('defaultSchemaName') || props.get('liquibase.defaultSchemaName');
  const liquibaseSchemaName = props.get('liquibaseSchemaName') || props.get('liquibase.liquibaseSchemaName');
  const logLevel = props.get('logLevel') || props.get('liquibase.logLevel');

  const connRows = [
    rawUrl ? `<div class="lq-row"><span class="lq-key">url</span><span class="lq-val ${hasPassword ? 'masked' : ''}">${esc(maskedUrl)}</span></div>` : '',
    urlHost ? `<div class="lq-row"><span class="lq-key">host</span><span class="lq-val">${esc(urlHost)}</span></div>` : '',
    username ? `<div class="lq-row"><span class="lq-key">username</span><span class="lq-val">${esc(username)}</span></div>` : '',
    rawPassword != null ? `<div class="lq-row"><span class="lq-key">password</span><span class="lq-val masked">••••••••</span></div>` : '',
    driver ? `<div class="lq-row"><span class="lq-key">driver</span><span class="lq-val">${esc(driver)}</span></div>` : '',
  ].filter(Boolean).join('');

  const migrationRows = [
    changeLogFile ? `<div class="lq-row"><span class="lq-key">changeLogFile</span><span class="lq-val">${esc(changeLogFile)}</span></div>` : '',
    defaultSchemaName ? `<div class="lq-row"><span class="lq-key">defaultSchemaName</span><span class="lq-val">${esc(defaultSchemaName)}</span></div>` : '',
    liquibaseSchemaName ? `<div class="lq-row"><span class="lq-key">liquibaseSchemaName</span><span class="lq-val">${esc(liquibaseSchemaName)}</span></div>` : '',
    referenceUrl ? `<div class="lq-row"><span class="lq-key">referenceUrl</span><span class="lq-val">${esc(maskUrl(referenceUrl))}</span></div>` : '',
    logLevel ? `<div class="lq-row"><span class="lq-key">logLevel</span><span class="lq-val">${esc(logLevel)}</span></div>` : '',
  ].filter(Boolean).join('');

  const passwordNote = (rawPassword != null || hasPassword)
    ? '<div class="lq-warn">Credentials detected — password masked for display. Use environment variables or a secrets manager in production.</div>'
    : '';

  const host = document.createElement('div');
  host.className = 'lq-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="lq-title"><span class="badge-lq">Liquibase</span>${esc(name)}</div>
<div class="lq-sub">Database migration configuration</div>
${connRows ? `<div class="lq-sec"><h3>Connection</h3><div class="lq-card">${connRows}</div></div>` : ''}
${migrationRows ? `<div class="lq-sec"><h3>Migration</h3><div class="lq-card">${migrationRows}</div></div>` : ''}
${passwordNote}`;
  return { parentNode: host };
}
