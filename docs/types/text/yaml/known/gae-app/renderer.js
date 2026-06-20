import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.gae-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-gae{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a73e8;color:#fff;vertical-align:middle;margin-right:8px;}
.gae-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.gae-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.gae-sec{margin:12px 0;}
.gae-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.gae-grid{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;margin:8px 0;}
.gae-key{font-size:12px;color:var(--fg-2,#888);}
.gae-val{font:12px ui-monospace,monospace;color:var(--accent,#1a73e8);word-break:break-all;}
.gae-badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin-right:4px;}
.gae-badge.env-std{background:#e8f0fe;border-color:#aecbfa;color:#1a73e8;}
.gae-badge.env-flex{background:#fce8b2;border-color:#f9ab00;color:#e37400;}
.gae-table{width:100%;border-collapse:collapse;font-size:12px;margin:6px 0;}
.gae-table th{text-align:left;padding:5px 8px;background:var(--bg-2,#f6f8fa);border-bottom:2px solid var(--border,#e0e0e0);font-weight:600;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.03em;}
.gae-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.gae-table tr:last-child td{border-bottom:none;}
.gae-pills{display:flex;flex-wrap:wrap;gap:6px;}
.gae-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || \'\') || [])[0] || {};
  } catch { cfg = {}; }

  const runtime = cfg.runtime || '';
  const service = cfg.service || 'default';
  const env = cfg.env || '';
  const entrypoint = cfg.entrypoint || (cfg.entrypoint_command ? cfg.entrypoint_command : '');
  const handlers = Array.isArray(cfg.handlers) ? cfg.handlers : [];
  const scaling = cfg.automatic_scaling || cfg.manual_scaling || cfg.basic_scaling || null;
  const scalingType = cfg.automatic_scaling ? 'automatic_scaling' : cfg.manual_scaling ? 'manual_scaling' : cfg.basic_scaling ? 'basic_scaling' : '';
  const envVars = cfg.env_variables || {};
  const envVarKeys = Object.keys(envVars);
  const includes = cfg.includes || [];
  const instanceClass = cfg.instance_class || '';
  const threadsafe = cfg.threadsafe;
  const apiVersion = cfg.api_version || '';

  const isStandard = env === 'standard' || (!env && runtime && !/^custom/.test(runtime));
  const isFlex = env === 'flex' || env === 'flexible';

  const envBadgeClass = isFlex ? 'env-flex' : 'env-std';
  const envLabel = isFlex ? 'Flexible' : 'Standard';

  const parts = [];
  if (runtime) parts.push(runtime);
  if (service !== 'default') parts.push(`service: ${service}`);
  if (handlers.length) parts.push(`${handlers.length} handler${handlers.length !== 1 ? 's' : ''}`);

  const handlersHtml = handlers.slice(0, 8).map((h) => {
    const url = h.url || h.static_dir || h.static_files || '';
    const target = h.script || h.static_dir ? 'static_dir' : h.static_files ? 'static_files' : h.redirect_http_response_code ? `redirect ${h.redirect_http_response_code}` : h.script || '';
    const scriptVal = typeof h.script === 'string' ? h.script : (h.static_dir || h.static_files || '');
    return `<tr><td>${esc(url)}</td><td>${esc(scriptVal || target)}</td><td>${h.login ? esc(h.login) : ''}</td></tr>`;
  }).join('');

  const scalingHtml = scaling && scalingType ? (() => {
    const rows = Object.entries(scaling).filter(([, v]) => v != null && typeof v !== 'object').slice(0, 6);
    return rows.map(([k, v]) => `<div class="gae-grid"><span class="gae-key">${esc(k.replace(/_/g, ' '))}</span><span class="gae-val">${esc(String(v))}</span></div>`).join('');
  })() : '';

  const host = document.createElement('div');
  host.className = 'gae-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="gae-title"><span class="badge-gae">App Engine</span>app.yaml</div>
<div class="gae-sub">${parts.join(' · ') || 'Google App Engine configuration'}</div>

<div class="gae-sec">
  <div class="gae-grid">
    ${runtime ? `<span class="gae-key">Runtime</span><span class="gae-val">${esc(runtime)}${apiVersion ? ` (api ${esc(apiVersion)})` : ''}</span>` : ''}
    <span class="gae-key">Service</span><span class="gae-val">${esc(service)}</span>
    <span class="gae-key">Environment</span><span class="gae-val"><span class="gae-badge ${envBadgeClass}">${envLabel}</span></span>
    ${instanceClass ? `<span class="gae-key">Instance class</span><span class="gae-val">${esc(instanceClass)}</span>` : ''}
    ${entrypoint ? `<span class="gae-key">Entrypoint</span><span class="gae-val">${esc(String(entrypoint).slice(0, 60))}${String(entrypoint).length > 60 ? '…' : ''}</span>` : ''}
    ${threadsafe != null ? `<span class="gae-key">Threadsafe</span><span class="gae-val">${esc(String(threadsafe))}</span>` : ''}
  </div>
</div>

${handlers.length ? `<div class="gae-sec"><h3>Handlers (${handlers.length})</h3>
<table class="gae-table"><thead><tr><th>URL</th><th>Script / Static</th><th>Login</th></tr></thead>
<tbody>${handlersHtml}</tbody></table>
${handlers.length > 8 ? `<div style="font-size:12px;color:var(--fg-2,#888);margin-top:4px">…and ${handlers.length - 8} more</div>` : ''}
</div>` : ''}

${scalingType ? `<div class="gae-sec"><h3>${esc(scalingType.replace(/_/g, ' '))}</h3>${scalingHtml}</div>` : ''}

${envVarKeys.length ? `<div class="gae-sec"><h3>Environment Variables</h3><div class="gae-pills">${envVarKeys.slice(0, 8).map((k) => `<span class="gae-pill">${esc(k)}</span>`).join('')}${envVarKeys.length > 8 ? `<span class="gae-pill">+${envVarKeys.length - 8}</span>` : ''}</div></div>` : ''}

${includes.length ? `<div class="gae-sec"><h3>Includes</h3><div class="gae-pills">${includes.map((i) => `<span class="gae-pill">${esc(String(i))}</span>`).join('')}</div></div>` : ''}
`;
  return { parentNode: host };
}
