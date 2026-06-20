import jsYaml from '../../../../../vendor/js-yaml/js-yaml.min.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.kc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-kc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#326ce5;color:#fff;vertical-align:middle;margin-right:8px;}
.kc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.kc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 10px;}
.kc-warn{display:flex;align-items:center;gap:8px;background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:8px 12px;margin:0 0 14px;font-size:12px;color:#7f1d1d;}
.kc-warn-icon{font-size:18px;flex-shrink:0;}
.kc-sec{margin:12px 0;}
.kc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.kc-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:8px 0;background:var(--bg,#fff);}
.kc-card-name{font:13px/1.4 ui-monospace,monospace;font-weight:700;margin-bottom:6px;display:flex;align-items:center;gap:6px;}
.kc-current-badge{display:inline-block;font-size:10px;padding:1px 7px;border-radius:8px;background:#dbeafe;border:1px solid #93c5fd;color:#1e3a8a;font-family:system-ui,sans-serif;font-weight:600;}
.kc-row{display:flex;gap:8px;font-size:13px;padding:2px 0;}
.kc-key{color:var(--fg-2,#888);min-width:180px;flex-shrink:0;font-size:12px;font-family:ui-monospace,monospace;}
.kc-val{font-family:ui-monospace,monospace;word-break:break-all;}
.kc-val.redacted{color:var(--fg-2,#888);font-style:italic;}
`;

function row(label, value, redacted = false) {
  if (value == null || value === '') return '';
  return `<div class="kc-row"><span class="kc-key">${esc(label)}</span><span class="kc-val${redacted ? ' redacted' : ''}">${esc(value)}</span></div>`;
}

function hasSensitiveData(obj) {
  if (!obj) return false;
  return !!(obj['certificate-authority-data'] || obj['client-certificate-data'] || obj['client-key-data'] || obj['token'] || obj['password']);
}

export async function render(intake) {
  let cfg = {};
  try { cfg = (jsYaml.loadAll(intake.text || \'\') || [])[0] || {}; } catch { cfg = {}; }

  const currentContext = cfg['current-context'] || '';
  const contexts = Array.isArray(cfg.contexts) ? cfg.contexts : [];
  const clusters = Array.isArray(cfg.clusters) ? cfg.clusters : [];
  const users = Array.isArray(cfg.users) ? cfg.users : [];

  const clustersHtml = clusters.map((c) => {
    const name = c.name || '';
    const clusterData = c.cluster || {};
    const server = clusterData.server || '';
    const hasCert = !!clusterData['certificate-authority-data'];
    const hasCertFile = !!clusterData['certificate-authority'];
    const skipTls = !!clusterData['insecure-skip-tls-verify'];
    return `<div class="kc-card">
      <div class="kc-card-name">${esc(name)}</div>
      ${row('server', server)}
      ${hasCert ? row('certificate-authority-data', '[DATA+OMITTED]', true) : ''}
      ${hasCertFile ? row('certificate-authority', clusterData['certificate-authority']) : ''}
      ${skipTls ? row('insecure-skip-tls-verify', 'true') : ''}
    </div>`;
  }).join('');

  const contextsHtml = contexts.map((ctx) => {
    const name = ctx.name || '';
    const ctxData = ctx.context || {};
    const isCurrent = name === currentContext;
    return `<div class="kc-card">
      <div class="kc-card-name">${esc(name)}${isCurrent ? ' <span class="kc-current-badge">current</span>' : ''}</div>
      ${row('cluster', ctxData.cluster || '')}
      ${row('user', ctxData.user || '')}
      ${ctxData.namespace ? row('namespace', ctxData.namespace) : ''}
    </div>`;
  }).join('');

  const usersHtml = users.map((u) => {
    const name = u.name || '';
    const userData = u.user || {};
    const sensitive = hasSensitiveData(userData);
    const hasClientCert = !!userData['client-certificate-data'] || !!userData['client-certificate'];
    const hasClientKey = !!userData['client-key-data'] || !!userData['client-key'];
    const hasToken = !!userData['token'];
    const authProvider = userData['auth-provider']?.name || '';
    const exec = userData['exec']?.command || '';
    return `<div class="kc-card">
      <div class="kc-card-name">${esc(name)}</div>
      ${hasClientCert ? row('client-certificate-data', '[DATA+OMITTED]', true) : ''}
      ${hasClientKey ? row('client-key-data', '[DATA+OMITTED]', true) : ''}
      ${hasToken ? row('token', '[REDACTED]', true) : ''}
      ${authProvider ? row('auth-provider', authProvider) : ''}
      ${exec ? row('exec command', exec) : ''}
      ${!sensitive && !authProvider && !exec ? row('auth', 'none configured') : ''}
    </div>`;
  }).join('');

  const sub = [
    contexts.length + ' context' + (contexts.length !== 1 ? 's' : ''),
    clusters.length + ' cluster' + (clusters.length !== 1 ? 's' : ''),
  ].join(' · ');

  const host = document.createElement('div');
  host.className = 'kc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="kc-title"><span class="badge-kc">Kubeconfig</span>Kubeconfig</div>
<div class="kc-sub">${esc(sub)}${currentContext ? ' · current: ' + esc(currentContext) : ''}</div>
<div class="kc-warn"><span class="kc-warn-icon">🔒</span> Contains cluster credentials — certificate and token data is always redacted.</div>
${clusters.length ? `<div class="kc-sec"><h3>Clusters (${clusters.length})</h3>${clustersHtml}</div>` : ''}
${contexts.length ? `<div class="kc-sec"><h3>Contexts (${contexts.length})</h3>${contextsHtml}</div>` : ''}
${users.length ? `<div class="kc-sec"><h3>Users (${users.length})</h3>${usersHtml}</div>` : ''}`;
  return { parentNode: host };
}
