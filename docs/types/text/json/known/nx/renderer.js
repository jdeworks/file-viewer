const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.nx-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-nx{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#002f6c;color:#fff;vertical-align:middle;margin-right:8px;}
.nx-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.nx-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.nx-sec{margin:12px 0;}
.nx-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.nx-pills{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0;}
.nx-pill{display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.nx-plugin{font-size:12px;padding:3px 10px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;font-family:ui-monospace,monospace;}
.nx-kv{font-size:12px;color:var(--fg-2,#888);}
.nx-cloud-ok{background:#dcfce7;border-color:#86efac;color:#166534;}
`;

export function render(intake) {
  const cfg = intake.parsed || {};

  const npmScope = cfg.npmScope || null;
  const defaultProject = cfg.defaultProject || null;
  const targetDefaults = cfg.targetDefaults ? Object.keys(cfg.targetDefaults) : [];
  const namedInputs = cfg.namedInputs ? Object.keys(cfg.namedInputs) : [];
  const plugins = Array.isArray(cfg.plugins) ? cfg.plugins.map((p) => typeof p === 'string' ? p : (p.plugin || String(p))) : [];
  const cacheDir = cfg.cacheDirectory || null;
  const tasksRunnerOpts = cfg.tasksRunnerOptions;
  const defaultBase = cfg.affected?.defaultBase || cfg.defaultBase || null;
  const hasCloudToken = Boolean(cfg.nxCloudAccessToken || cfg.nxCloudId);

  const host = document.createElement('div');
  host.className = 'nx-doc';

  const metaHtml = (npmScope || defaultProject || defaultBase)
    ? `<div class="nx-sec"><h3>Workspace</h3><div class="nx-pills">
        ${npmScope ? `<span class="nx-pill">scope: @${esc(npmScope)}</span>` : ''}
        ${defaultProject ? `<span class="nx-pill">default: ${esc(defaultProject)}</span>` : ''}
        ${defaultBase ? `<span class="nx-pill">base: ${esc(defaultBase)}</span>` : ''}
      </div></div>`
    : '';

  const targetsHtml = targetDefaults.length
    ? `<div class="nx-sec"><h3>Target defaults (${targetDefaults.length})</h3><div class="nx-pills">${targetDefaults.map((t) => `<span class="nx-pill">${esc(t)}</span>`).join('')}</div></div>`
    : '';

  const inputsHtml = namedInputs.length
    ? `<div class="nx-sec"><h3>Named inputs (${namedInputs.length})</h3><div class="nx-pills">${namedInputs.map((n) => `<span class="nx-pill">${esc(n)}</span>`).join('')}</div></div>`
    : '';

  const pluginsHtml = plugins.length
    ? `<div class="nx-sec"><h3>Plugins (${plugins.length})</h3><div class="nx-pills">${plugins.map((p) => `<span class="nx-plugin">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const cloudHtml = hasCloudToken
    ? `<div class="nx-sec"><h3>Nx Cloud</h3><div class="nx-pills"><span class="nx-pill nx-cloud-ok">connected (token configured)</span></div></div>`
    : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="nx-title"><span class="badge-nx">Nx</span>nx.json</div>
<div class="nx-sub">${targetDefaults.length ? `${targetDefaults.length} target default${targetDefaults.length !== 1 ? 's' : ''}` : 'workspace config'}${plugins.length ? ` · ${plugins.length} plugin${plugins.length !== 1 ? 's' : ''}` : ''}</div>
${metaHtml}
${targetsHtml}
${inputsHtml}
${pluginsHtml}
${cloudHtml}`;

  return { parentNode: host };
}
