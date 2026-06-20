import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.say-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.say-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#6DB33F;color:#fff;vertical-align:middle;margin-right:8px}
.say-title{font-size:18px;font-weight:700;margin:0 0 4px}
.say-sub{font-size:13px;color:var(--fg-2,#888);margin:0 0 16px}
.say-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:12px 16px;margin:0 0 14px}
.say-card h3{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-2,#888);margin:0 0 8px}
.say-table{width:100%;border-collapse:collapse;font-size:13px}
.say-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.say-table td:first-child{font-size:12px;color:var(--fg-2,#666);white-space:nowrap;width:45%}
.say-table td:last-child{font:13px/1.4 ui-monospace,monospace;word-break:break-all}
.say-list{list-style:none;margin:0;padding:0}
.say-list li{display:flex;justify-content:space-between;gap:8px;padding:3px 0;border-bottom:1px solid var(--border,#e0e0e0);font-size:12px}
.say-list li span:first-child{color:var(--fg-2,#666);font-family:ui-monospace,monospace}
.say-list li span:last-child{font-family:ui-monospace,monospace;color:var(--accent,#0366d6)}
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

// Flatten nested YAML into dot-notation keys
function flatten(obj, prefix = '') {
  const out = {};
  if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) {
    if (prefix) out[prefix] = obj;
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? prefix + '.' + k : k;
    if (v != null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}

export async function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());

  let parsed;
  try {
    parsed = (jsYaml.loadAll(text) || [])[0];
  } catch {
    parsed = null;
  }

  const flat = parsed ? flatten(parsed) : {};

  const appName = flat['spring.application.name'];
  const serverPort = flat['server.port'];
  const profiles = flat['spring.profiles.active'];
  const dsUrl = flat['spring.datasource.url'];
  const cacheType = flat['spring.cache.type'];
  const securityEnabled = 'spring.security.user.name' in flat || 'spring.security.oauth2.client.registration' in flat;

  // Logging levels
  const loggingLevels = Object.entries(flat)
    .filter(([k]) => k.startsWith('logging.level.'))
    .map(([k, v]) => ({ logger: k.replace('logging.level.', ''), level: String(v) }));

  const coreRows = [];
  if (appName) coreRows.push(['Application name', String(appName)]);
  if (serverPort) coreRows.push(['Server port', String(serverPort)]);
  if (profiles) coreRows.push(['Active profiles', Array.isArray(profiles) ? profiles.join(', ') : String(profiles)]);
  if (dsUrl) coreRows.push(['Database', detectDbType(String(dsUrl))]);
  if (cacheType) coreRows.push(['Cache type', String(cacheType)]);
  if (securityEnabled) coreRows.push(['Security', 'Configured']);

  let html = '';

  if (coreRows.length) {
    html += `<div class="say-card"><table class="say-table"><tbody>${
      coreRows.map(([l, v]) => `<tr><td>${esc(l)}</td><td>${esc(v)}</td></tr>`).join('')
    }</tbody></table></div>`;
  }

  if (loggingLevels.length) {
    html += `<div class="say-card"><h3>Logging levels (${loggingLevels.length})</h3><ul class="say-list">${
      loggingLevels.map((e) =>
        `<li><span>${esc(e.logger)}</span><span>${esc(e.level)}</span></li>`
      ).join('')
    }</ul></div>`;
  }

  // All flattened keys
  const allRows = Object.entries(flat)
    .filter(([k]) => !k.startsWith('logging.level.'))
    .map(([k, v]) => {
      const sensitive = /password|secret|token|credential|private.?key/i.test(k);
      const display = Array.isArray(v) ? v.join(', ') : String(v == null ? '' : v);
      return `<tr><td>${esc(k)}</td><td>${sensitive ? '<em style="color:var(--fg-2)">redacted</em>' : esc(display)}</td></tr>`;
    }).join('');

  if (allRows) {
    html += `<div class="say-card"><h3>All properties</h3><table class="say-table"><tbody>${allRows}</tbody></table></div>`;
  }

  if (!html) {
    html = '<p style="color:var(--fg-2);font-size:13px">No Spring Boot properties detected.</p>';
  }

  const filename = intake.name || intake.filename || 'application.yml';
  const host = document.createElement('div');
  host.className = 'say-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="say-title"><span class="say-badge">Spring Boot</span>${esc(filename)}</div>
${appName ? `<div class="say-sub">${esc(String(appName))}${serverPort ? ' · port ' + esc(String(serverPort)) : ''}</div>` : ''}
${html}`;
  return { parentNode: host };
}
