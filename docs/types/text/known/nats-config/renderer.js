const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.nats-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-nats{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#27aae1;color:#fff;vertical-align:middle;margin-right:8px;}
.nats-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.nats-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.nats-sec{margin:12px 0;}
.nats-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.nats-kv{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0;}
.nats-kv-item{display:flex;gap:6px;align-items:baseline;font-size:12px;padding:4px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.nats-kv-item span:first-child{color:var(--fg-2,#888);}
.nats-kv-item span:last-child{font-family:ui-monospace,monospace;font-weight:600;}
.nats-pill{display:inline-block;font-size:12px;padding:2px 8px;border-radius:10px;background:#e3f7ff;border:1px solid #7dd3fc;color:#0369a1;margin:2px;}
`;

function parseLine(text, key) {
  const m = text.match(new RegExp(`^\\s*${key}\\s*[:=]\\s*(.+)$`, 'm'));
  return m ? m[1].trim().replace(/['"]/g, '') : null;
}

export function render(intake) {
  const text = intake.text || '';
  const filename = (intake.name || intake.filename || '').split('/').pop() || 'nats.conf';

  const host2 = parseLine(text, 'host');
  const port = parseLine(text, 'port');
  const httpPort = parseLine(text, 'http_port');
  const clusterName = parseLine(text, 'name') || parseLine(text, 'cluster_name');
  const maxConnections = parseLine(text, 'max_connections');
  const maxPayload = parseLine(text, 'max_payload');
  const hasJetstream = /jetstream\s*{|jetstream\s*:/i.test(text);
  const hasCluster = /cluster\s*{/i.test(text);
  const hasTls = /tls\s*{/i.test(text);

  const kvHtml = (label, val) => val
    ? `<div class="nats-kv-item"><span>${esc(label)}</span><span>${esc(val)}</span></div>`
    : '';

  const features = [
    hasJetstream && '<span class="nats-pill">JetStream</span>',
    hasCluster && '<span class="nats-pill">Cluster</span>',
    hasTls && '<span class="nats-pill">TLS</span>',
  ].filter(Boolean).join('');

  const host = document.createElement('div');
  host.className = 'nats-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="nats-title"><span class="badge-nats">NATS</span>${esc(filename)}</div>
<div class="nats-sub">NATS messaging server configuration</div>
<div class="nats-sec">
  <h3>Server Settings</h3>
  <div class="nats-kv">
    ${kvHtml('Host', host2)}
    ${kvHtml('Port', port)}
    ${kvHtml('HTTP Port', httpPort)}
    ${kvHtml('Cluster Name', clusterName)}
    ${kvHtml('Max Connections', maxConnections)}
    ${kvHtml('Max Payload', maxPayload)}
  </div>
</div>
${features ? `<div class="nats-sec"><h3>Features</h3>${features}</div>` : ''}`;

  return { parentNode: host };
}
