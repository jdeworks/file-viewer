import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.komga-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.komga-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1565c0;color:#fff;vertical-align:middle;margin-right:8px;}
.komga-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.komga-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.komga-sec{margin:12px 0;}
.komga-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.komga-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.komga-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;flex-wrap:wrap;}
.komga-key{color:var(--fg-2,#888);font-size:12px;min-width:220px;flex-shrink:0;}
.komga-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.komga-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;background:var(--bg-2,#f6f8fa);color:var(--fg,#24292f);}
.komga-chip-blue{background:#e3f2fd;border-color:#2196f3;color:#0d47a1;}
.komga-chip-green{background:#e8f5e9;border-color:#4caf50;color:#1b5e20;}
.komga-chip-gray{background:var(--bg-2,#f6f8fa);border-color:var(--border,#e0e0e0);color:var(--fg-2,#888);}
.komga-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
`;

function chip(val, cls = '') {
  if (val == null || val === '') return '';
  return `<span class="komga-chip${cls ? ' komga-chip-' + cls : ''}">${esc(String(val))}</span>`;
}

function masked() {
  return '<span class="komga-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="komga-row"><span class="komga-key">${esc(label)}</span><span class="komga-val">${html}</span></div>`;
}

function boolChip(v) {
  if (v === true || v === 'true') return chip('true', 'green');
  if (v === false || v === 'false') return chip('false', 'gray');
  return chip(String(v), 'gray');
}

/** Mask credentials in a JDBC/DSN URL */
function maskUrl(url) {
  if (!url) return '';
  // jdbc:postgresql://user:pass@host/db or postgres://user:pass@host/db
  return String(url).replace(/(\/\/[^:@]*):([^@]*)@/, '$1:[configured]@');
}

export async function render(intake) {
  const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());

  let cfg = {};
  try {
    cfg = (jsyaml.loadAll(text) || [])[0] || {};
  } catch { cfg = {}; }

  const server = cfg.server || {};
  const komga = cfg.komga || {};
  const spring = cfg.spring || {};
  const ds = spring.datasource || {};
  const oauth2 = (spring.security && spring.security.oauth2 && spring.security.oauth2.client && spring.security.oauth2.client.registration) || null;
  const dbBackup = komga.database && komga.database.backup;

  const host = document.createElement('div');
  host.className = 'komga-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const header = document.createElement('div');
  const portStr = server.port ? String(server.port) : '';
  header.innerHTML = `
    <div style="margin-bottom:4px;">
      <span class="komga-badge">Komga</span>
      <span class="komga-title">Komga Comic Server</span>
    </div>
    <div class="komga-sub">Komga comic/manga server configuration${portStr ? ' · port ' + esc(portStr) : ''}</div>
  `;
  host.appendChild(header);

  let body = '';

  // Server section
  const serverRows = [
    server.port != null ? row('server.port', chip(String(server.port), 'blue')) : '',
    server.servlet && server.servlet['context-path'] ? row('server.servlet.context-path', chip(server.servlet['context-path'])) : '',
  ].filter(Boolean).join('');
  if (serverRows) body += `<div class="komga-sec"><h3>Server</h3><div class="komga-card">${serverRows}</div></div>`;

  // Komga section
  const scanCron = komga['libraries-scan-cron'];
  const scanStartup = komga['libraries-scan-startup'];
  const rememberMeKey = komga['remember-me-key'];
  const backupEnabled = dbBackup && dbBackup.enabled != null ? dbBackup.enabled : null;

  const komgaRows = [
    scanCron != null ? row('libraries-scan-cron', chip(String(scanCron))) : '',
    scanStartup != null ? row('libraries-scan-startup', boolChip(scanStartup)) : '',
    backupEnabled != null ? row('database.backup.enabled', boolChip(backupEnabled)) : '',
    rememberMeKey != null ? row('remember-me-key', masked()) : '',
  ].filter(Boolean).join('');
  if (komgaRows) body += `<div class="komga-sec"><h3>Komga</h3><div class="komga-card">${komgaRows}</div></div>`;

  // Database section
  const dbRows = [
    ds.url ? row('spring.datasource.url', chip(maskUrl(String(ds.url)))) : '',
    ds.username != null ? row('spring.datasource.username', chip(String(ds.username))) : '',
    ds.password != null ? row('spring.datasource.password', masked()) : '',
  ].filter(Boolean).join('');
  if (dbRows) body += `<div class="komga-sec"><h3>Database</h3><div class="komga-card">${dbRows}</div></div>`;

  // OAuth2 section
  if (oauth2 && typeof oauth2 === 'object') {
    const providerNames = Object.keys(oauth2);
    if (providerNames.length) {
      const providerChips = providerNames.map((name) => {
        const reg = oauth2[name] || {};
        return chip(name, 'blue') + (reg['client-secret'] != null ? ' ' + masked() : '');
      }).join(' ');
      body += `<div class="komga-sec"><h3>OAuth2 Clients</h3><div class="komga-card"><div class="komga-row"><span class="komga-key">Providers</span><span class="komga-val">${providerChips}</span></div></div></div>`;
    }
  }

  if (!body) {
    body = '<p style="color:var(--fg-2,#888);font-size:13px;">No Komga configuration keys found.</p>';
  }

  const bodyDiv = document.createElement('div');
  bodyDiv.innerHTML = body;
  host.appendChild(bodyDiv);

  return { parentNode: host };
}
