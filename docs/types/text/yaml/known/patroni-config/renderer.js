import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.patroni-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-patroni{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#326CE5;color:#fff;vertical-align:middle;margin-right:8px;}
.patroni-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.patroni-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.patroni-sec{margin:14px 0;}
.patroni-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.patroni-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin:6px 0;}
.patroni-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.patroni-kv-k{color:var(--fg-2,#888);min-width:180px;font-family:ui-monospace,monospace;}
.patroni-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.patroni-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);letter-spacing:2px;}
.patroni-chip{display:inline-block;font-size:11px;font-weight:600;padding:2px 8px;border-radius:5px;margin-right:6px;vertical-align:middle;}
.patroni-chip-etcd{background:#419eda;color:#fff;}
.patroni-chip-consul{background:#e03875;color:#fff;}
.patroni-chip-zookeeper{background:#f96000;color:#fff;}
.patroni-chip-kubernetes{background:#326CE5;color:#fff;}
.patroni-chip-other{background:#6e7781;color:#fff;}
.patroni-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;}
.patroni-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
`;

function kv(label, value, masked) {
  if (value == null || value === '') return '';
  const display = masked
    ? `<span class="patroni-masked">[configured]</span>`
    : `<span class="patroni-kv-v">${esc(String(value))}</span>`;
  return `<div class="patroni-kv"><span class="patroni-kv-k">${esc(label)}</span>${display}</div>`;
}

function dcsChip(dcsType) {
  if (!dcsType) return '';
  const t = dcsType.toLowerCase();
  let cls = 'patroni-chip-other';
  if (t === 'etcd' || t === 'etcd3') cls = 'patroni-chip-etcd';
  else if (t === 'consul') cls = 'patroni-chip-consul';
  else if (t === 'zookeeper') cls = 'patroni-chip-zookeeper';
  else if (t === 'kubernetes') cls = 'patroni-chip-kubernetes';
  return `<span class="patroni-chip ${cls}">${esc(dcsType.toUpperCase())}</span>`;
}

function detectDcs(cfg) {
  const dcsKeys = ['etcd3', 'etcd', 'consul', 'zookeeper', 'kubernetes'];
  for (const k of dcsKeys) {
    if (cfg[k]) return { type: k, info: cfg[k] };
  }
  return null;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  const scope = cfg.scope || '';
  const name = cfg.name || '';
  const namespace = cfg.namespace || '';

  const restapi = cfg.restapi || {};
  const restapiListen = restapi.listen || '';
  const restapiConnect = restapi.connect_address || '';

  const dcs = detectDcs(cfg);
  const dcsType = dcs ? dcs.type : '';
  const dcsInfo = dcs ? dcs.info : {};
  const dcsHosts = dcsInfo.hosts || dcsInfo.host || '';

  const bootstrap = cfg.bootstrap || {};
  const bootstrapDcs = bootstrap.dcs || {};
  const ttl = bootstrapDcs.ttl != null ? String(bootstrapDcs.ttl) : '';
  const loopWait = bootstrapDcs.loop_wait != null ? String(bootstrapDcs.loop_wait) : '';
  const retryTimeout = bootstrapDcs.retry_timeout != null ? String(bootstrapDcs.retry_timeout) : '';

  const initdb = Array.isArray(bootstrap.initdb) ? bootstrap.initdb : [];
  const initdbParams = initdb.map((item) => {
    if (typeof item === 'string') return item;
    if (typeof item === 'object' && item !== null) return Object.entries(item).map(([k, v]) => `${k}: ${v}`).join(', ');
    return String(item);
  });

  const pg = cfg.postgresql || {};
  const pgListen = pg.listen || '';
  const pgConnect = pg.connect_address || '';
  const pgDataDir = pg.data_dir || '';
  const pgBinDir = pg.bin_dir || '';
  const pgAuth = pg.authentication || {};

  // Cluster info card
  const clusterHtml = `<div class="patroni-sec"><h3>Cluster</h3><div class="patroni-card">
${kv('scope (cluster)', scope)}
${kv('name (node)', name)}
${namespace ? kv('namespace', namespace) : ''}
</div></div>`;

  // REST API card
  const restapiHtml = (restapiListen || restapiConnect) ? `<div class="patroni-sec"><h3>REST API</h3><div class="patroni-card">
${kv('listen', restapiListen)}
${kv('connect_address', restapiConnect)}
</div></div>` : '';

  // DCS card
  const dcsHtml = dcsType ? `<div class="patroni-sec"><h3>DCS</h3><div class="patroni-card">
<div style="margin-bottom:6px;">${dcsChip(dcsType)}<span style="font-size:12px;color:var(--fg-2,#888)">distributed configuration store</span></div>
${dcsHosts ? `<div class="patroni-kv"><span class="patroni-kv-k">hosts</span><div class="patroni-pills">${String(dcsHosts).split(',').map((h) => `<span class="patroni-pill">${esc(h.trim())}</span>`).join('')}</div></div>` : ''}
</div></div>` : '';

  // PostgreSQL card
  const pgHtml = (pgDataDir || pgListen || pgConnect) ? `<div class="patroni-sec"><h3>PostgreSQL</h3><div class="patroni-card">
${kv('data_dir', pgDataDir)}
${kv('listen', pgListen)}
${kv('connect_address', pgConnect)}
${kv('bin_dir', pgBinDir)}
${Object.entries(pgAuth).map(([role, auth]) => {
    const pass = auth && auth.password;
    return [
      kv(`auth.${role}.username`, auth && auth.username),
      pass != null ? kv(`auth.${role}.password`, pass, true) : '',
    ].join('');
  }).join('')}
</div></div>` : '';

  // Bootstrap settings card
  const bootstrapHtml = (ttl || loopWait || retryTimeout || initdbParams.length) ? `<div class="patroni-sec"><h3>Bootstrap Settings</h3><div class="patroni-card">
${kv('ttl', ttl)}
${kv('loop_wait', loopWait)}
${kv('retry_timeout', retryTimeout)}
${initdbParams.length ? `<div class="patroni-kv"><span class="patroni-kv-k">initdb</span><div class="patroni-pills">${initdbParams.map((p) => `<span class="patroni-pill">${esc(p)}</span>`).join('')}</div></div>` : ''}
</div></div>` : '';

  const subParts = [];
  if (scope) subParts.push(`cluster: ${scope}`);
  if (name) subParts.push(`node: ${name}`);
  if (dcsType) subParts.push(`dcs: ${dcsType}`);

  const host = document.createElement('div');
  host.className = 'patroni-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-patroni">Patroni</span>
  <span class="patroni-title">HA Configuration</span>
</div>
<div class="patroni-sub">${esc(subParts.join(' · '))}</div>
${clusterHtml}${restapiHtml}${dcsHtml}${pgHtml}${bootstrapHtml}`;

  return { parentNode: host };
}
