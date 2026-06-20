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
.gcp-pk-block{margin:8px 0;background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;padding:8px 12px;font:12px ui-monospace,monospace;color:#991b1b;}
`;

function maskKeyId(val) {
  if (!val) return '****';
  const s = String(val);
  if (s.length <= 8) return s.slice(0, 4) + '****';
  return s.slice(0, 4) + '••••••••' + s.slice(-4);
}

function row(label, value, redacted = false) {
  if (value == null || value === '') return '';
  return `<div class="gcp-row"><span class="gcp-key">${esc(label)}</span><span class="gcp-val${redacted ? ' redacted' : ''}">${esc(value)}</span></div>`;
}

export function render(intake) {
  let cfg = {};
  try { cfg = JSON.parse(intake.text || '{}'); } catch { cfg = {}; }

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
  ${row('type', type)}
  ${row('project_id', projectId)}
  ${row('client_email', clientEmail)}
  ${row('client_id', clientId)}
  ${row('universe_domain', universeDomain)}
</div></div>
<div class="gcp-sec"><h3>Key</h3>
<div class="gcp-card">
  ${row('private_key_id', privateKeyId ? maskKeyId(privateKeyId) : '')}
  ${hasPrivateKey ? `<div class="gcp-row"><span class="gcp-key">private_key</span><span class="gcp-val redacted">[REDACTED — private key is never displayed]</span></div>
  <div class="gcp-pk-block">-----BEGIN RSA PRIVATE KEY-----<br>[REDACTED]<br>-----END RSA PRIVATE KEY-----</div>` : ''}
</div></div>
<div class="gcp-sec"><h3>Endpoints</h3>
<div class="gcp-card">
  ${row('auth_uri', authUri)}
  ${row('token_uri', tokenUri)}
</div></div>`;
  return { parentNode: host };
}
