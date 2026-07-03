import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SENSITIVE_RE = /SECRET|TOKEN|KEY|PASSWORD|API/i;

const CSS = `
.appyaml-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-appyaml{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#4285f4;color:#fff;vertical-align:middle;margin-right:8px;}
.appyaml-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.appyaml-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.appyaml-sec{margin:12px 0;}
.appyaml-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.appyaml-grid{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;margin:8px 0;}
.appyaml-key{font-size:12px;color:var(--fg-2,#888);}
.appyaml-val{font:12px ui-monospace,monospace;color:var(--accent,#4285f4);word-break:break-all;}
.appyaml-badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin-right:4px;}
.appyaml-badge.env-std{background:#e8f0fe;border-color:#aecbfa;color:#1a73e8;}
.appyaml-badge.env-flex{background:#fce8b2;border-color:#f9ab00;color:#e37400;}
.appyaml-table{width:100%;border-collapse:collapse;font-size:12px;margin:6px 0;}
.appyaml-table th{text-align:left;padding:5px 8px;background:var(--bg-2,#f6f8fa);border-bottom:2px solid var(--border,#e0e0e0);font-weight:600;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;letter-spacing:.03em;}
.appyaml-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.appyaml-table tr:last-child td{border-bottom:none;}
.appyaml-pills{display:flex;flex-wrap:wrap;gap:6px;}
.appyaml-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.appyaml-pill.masked{background:#fff7ed;border-color:#fed7aa;color:#92400e;}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
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
  const skipFiles = cfg.skip_files || [];
  const instanceClass = cfg.instance_class || '';
  const threadsafe = cfg.threadsafe;
  const apiVersion = cfg.api_version || '';

  const isFlex = env === 'flex' || env === 'flexible';
  const envBadgeClass = isFlex ? 'env-flex' : 'env-std';
  const envLabel = isFlex ? 'Flexible' : 'Standard';

  const parts = [];
  if (runtime) parts.push(runtime);
  if (service !== 'default') parts.push(`service: ${service}`);
  if (handlers.length) parts.push(`${handlers.length} handler${handlers.length !== 1 ? 's' : ''}`);

  const handlersHtml = handlers.slice(0, 8).map((h) => {
    const url = h.url || h.static_dir || h.static_files || '';
    const scriptVal = typeof h.script === 'string' ? h.script : (h.static_dir || h.static_files || '');
    const login = h.login || '';
    return `<tr><td>${esc(url)}</td><td>${esc(scriptVal)}</td><td>${esc(login)}</td></tr>`;
  }).join('');

  const scalingHtml = scaling && scalingType ? (() => {
    const rows = Object.entries(scaling).filter(([, v]) => v != null && typeof v !== 'object').slice(0, 6);
    return `<div class="appyaml-grid">${rows.map(([k, v]) => `<span class="appyaml-key">${esc(k.replace(/_/g, ' '))}</span><span class="appyaml-val">${esc(String(v))}</span>`).join('')}</div>`;
  })() : '';

  const envVarPills = envVarKeys.slice(0, 10).map((k) => {
    const masked = SENSITIVE_RE.test(k);
    return `<span class="appyaml-pill${masked ? ' masked' : ''}">${esc(k)}${masked ? ': [configured]' : ': ' + esc(String(envVars[k])).slice(0, 30)}</span>`;
  }).join('');

  const host = document.createElement('div');
  host.className = 'appyaml-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="appyaml-title"><span class="badge-appyaml">App Engine</span>app.yaml</div>
<div class="appyaml-sub">${esc(parts.join(' · ')) || 'Google App Engine configuration'}</div>

<div class="appyaml-sec">
  <div class="appyaml-grid">
    ${runtime ? `<span class="appyaml-key">runtime</span><span class="appyaml-val">${esc(runtime)}${apiVersion ? ` (api ${esc(apiVersion)})` : ''}</span>` : ''}
    <span class="appyaml-key">service</span><span class="appyaml-val">${esc(service)}</span>
    <span class="appyaml-key">environment</span><span class="appyaml-val"><span class="appyaml-badge ${envBadgeClass}">${envLabel}</span></span>
    ${instanceClass ? `<span class="appyaml-key">instance_class</span><span class="appyaml-val">${esc(instanceClass)}</span>` : ''}
    ${entrypoint ? `<span class="appyaml-key">entrypoint</span><span class="appyaml-val">${esc(String(entrypoint).slice(0, 60))}${String(entrypoint).length > 60 ? '…' : ''}</span>` : ''}
    ${threadsafe != null ? `<span class="appyaml-key">threadsafe</span><span class="appyaml-val">${esc(String(threadsafe))}</span>` : ''}
  </div>
</div>

${handlers.length ? `<div class="appyaml-sec"><h3>Handlers (${handlers.length})</h3>
<table class="appyaml-table"><thead><tr><th>URL</th><th>Script / Static</th><th>Login</th></tr></thead>
<tbody>${handlersHtml}</tbody></table>
${handlers.length > 8 ? `<div style="font-size:12px;color:var(--fg-2,#888);margin-top:4px">…and ${handlers.length - 8} more</div>` : ''}
</div>` : ''}

${scalingType ? `<div class="appyaml-sec"><h3>${esc(scalingType.replace(/_/g, ' '))}</h3>${scalingHtml}</div>` : ''}

${envVarKeys.length ? `<div class="appyaml-sec"><h3>Environment Variables (${envVarKeys.length})</h3><div class="appyaml-pills">${envVarPills}${envVarKeys.length > 10 ? `<span class="appyaml-pill">+${envVarKeys.length - 10}</span>` : ''}</div></div>` : ''}

${includes.length ? `<div class="appyaml-sec"><h3>Includes</h3><div class="appyaml-pills">${includes.map((i) => `<span class="appyaml-pill">${esc(String(i))}</span>`).join('')}</div></div>` : ''}

${skipFiles.length ? `<div class="appyaml-sec"><h3>Skip files</h3><div class="appyaml-pills">${(Array.isArray(skipFiles) ? skipFiles : [skipFiles]).map((i) => `<span class="appyaml-pill">${esc(String(i))}</span>`).join('')}</div></div>` : ''}
`;
  return { parentNode: host };
}
