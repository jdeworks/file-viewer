const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.zkp-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-zkp{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e53e3e;color:#fff;vertical-align:middle;margin-right:8px;}
.zkp-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.zkp-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.zkp-sec{margin:12px 0;}
.zkp-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.zkp-kv{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0;}
.zkp-kv-item{display:flex;gap:6px;align-items:baseline;font-size:12px;padding:4px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.zkp-kv-item span:first-child{color:var(--fg-2,#888);}
.zkp-kv-item span:last-child{font-family:ui-monospace,monospace;font-weight:600;}
.zkp-pill{display:inline-block;font-size:12px;padding:2px 8px;border-radius:10px;background:#fff5f5;border:1px solid #fc8181;color:#c53030;margin:2px;font-family:ui-monospace,monospace;}
`;

function parseProp(text, key) {
  const m = text.match(new RegExp(`^\\s*${key}\\s*=\\s*(.+)$`, 'm'));
  return m ? m[1].trim() : null;
}

export function render(intake) {
  const text = intake.text || '';
  const filename = (intake.name || intake.filename || '').split('/').pop() || 'zoo.cfg';

  const dataDir = parseProp(text, 'dataDir');
  const clientPort = parseProp(text, 'clientPort');
  const tickTime = parseProp(text, 'tickTime');
  const initLimit = parseProp(text, 'initLimit');
  const syncLimit = parseProp(text, 'syncLimit');
  const maxClientCnxns = parseProp(text, 'maxClientCnxns');

  // Extract server ensemble entries: server.N=host:port1:port2
  const servers = [...text.matchAll(/^server\.(\d+)\s*=\s*(.+)$/gm)].map(m => `server.${m[1]}=${m[2].trim()}`);

  const kvHtml = (label, val) => val
    ? `<div class="zkp-kv-item"><span>${esc(label)}</span><span>${esc(val)}</span></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'zkp-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="zkp-title"><span class="badge-zkp">ZooKeeper</span>${esc(filename)}</div>
<div class="zkp-sub">Apache ZooKeeper configuration</div>
<div class="zkp-sec">
  <h3>Core Settings</h3>
  <div class="zkp-kv">
    ${kvHtml('Data Dir', dataDir)}
    ${kvHtml('Client Port', clientPort)}
    ${kvHtml('Tick Time', tickTime)}
    ${kvHtml('Init Limit', initLimit)}
    ${kvHtml('Sync Limit', syncLimit)}
    ${kvHtml('Max Client Cnxns', maxClientCnxns)}
  </div>
</div>
${servers.length ? `<div class="zkp-sec"><h3>Ensemble (${servers.length} server${servers.length !== 1 ? 's' : ''})</h3>${servers.map(s => `<span class="zkp-pill">${esc(s)}</span>`).join('')}</div>` : ''}`;

  return { parentNode: host };
}
