const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.snt-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.snt-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#362d59;color:#fff;vertical-align:middle;margin-right:8px}
.snt-title{font-size:18px;font-weight:700;margin:0 0 4px}
.snt-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.snt-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:12px 16px;margin:0 0 14px}
.snt-table{width:100%;border-collapse:collapse;font-size:13px}
.snt-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.snt-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.snt-table td:first-child{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#666);white-space:nowrap}
.snt-table td:last-child{font:13px/1.4 ui-monospace,monospace;word-break:break-all}
.snt-sec{margin:14px 0}
.snt-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px}
.snt-dsn{font:12px/1.5 ui-monospace,monospace;word-break:break-all;color:var(--fg,#24292f)}
.snt-masked{color:var(--fg-2,#888)}
.snt-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#f3e8ff;border:1px solid #d8b4fe;color:#6b21a8;margin-left:4px}
.snt-on{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#dcfce7;border:1px solid #86efac;color:#166534;margin:2px 3px}
.snt-off{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#f3f4f6;border:1px solid #d1d5db;color:#6b7280;margin:2px 3px}
`;

// Mask the secret part of a Sentry DSN (everything before the @)
function maskDsn(dsn) {
  // DSN format: https://<key>@<host>/<project>
  const atIdx = dsn.indexOf('@');
  if (atIdx < 0) return esc(dsn);
  const schemeEnd = dsn.indexOf('://');
  const prefix = schemeEnd >= 0 ? dsn.slice(0, schemeEnd + 3) : '';
  return esc(prefix) + '<span class="snt-masked">***</span>' + esc(dsn.slice(atIdx));
}

function parseProps(text) {
  const props = new Map();
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || t.startsWith('!')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    props.set(t.slice(0, eq).trim(), t.slice(eq + 1).trim());
  }
  return props;
}

export async function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const props = parseProps(text);

  const dsn = props.get('sentry.dsn') || props.get('dsn') || '';
  const release = props.get('sentry.release') || props.get('release') || '';
  const environment = props.get('sentry.environment') || props.get('environment') || '';
  const org = props.get('sentry.org') || props.get('org') || props.get('defaults.org') || '';
  const project = props.get('sentry.project') || props.get('project') || props.get('defaults.project') || '';
  const uploadNative = props.get('sentry.uploadNativeSymbols') || props.get('uploadNativeSymbols') || '';
  const includeNative = props.get('sentry.includeNativeSources') || props.get('includeNativeSources') || '';
  const uploadSources = props.get('sentry.upload-sources') || props.get('upload-sources') || '';

  const dsnHtml = dsn ? `
<div class="snt-sec"><h3>DSN</h3><div class="snt-card">
<div class="snt-dsn">${maskDsn(dsn)}</div>
</div></div>` : '';

  const coreRows = [
    release && `<tr><td>release</td><td>${esc(release)}</td></tr>`,
    environment && `<tr><td>environment</td><td>${esc(environment)}</td></tr>`,
    org && `<tr><td>org</td><td>${esc(org)}</td></tr>`,
    project && `<tr><td>project</td><td>${esc(project)}</td></tr>`,
  ].filter(Boolean).join('');

  const coreHtml = coreRows ? `
<div class="snt-sec"><h3>Project Settings</h3><div class="snt-card">
<table class="snt-table"><thead><tr><th>Setting</th><th>Value</th></tr></thead><tbody>${coreRows}</tbody></table>
</div></div>` : '';

  const boolBadge = (label, val) => {
    if (!val) return '';
    const on = val === 'true' || val === '1' || val === 'yes';
    return `<span class="${on ? 'snt-on' : 'snt-off'}">${esc(label)}: ${on ? 'enabled' : 'disabled'}</span>`;
  };

  const uploadRows = [uploadNative, includeNative, uploadSources].filter(Boolean);
  const uploadHtml = uploadRows.length ? `
<div class="snt-sec"><h3>Source Upload</h3>
${boolBadge('uploadNativeSymbols', uploadNative)}
${boolBadge('includeNativeSources', includeNative)}
${boolBadge('upload-sources', uploadSources)}
</div>` : '';

  // Other properties not yet shown
  const shownKeys = new Set(['sentry.dsn', 'dsn', 'sentry.release', 'release', 'sentry.environment', 'environment',
    'sentry.org', 'org', 'defaults.org', 'sentry.project', 'project', 'defaults.project',
    'sentry.uploadNativeSymbols', 'uploadNativeSymbols', 'sentry.includeNativeSources', 'includeNativeSources',
    'sentry.upload-sources', 'upload-sources']);
  const otherRows = [...props.entries()]
    .filter(([k]) => !shownKeys.has(k))
    .map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`)
    .join('');
  const otherHtml = otherRows ? `
<div class="snt-sec"><h3>Additional Properties</h3><div class="snt-card">
<table class="snt-table"><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>${otherRows}</tbody></table>
</div></div>` : '';

  const subParts = [org, project, environment, release].filter(Boolean);

  const host = document.createElement('div');
  host.className = 'snt-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="snt-title"><span class="snt-badge">Sentry</span>sentry.properties</div>
<div class="snt-sub">${esc(subParts.join(' · '))}</div>
${dsnHtml}${coreHtml}${uploadHtml}${otherHtml}`;
  return { parentNode: host };
}
