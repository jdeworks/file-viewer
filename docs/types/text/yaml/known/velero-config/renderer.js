import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<span class="vl-k">${esc(label)}</span><span class="vl-v">${esc(String(value))}</span>`;
}

export async function render(intake) {
  const text = intake.text || '';
  let doc = {};
  try { doc = (jsYaml.loadAll(text) || [])[0] || {}; } catch { /* ignore */ }

  const kind = doc.kind || '';
  const meta = doc.metadata || {};
  const name = meta.name || '';
  const namespace = meta.namespace || '';
  const spec = doc.spec || {};

  const kvEntries = [];

  if (kind === 'BackupStorageLocation') {
    const provider = spec.provider || '';
    const bucket = (spec.objectStorage || {}).bucket || '';
    const prefix = (spec.objectStorage || {}).prefix || '';
    const region = (spec.config || {}).region || '';
    if (provider) kvEntries.push(kv('provider', provider));
    if (bucket) kvEntries.push(kv('bucket', bucket));
    if (prefix) kvEntries.push(kv('prefix', prefix));
    if (region) kvEntries.push(kv('region', region));
  } else if (kind === 'Schedule') {
    const schedule = spec.schedule || '';
    const tmpl = spec.template || {};
    const ttl = tmpl.ttl || spec.ttl || '';
    const includedNS = tmpl.includedNamespaces || spec.includedNamespaces || [];
    const excludedNS = tmpl.excludedNamespaces || spec.excludedNamespaces || [];
    const storageLocation = tmpl.storageLocation || spec.storageLocation || '';
    if (schedule) kvEntries.push(kv('schedule', schedule));
    if (ttl) kvEntries.push(kv('ttl', ttl));
    if (storageLocation) kvEntries.push(kv('storageLocation', storageLocation));
    if (includedNS.length) kvEntries.push(kv('includedNamespaces', includedNS.join(', ')));
    if (excludedNS.length) kvEntries.push(kv('excludedNamespaces', excludedNS.join(', ')));
  } else if (kind === 'Backup') {
    const ttl = spec.ttl || '';
    const storageLocation = spec.storageLocation || '';
    const includedNS = spec.includedNamespaces || [];
    const excludedNS = spec.excludedNamespaces || [];
    if (ttl) kvEntries.push(kv('ttl', ttl));
    if (storageLocation) kvEntries.push(kv('storageLocation', storageLocation));
    if (includedNS.length) kvEntries.push(kv('includedNamespaces', includedNS.join(', ')));
    if (excludedNS.length) kvEntries.push(kv('excludedNamespaces', excludedNS.join(', ')));
  }

  const host = document.createElement('div');
  host.className = 'vl-doc';
  host.innerHTML = `<style>
.vl-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-vl{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#059669;color:#fff;vertical-align:middle;margin-right:8px;}
.vl-kind-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#047857;color:#fff;margin-right:6px;vertical-align:middle;}
.vl-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.vl-meta{font-size:12px;color:var(--fg-2,#888);margin:2px 0 12px;}
.vl-sec{margin:12px 0;}
.vl-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.vl-kv{display:grid;grid-template-columns:max-content 1fr;gap:5px 16px;font-size:13px;margin:6px 0;}
.vl-k{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);}
.vl-v{font:12px/1.6 ui-monospace,monospace;font-weight:600;}
</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
  <span class="badge-vl">Velero</span>
  ${kind ? `<span class="vl-kind-badge">${esc(kind)}</span>` : ''}
  ${name ? `<span class="vl-title">${esc(name)}</span>` : ''}
</div>
${namespace ? `<div class="vl-meta">namespace: ${esc(namespace)}</div>` : ''}
${kvEntries.length ? `<div class="vl-sec"><h3>Config</h3><div class="vl-kv">${kvEntries.join('')}</div></div>` : '<div style="color:var(--fg-2,#888);font-size:13px;">No config details detected.</div>'}`;

  return { parentNode: host };
}
