const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sa-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.sa-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#6DB33F;color:#fff;vertical-align:middle;margin-right:8px}
.sa-title{font-size:18px;font-weight:700;margin:0 0 4px}
.sa-sub{font-size:13px;color:var(--fg-2,#888);margin:0 0 16px}
.sa-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:12px 16px;margin:0 0 14px}
.sa-card h3{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-2,#888);margin:0 0 8px}
.sa-table{width:100%;border-collapse:collapse;font-size:13px}
.sa-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.sa-table td:first-child{font-size:12px;color:var(--fg-2,#666);white-space:nowrap;width:45%}
.sa-table td:last-child{font:13px/1.4 ui-monospace,monospace;word-break:break-all}
.sa-list{list-style:none;margin:0;padding:0}
.sa-list li{display:flex;justify-content:space-between;gap:8px;padding:3px 0;border-bottom:1px solid var(--border,#e0e0e0);font-size:12px}
.sa-list li span:first-child{color:var(--fg-2,#666);font-family:ui-monospace,monospace}
.sa-list li span:last-child{font-family:ui-monospace,monospace;color:var(--accent,#0366d6)}
.sa-pill{display:inline-block;padding:1px 7px;border-radius:4px;font-size:11px;font-weight:600;background:#d1fae5;color:#065f46}
`;

const DB_URL_PATTERNS = [
  [/postgresql|postgres/i, 'PostgreSQL'],
  [/mysql/i, 'MySQL'],
  [/mariadb/i, 'MariaDB'],
  [/sqlserver|mssql/i, 'SQL Server'],
  [/oracle/i, 'Oracle'],
  [/h2/i, 'H2'],
  [/sqlite/i, 'SQLite'],
  [/mongodb/i, 'MongoDB'],
  [/redis/i, 'Redis'],
];

function detectDbType(url) {
  for (const [re, label] of DB_URL_PATTERNS) {
    if (re.test(url)) return label;
  }
  return 'Unknown';
}

function parseProps(text) {
  const props = new Map();
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || t.startsWith('!')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim();
    if (!props.has(key)) props.set(key, val); // first wins (profiles can't override here)
  }
  return props;
}

export async function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const props = parseProps(text);

  // Core info
  const appName = props.get('spring.application.name');
  const serverPort = props.get('server.port');
  const profiles = props.get('spring.profiles.active');
  const dsUrl = props.get('spring.datasource.url');
  const cacheType = props.get('spring.cache.type');

  // Logging levels
  const loggingLevels = [...props.entries()]
    .filter(([k]) => k.startsWith('logging.level.'))
    .map(([k, v]) => ({ logger: k.replace('logging.level.', ''), level: v }));

  // Security hints
  const securityEnabled = props.has('spring.security.user.name') || props.has('spring.security.oauth2.client.registration');

  const coreRows = [];
  if (appName) coreRows.push(['Application name', appName]);
  if (serverPort) coreRows.push(['Server port', serverPort]);
  if (profiles) coreRows.push(['Active profiles', profiles]);
  if (dsUrl) coreRows.push(['Database', detectDbType(dsUrl)]);
  if (cacheType) coreRows.push(['Cache type', cacheType]);
  if (securityEnabled) coreRows.push(['Security', 'Configured']);

  let html = '';

  if (coreRows.length) {
    html += `<div class="sa-card"><table class="sa-table"><tbody>${
      coreRows.map(([l, v]) => `<tr><td>${esc(l)}</td><td>${esc(v)}</td></tr>`).join('')
    }</tbody></table></div>`;
  }

  if (loggingLevels.length) {
    html += `<div class="sa-card"><h3>Logging levels (${loggingLevels.length})</h3><ul class="sa-list">${
      loggingLevels.map((e) =>
        `<li><span>${esc(e.logger)}</span><span>${esc(e.level)}</span></li>`
      ).join('')
    }</ul></div>`;
  }

  // All properties table for completeness
  const allRows = [...props.entries()]
    .filter(([k]) => !k.startsWith('logging.level.'))
    .map(([k, v]) => {
      // Redact sensitive values
      const sensitive = /password|secret|token|credential|private.?key/i.test(k);
      return `<tr><td>${esc(k)}</td><td>${sensitive ? '<em style="color:var(--fg-2)">redacted</em>' : esc(v)}</td></tr>`;
    }).join('');

  if (allRows) {
    html += `<div class="sa-card"><h3>All properties</h3><table class="sa-table"><tbody>${allRows}</tbody></table></div>`;
  }

  if (!html) {
    html = '<p style="color:var(--fg-2);font-size:13px">No Spring Boot properties detected.</p>';
  }

  const host = document.createElement('div');
  host.className = 'sa-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="sa-title"><span class="sa-badge">Spring Boot</span>application.properties</div>
${appName ? `<div class="sa-sub">${esc(appName)}${serverPort ? ' · port ' + esc(serverPort) : ''}</div>` : ''}
${html}`;
  return { parentNode: host };
}
