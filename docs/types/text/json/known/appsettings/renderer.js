const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.appsettings-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.appsettings-doc .badge-asp{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#512bd4;color:#fff;vertical-align:middle;margin-right:8px}
.appsettings-doc .asp-title{font-size:18px;font-weight:700;margin:0 0 4px}
.appsettings-doc .asp-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.appsettings-doc .asp-sec{margin:14px 0}
.appsettings-doc .asp-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.appsettings-doc .asp-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff)}
.appsettings-doc .asp-row{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px}
.appsettings-doc .asp-key{color:var(--fg-2,#888);min-width:160px;flex-shrink:0;font-size:12px}
.appsettings-doc .asp-val{font-family:ui-monospace,monospace;word-break:break-all}
.appsettings-doc .asp-val.masked{color:var(--fg-2,#888);font-style:italic}
.appsettings-doc .asp-table{width:100%;border-collapse:collapse;font-size:13px}
.appsettings-doc .asp-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0)}
.appsettings-doc .asp-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:12px;vertical-align:top}
.appsettings-doc .asp-pill{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px 3px 2px 0}
.appsettings-doc .asp-pill.warn{background:#fef3c7;border-color:#fcd34d;color:#78350f}
.appsettings-doc .asp-warn{background:#fef3c7;border:1px solid #fcd34d;border-radius:6px;padding:8px 12px;font-size:12px;color:#78350f;margin-top:10px}
.appsettings-doc .asp-level-trace{color:#6b7280}
.appsettings-doc .asp-level-debug{color:#2563eb}
.appsettings-doc .asp-level-information{color:#16a34a}
.appsettings-doc .asp-level-warning{color:#d97706}
.appsettings-doc .asp-level-error{color:#dc2626}
.appsettings-doc .asp-level-critical{color:#7c3aed;font-weight:700}
.appsettings-doc .asp-level-none{color:var(--fg-2,#888)}
`;

function levelClass(level) {
  return 'asp-level-' + String(level || '').toLowerCase();
}

function maskConnectionString(cs) {
  if (!cs || typeof cs !== 'string') return cs;
  return cs.replace(/Password\s*=\s*[^;"]*/gi, 'Password=[configured]')
    .replace(/Pwd\s*=\s*[^;"]*/gi, 'Pwd=[configured]')
    .replace(/:\/\/([^:@]+):([^@]+)@/, '://$1:[configured]@');
}

function hasSensitiveData(cs) {
  return /Password\s*=/i.test(cs) || /Pwd\s*=/i.test(cs) || /:\/\/[^:@]+:[^@]+@/.test(cs);
}

const SENSITIVE_KEY_RE = /password|secret|key|token|apikey/i;

function maskValue(key, val) {
  if (SENSITIVE_KEY_RE.test(key)) return '[configured]';
  return val;
}

export function render(intake) {
  let cfg;
  try { cfg = intake.parsed ?? JSON.parse(intake.text || '{}'); } catch {
    const host = document.createElement('div');
    host.className = 'appsettings-doc';
    host.innerHTML = `<style>${CSS}</style><div class="asp-title"><span class="badge-asp">ASP.NET</span>${esc((intake.name || intake.filename || 'appsettings.json').split('/').pop())}</div><p>Invalid JSON.</p>`;
    return { parentNode: host };
  }

  const filename = (intake.name || intake.filename || 'appsettings.json').split('/').pop();
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
    if (hasSensitiveData(String(v || ''))) { hasMasked = true; return [k, maskConnectionString(String(v))]; }
    return [k, String(v)];
  });

  // AllowedHosts
  const allowedHosts = cfg['AllowedHosts'] || '';

  // FeatureFlags / Features section
  const featureSection = cfg['FeatureFlags'] || cfg['Features'] || null;
  const featureEntries = featureSection && typeof featureSection === 'object' ? Object.entries(featureSection) : [];

  // JWT / Authentication section
  const jwtSection = cfg['Jwt'] || cfg['Authentication'] || null;

  // Top-level sections (excluding handled keys)
  const SKIP_KEYS = new Set(['Logging', 'ConnectionStrings', 'AllowedHosts', 'FeatureFlags', 'Features', 'Jwt', 'Authentication']);
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

  const featureGrid = featureEntries.length ? `
<div class="asp-sec"><h3>Feature Flags</h3><div class="asp-card" style="display:flex;flex-wrap:wrap;gap:6px">
${featureEntries.map(([k, v]) => {
    const isBool = typeof v === 'boolean';
    const isNum = typeof v === 'number';
    const chip = isBool
      ? `<span class="asp-pill" style="background:${v ? '#dcfce7' : '#fee2e2'};border-color:${v ? '#86efac' : '#fca5a5'};color:${v ? '#15803d' : '#b91c1c'}">${esc(k)}: ${v ? 'on' : 'off'}</span>`
      : `<span class="asp-pill">${esc(k)}: ${esc(String(v))}</span>`;
    return chip;
  }).join('')}
</div></div>` : '';

  const jwtCard = jwtSection && typeof jwtSection === 'object' ? `
<div class="asp-sec"><h3>JWT / Auth</h3><div class="asp-card">
${Object.entries(jwtSection).map(([k, v]) => {
    const display = maskValue(k, esc(String(v)));
    return `<div class="asp-row"><span class="asp-key">${esc(k)}</span><span class="asp-val${display === '[configured]' ? ' masked' : ''}">${display}</span></div>`;
  }).join('')}
</div></div>` : '';

  const otherSections = otherKeys.length ? `
<div class="asp-sec"><h3>Config Sections</h3><div class="asp-card">
${otherKeys.map((k) => {
    const section = cfg[k];
    if (section && typeof section === 'object') {
      const entries = Object.entries(section);
      return `<div style="margin-bottom:8px"><div style="font-size:12px;font-weight:600;color:var(--fg-2,#888);margin-bottom:4px">${esc(k)}</div>
${entries.map(([sk, sv]) => {
        const display = maskValue(sk, esc(String(sv)));
        return `<div class="asp-row"><span class="asp-key">${esc(sk)}</span><span class="asp-val${display === '[configured]' ? ' masked' : ''}">${display}</span></div>`;
      }).join('')}</div>`;
    }
    const display = maskValue(k, esc(String(section)));
    return `<div class="asp-row"><span class="asp-key">${esc(k)}</span><span class="asp-val${display === '[configured]' ? ' masked' : ''}">${display}</span></div>`;
  }).join('')}
</div></div>` : '';

  const host = document.createElement('div');
  host.className = 'appsettings-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="asp-title"><span class="badge-asp">ASP.NET</span>${esc(filename)}</div>
<div class="asp-sub">ASP.NET Core application configuration${environment ? ` — ${esc(environment)} environment` : ''}</div>
${(envPill || allowedPill) ? `<div style="margin-bottom:12px">${envPill}${allowedHosts ? `<span style="font-size:12px;color:var(--fg-2,#888);margin-left:6px">AllowedHosts: </span>${allowedPill}` : ''}</div>` : ''}
${logTable}
${connTable}
${featureGrid}
${jwtCard}
${otherSections}
${hasMasked ? '<div class="asp-warn">Connection strings contain sensitive values — masked for display.</div>' : ''}`;
  return { parentNode: host };
}
