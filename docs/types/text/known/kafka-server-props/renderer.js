const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.kfk-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-kfk{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#231f20;color:#fff;vertical-align:middle;margin-right:8px;}
.kfk-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.kfk-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.kfk-sec{margin:12px 0;}
.kfk-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.kfk-kv{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0;}
.kfk-kv-item{display:flex;gap:6px;align-items:baseline;font-size:12px;padding:4px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.kfk-kv-item span:first-child{color:var(--fg-2,#888);}
.kfk-kv-item span:last-child{font-family:ui-monospace,monospace;font-weight:600;}
`;

function parseProp(text, key) {
  const m = text.match(new RegExp(`^\\s*${key}\\s*=\\s*(.+)$`, 'm'));
  return m ? m[1].trim() : null;
}

export function render(intake) {
  const text = intake.text || '';
  const filename = (intake.name || intake.filename || '').split('/').pop() || 'server.properties';

  const brokerId = parseProp(text, 'broker\\.id');
  const listeners = parseProp(text, 'listeners');
  const logDirs = parseProp(text, 'log\\.dirs');
  const zookeeperConnect = parseProp(text, 'zookeeper\\.connect');
  const numPartitions = parseProp(text, 'num\\.partitions');
  const replicationFactor = parseProp(text, 'default\\.replication\\.factor');
  const logRetentionHours = parseProp(text, 'log\\.retention\\.hours');

  const kvHtml = (label, val) => val
    ? `<div class="kfk-kv-item"><span>${esc(label)}</span><span>${esc(val)}</span></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'kfk-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="kfk-title"><span class="badge-kfk">Kafka</span>${esc(filename)}</div>
<div class="kfk-sub">Apache Kafka broker configuration</div>
<div class="kfk-sec">
  <h3>Broker Settings</h3>
  <div class="kfk-kv">
    ${kvHtml('Broker ID', brokerId)}
    ${kvHtml('Listeners', listeners)}
    ${kvHtml('Log Dirs', logDirs)}
    ${kvHtml('Partitions', numPartitions)}
    ${kvHtml('Replication Factor', replicationFactor)}
    ${kvHtml('Log Retention (h)', logRetentionHours)}
  </div>
</div>
${zookeeperConnect ? `<div class="kfk-sec"><h3>ZooKeeper</h3><div class="kfk-kv">${kvHtml('Connect', zookeeperConnect)}</div></div>` : ''}`;

  return { parentNode: host };
}
