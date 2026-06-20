import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.asyncapi-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-asyncapi{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#FF6D6D;color:#fff;vertical-align:middle;margin-right:8px}
.aa-title{font-size:18px;font-weight:700;margin:0 0 2px}
.aa-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.aa-sec{margin:14px 0}
.aa-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.aa-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:6px 0;background:var(--bg,#fff)}
.aa-card-name{font:13px/1.4 ui-monospace,monospace;font-weight:700;margin-bottom:4px}
.aa-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px}
.aa-kv-k{color:var(--fg-2,#888);min-width:120px}
.aa-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.aa-pills{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px}
.aa-pill{display:inline-flex;align-items:center;font-size:11px;padding:2px 9px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.aa-pill.pub{background:#fff7ed;border-color:#fed7aa;color:#92400e}
.aa-pill.sub{background:#eff6ff;border-color:#bfdbfe;color:#1e40af}
.aa-proto{display:inline-block;font-size:11px;padding:2px 7px;border-radius:10px;font-weight:600;background:#ede9fe;border:1px solid #c4b5fd;color:#5b21b6;font-family:ui-monospace,monospace;margin-left:4px}
.aa-proto.kafka{background:#fef3c7;border-color:#fcd34d;color:#92400e}
.aa-proto.mqtt{background:#d1fae5;border-color:#6ee7b7;color:#065f46}
.aa-proto.amqp{background:#fee2e2;border-color:#fca5a5;color:#991b1b}
.aa-proto.ws{background:#e0f2fe;border-color:#7dd3fc;color:#075985}
.aa-proto.http{background:#ede9fe;border-color:#c4b5fd;color:#5b21b6}
.aa-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#fdf2f8;border:1px solid #f0abfc;color:#86198f;margin-left:4px}
.aa-warn{font-size:11px;color:var(--fg-2,#888);font-style:italic}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="aa-kv"><span class="aa-kv-k">${esc(label)}</span><span class="aa-kv-v">${esc(value)}</span></div>`;
}

function protoClass(proto) {
  if (!proto) return '';
  const p = String(proto).toLowerCase();
  if (p.startsWith('kafka')) return 'kafka';
  if (p.startsWith('mqtt')) return 'mqtt';
  if (p.startsWith('amqp')) return 'amqp';
  if (p === 'ws' || p === 'wss' || p.startsWith('websocket')) return 'ws';
  if (p === 'http' || p === 'https') return 'http';
  return '';
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const asyncapiVersion = cfg.asyncapi || '';
  const info = cfg.info || {};
  const title = info.title || '';
  const version = info.version || '';
  const description = info.description || '';
  const contact = info.contact || {};
  const license = info.license || {};

  // Servers
  const serversObj = cfg.servers || {};
  const servers = Object.entries(serversObj);
  const serversHtml = servers.length ? `
<div class="aa-sec"><h3>Servers (${servers.length})</h3>
<table style="width:100%;border-collapse:collapse;font-size:13px">
  <thead><tr>
    <th style="text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0)">Name</th>
    <th style="text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0)">URL</th>
    <th style="text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0)">Protocol</th>
  </tr></thead>
  <tbody>
${servers.map(([name, srv]) => {
    const url = srv.url || srv.host || '';
    const proto = srv.protocol || srv.binding || '';
    const security = Array.isArray(srv.security) && srv.security.length ? '[configured]' : null;
    const pcls = protoClass(proto);
    return `<tr>
      <td style="padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);font:12px/1.4 ui-monospace,monospace;font-weight:600">${esc(name)}</td>
      <td style="padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:12px">${esc(security ? url.replace(/:[^@]+@/, ':[configured]@') : url)}</td>
      <td style="padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0)">${proto ? `<span class="aa-proto ${esc(pcls)}">${esc(proto)}</span>` : ''}${security ? `<span class="aa-warn" style="margin-left:6px">auth: ${esc(security)}</span>` : ''}</td>
    </tr>`;
  }).join('')}
  </tbody>
</table></div>` : '';

  // Channels
  const channelsObj = cfg.channels || {};
  const channels = Object.entries(channelsObj);
  const channelsHtml = channels.length ? `
<div class="aa-sec"><h3>Channels (${channels.length})</h3>
${channels.slice(0, 15).map(([path, ch]) => {
    const hasSub = ch.subscribe != null;
    const hasPub = ch.publish != null;
    const subMsg = hasSub ? (ch.subscribe.message || {}) : null;
    const pubMsg = hasPub ? (ch.publish.message || {}) : null;
    const subName = subMsg ? (subMsg.name || subMsg['$ref'] || '') : '';
    const pubName = pubMsg ? (pubMsg.name || pubMsg['$ref'] || '') : '';
    const subSummary = hasSub ? (ch.subscribe.summary || ch.subscribe.operationId || '') : '';
    const pubSummary = hasPub ? (ch.publish.summary || ch.publish.operationId || '') : '';
    const desc = ch.description || '';
    const bindings = ch.bindings ? Object.keys(ch.bindings) : [];
    return `<div class="aa-card">
<div class="aa-card-name">${esc(path)}</div>
${desc ? `<div style="font-size:12px;color:var(--fg-2,#888);margin-bottom:4px">${esc(desc.length > 100 ? desc.slice(0, 100) + '…' : desc)}</div>` : ''}
<div class="aa-pills">
${hasSub ? `<span class="aa-pill sub">subscribe${subSummary ? ': ' + subSummary.slice(0, 40) : ''}${subName ? ' [' + String(subName).split('/').pop() + ']' : ''}</span>` : ''}
${hasPub ? `<span class="aa-pill pub">publish${pubSummary ? ': ' + pubSummary.slice(0, 40) : ''}${pubName ? ' [' + String(pubName).split('/').pop() + ']' : ''}</span>` : ''}
${bindings.map((b) => `<span class="aa-pill">${esc(b)} binding</span>`).join('')}
</div>
</div>`;
  }).join('')}
${channels.length > 15 ? `<div style="font-size:12px;color:var(--fg-2,#888);padding:4px 0">…and ${channels.length - 15} more channels</div>` : ''}
</div>` : '';

  // Components
  const components = cfg.components || {};
  const nSchemas = Object.keys(components.schemas || {}).length;
  const nMessages = Object.keys(components.messages || {}).length;
  const nSecSchemes = Object.keys(components.securitySchemes || {}).length;
  const componentsHtml = (nSchemas || nMessages || nSecSchemes) ? `
<div class="aa-sec"><h3>Components</h3>
<div class="aa-card">
${nSchemas ? kv('schemas', String(nSchemas)) : ''}
${nMessages ? kv('messages', String(nMessages)) : ''}
${nSecSchemes ? kv('securitySchemes', String(nSecSchemes) + ' (credentials masked)') : ''}
</div></div>` : '';

  // Info block
  const truncDesc = description.length > 200 ? description.slice(0, 200) + '…' : description;
  const infoHtml = (truncDesc || contact.name || contact.email || license.name) ? `
<div class="aa-sec"><h3>Info</h3><div class="aa-card">
${truncDesc ? `<div style="font-size:12px;margin-bottom:6px">${esc(truncDesc)}</div>` : ''}
${contact.name ? kv('contact', contact.name + (contact.email ? ' <' + contact.email + '>' : '')) : ''}
${!contact.name && contact.email ? kv('contact email', contact.email) : ''}
${license.name ? kv('license', license.name) : ''}
</div></div>` : '';

  const subParts = [
    asyncapiVersion ? `AsyncAPI ${asyncapiVersion}` : '',
    version ? `v${version}` : '',
    channels.length ? `${channels.length} channel${channels.length !== 1 ? 's' : ''}` : '',
    servers.length ? `${servers.length} server${servers.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean);

  const host = document.createElement('div');
  host.className = 'asyncapi-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-asyncapi">AsyncAPI</span>
  <span class="aa-title">${esc(title || 'Specification')}</span>
  ${channels.length ? `<span class="aa-tag">${channels.length} channel${channels.length !== 1 ? 's' : ''}</span>` : ''}
  ${servers.length ? `<span class="aa-tag">${servers.length} server${servers.length !== 1 ? 's' : ''}</span>` : ''}
</div>
<div class="aa-sub">${esc(subParts.join(' · '))}</div>
${infoHtml}${serversHtml}${channelsHtml}${componentsHtml}`;
  return { parentNode: host };
}
