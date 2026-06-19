const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.asp-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-asp{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#512bd4;color:#fff;vertical-align:middle;margin-right:8px}
.asp-title{font-size:18px;font-weight:700;margin:0 0 4px}
.asp-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.asp-sec{margin:14px 0}
.asp-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.asp-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff)}
.asp-row{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px}
.asp-key{color:var(--fg-2,#888);min-width:160px;flex-shrink:0;font-size:12px}
.asp-val{font-family:ui-monospace,monospace;word-break:break-all}
.asp-val.masked{color:var(--fg-2,#888);font-style:italic}
.asp-table{width:100%;border-collapse:collapse;font-size:13px}
.asp-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0)}
.asp-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:12px;vertical-align:top}
.asp-pill{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px 3px 2px 0}
.asp-pill.warn{background:#fef3c7;border-color:#fcd34d;color:#78350f}
.asp-warn{background:#fef3c7;border:1px solid #fcd34d;border-radius:6px;padding:8px 12px;font-size:12px;color:#78350f;margin-top:10px}
.asp-level-trace{color:#6b7280}
.asp-level-debug{color:#2563eb}
.asp-level-information{color:#16a34a}
.asp-level-warning{color:#d97706}
.asp-level-error{color:#dc2626}
.asp-level-critical{color:#7c3aed;font-weight:700}
.asp-level-none{color:var(--fg-2,#888)}
`;

const LOG_LEVELS = ['Trace', 'Debug', 'Information', 'Warning', 'Error', 'Critical', 'None'];

function levelClass(level) {
  return 'asp-level-' + String(level || '').toLowerCase();
}

function maskConnectionString(cs) {
  if (!cs || typeof cs !== 'string') return cs;
  // Mask Password= in connection strings
  return cs.replace(/Password\s*=\s*[^;"]*/gi, 'Password=***')
    .replace(/Pwd\s*=\s*[^;"]*/gi, 'Pwd=***')
    .replace(/:\/\/([^:@]+):([^@]+)@/, '://$1:***@');
}

function hasSensitiveData(cs) {
  return /Password\s*=/i.test(cs) || /Pwd\s*=/i.test(cs) || /:\/\/[^:@]+:[^@]+@/.test(cs);
}

export function render(intake) {
  let cfg;
  try { cfg = JSON.parse(intake.text || '{}'); } catch {
    const host = document.createElement('div');
    host.className = 'asp-doc';
    host.innerHTML = `<style>${CSS}</style><div class="asp-title"><span class="badge-asp">ASP.NET Core</span>${esc(intake.name || 'appsettings.json')}</div><p>Invalid JSON.</p>`;
    return { parentNode: host };
  }

  const filename = intake.name || 'appsettings.json';
  // Derive environment from filename
  const envMatch = filename.match(/appsettings\.(\w+)\.json$/i);
  const environment = envMatch ? envMatch[1] : null;

  // Logging section
  const logging = cfg['Logging'] || {};
  const logLevel = logging['LogLevel'] || {};
  const logLevelEntries = Object.entries(logLevel);

  // ConnectionStrings
  const connStrings = cfg['ConnectionStrings'] || {};
  const connEntries = Object.entries(connStrings);
  let hasMasked = false;
  const maskedConns = connEntries.map(([k, v]) => {
    if (hasSensitiveData(v)) { hasMasked = true; return [k, maskConnectionString(v)]; }
    return [k, v];
  });

  // AllowedHosts
  const allowedHosts = cfg['AllowedHosts'] || '';

  // Top-level sections (excluding Logging, ConnectionStrings, AllowedHosts)
  const SKIP_KEYS = new Set(['Logging', 'ConnectionStrings', 'AllowedHosts']);
  const otherKeys = Object.keys(cfg).filter((k) => !SKIP_KEYS.has(k));

  const envPill = environment ? `<span class="asp-pill">${esc(environment)}</span>` : '';
  const allowedPill = allowedHosts ? `<span class="asp-pill">${esc(allowedHosts)}</span>` : '';

  const logTable = logLevelEntries.length ? `
<div class="asp-sec"><h3>Log Levels</h3><div class="asp-card">
<table class="asp-table">
<thead><tr><th>Logger</th><th>Level</th></tr></thead>
<tbody>${logLevelEntries.map(([k, v]) => `<tr><td>${esc(k)}</td><td><span class="${levelClass(v)}">${esc(v)}</span></td></tr>`).join('')}</tbody>
</table></div></div>` : '';

  const connTable = maskedConns.length ? `
<div class="asp-sec"><h3>Connection Strings (${maskedConns.length})</h3><div class="asp-card">
<table class="asp-table">
<thead><tr><th>Name</th><th>Value</th></tr></thead>
<tbody>${maskedConns.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</tbody>
</table></div></div>` : '';

  const otherSections = otherKeys.length ? `
<div class="asp-sec"><h3>Config Sections</h3><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">${otherKeys.map((k) => `<span class="asp-pill">${esc(k)}</span>`).join('')}</div></div>` : '';

  const host = document.createElement('div');
  host.className = 'asp-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="asp-title"><span class="badge-asp">ASP.NET Core</span>${esc(filename)}</div>
<div class="asp-sub">ASP.NET Core application configuration${environment ? ` — ${esc(environment)} environment` : ''}</div>
${(envPill || allowedPill) ? `<div style="margin-bottom:12px">${envPill}${allowedHosts ? `<span style="font-size:12px;color:var(--fg-2,#888);margin-left:6px">AllowedHosts: </span>${allowedPill}` : ''}</div>` : ''}
${logTable}
${connTable}
${otherSections}
${hasMasked ? '<div class="asp-warn">Connection strings contain passwords — masked for display.</div>' : ''}`;
  return { parentNode: host };
}
