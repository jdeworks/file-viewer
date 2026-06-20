const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sonarqube-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.sonarqube-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#4e9bcd;color:#fff;vertical-align:middle;margin-right:8px;}
.sonarqube-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.sonarqube-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.sonarqube-sec{margin:12px 0;}
.sonarqube-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.sonarqube-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.sonarqube-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap;}
.sonarqube-key{color:var(--fg-2,#888);font-size:12px;min-width:260px;flex-shrink:0;}
.sonarqube-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.sonarqube-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.sonarqube-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.sonarqube-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.sonarqube-chip-orange{background:#fff7ed;border-color:#f97316;color:#c2410c;}
.sonarqube-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
`;

/** Parse Java .properties format: key=value lines, # or ! comments, no quote stripping. */
function parseKV(text) {
  const out = {};
  for (const raw of (text || '').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('!')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim();
    if (key && !(key in out)) out[key] = val;
  }
  return out;
}

function masked() {
  return '<span class="sonarqube-masked">[configured]</span>';
}

function chip(val, cls) {
  if (val == null || val === '') return '';
  const s = String(val);
  return `<span class="sonarqube-chip${cls ? ' sonarqube-chip-' + cls : ''}">${esc(s.length > 80 ? s.slice(0, 77) + '…' : s)}</span>`;
}

function val(v) {
  if (v == null || v === '') return '';
  const s = String(v);
  return `<span class="sonarqube-val">${esc(s.length > 120 ? s.slice(0, 117) + '…' : s)}</span>`;
}

function row(label, html) {
  if (!html) return '';
  return `<div class="sonarqube-row"><span class="sonarqube-key">${esc(label)}</span><span>${html}</span></div>`;
}

/** Mask credentials in JDBC URL: jdbc:postgresql://user:pass@host/db → jdbc:postgresql://[configured]:[configured]@host/db */
function maskJdbcUrl(url) {
  return String(url || '').replace(/(jdbc:[^:]+:\/\/)[^:@/]*:[^@]*@/, '$1[configured]:[configured]@');
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'sonarqube-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const kv = parseKV(intake.text || '');

  const webHost = kv['sonar.web.host'] || '';
  const webPort = kv['sonar.web.port'] || '';
  const titleText = webHost ? `${webHost}${webPort ? ':' + webPort : ''}` : 'SonarQube Server';

  const header = document.createElement('div');
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="sonarqube-badge">SonarQube</span>
      <span class="sonarqube-title">${esc(titleText)}</span>
    </div>
    <div class="sonarqube-sub">SonarQube code quality server configuration</div>
  `;
  host.appendChild(header);

  let body = '';

  // Web
  const webRows = [
    kv['sonar.web.host'] ? row('sonar.web.host', val(kv['sonar.web.host'])) : '',
    kv['sonar.web.port'] ? row('sonar.web.port', chip(kv['sonar.web.port'], 'blue')) : '',
    kv['sonar.web.context'] ? row('sonar.web.context', val(kv['sonar.web.context'])) : '',
    kv['sonar.web.javaAdditionalOpts'] ? row('sonar.web.javaAdditionalOpts', val(kv['sonar.web.javaAdditionalOpts'])) : '',
  ].filter(Boolean).join('');
  if (webRows) body += `<div class="sonarqube-sec"><h3>Web</h3><div class="sonarqube-card">${webRows}</div></div>`;

  // Database
  const jdbcUrl = kv['sonar.jdbc.url'];
  const maskedJdbc = jdbcUrl ? `<span class="sonarqube-val">${esc(maskJdbcUrl(jdbcUrl))}</span>` : '';
  const dbRows = [
    maskedJdbc ? row('sonar.jdbc.url', maskedJdbc) : '',
    kv['sonar.jdbc.username'] ? row('sonar.jdbc.username', val(kv['sonar.jdbc.username'])) : '',
    kv['sonar.jdbc.password'] != null ? row('sonar.jdbc.password', masked()) : '',
    kv['sonar.jdbc.maxActive'] ? row('sonar.jdbc.maxActive', chip(kv['sonar.jdbc.maxActive'], 'blue')) : '',
  ].filter(Boolean).join('');
  if (dbRows) body += `<div class="sonarqube-sec"><h3>Database</h3><div class="sonarqube-card">${dbRows}</div></div>`;

  // Elasticsearch
  const esRows = [
    kv['sonar.search.host'] ? row('sonar.search.host', val(kv['sonar.search.host'])) : '',
    kv['sonar.search.port'] ? row('sonar.search.port', chip(kv['sonar.search.port'], 'blue')) : '',
    kv['sonar.search.javaAdditionalOpts'] ? row('sonar.search.javaAdditionalOpts', val(kv['sonar.search.javaAdditionalOpts'])) : '',
  ].filter(Boolean).join('');
  if (esRows) body += `<div class="sonarqube-sec"><h3>Elasticsearch</h3><div class="sonarqube-card">${esRows}</div></div>`;

  // Log
  const logLevelVal = kv['sonar.log.level'];
  const logLevelChipClass = logLevelVal === 'DEBUG' ? 'orange' : logLevelVal === 'TRACE' ? 'orange' : 'blue';
  const logRows = [
    logLevelVal ? row('sonar.log.level', chip(logLevelVal, logLevelChipClass)) : '',
    kv['sonar.path.logs'] ? row('sonar.path.logs', val(kv['sonar.path.logs'])) : '',
    kv['sonar.log.rollingPolicy'] ? row('sonar.log.rollingPolicy', val(kv['sonar.log.rollingPolicy'])) : '',
  ].filter(Boolean).join('');
  if (logRows) body += `<div class="sonarqube-sec"><h3>Log</h3><div class="sonarqube-card">${logRows}</div></div>`;

  // Authentication
  const forceAuth = kv['sonar.forceAuthentication'];
  const ghEnabled = kv['sonar.auth.github.enabled'];
  const samlEnabled = kv['sonar.auth.saml.enabled'];
  const authRows = [
    forceAuth != null ? row('sonar.forceAuthentication', chip(forceAuth, forceAuth === 'true' ? 'green' : '')) : '',
    ghEnabled != null ? row('sonar.auth.github.enabled', chip(ghEnabled, ghEnabled === 'true' ? 'green' : '')) : '',
    kv['sonar.auth.github.clientId'] ? row('sonar.auth.github.clientId', val(kv['sonar.auth.github.clientId'])) : '',
    kv['sonar.auth.github.clientSecret'] != null ? row('sonar.auth.github.clientSecret', masked()) : '',
    samlEnabled != null ? row('sonar.auth.saml.enabled', chip(samlEnabled, samlEnabled === 'true' ? 'green' : '')) : '',
  ].filter(Boolean).join('');
  if (authRows) body += `<div class="sonarqube-sec"><h3>Authentication</h3><div class="sonarqube-card">${authRows}</div></div>`;

  // Security
  const secRows = [
    kv['sonar.secretKeyPath'] ? row('sonar.secretKeyPath', val(kv['sonar.secretKeyPath'])) : '',
  ].filter(Boolean).join('');
  if (secRows) body += `<div class="sonarqube-sec"><h3>Security</h3><div class="sonarqube-card">${secRows}</div></div>`;

  // Paths
  const pathRows = [
    kv['sonar.path.data'] ? row('sonar.path.data', val(kv['sonar.path.data'])) : '',
    kv['sonar.path.temp'] ? row('sonar.path.temp', val(kv['sonar.path.temp'])) : '',
  ].filter(Boolean).join('');
  if (pathRows) body += `<div class="sonarqube-sec"><h3>Paths</h3><div class="sonarqube-card">${pathRows}</div></div>`;

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No SonarQube server configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
