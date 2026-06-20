const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rmq-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-rmq{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#ff6600;color:#fff;vertical-align:middle;margin-right:8px;}
.rmq-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.rmq-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.rmq-sec{margin:12px 0;}
.rmq-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.rmq-kv{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0;}
.rmq-kv-item{display:flex;gap:6px;align-items:baseline;font-size:12px;padding:4px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.rmq-kv-item span:first-child{color:var(--fg-2,#888);}
.rmq-kv-item span:last-child{font-family:ui-monospace,monospace;font-weight:600;}
`;

function parseProp(text, key) {
  const m = text.match(new RegExp(`^\\s*${key}\\s*=\\s*(.+)$`, 'm'));
  return m ? m[1].trim() : null;
}

export function render(intake) {
  const text = intake.text || '';
  const filename = (intake.name || intake.filename || '').split('/').pop() || 'rabbitmq.conf';

  const nodeName = parseProp(text, 'node\\.name') || parseProp(text, 'nodename');
  const listeners = parseProp(text, 'listeners\\.tcp\\.default');
  const tlsListeners = parseProp(text, 'listeners\\.ssl\\.default');
  const memLimit = parseProp(text, 'vm_memory_high_watermark\\.relative') || parseProp(text, 'vm_memory_high_watermark');
  const diskFree = parseProp(text, 'disk_free_limit\\.absolute') || parseProp(text, 'disk_free_limit\\.relative');
  const loopback = parseProp(text, 'loopback_users');
  const mgmtPort = parseProp(text, 'management\\.tcp\\.port');

  const kvHtml = (label, val) => val
    ? `<div class="rmq-kv-item"><span>${esc(label)}</span><span>${esc(val)}</span></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'rmq-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="rmq-title"><span class="badge-rmq">RabbitMQ</span>${esc(filename)}</div>
<div class="rmq-sub">RabbitMQ message broker configuration</div>
<div class="rmq-sec">
  <h3>Broker Settings</h3>
  <div class="rmq-kv">
    ${kvHtml('Node Name', nodeName)}
    ${kvHtml('AMQP Port', listeners)}
    ${kvHtml('TLS Port', tlsListeners)}
    ${kvHtml('Mgmt Port', mgmtPort)}
    ${kvHtml('Memory Limit', memLimit)}
    ${kvHtml('Disk Free Limit', diskFree)}
    ${kvHtml('Loopback Users', loopback)}
  </div>
</div>`;

  return { parentNode: host };
}
