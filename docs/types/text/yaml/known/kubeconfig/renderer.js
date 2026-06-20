import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.kube-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.kube-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#326CE5;color:#fff;vertical-align:middle;margin-right:8px;}
.kube-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.kube-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 10px;}
.kube-header-row{display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin:0 0 12px;}
.kube-ctx-chip{display:inline-flex;align-items:center;gap:5px;background:#dcfce7;border:1px solid #86efac;border-radius:8px;padding:3px 10px;font-size:12px;font-weight:600;color:#14532d;}
.kube-ctx-label{font-size:11px;color:#166534;font-weight:400;margin-right:3px;}
.kube-copy-btn{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:6px;border:1px solid var(--border,#e0e0e0);background:var(--bg,#fff);color:var(--fg,#24292f);font-size:12px;cursor:pointer;font-family:system-ui,sans-serif;}
.kube-copy-btn:hover{background:var(--bg-2,#f6f8fa);}
.kube-warn{display:flex;align-items:center;gap:8px;background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:8px 12px;margin:0 0 14px;font-size:12px;color:#7f1d1d;}
.kube-warn-icon{font-size:18px;flex-shrink:0;}
.kube-sec{margin:14px 0;}
.kube-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.kube-table{width:100%;border-collapse:collapse;font-size:13px;}
.kube-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.04em;padding:5px 10px 5px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.kube-table td{padding:6px 10px 6px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.kube-table tr.kube-current-row td:first-child{border-left:3px solid #326CE5;padding-left:7px;font-weight:700;}
.kube-chip{display:inline-block;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:600;font-family:system-ui,sans-serif;}
.kube-chip-cert{background:#dbeafe;border:1px solid #93c5fd;color:#1e3a8a;}
.kube-chip-insecure{background:#fef2f2;border:1px solid #fca5a5;color:#7f1d1d;}
.kube-chip-token{background:#f3f4f6;border:1px solid #d1d5db;color:#374151;}
.kube-chip-exec{background:#fef3c7;border:1px solid #fcd34d;color:#78350f;}
.kube-chip-basic{background:#f5f3ff;border:1px solid #c4b5fd;color:#4c1d95;}
.kube-ns-default{color:var(--fg-2,#888);font-style:italic;font-family:system-ui,sans-serif;font-size:12px;}
.kube-redacted{color:var(--fg-2,#888);font-style:italic;}
.kube-mono{font-family:ui-monospace,monospace;}
`;

function truncate(s, max) {
  s = String(s || '');
  return s.length > max ? s.slice(0, max) + '…' : s;
}

export async function render(intake) {
  const jsYaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
  let cfg = {};
  try { cfg = (jsYaml.loadAll(intake.text || '') || [])[0] || {}; } catch { cfg = {}; }

  const currentContext = cfg['current-context'] || '';
  const contexts = Array.isArray(cfg.contexts) ? cfg.contexts : [];
  const clusters = Array.isArray(cfg.clusters) ? cfg.clusters : [];
  const users = Array.isArray(cfg.users) ? cfg.users : [];

  // Build clusters table
  const clustersRows = clusters.map((c) => {
    const name = c.name || '';
    const cd = c.cluster || {};
    const server = truncate(cd.server || '', 60);
    const isCurrent = contexts.some((ctx) => ctx.name === currentContext && ctx.context?.cluster === name);
    const hasCertData = !!cd['certificate-authority-data'];
    const hasCertFile = !!cd['certificate-authority'];
    const skipTls = !!cd['insecure-skip-tls-verify'];
    let tlsCell = '';
    if (hasCertData || hasCertFile) tlsCell = `<span class="kube-chip kube-chip-cert">cert-auth</span>`;
    else if (skipTls) tlsCell = `<span class="kube-chip kube-chip-insecure">insecure</span>`;
    return `<tr class="${isCurrent ? 'kube-current-row' : ''}">
      <td>${esc(name)}</td>
      <td class="kube-mono">${esc(server)}</td>
      <td>${tlsCell}</td>
    </tr>`;
  }).join('');

  // Build contexts table
  const contextsRows = contexts.map((ctx) => {
    const name = ctx.name || '';
    const cd = ctx.context || {};
    const isCurrent = name === currentContext;
    const ns = cd.namespace || '';
    const nsCell = ns ? `<span class="kube-mono">${esc(ns)}</span>` : `<span class="kube-ns-default">default</span>`;
    return `<tr class="${isCurrent ? 'kube-current-row' : ''}">
      <td>${esc(name)}</td>
      <td class="kube-mono">${esc(cd.cluster || '')}</td>
      <td class="kube-mono">${esc(cd.user || '')}</td>
      <td>${nsCell}</td>
    </tr>`;
  }).join('');

  // Build users table
  const usersRows = users.map((u) => {
    const name = u.name || '';
    const ud = u.user || {};
    const chips = [];
    if (ud['client-certificate'] || ud['client-certificate-data']) chips.push(`<span class="kube-chip kube-chip-cert">client-cert</span>`);
    if (ud['token']) chips.push(`<span class="kube-chip kube-chip-token">token [configured]</span>`);
    if (ud['exec']) {
      const cmd = ud['exec'].command || 'exec';
      chips.push(`<span class="kube-chip kube-chip-exec">exec: ${esc(cmd)}</span>`);
    }
    if (ud['username'] || ud['password']) chips.push(`<span class="kube-chip kube-chip-basic">basic [configured]</span>`);
    if (ud['auth-provider']) chips.push(`<span class="kube-chip kube-chip-token">${esc(ud['auth-provider'].name || 'auth-provider')}</span>`);
    if (!chips.length) chips.push(`<span class="kube-redacted">none configured</span>`);
    return `<tr>
      <td class="kube-mono">${esc(name)}</td>
      <td>${chips.join(' ')}</td>
    </tr>`;
  }).join('');

  const sub = [
    clusters.length + ' cluster' + (clusters.length !== 1 ? 's' : ''),
    contexts.length + ' context' + (contexts.length !== 1 ? 's' : ''),
  ].join(' \xb7 ');

  const host = document.createElement('div');
  host.className = 'kube-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="kube-title"><span class="kube-badge">kubectl</span>Kubernetes Config</div>
<div class="kube-sub">${esc(sub)}</div>
<div class="kube-header-row">
  ${currentContext ? `<span class="kube-ctx-chip"><span class="kube-ctx-label">current-context</span>${esc(currentContext)}</span>` : ''}
  ${currentContext ? `<button class="kube-copy-btn" type="button">Copy kubectl context</button>` : ''}
</div>
<div class="kube-warn"><span class="kube-warn-icon">\u{1F512}</span> Contains cluster credentials — certificate and token data is always redacted.</div>
${clusters.length ? `<div class="kube-sec"><h3>Clusters (${clusters.length})</h3><table class="kube-table"><thead><tr><th>Name</th><th>Server URL</th><th>TLS</th></tr></thead><tbody>${clustersRows}</tbody></table></div>` : ''}
${contexts.length ? `<div class="kube-sec"><h3>Contexts (${contexts.length})</h3><table class="kube-table"><thead><tr><th>Name</th><th>Cluster</th><th>User</th><th>Namespace</th></tr></thead><tbody>${contextsRows}</tbody></table></div>` : ''}
${users.length ? `<div class="kube-sec"><h3>Users (${users.length})</h3><table class="kube-table"><thead><tr><th>Name</th><th>Auth Type</th></tr></thead><tbody>${usersRows}</tbody></table></div>` : ''}`;

  // Wire up copy button
  const btn = host.querySelector('.kube-copy-btn');
  if (btn && currentContext) {
    const cmd = `kubectl config use-context ${currentContext}`;
    btn.addEventListener('click', () => {
      navigator.clipboard?.writeText(cmd).catch(() => {});
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = orig; }, 1500);
    });
  }

  return { parentNode: host };
}
