import jsYaml from '../../../../vendor/js-yaml/js-yaml.min.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SENSITIVE = /password|secret|key|token|pass|auth|pwd/i;

function mask(k, v) {
  if (v == null || v === '') return '';
  if (SENSITIVE.test(k)) return '••••••••';
  return String(v);
}

const CSS = `
.mg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-mg{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00684a;color:#fff;vertical-align:middle;margin-right:8px;}
.mg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.mg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.mg-sec{margin:14px 0;}
.mg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.mg-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.mg-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.mg-kv-k{color:var(--fg-2,#888);min-width:180px;font-family:ui-monospace,monospace;}
.mg-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.mg-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);letter-spacing:2px;}
.mg-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.mg-pill.on{background:#dcfce7;border-color:#86efac;color:#166534;}
.mg-pill.warn{background:#fff7ed;border-color:#fed7aa;color:#c2410c;}
`;

function kv(label, rawKey, value) {
  if (value == null || value === '') return '';
  const isMasked = SENSITIVE.test(rawKey);
  const display = isMasked
    ? `<span class="mg-masked">••••••••</span>`
    : `<span class="mg-kv-v">${esc(String(value))}</span>`;
  return `<div class="mg-kv"><span class="mg-kv-k">${esc(label)}</span>${display}</div>`;
}

function get(obj, ...path) {
  let cur = obj;
  for (const key of path) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[key];
  }
  return cur;
}

export function render(intake) {
  const text = intake.text || '';
  let cfg = {};
  try {
    cfg = jsYaml.load(text) || {};
  } catch {
    // fall back to empty
  }

  const host = document.createElement('div');
  host.className = 'mg-doc';

  // Storage
  const dbPath = get(cfg, 'storage', 'dbPath');
  const engine = get(cfg, 'storage', 'engine');
  const journalEnabled = get(cfg, 'storage', 'journal', 'enabled');
  const storageHtml = (dbPath || engine || journalEnabled != null) ? `
<div class="mg-sec"><h3>Storage</h3><div class="mg-card">
${kv('storage.dbPath', 'dbPath', dbPath)}
${kv('storage.engine', 'engine', engine)}
${journalEnabled != null ? kv('storage.journal.enabled', 'enabled', String(journalEnabled)) : ''}
</div></div>` : '';

  // Network
  const port = get(cfg, 'net', 'port');
  const bindIp = get(cfg, 'net', 'bindIp');
  const tls = get(cfg, 'net', 'tls', 'mode') || get(cfg, 'net', 'ssl', 'mode');
  const netHtml = (port || bindIp || tls) ? `
<div class="mg-sec"><h3>Network</h3><div class="mg-card">
${kv('net.port', 'port', port)}
${kv('net.bindIp', 'bindIp', bindIp)}
${tls ? kv('net.tls.mode', 'tls', tls) : ''}
</div></div>` : '';

  // Replication
  const replSetName = get(cfg, 'replication', 'replSetName');
  const oplogSize = get(cfg, 'replication', 'oplogSizeMB');
  const replHtml = replSetName ? `
<div class="mg-sec"><h3>Replication</h3><div class="mg-card">
${kv('replication.replSetName', 'replSetName', replSetName)}
${kv('replication.oplogSizeMB', 'oplogSizeMB', oplogSize)}
</div></div>` : '';

  // Security
  const authorization = get(cfg, 'security', 'authorization');
  const keyFile = get(cfg, 'security', 'keyFile');
  const secHtml = (authorization || keyFile) ? `
<div class="mg-sec"><h3>Security</h3><div class="mg-card">
${kv('security.authorization', 'authorization', authorization)}
${keyFile ? kv('security.keyFile', 'keyFile', keyFile) : ''}
</div></div>` : '';

  // System Log
  const logDest = get(cfg, 'systemLog', 'destination');
  const logPath = get(cfg, 'systemLog', 'path');
  const logAppend = get(cfg, 'systemLog', 'logAppend');
  const logHtml = (logDest || logPath) ? `
<div class="mg-sec"><h3>System Log</h3><div class="mg-card">
${kv('systemLog.destination', 'destination', logDest)}
${kv('systemLog.path', 'path', logPath)}
${logAppend != null ? kv('systemLog.logAppend', 'logAppend', String(logAppend)) : ''}
</div></div>` : '';

  // Summary
  const subParts = [];
  if (port) subParts.push(`port ${port}`);
  if (bindIp) subParts.push(`bind ${bindIp}`);
  if (replSetName) subParts.push(`replSet ${replSetName}`);
  if (authorization) subParts.push(`auth: ${authorization}`);

  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-mg">MongoDB</span>
  <span class="mg-title">Server Configuration</span>
</div>
<div class="mg-sub">${esc(subParts.join(' · '))}</div>
${storageHtml}${netHtml}${replHtml}${secHtml}${logHtml}`;

  return { parentNode: host };
}
