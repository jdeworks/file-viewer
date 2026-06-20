import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.dt-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.dt-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1496FF;color:#fff;vertical-align:middle;margin-right:8px;}
.dt-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.dt-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.dt-sec{margin:14px 0;}
.dt-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.dt-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:6px 0;background:var(--bg,#fff);}
.dt-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.dt-kv-k{color:var(--fg-2,#888);min-width:160px;flex-shrink:0;}
.dt-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.dt-masked{color:var(--fg-2,#999);font-style:italic;}
.dt-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0;}
.dt-pill{display:inline-block;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.dt-on{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#dcfce7;border:1px solid #86efac;color:#166534;margin:2px 3px;}
.dt-off{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#f3f4f6;border:1px solid #d1d5db;color:#6b7280;margin:2px 3px;}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="dt-kv"><span class="dt-kv-k">${esc(label)}</span><span class="dt-kv-v">${esc(value)}</span></div>`;
}

function masked(label) {
  return `<div class="dt-kv"><span class="dt-kv-k">${esc(label)}</span><span class="dt-kv-v dt-masked">••••••••</span></div>`;
}

function boolBadge(label, val) {
  if (val == null) return '';
  const on = val === true || val === 'true' || val === 'enabled' || val === 1;
  return `<span class="${on ? 'dt-on' : 'dt-off'}">${esc(label)}: ${on ? 'on' : 'off'}</span>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || \'\') || [])[0] || {};
  } catch { cfg = {}; }

  // Support both top-level and nested under `dynatrace:` key
  const dt = cfg.dynatrace || cfg;

  const apiUrl = dt.apiUrl || dt['api-url'] || dt.apiurl || '';
  const environmentId = dt.environmentId || dt['environment-id'] || dt.environment || '';
  const hasApiToken = !!(dt.apiToken || dt['api-token'] || dt.apitoken);

  // Network zones
  const networkZone = dt.networkZone || dt['network-zone'] || dt.networkzone || '';
  const networkZones = Array.isArray(dt.networkZones) ? dt.networkZones : (networkZone ? [networkZone] : []);

  // Storage
  const storage = dt.storage || dt.storageSettings || {};
  const storagePath = storage.path || storage.location || '';
  const storageMaxSize = storage.maxSize || storage['max-size'] || storage.maxDiskSpaceMb || '';

  // Feature flags / capabilities
  const features = dt.features || dt.featureFlags || {};
  const featureEntries = Object.entries(features).filter(([, v]) => typeof v === 'boolean' || v === 'enabled' || v === 'disabled');

  // Proxy
  const proxy = dt.proxy || dt.proxyAddress || '';

  // Host metadata
  const hostGroup = dt.hostGroup || dt['host-group'] || '';
  const hostTags = Array.isArray(dt.hostTags) ? dt.hostTags : (dt.hostTags ? [dt.hostTags] : []);
  const infraOnly = dt.infraOnly || dt['infra-only'];

  const connectionHtml = `
<div class="dt-sec"><h3>Connection</h3><div class="dt-card">
${apiUrl ? kv('apiUrl', apiUrl) : ''}
${environmentId ? kv('environment', environmentId) : ''}
${hasApiToken ? masked('apiToken') : ''}
${proxy ? kv('proxy', proxy) : ''}
</div></div>`;

  const networkHtml = networkZones.length ? `
<div class="dt-sec"><h3>Network Zones</h3>
<div class="dt-pills">${networkZones.map((z) => `<span class="dt-pill">${esc(z)}</span>`).join('')}</div>
</div>` : '';

  const hostGroupHtml = (hostGroup || hostTags.length || infraOnly != null) ? `
<div class="dt-sec"><h3>Host Configuration</h3><div class="dt-card">
${hostGroup ? kv('hostGroup', hostGroup) : ''}
${infraOnly != null ? `<div style="margin-top:4px;">${boolBadge('infraOnly', infraOnly)}</div>` : ''}
${hostTags.length ? `<div class="dt-kv"><span class="dt-kv-k">hostTags</span><span class="dt-kv-v">${esc(hostTags.join(', '))}</span></div>` : ''}
</div></div>` : '';

  const storageHtml = (storagePath || storageMaxSize) ? `
<div class="dt-sec"><h3>Storage</h3><div class="dt-card">
${kv('path', storagePath)}
${storageMaxSize ? kv('maxSize', String(storageMaxSize)) : ''}
</div></div>` : '';

  const featuresHtml = featureEntries.length ? `
<div class="dt-sec"><h3>Feature Flags</h3>
<div>${featureEntries.map(([k, v]) => boolBadge(k, v)).join('')}</div>
</div>` : '';

  const sub = [
    environmentId || '',
    apiUrl ? apiUrl.replace(/^https?:\/\//, '').split('/')[0] : '',
    networkZones.length ? `${networkZones.length} network zone${networkZones.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'dt-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="dt-badge">Dynatrace</span>
  <span class="dt-title">OneAgent Configuration</span>
</div>
<div class="dt-sub">${esc(sub)}</div>
${connectionHtml}${networkHtml}${hostGroupHtml}${storageHtml}${featuresHtml}`;
  return { parentNode: host };
}
