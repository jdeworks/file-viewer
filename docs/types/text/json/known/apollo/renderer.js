const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.apl-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-apl{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#3f20ba;color:#fff;vertical-align:middle;margin-right:8px;}
.apl-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.apl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.apl-sec{margin:12px 0;}
.apl-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.apl-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 3px 1px 0;}
.apl-chip-list{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0;}
.apl-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;font-size:13px;margin:6px 0;}
.apl-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.apl-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;word-break:break-all;}
.apl-card{border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin:6px 0;background:var(--bg-2,#f6f8fa);}
.apl-card h4{font-size:13px;font-weight:700;margin:0 0 6px;}
`;

export function render(intake) {
  let cfg;
  try { cfg = JSON.parse(intake.text || '{}'); } catch {
    const host = document.createElement('div');
    host.className = 'apl-doc';
    host.innerHTML = `<style>${CSS}</style><div class="apl-title"><span class="badge-apl">Apollo</span>Invalid JSON</div>`;
    return { parentNode: host };
  }

  const client = cfg.client || {};
  const service = cfg.service || {};
  const rover = cfg.rover || {};

  const clientName = client.name || null;
  const clientSchema = client.service || client.localSchemaFile || null;
  const clientIncludes = Array.isArray(client.includes) ? client.includes : (client.includes ? [client.includes] : []);
  const clientExcludes = Array.isArray(client.excludes) ? client.excludes : [];

  const serviceName = service.name || null;
  const serviceEndpoint = service.endpoint?.url || service.url || null;
  const serviceLocalSchema = service.localSchemaFile || null;

  let clientHtml = '';
  if (clientName || clientSchema || clientIncludes.length) {
    clientHtml = `<div class="apl-sec"><h3>Client</h3><div class="apl-card">
      ${clientName ? `<h4>${esc(clientName)}</h4>` : ''}
      <div class="apl-kv">
        ${clientSchema ? `<span class="apl-k">schema / service</span><span class="apl-v">${esc(clientSchema)}</span>` : ''}
        ${clientIncludes.length ? `<span class="apl-k">includes</span><span class="apl-v">${clientIncludes.map(esc).join(', ')}</span>` : ''}
        ${clientExcludes.length ? `<span class="apl-k">excludes</span><span class="apl-v">${clientExcludes.map(esc).join(', ')}</span>` : ''}
      </div>
    </div></div>`;
  }

  let serviceHtml = '';
  if (serviceName || serviceEndpoint || serviceLocalSchema) {
    serviceHtml = `<div class="apl-sec"><h3>Service</h3><div class="apl-card">
      ${serviceName ? `<h4>${esc(serviceName)}</h4>` : ''}
      <div class="apl-kv">
        ${serviceEndpoint ? `<span class="apl-k">endpoint</span><span class="apl-v">${esc(serviceEndpoint)}</span>` : ''}
        ${serviceLocalSchema ? `<span class="apl-k">localSchemaFile</span><span class="apl-v">${esc(serviceLocalSchema)}</span>` : ''}
      </div>
    </div></div>`;
  }

  const roverKeys = Object.keys(rover);
  const roverHtml = roverKeys.length
    ? `<div class="apl-sec"><h3>Rover profiles (${roverKeys.length})</h3><div class="apl-chip-list">${roverKeys.map((k) => `<span class="apl-chip">${esc(k)}</span>`).join('')}</div></div>`
    : '';

  const sub = [
    clientName ? `client: ${clientName}` : (Object.keys(client).length ? 'client defined' : ''),
    serviceName ? `service: ${serviceName}` : (Object.keys(service).length ? 'service defined' : ''),
  ].filter(Boolean).join(' · ') || 'Apollo GraphQL config';

  const host = document.createElement('div');
  host.className = 'apl-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="apl-title"><span class="badge-apl">Apollo</span>Apollo Config</div>
<div class="apl-sub">${esc(sub)}</div>
${clientHtml}${serviceHtml}${roverHtml}`;

  return { parentNode: host };
}
