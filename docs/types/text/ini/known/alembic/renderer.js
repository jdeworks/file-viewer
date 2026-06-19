const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.alb-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-alb{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1e6fcc;color:#fff;vertical-align:middle;margin-right:8px}
.alb-title{font-size:18px;font-weight:700;margin:0 0 4px}
.alb-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.alb-sec{margin:12px 0}
.alb-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px}
.alb-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin-bottom:8px}
.alb-row{display:flex;gap:8px;font-size:13px;padding:3px 0}
.alb-key{color:var(--fg-2,#888);min-width:130px;flex-shrink:0;font-size:12px}
.alb-val{font-family:ui-monospace,monospace;word-break:break-all}
.alb-url-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#888)}
.alb-sec-pill{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px}
.alb-warn{background:#e3f2fd;border:1px solid #90caf9;border-radius:6px;padding:8px 12px;font-size:12px;color:#1565c0;margin-top:10px}
`;

function parseIni(text) {
  const secs = {};
  let cur = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const sec = line.match(/^\[([^\]]+)\]/);
    if (sec) { cur = sec[1].trim(); secs[cur] = {}; continue; }
    if (cur) {
      const kv = line.match(/^([^=]+)=(.*)/);
      if (kv) {
        const key = kv[1].trim();
        const val = kv[2].trim();
        if (!(key in secs[cur])) secs[cur][key] = val;
      }
    }
  }
  return secs;
}

function maskUrl(url) {
  if (!url) return url;
  // Mask password in URLs like postgresql://user:password@host/db
  return url.replace(/:\/\/([^:@]+):([^@]+)@/, '://$1:***@');
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes);
  const ini = parseIni(text);

  const alembic = ini['alembic'] || {};
  const scriptLocation = alembic['script_location'] || null;
  const rawUrl = alembic['sqlalchemy.url'] || null;
  const maskedUrl = maskUrl(rawUrl);
  const versionTable = alembic['version_table'] || 'alembic_version';
  const versionLocations = alembic['version_locations'] || null;
  const fileTemplate = alembic['file_template'] || null;
  const timezone = alembic['timezone'] || null;
  const truncate = alembic['truncate_slug_length'] || null;
  const recursive = alembic['recursive_version_locations'] || null;

  // Logging sections
  const loggers = ini['loggers'] || {};
  const loggerKeys = (loggers['keys'] || '').split(',').map((s) => s.trim()).filter(Boolean);

  const sectionNames = Object.keys(ini).filter((k) => k !== 'alembic');

  const urlHasPassword = rawUrl && /:\/\/[^:@]+:[^@]+@/.test(rawUrl);

  const mainRows = [
    scriptLocation ? `<div class="alb-row"><span class="alb-key">script_location</span><span class="alb-val">${esc(scriptLocation)}</span></div>` : '',
    rawUrl ? `<div class="alb-row"><span class="alb-key">sqlalchemy.url</span><span class="alb-val ${urlHasPassword ? 'alb-url-masked' : ''}">${esc(maskedUrl)}</span></div>` : '',
    `<div class="alb-row"><span class="alb-key">version_table</span><span class="alb-val">${esc(versionTable)}</span></div>`,
    versionLocations ? `<div class="alb-row"><span class="alb-key">version_locations</span><span class="alb-val">${esc(versionLocations)}</span></div>` : '',
    fileTemplate ? `<div class="alb-row"><span class="alb-key">file_template</span><span class="alb-val">${esc(fileTemplate)}</span></div>` : '',
    timezone ? `<div class="alb-row"><span class="alb-key">timezone</span><span class="alb-val">${esc(timezone)}</span></div>` : '',
  ].filter(Boolean).join('');

  const host = document.createElement('div');
  host.className = 'alb-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="alb-title"><span class="badge-alb">Alembic</span>alembic.ini</div>
<div class="alb-sub">SQLAlchemy database migration configuration</div>
${mainRows ? `<div class="alb-sec"><h3>Configuration</h3><div class="alb-card">${mainRows}</div></div>` : ''}
${loggerKeys.length ? `<div class="alb-sec"><h3>Loggers</h3><div>${loggerKeys.map((k) => `<span class="alb-sec-pill">${esc(k)}</span>`).join('')}</div></div>` : ''}
${sectionNames.length > 1 ? `<div class="alb-sec"><h3>Sections</h3><div>${sectionNames.map((k) => `<span class="alb-sec-pill">${esc(k)}</span>`).join('')}</div></div>` : ''}
${urlHasPassword ? '<div class="alb-warn">Database URL contains a password — masked for display.</div>' : ''}`;
  return { parentNode: host };
}
