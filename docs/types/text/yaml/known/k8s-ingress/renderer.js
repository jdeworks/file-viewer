import jsYaml from '../../../../vendor/js-yaml/js-yaml.min.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function lockIcon() {
  return `<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style="vertical-align:middle;margin-right:3px"><path d="M11.5 1a3.5 3.5 0 0 0-3.5 3.5V7H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1H9.5V4.5a2 2 0 1 1 4 0V7h1V4.5A3.5 3.5 0 0 0 11.5 1Z"/></svg>`;
}

function renderTLS(tlsList) {
  if (!tlsList || !tlsList.length) return '';
  const rows = tlsList.flatMap(t => {
    const hosts = t.hosts || ['(default cert)'];
    const secret = t.secretName || '';
    return hosts.map(h => `<tr>
      <td style="padding:6px 10px 6px 0;border-bottom:1px solid var(--border,#e0e0e0);font-size:13px;color:#00897b">${lockIcon()}${esc(h)}</td>
      <td style="padding:6px 0;border-bottom:1px solid var(--border,#e0e0e0);font-size:12.5px;font-family:ui-monospace,monospace;color:var(--fg-2,#888)">${esc(secret)}</td>
    </tr>`);
  });
  return `<div class="ing-sec">
  <h3>TLS (${rows.length} host${rows.length !== 1 ? 's' : ''})</h3>
  <table style="width:100%;border-collapse:collapse">
    <thead><tr>
      <th style="text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.03em;border-bottom:2px solid var(--border,#e0e0e0);padding:4px 10px 4px 0">Host</th>
      <th style="text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.03em;border-bottom:2px solid var(--border,#e0e0e0);padding:4px 0 4px 0">Secret</th>
    </tr></thead>
    <tbody>${rows.join('')}</tbody>
  </table>
</div>`;
}

function renderRoutes(rules) {
  if (!rules || !rules.length) return '<p style="color:var(--fg-2,#888);font-size:13px">No routing rules defined.</p>';
  const rows = rules.flatMap(rule => {
    const host = rule.host || '*';
    const http = rule.http || {};
    const paths = http.paths || [];
    if (!paths.length) {
      return [`<tr>
        <td style="padding:7px 10px 7px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:12.5px">${esc(host)}</td>
        <td style="padding:7px 10px 7px 0;border-bottom:1px solid var(--border,#e0e0e0);font-size:12.5px;color:var(--fg-2,#888)">—</td>
        <td style="padding:7px 0;border-bottom:1px solid var(--border,#e0e0e0);font-size:12.5px;color:var(--fg-2,#888)">—</td>
        <td style="padding:7px 0;border-bottom:1px solid var(--border,#e0e0e0);font-size:12px;color:var(--fg-2,#888)">—</td>
      </tr>`];
    }
    return paths.map((p, i) => {
      const svc = p.backend?.service || p.backend || {};
      const svcName = svc.name || svc.serviceName || '?';
      const svcPort = svc.port?.number ?? svc.port?.name ?? svc.servicePort ?? '?';
      const pathType = p.pathType || '';
      return `<tr>
        <td style="padding:7px 10px 7px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:12.5px">${i === 0 ? esc(host) : ''}</td>
        <td style="padding:7px 10px 7px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:12.5px">${esc(p.path || '/')}</td>
        <td style="padding:7px 10px 7px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:12.5px;color:#0969da">${esc(svcName)}:${esc(svcPort)}</td>
        <td style="padding:7px 0;border-bottom:1px solid var(--border,#e0e0e0);font-size:11px;color:var(--fg-2,#888)">${esc(pathType)}</td>
      </tr>`;
    });
  });

  return `<table style="width:100%;border-collapse:collapse;font-size:13px">
    <thead><tr>
      <th style="text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.03em;border-bottom:2px solid var(--border,#e0e0e0);padding:4px 10px 4px 0">Host</th>
      <th style="text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.03em;border-bottom:2px solid var(--border,#e0e0e0);padding:4px 10px 4px 0">Path</th>
      <th style="text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.03em;border-bottom:2px solid var(--border,#e0e0e0);padding:4px 10px 4px 0">Service:Port</th>
      <th style="text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.03em;border-bottom:2px solid var(--border,#e0e0e0);padding:4px 0 4px 0">PathType</th>
    </tr></thead>
    <tbody>${rows.join('')}</tbody>
  </table>`;
}

export async function render(intake) {
  const text = intake.text || '';
  let doc = {};
  try { doc = jsYaml.load(text) || {}; } catch { /* fall through */ }

  const meta = doc.metadata || {};
  const spec = doc.spec || {};
  const annotations = meta.annotations || {};
  const name = meta.name || '';
  const namespace = meta.namespace || '';
  const ingressClassName = spec.ingressClassName || annotations['kubernetes.io/ingress.class'] || '';
  const rules = spec.rules || [];
  const tls = spec.tls || [];
  const annKeys = Object.keys(annotations);

  const host = document.createElement('div');
  host.className = 'ing-doc';

  host.innerHTML = `<style>
.ing-doc{padding:16px 18px;max-width:960px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;}
.ing-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#326CE5;color:#fff;margin-right:8px;vertical-align:middle;}
.ing-kind{font-size:19px;font-weight:700;margin:0;}
.ing-api{font-size:12px;color:var(--fg-2,#888);margin:2px 0 10px;}
.ing-sec{margin:16px 0;}
.ing-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.ing-tag{display:inline-block;padding:1px 7px;border-radius:4px;background:var(--bg-3,#eee);font-size:12px;margin:2px 2px 0 0;}
</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="ing-badge">K8s Ingress</span>
  <span class="ing-kind">Ingress</span>
</div>
<div class="ing-api">${esc(doc.apiVersion || '')}</div>
<div class="ing-sec">
  <table style="border-collapse:collapse;font-size:13px">
    <tbody>
      ${name ? `<tr><td style="padding:4px 12px 4px 0;color:var(--fg-2,#888);font-size:12.5px">Name</td><td style="font-family:ui-monospace,monospace">${esc(name)}</td></tr>` : ''}
      ${namespace ? `<tr><td style="padding:4px 12px 4px 0;color:var(--fg-2,#888);font-size:12.5px">Namespace</td><td><span class="ing-tag">${esc(namespace)}</span></td></tr>` : ''}
      ${ingressClassName ? `<tr><td style="padding:4px 12px 4px 0;color:var(--fg-2,#888);font-size:12.5px">Class</td><td><span class="ing-tag">${esc(ingressClassName)}</span></td></tr>` : ''}
    </tbody>
  </table>
</div>
${tls.length ? renderTLS(tls) : ''}
<div class="ing-sec">
  <h3>Routing Rules (${rules.length})</h3>
  ${renderRoutes(rules)}
</div>
${annKeys.length ? `<div class="ing-sec">
  <h3>Annotations (${annKeys.length})</h3>
  <div style="display:flex;flex-wrap:wrap;gap:4px">${annKeys.map(k => `<span class="ing-tag" style="font-family:ui-monospace,monospace;font-size:11px" title="${esc(annotations[k])}">${esc(k)}</span>`).join('')}</div>
</div>` : ''}`;

  return { parentNode: host };
}
