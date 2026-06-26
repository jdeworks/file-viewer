import { ensureKnownUiStyle, issueList, maskedValue, sourcePreview, wireSourceLinks } from '../../../../../core/known-ui.js';

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
.appsettings-doc .asp-reason{font-size:11px;color:var(--fg-2,#888);font-family:system-ui,sans-serif;margin-left:6px}
.appsettings-doc .asp-line-btn{border:0;background:transparent;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px}
.appsettings-doc .asp-line-btn:hover{color:var(--accent,#2563eb)}
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

function displayValue(key, val) {
  const text = String(val ?? '');
  const masked = maskedValue(key, text);
  if (masked.masked) return { text: '[configured]', masked: true, reason: masked.reason };
  return { text, masked: false, reason: '' };
}

function keyLineMap(text) {
  const map = new Map();
  String(text || '').split(/\r?\n/).forEach((line, idx) => {
    const m = line.match(/^\s*"([^"]+)"\s*:/);
    if (m && !map.has(m[1])) map.set(m[1], idx + 1);
  });
  return map;
}

function lineButton(label, line, title = '') {
  return `<button class="asp-line-btn" type="button" data-source-line="${line || 1}" title="${esc(title || `Open ${label} in source`)}">${esc(label)}</button>`;
}

function valueSpan(info) {
  return `<span class="asp-val${info.masked ? ' masked' : ''}" title="${esc(info.reason || '')}">${esc(info.text)}</span>${info.reason ? `<span class="asp-reason">${esc(info.reason)}</span>` : ''}`;
}

function collectIssues({ allowedHosts, maskedConns, jwtSection, logLevel, lines }) {
  const issues = [];
  if (allowedHosts === '*') {
    issues.push({
      severity: 'warning',
      label: 'public hosts',
      line: lines.get('AllowedHosts') || 1,
      message: 'AllowedHosts is "*"; restrict host headers in production-facing deployments.',
    });
  }
  for (const entry of maskedConns) {
    if (hasSensitiveData(entry.original)) {
      issues.push({
        severity: 'warning',
        label: 'connection secret',
        line: lines.get(entry.key) || lines.get('ConnectionStrings') || 1,
        message: `${entry.key} contains a password or URL credential. It is redacted in the preview and source.`,
      });
    }
  }
  if (jwtSection && typeof jwtSection === 'object' && !Object.keys(jwtSection).some((k) => /secret|key|signing/i.test(k))) {
    issues.push({
      severity: 'info',
      label: 'jwt signing',
      line: lines.get('Jwt') || lines.get('Authentication') || 1,
      message: 'JWT settings do not include a visible signing key; verify it is supplied by environment or secrets storage.',
    });
  }
  for (const [logger, level] of Object.entries(logLevel || {})) {
    if (/Trace|Debug/i.test(String(level))) {
      issues.push({
        severity: 'warning',
        label: 'verbose logging',
        line: lines.get(logger) || lines.get('LogLevel') || 1,
        message: `${logger} logs at ${level}; verbose logs can expose sensitive request or database details.`,
      });
    }
  }
  return issues;
}

function redactedSource(text) {
  const lines = String(text || '').split(/\r?\n/);
  return lines.map((line) => {
    const m = line.match(/^(\s*)"([^"]+)"\s*:\s*"((?:\\.|[^"\\])*)"(,?)\s*$/);
    if (!m) return line;
    const [, indent, key, rawValue, comma] = m;
    const value = rawValue.replace(/\\"/g, '"');
    if (hasSensitiveData(value)) {
      return `${indent}"${key}": "${maskConnectionString(value)}"${comma}`;
    }
    const display = displayValue(key, value);
    if (display.masked) return `${indent}"${key}": "[configured]"${comma}`;
    return line;
  }).join('\n');
}

function highlightJsonLine(line) {
  let out = esc(line);
  out = out.replace(/^(\s*)(&quot;[^&]+&quot;)(\s*:)/, '$1<span style="color:#8250df">$2</span>$3');
  out = out.replace(/(:\s*)(&quot;[^&]*&quot;|true|false|null|\d+)/i, '$1<span style="color:#0f766e">$2</span>');
  return out;
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
  const lines = keyLineMap(intake.text || '');

  // Logging section
  const logging = cfg['Logging'] || {};
  const logLevel = logging['LogLevel'] || {};
  const logLevelEntries = Object.entries(logLevel);

  // ConnectionStrings
  const connStrings = cfg['ConnectionStrings'] || {};
  const connEntries = Object.entries(connStrings);
  let hasMasked = false;
  const maskedConns = connEntries.map(([k, v]) => {
    const original = String(v || '');
    if (hasSensitiveData(original)) { hasMasked = true; return { key: k, value: maskConnectionString(original), original, masked: true, reason: 'masked because the connection string contains a password or URL credential' }; }
    return { key: k, value: original, original, masked: false, reason: '' };
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
<tbody>${logLevelEntries.map(([k, v]) => `<tr><td>${lineButton(k, lines.get(k) || lines.get('LogLevel'), 'Open logger in source')}</td><td><span class="${levelClass(v)}" title="ASP.NET logging level">${esc(v)}</span></td></tr>`).join('')}</tbody>
</table></div></div>` : '';

  const connTable = maskedConns.length ? `
<div class="asp-sec"><h3>Connection Strings (${maskedConns.length})</h3><div class="asp-card">
<table class="asp-table">
<thead><tr><th>Name</th><th>Value</th></tr></thead>
<tbody>${maskedConns.map((entry) => `<tr><td>${lineButton(entry.key, lines.get(entry.key) || lines.get('ConnectionStrings'), 'Open connection string in source')}</td><td>${valueSpan({ text: entry.value, masked: entry.masked, reason: entry.reason })}</td></tr>`).join('')}</tbody>
</table></div></div>` : '';

  const featureGrid = featureEntries.length ? `
<div class="asp-sec"><h3>Feature Flags</h3><div class="asp-card" style="display:flex;flex-wrap:wrap;gap:6px">
${featureEntries.map(([k, v]) => {
    const isBool = typeof v === 'boolean';
    const isNum = typeof v === 'number';
    const chip = isBool
      ? `<span class="asp-pill" style="background:${v ? '#dcfce7' : '#fee2e2'};border-color:${v ? '#86efac' : '#fca5a5'};color:${v ? '#15803d' : '#b91c1c'}">${esc(k)}: ${v ? 'on' : 'off'}</span>`
      : `<span class="asp-pill">${esc(k)}: ${esc(String(v))}</span>`;
    return chip.replace(esc(k), lineButton(k, lines.get(k) || lines.get('Features') || lines.get('FeatureFlags'), 'Open feature flag in source'));
  }).join('')}
</div></div>` : '';

  const jwtCard = jwtSection && typeof jwtSection === 'object' ? `
<div class="asp-sec"><h3>JWT / Auth</h3><div class="asp-card">
${Object.entries(jwtSection).map(([k, v]) => {
    const display = displayValue(k, v);
    return `<div class="asp-row"><span class="asp-key">${lineButton(k, lines.get(k) || lines.get('Jwt') || lines.get('Authentication'), 'Open auth setting in source')}</span>${valueSpan(display)}</div>`;
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
        const display = displayValue(sk, sv);
        return `<div class="asp-row"><span class="asp-key">${lineButton(sk, lines.get(sk) || lines.get(k), 'Open config setting in source')}</span>${valueSpan(display)}</div>`;
      }).join('')}</div>`;
    }
    const display = displayValue(k, section);
    return `<div class="asp-row"><span class="asp-key">${lineButton(k, lines.get(k), 'Open config setting in source')}</span>${valueSpan(display)}</div>`;
  }).join('')}
</div></div>` : '';

  const host = document.createElement('div');
  ensureKnownUiStyle(document);
  host.className = 'appsettings-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="asp-title"><span class="badge-asp">ASP.NET</span>${esc(filename)}</div>
<div class="asp-sub">ASP.NET Core application configuration${environment ? ` — ${esc(environment)} environment` : ''}</div>
${(envPill || allowedPill) ? `<div style="margin-bottom:12px">${envPill}${allowedHosts ? `<span style="font-size:12px;color:var(--fg-2,#888);margin-left:6px">AllowedHosts: </span><span title="Host header allow-list">${lineButton(allowedHosts, lines.get('AllowedHosts'), 'Open AllowedHosts in source')}</span>` : ''}</div>` : ''}
${logTable}
${connTable}
${featureGrid}
${jwtCard}
${otherSections}
${hasMasked ? '<div class="asp-warn">Connection strings contain sensitive values — masked for display.</div>' : ''}`;
  const issues = issueList(collectIssues({ allowedHosts, maskedConns, jwtSection, logLevel, lines }), { title: 'Appsettings Review' });
  if (issues) host.insertBefore(issues, host.querySelector('.asp-sec'));
  host.appendChild(sourcePreview(redactedSource(intake.text || ''), { title: 'Redacted source', collapsed: true, idPrefix: 'appsettings-line', highlighter: highlightJsonLine }));
  wireSourceLinks(host, { idPrefix: 'appsettings-line' });
  return { parentNode: host };
}
