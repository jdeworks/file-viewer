// Enhanced buf.gen.yaml viewer — shows version, managed mode, plugins table, and inputs.
import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.bufgen-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-bufgen{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0C5CF5;color:#fff;vertical-align:middle;margin-right:8px}
.bufgen-title{font-size:18px;font-weight:700;margin:0 0 4px}
.bufgen-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.bufgen-sec{margin:14px 0}
.bufgen-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px}
.bufgen-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin-bottom:8px}
.bufgen-row{display:flex;gap:8px;font-size:13px;padding:3px 0;border-bottom:1px solid var(--border,#f0f0f0)}
.bufgen-row:last-child{border-bottom:none}
.bufgen-key{color:var(--fg-2,#888);min-width:160px;flex-shrink:0;font-size:12px}
.bufgen-val{font-family:ui-monospace,monospace;word-break:break-all}
.bufgen-table{width:100%;border-collapse:collapse;font-size:13px}
.bufgen-table th{text-align:left;padding:5px 8px;border-bottom:2px solid var(--border,#e0e0e0);color:var(--fg-2,#888);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.04em}
.bufgen-table td{padding:5px 8px;border-bottom:1px solid var(--border,#f0f0f0);vertical-align:top}
.bufgen-table tr:last-child td{border-bottom:none}
.bufgen-plugin-name{font-family:ui-monospace,monospace;font-weight:600;color:#0C5CF5}
.bufgen-out{font-family:ui-monospace,monospace;color:var(--fg-2,#666);font-size:12px}
.bufgen-opts{font-size:12px;color:var(--fg-2,#555);font-family:ui-monospace,monospace}
.bufgen-strategy{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:#e0f2fe;border:1px solid #7dd3fc;color:#0369a1}
.bufgen-pill{display:inline-block;font-size:12px;padding:2px 9px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px 3px 2px 0}
.bufgen-on{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:#dcfce7;border:1px solid #86efac;color:#166534}
.bufgen-off{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:#fee2e2;border:1px solid #fca5a5;color:#991b1b}
`;

function fmtOpts(opt) {
  if (!opt) return '';
  if (Array.isArray(opt)) return opt.slice(0, 3).join(', ') + (opt.length > 3 ? ` +${opt.length - 3}` : '');
  if (typeof opt === 'object') {
    const entries = Object.entries(opt).slice(0, 3).map(([k, v]) => `${k}=${v}`);
    return entries.join(', ') + (Object.keys(opt).length > 3 ? ' …' : '');
  }
  return String(opt).slice(0, 60);
}

function pluginName(p) {
  return p.plugin || p.name || p.remote || p.local || '(unknown)';
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const version = cfg.version != null ? String(cfg.version) : '';
  const plugins = Array.isArray(cfg.plugins) ? cfg.plugins : [];
  const managed = cfg.managed || null;
  const inputs = Array.isArray(cfg.inputs) ? cfg.inputs : [];

  // Version row
  const versionHtml = version
    ? `<div class="bufgen-sec"><h3>Version</h3><div class="bufgen-card"><div class="bufgen-row"><span class="bufgen-key">version</span><span class="bufgen-val">${esc(version)}</span></div></div></div>`
    : '';

  // Managed section
  let managedHtml = '';
  if (managed) {
    const enabled = managed.enabled !== false;
    const goPrefix = managed.go_package_prefix?.default || managed.go_package_prefix || null;
    const javaPrefix = managed.java_package_prefix?.default || managed.java_package_prefix || null;
    const rows = [
      `<div class="bufgen-row"><span class="bufgen-key">enabled</span><span class="bufgen-val"><span class="${enabled ? 'bufgen-on' : 'bufgen-off'}">${enabled ? 'enabled' : 'disabled'}</span></span></div>`,
      goPrefix ? `<div class="bufgen-row"><span class="bufgen-key">go_package_prefix</span><span class="bufgen-val">${esc(String(goPrefix))}</span></div>` : '',
      javaPrefix ? `<div class="bufgen-row"><span class="bufgen-key">java_package_prefix</span><span class="bufgen-val">${esc(String(javaPrefix))}</span></div>` : '',
    ].filter(Boolean).join('');
    managedHtml = `<div class="bufgen-sec"><h3>Managed Mode</h3><div class="bufgen-card">${rows}</div></div>`;
  }

  // Plugins table
  let pluginsHtml = '';
  if (plugins.length) {
    const rows = plugins.map((p) => {
      const name = pluginName(p);
      const out = p.out || '';
      const opts = fmtOpts(p.opt || p.options);
      const strategy = p.strategy || '';
      return `<tr>
        <td><div class="bufgen-plugin-name">${esc(name)}</div></td>
        <td><div class="bufgen-out">${esc(out)}</div></td>
        <td><div class="bufgen-opts">${esc(opts)}</div></td>
        <td>${strategy ? `<span class="bufgen-strategy">${esc(strategy)}</span>` : ''}</td>
      </tr>`;
    }).join('');
    pluginsHtml = `<div class="bufgen-sec"><h3>Plugins (${plugins.length})</h3><div class="bufgen-card">
      <table class="bufgen-table">
        <thead><tr><th>Plugin</th><th>Output</th><th>Options</th><th>Strategy</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div></div>`;
  }

  // Inputs section
  let inputsHtml = '';
  if (inputs.length) {
    const pills = inputs.map((inp) => {
      const label = inp.module || inp.path || inp.directory || (typeof inp === 'string' ? inp : JSON.stringify(inp));
      return `<span class="bufgen-pill">${esc(String(label))}</span>`;
    }).join('');
    inputsHtml = `<div class="bufgen-sec"><h3>Inputs (${inputs.length})</h3><div class="bufgen-card">${pills}</div></div>`;
  }

  const sub = [
    version ? `v${version}` : '',
    `${plugins.length} plugin${plugins.length !== 1 ? 's' : ''}`,
    managed ? 'managed mode' : '',
    inputs.length ? `${inputs.length} input${inputs.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'bufgen-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="bufgen-title"><span class="badge-bufgen">Buf</span>buf.gen.yaml</div>
<div class="bufgen-sub">${esc(sub)}</div>
${versionHtml}${managedHtml}${pluginsHtml}${inputsHtml}`;
  return { parentNode: host };
}
