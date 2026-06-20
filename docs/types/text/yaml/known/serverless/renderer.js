import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sls-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-sls{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#fd5750;color:#fff;vertical-align:middle;margin-right:8px;}
.sls-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.sls-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.sls-sec{margin:12px 0;}
.sls-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.sls-provider{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0;}
.sls-kv{display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:4px 10px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.sls-kv-key{color:var(--fg-2,#888);font-size:11px;}
.sls-table{width:100%;border-collapse:collapse;font-size:13px;}
.sls-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.sls-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.sls-fn{font:12px/1.4 ui-monospace,monospace;font-weight:600;}
.sls-handler{font:11px/1.4 ui-monospace,monospace;color:var(--fg-2,#888);}
.sls-event{display:inline-block;font-size:11px;padding:1px 6px;border-radius:4px;background:#eff6ff;border:1px solid #93c5fd;color:#1d4ed8;margin:1px;}
.sls-pill{display:inline-flex;font-size:12px;padding:2px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:2px;}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const service = typeof cfg.service === 'string' ? cfg.service : (cfg.service?.name || '—');
  const provider = cfg.provider || {};
  const providerName = typeof provider === 'string' ? provider : (provider.name || '—');
  const runtime = provider.runtime || '';
  const region = provider.region || '';
  const stage = provider.stage || '';
  const memorySize = provider.memorySize;
  const timeout = provider.timeout;

  const functions = cfg.functions && typeof cfg.functions === 'object'
    ? Object.entries(cfg.functions)
    : [];

  const plugins = Array.isArray(cfg.plugins) ? cfg.plugins : [];
  const resources = cfg.resources
    ? (cfg.resources.Resources ? Object.keys(cfg.resources.Resources).length : 1)
    : 0;

  const host = document.createElement('div');
  host.className = 'sls-doc';

  const providerHtml = `<div class="sls-sec"><h3>Provider</h3><div class="sls-provider">
    <span class="sls-kv"><span class="sls-kv-key">cloud</span>${esc(providerName)}</span>
    ${runtime ? `<span class="sls-kv"><span class="sls-kv-key">runtime</span>${esc(runtime)}</span>` : ''}
    ${region ? `<span class="sls-kv"><span class="sls-kv-key">region</span>${esc(region)}</span>` : ''}
    ${stage ? `<span class="sls-kv"><span class="sls-kv-key">stage</span>${esc(stage)}</span>` : ''}
    ${memorySize ? `<span class="sls-kv"><span class="sls-kv-key">memory</span>${esc(memorySize)} MB</span>` : ''}
    ${timeout ? `<span class="sls-kv"><span class="sls-kv-key">timeout</span>${esc(timeout)}s</span>` : ''}
  </div></div>`;

  const fnRows = functions.slice(0, 20).map(([name, fn]) => {
    if (!fn || typeof fn !== 'object') return '';
    const handler = fn.handler || '';
    const events = Array.isArray(fn.events)
      ? fn.events.map((e) => {
          if (!e || typeof e !== 'object') return '';
          const evType = Object.keys(e)[0] || '';
          return evType ? `<span class="sls-event">${esc(evType)}</span>` : '';
        }).join('')
      : '';
    return `<tr>
      <td><span class="sls-fn">${esc(name)}</span></td>
      <td><span class="sls-handler">${esc(handler)}</span></td>
      <td>${events || '—'}</td>
    </tr>`;
  }).join('');

  const fnHtml = functions.length
    ? `<div class="sls-sec"><h3>Functions (${functions.length})</h3>
      <table class="sls-table">
        <thead><tr><th>Name</th><th>Handler</th><th>Events</th></tr></thead>
        <tbody>${fnRows}${functions.length > 20 ? `<tr><td colspan="3" style="color:var(--fg-2,#888);font-size:12px">…and ${functions.length - 20} more</td></tr>` : ''}</tbody>
      </table></div>`
    : '';

  const pluginsHtml = plugins.length
    ? `<div class="sls-sec"><h3>Plugins (${plugins.length})</h3><div class="sls-provider">${plugins.map((p) => `<span class="sls-pill">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const resourcesHtml = resources
    ? `<div class="sls-sec"><h3>Resources</h3><div class="sls-provider"><span class="sls-kv">${esc(resources)} CloudFormation resource${resources !== 1 ? 's' : ''}</span></div></div>`
    : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="sls-title"><span class="badge-sls">Serverless</span>${esc(service)}</div>
<div class="sls-sub">${functions.length} function${functions.length !== 1 ? 's' : ''}${plugins.length ? ` · ${plugins.length} plugin${plugins.length !== 1 ? 's' : ''}` : ''}${resources ? ` · ${resources} resource${resources !== 1 ? 's' : ''}` : ''}</div>
${providerHtml}${fnHtml}${pluginsHtml}${resourcesHtml}`;

  return { parentNode: host };
}
