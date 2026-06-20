import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sam-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-sam{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e8711a;color:#fff;vertical-align:middle;margin-right:8px;}
.sam-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.sam-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.sam-sec{margin:14px 0;}
.sam-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.sam-table{width:100%;border-collapse:collapse;font-size:13px;}
.sam-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.sam-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.sam-mono{font:12px ui-monospace,monospace;}
.sam-chips{display:flex;flex-wrap:wrap;gap:5px;margin:4px 0;}
.sam-chip{display:inline-block;font-size:11px;padding:2px 8px;border-radius:4px;border:1px solid var(--border,#e0e0e0);background:var(--bg-2,#f6f8fa);font-family:ui-monospace,monospace;}
.sam-chip.fn{background:#e8f5e9;border-color:#a5d6a7;color:#1b5e20;}
.sam-chip.api{background:#e0f7fa;border-color:#80deea;color:#006064;}
.sam-chip.layer{background:#f3e5f5;border-color:#ce93d8;color:#4a148c;}
.sam-chip.other{background:var(--bg-2,#f6f8fa);}
.sam-kv{display:flex;gap:10px;align-items:baseline;margin:3px 0;}
.sam-key{font-size:12px;color:var(--fg-2,#888);min-width:120px;}
.sam-val{font:12px ui-monospace,monospace;font-weight:600;}
`;

function fnChipClass(type) {
  if (/Serverless::Function/i.test(type)) return 'fn';
  if (/Serverless::Api|Serverless::HttpApi/i.test(type)) return 'api';
  if (/Serverless::LayerVersion/i.test(type)) return 'layer';
  return 'other';
}

function makeCfnSchema(jsYaml) {
  const tagNames = ['Sub', 'Ref', 'GetAtt', 'If', 'Select', 'Split', 'Join', 'Base64',
    'FindInMap', 'GetAZs', 'ImportValue', 'Length', 'Transform', 'ValueOf', 'Condition', 'And', 'Or', 'Not', 'Equals'];
  const types = tagNames.flatMap((tag) => ['scalar', 'sequence', 'mapping'].map((kind) =>
    new jsYaml.Type('!' + tag, { kind, construct: (d) => ({ [tag]: d }) })));
  return jsYaml.DEFAULT_SCHEMA.extend(types);
}

export async function render(intake) {
  const jsYaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
  let tpl = {};
  const cfnSchema = makeCfnSchema(jsYaml);
  try { tpl = jsYaml.load(intake.text || '', { schema: cfnSchema }) || {}; } catch { tpl = {}; }

  const transform = tpl.Transform || '';
  const description = tpl.Description || '';
  const globals = tpl.Globals || {};
  const parameters = tpl.Parameters || {};
  const resources = tpl.Resources || {};

  const paramEntries = Object.entries(parameters);
  const resourceEntries = Object.entries(resources);
  const functions = resourceEntries.filter(([, v]) => v && /Serverless::Function/i.test(v.Type || ''));
  const apis = resourceEntries.filter(([, v]) => v && /Serverless::Api|Serverless::HttpApi/i.test(v.Type || ''));
  const others = resourceEntries.filter(([, v]) => v && !/Serverless::/i.test(v.Type || ''));

  // Globals summary
  const globalFn = globals.Function || {};
  const globalApi = globals.Api || {};

  const host = document.createElement('div');
  host.className = 'sam-doc';

  const transformStr = Array.isArray(transform) ? transform.join(', ') : String(transform);

  // Globals
  const globalsHtml = (Object.keys(globalFn).length || Object.keys(globalApi).length) ? `
<div class="sam-sec"><h3>Globals</h3>
${Object.keys(globalFn).length ? `<div style="margin-bottom:6px;"><span style="font-size:11px;font-weight:600;color:var(--fg-2,#888);">Function</span>
${[
  globalFn.Runtime && `<div class="sam-kv"><span class="sam-key">Runtime</span><span class="sam-val">${esc(globalFn.Runtime)}</span></div>`,
  globalFn.Handler && `<div class="sam-kv"><span class="sam-key">Handler</span><span class="sam-val">${esc(globalFn.Handler)}</span></div>`,
  globalFn.Timeout && `<div class="sam-kv"><span class="sam-key">Timeout</span><span class="sam-val">${esc(globalFn.Timeout)}s</span></div>`,
  globalFn.MemorySize && `<div class="sam-kv"><span class="sam-key">MemorySize</span><span class="sam-val">${esc(globalFn.MemorySize)} MB</span></div>`,
].filter(Boolean).join('')}
</div>` : ''}
${Object.keys(globalApi).length ? `<div><span style="font-size:11px;font-weight:600;color:var(--fg-2,#888);">Api</span>
${[
  globalApi.Cors && `<div class="sam-kv"><span class="sam-key">Cors</span><span class="sam-val">${typeof globalApi.Cors === 'string' ? esc(globalApi.Cors) : 'enabled'}</span></div>`,
  globalApi.Auth && `<div class="sam-kv"><span class="sam-key">Auth</span><span class="sam-val">${esc(globalApi.Auth.DefaultAuthorizer || 'configured')}</span></div>`,
].filter(Boolean).join('')}
</div>` : ''}
</div>` : '';

  // Functions
  const fnHtml = functions.length ? `
<div class="sam-sec"><h3>Functions (${functions.length})</h3>
<table class="sam-table">
<thead><tr><th>Name</th><th>Runtime</th><th>Handler</th><th>Memory</th></tr></thead>
<tbody>${functions.slice(0, 20).map(([name, val]) => {
    const props = val.Properties || {};
    return `<tr>
<td><span class="sam-mono">${esc(name)}</span></td>
<td><span class="sam-mono">${esc(props.Runtime || globalFn.Runtime || '—')}</span></td>
<td><span class="sam-mono">${esc(props.Handler || globalFn.Handler || '—')}</span></td>
<td><span class="sam-mono">${esc(props.MemorySize || globalFn.MemorySize || '128')} MB</span></td>
</tr>`;
  }).join('')}</tbody>
</table></div>` : '';

  // APIs
  const apiHtml = apis.length ? `
<div class="sam-sec"><h3>APIs (${apis.length})</h3>
<div class="sam-chips">${apis.map(([name]) => `<span class="sam-chip api">${esc(name)}</span>`).join('')}</div>
</div>` : '';

  // Parameters
  const paramsHtml = paramEntries.length ? `
<div class="sam-sec"><h3>Parameters (${paramEntries.length})</h3>
<table class="sam-table">
<thead><tr><th>Name</th><th>Type</th><th>Default</th></tr></thead>
<tbody>${paramEntries.slice(0, 15).map(([k, v]) => {
    const type = (v && v.Type) ? v.Type : '—';
    const def = (v && v.Default != null) ? String(v.Default) : '—';
    return `<tr><td><span class="sam-mono">${esc(k)}</span></td><td><span class="sam-mono">${esc(type)}</span></td><td><span class="sam-mono">${esc(def)}</span></td></tr>`;
  }).join('')}</tbody>
</table></div>` : '';

  const otherCount = others.length;

  host.innerHTML = `<style>${CSS}</style>
<div class="sam-title"><span class="badge-sam">AWS SAM</span>${esc(description || 'SAM Template')}</div>
<div class="sam-sub">${transformStr ? `Transform: ${esc(transformStr)} · ` : ''}${functions.length} function${functions.length !== 1 ? 's' : ''}${apis.length ? ` · ${apis.length} API${apis.length !== 1 ? 's' : ''}` : ''}${otherCount ? ` · ${otherCount} other resource${otherCount !== 1 ? 's' : ''}` : ''}</div>
${globalsHtml}
${fnHtml}
${apiHtml}
${paramsHtml}`;

  return { parentNode: host };
}
