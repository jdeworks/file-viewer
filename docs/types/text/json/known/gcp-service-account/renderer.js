import { ensureKnownUiStyle, issueList, sourcePreview, wireSourceLinks } from '../../../../../core/known-ui.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.gcp-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-gcp{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a73e8;color:#fff;vertical-align:middle;margin-right:8px;}
.gcp-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.gcp-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 10px;}
.gcp-warn{display:flex;align-items:flex-start;gap:8px;background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:10px 14px;margin:0 0 14px;font-size:12px;color:#7f1d1d;}
.gcp-warn-icon{font-size:18px;flex-shrink:0;margin-top:-2px;}
.gcp-warn-text strong{display:block;margin-bottom:2px;}
.gcp-sec{margin:12px 0;}
.gcp-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.gcp-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.gcp-row{display:flex;gap:8px;font-size:13px;padding:3px 0;}
.gcp-key{color:var(--fg-2,#888);min-width:180px;flex-shrink:0;font-size:12px;font-family:ui-monospace,monospace;}
.gcp-val{font-family:ui-monospace,monospace;word-break:break-all;}
.gcp-val.redacted{color:var(--fg-2,#888);font-style:italic;}
.gcp-reason{font-size:11px;color:var(--fg-2,#888);font-family:system-ui,sans-serif;margin-left:6px;}
.gcp-line-btn{border:0;background:transparent;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;}
.gcp-line-btn:hover{color:var(--accent,#2563eb);}
.gcp-pk-block{margin:8px 0;background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;padding:8px 12px;font:12px ui-monospace,monospace;color:#991b1b;}
`;

function maskKeyId(val) {
  if (!val) return '****';
  const s = String(val);
  if (s.length <= 8) return s.slice(0, 4) + '****';
  return s.slice(0, 4) + '••••••••' + s.slice(-4);
}

function keyLineMap(text) {
  const map = new Map();
  const lines = String(text || '').split(/\r?\n/);
  lines.forEach((line, idx) => {
    const m = line.match(/^\s*"([^"]+)"\s*:/);
    if (m && !map.has(m[1])) map.set(m[1], idx + 1);
  });
  return map;
}

function row(label, value, { redacted = false, reason = '', line = 1 } = {}) {
  if (value == null || value === '') return '';
  return `<div class="gcp-row">
    <span class="gcp-key"><button class="gcp-line-btn" type="button" data-source-line="${line}" title="Open ${esc(label)} in source">${esc(label)}</button></span>
    <span class="gcp-val${redacted ? ' redacted' : ''}" title="${esc(reason)}">${esc(value)}</span>
    ${reason ? `<span class="gcp-reason">${esc(reason)}</span>` : ''}
  </div>`;
}

function redactSource(text, linesByKey, privateKeyId) {
  const lines = String(text || '').split(/\r?\n/);
  const replacements = new Map([
    ['private_key_id', maskKeyId(privateKeyId || '')],
    ['private_key', '[REDACTED private key]'],
  ]);
  for (const [key, replacement] of replacements) {
    const line = linesByKey.get(key);
    if (!line) continue;
    lines[line - 1] = lines[line - 1].replace(/:\s*"(?:(?:\\.)|[^"\\])*"/, `: "${replacement}"`);
  }
  return lines.join('\n');
}

function highlightJsonLine(line) {
  let out = esc(line);
  out = out.replace(/^(\s*)(&quot;[^&]+&quot;)(\s*:)/, '$1<span style="color:#8250df">$2</span>$3');
  out = out.replace(/(:\s*)(&quot;[^&]*&quot;)/, '$1<span style="color:#0f766e">$2</span>');
  return out;
}

function collectIssues({ hasPrivateKey, privateKeyLine, privateKeyIdLine }) {
  const issues = [];
  if (hasPrivateKey) {
    issues.push({
      severity: 'high',
      label: 'private key',
      line: privateKeyLine,
      message: 'This file contains a service account private key. Prefer Workload Identity, metadata credentials, or a secrets manager.',
    });
  }
  if (privateKeyIdLine) {
    issues.push({
      severity: 'warning',
      label: 'key id',
      line: privateKeyIdLine,
      message: 'private_key_id is a key fingerprint. It is partially masked in the view and redacted in source.',
    });
  }
  return issues;
}

export function render(intake) {
  let cfg = {};
  try { cfg = JSON.parse(intake.text || '{}'); } catch { cfg = {}; }
  const linesByKey = keyLineMap(intake.text || '');

  const type = cfg.type || 'service_account';
  const projectId = cfg.project_id || '';
  const privateKeyId = cfg.private_key_id || '';
  const clientEmail = cfg.client_email || '';
  const clientId = cfg.client_id || '';
  const authUri = cfg.auth_uri || '';
  const tokenUri = cfg.token_uri || '';
  const universeDomain = cfg.universe_domain || '';
  const hasPrivateKey = !!(cfg.private_key);

  const displayName = clientEmail || projectId || 'GCP Service Account';

  const host = document.createElement('div');
  ensureKnownUiStyle(host.ownerDocument || document);
  host.className = 'gcp-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="gcp-title"><span class="badge-gcp">GCP Service Account</span>${esc(displayName)}</div>
<div class="gcp-sub">Google Cloud service account credentials</div>
<div class="gcp-warn">
  <span class="gcp-warn-icon">🔴</span>
  <div class="gcp-warn-text"><strong>Private key present — never commit this file to version control.</strong>
  This JSON key grants full service account access. Store in a secrets manager or use Workload Identity instead.</div>
</div>
<div class="gcp-sec"><h3>Identity</h3>
<div class="gcp-card">
  ${row('type', type, { line: linesByKey.get('type') || 1 })}
  ${row('project_id', projectId, { line: linesByKey.get('project_id') || 1 })}
  ${row('client_email', clientEmail, { line: linesByKey.get('client_email') || 1 })}
  ${row('client_id', clientId, { line: linesByKey.get('client_id') || 1 })}
  ${row('universe_domain', universeDomain, { line: linesByKey.get('universe_domain') || 1 })}
</div></div>
<div class="gcp-sec"><h3>Key</h3>
<div class="gcp-card">
  ${row('private_key_id', privateKeyId ? maskKeyId(privateKeyId) : '', { redacted: true, reason: 'masked to expose only the key fingerprint', line: linesByKey.get('private_key_id') || 1 })}
  ${hasPrivateKey ? row('private_key', '[REDACTED — private key is never displayed]', { redacted: true, reason: 'masked because this is a service account private key', line: linesByKey.get('private_key') || 1 }) + `
  <div class="gcp-pk-block">-----BEGIN RSA PRIVATE KEY-----<br>[REDACTED]<br>-----END RSA PRIVATE KEY-----</div>` : ''}
</div></div>
<div class="gcp-sec"><h3>Endpoints</h3>
<div class="gcp-card">
  ${row('auth_uri', authUri, { line: linesByKey.get('auth_uri') || 1 })}
  ${row('token_uri', tokenUri, { line: linesByKey.get('token_uri') || 1 })}
</div></div>`;
  const issues = issueList(collectIssues({
    hasPrivateKey,
    privateKeyLine: linesByKey.get('private_key') || 1,
    privateKeyIdLine: linesByKey.get('private_key_id') || 0,
  }), { title: 'Key Review' });
  if (issues) host.insertBefore(issues, host.querySelector('.gcp-sec'));
  let source = intake.text || '';
  source = redactSource(source, linesByKey, privateKeyId);
  host.appendChild(sourcePreview(source, { title: 'Redacted source', collapsed: true, idPrefix: 'gcp-line', highlighter: highlightJsonLine }));
  wireSourceLinks(host, { idPrefix: 'gcp-line' });
  return { parentNode: host };
}
