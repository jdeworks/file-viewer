import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.cfd-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.cfd-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#F48120;color:#fff;vertical-align:middle;margin-right:8px;}
.cfd-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.cfd-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.cfd-sec{margin:14px 0;}
.cfd-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.cfd-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:6px 0;background:var(--bg,#fff);}
.cfd-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.cfd-kv-k{color:var(--fg-2,#888);min-width:140px;flex-shrink:0;}
.cfd-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.cfd-table{width:100%;border-collapse:collapse;font-size:13px;}
.cfd-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.cfd-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
.cfd-catch{color:var(--fg-2,#888);font-style:italic;}
.cfd-chip{display:inline-flex;align-items:center;font-size:11px;padding:2px 8px;border-radius:10px;font-family:ui-monospace,monospace;}
.cfd-chip-warn{background:#fff7ed;border:1px solid #fed7aa;color:#c2410c;}
.cfd-chip-ok{background:#f0fdf4;border:1px solid #86efac;color:#166534;}
.cfd-chip-info{background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="cfd-kv"><span class="cfd-kv-k">${esc(label)}</span><span class="cfd-kv-v">${esc(value)}</span></div>`;
}

function maskSecret(val) {
  if (!val) return '';
  // mask credential paths / tokens that look sensitive
  return '[configured]';
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch {
    cfg = intake.parsed || {};
  }

  const tunnelId = cfg.tunnel || '';
  const credentialsFile = cfg['credentials-file'] || '';

  // Ingress rules
  const ingressRules = Array.isArray(cfg.ingress) ? cfg.ingress : [];

  // Warp routing
  const warpRouting = cfg['warp-routing'];
  const warpEnabled = warpRouting != null ? String(warpRouting.enabled ?? warpRouting) : null;

  // Metrics and log
  const metrics = cfg.metrics || '';
  const loglevel = cfg.loglevel || cfg['log-level'] || '';

  // Summary line
  const summaryParts = [];
  if (tunnelId) summaryParts.push(`tunnel ${tunnelId.toString().length > 8 ? tunnelId.toString().slice(0, 8) + '…' : tunnelId}`);
  if (ingressRules.length) summaryParts.push(`${ingressRules.length} ingress rule${ingressRules.length !== 1 ? 's' : ''}`);

  // Ingress table
  const ingressRowsHtml = ingressRules.map((rule) => {
    const hostname = rule.hostname || '';
    const service = rule.service || '';
    const noTlsVerify = rule.originRequest && rule.originRequest.noTLSVerify === true;
    const isCatchAll = !hostname;

    const hostnameCell = isCatchAll
      ? `<span class="cfd-catch">catch-all</span>`
      : `<span>${esc(hostname)}</span>`;

    const warnChip = noTlsVerify
      ? `<span class="cfd-chip cfd-chip-warn" title="noTLSVerify is enabled">⚠ noTLSVerify</span>`
      : '';

    return `<tr>
  <td>${hostnameCell}</td>
  <td>${esc(service)} ${warnChip}</td>
</tr>`;
  }).join('');

  const ingressHtml = ingressRules.length ? `<div class="cfd-sec">
  <h3>Ingress Rules (${ingressRules.length})</h3>
  <table class="cfd-table">
    <thead><tr><th>Hostname</th><th>Service</th></tr></thead>
    <tbody>${ingressRowsHtml}</tbody>
  </table>
</div>` : '';

  // Misc settings
  const miscKvs = [];
  if (credentialsFile) miscKvs.push(kv('credentials-file', credentialsFile));
  if (metrics) miscKvs.push(kv('metrics', metrics));
  if (loglevel) miscKvs.push(kv('loglevel', loglevel));
  if (warpEnabled != null) {
    miscKvs.push(`<div class="cfd-kv"><span class="cfd-kv-k">warp-routing</span><span class="cfd-chip ${warpEnabled === 'true' ? 'cfd-chip-ok' : 'cfd-chip-info'}">${warpEnabled === 'true' ? 'enabled' : 'disabled'}</span></div>`);
  }

  const miscHtml = miscKvs.length ? `<div class="cfd-sec">
  <h3>Settings</h3>
  <div class="cfd-card">${miscKvs.join('')}</div>
</div>` : '';

  // Tunnel ID section
  const tunnelHtml = tunnelId ? `<div class="cfd-sec">
  <h3>Tunnel</h3>
  <div class="cfd-card">
    ${kv('tunnel ID', String(tunnelId))}
  </div>
</div>` : '';

  const host = document.createElement('div');
  host.className = 'cfd-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="cfd-badge">Cloudflare</span>
  <span class="cfd-title">Cloudflare Tunnel</span>
</div>
<div class="cfd-sub">${esc(summaryParts.join(' · ') || 'cloudflared configuration')}</div>
${tunnelHtml}
${ingressHtml}
${miscHtml}`;

  return { parentNode: host };
}
