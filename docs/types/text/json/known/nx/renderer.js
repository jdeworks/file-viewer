const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.nxjson-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-nxjson{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#143055;color:#fff;vertical-align:middle;margin-right:8px;}
.nxjson-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.nxjson-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.nxjson-sec{margin:12px 0;}
.nxjson-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.nxjson-pills{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0;}
.nxjson-pill{display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.nxjson-plugin{font-size:12px;padding:3px 10px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;font-family:ui-monospace,monospace;}
.nxjson-badge{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:2px 4px 2px 0;}
.nxjson-badge.on{background:#dcfce7;border-color:#86efac;color:#166534;}
.nxjson-kv{font-size:12px;color:var(--fg-2,#888);}
.nxjson-cloud-ok{background:#dcfce7;border-color:#86efac;color:#166534;}
`;

export function render(intake) {
  let cfg = {};
  try { cfg = intake.parsed ?? JSON.parse(intake.text || '{}'); } catch { cfg = {}; }

  const npmScope = cfg.npmScope || null;
  const defaultProject = cfg.defaultProject || null;
  const targetDefaults = cfg.targetDefaults ? Object.keys(cfg.targetDefaults) : [];
  const namedInputs = cfg.namedInputs ? Object.keys(cfg.namedInputs) : [];
  const plugins = Array.isArray(cfg.plugins)
    ? cfg.plugins.map((p) => typeof p === 'string' ? p : (p.plugin || String(p)))
    : [];
  const cacheDir = cfg.cacheDirectory || null;
  const tasksRunnerOpts = cfg.tasksRunnerOptions || null;
  const defaultBase = cfg.affected?.defaultBase || cfg.defaultBase || null;
  const hasCloudToken = Boolean(cfg.nxCloudAccessToken || cfg.nxCloudId);

  const host = document.createElement('div');
  host.className = 'nxjson-doc';

  const metaHtml = (npmScope || defaultProject || defaultBase)
    ? `<div class="nxjson-sec"><h3>Workspace</h3><div class="nxjson-pills">
        ${npmScope ? `<span class="nxjson-pill">scope: @${esc(npmScope)}</span>` : ''}
        ${defaultProject ? `<span class="nxjson-pill">default: ${esc(defaultProject)}</span>` : ''}
        ${defaultBase ? `<span class="nxjson-pill">base: ${esc(defaultBase)}</span>` : ''}
      </div></div>`
    : '';

  // Tasks runner options
  let tasksRunnerHtml = '';
  if (tasksRunnerOpts && typeof tasksRunnerOpts === 'object') {
    const runners = Object.entries(tasksRunnerOpts).slice(0, 4);
    const runnerParts = runners.map(([name, opts]) => {
      const runner = opts.runner || 'default';
      const cacheOps = Array.isArray(opts.options?.cacheableOperations) ? opts.options.cacheableOperations : [];
      const hasToken = Boolean(opts.options?.accessToken);
      const runnerLabel = runner.includes('nx-cloud') ? 'nx-cloud' : runner.split('/').pop();
      const cacheChips = cacheOps.map((op) => `<span class="nxjson-pill">${esc(op)}</span>`).join('');
      return `<div style="margin-bottom:6px">
        <span class="nxjson-badge">${esc(name)}: ${esc(runnerLabel)}</span>
        ${hasToken ? '<span class="nxjson-badge on">access token: [configured]</span>' : ''}
        ${cacheOps.length ? `<div class="nxjson-pills" style="margin-top:4px">${cacheChips}</div>` : ''}
      </div>`;
    }).join('');
    if (runnerParts) {
      tasksRunnerHtml = `<div class="nxjson-sec"><h3>Task runners</h3>${runnerParts}</div>`;
    }
  }

  const targetsHtml = targetDefaults.length
    ? `<div class="nxjson-sec"><h3>Target defaults (${targetDefaults.length})</h3><div class="nxjson-pills">${targetDefaults.slice(0, 8).map((t) => `<span class="nxjson-pill">${esc(t)}</span>`).join('')}${targetDefaults.length > 8 ? `<span class="nxjson-pill">+${targetDefaults.length - 8} more</span>` : ''}</div></div>`
    : '';

  const inputsHtml = namedInputs.length
    ? `<div class="nxjson-sec"><h3>Named inputs (${namedInputs.length})</h3><div class="nxjson-pills">${namedInputs.map((n) => `<span class="nxjson-pill">${esc(n)}</span>`).join('')}</div></div>`
    : '';

  const pluginsHtml = plugins.length
    ? `<div class="nxjson-sec"><h3>Plugins (${plugins.length})</h3><div class="nxjson-pills">${plugins.map((p) => `<span class="nxjson-plugin">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const cloudHtml = hasCloudToken
    ? `<div class="nxjson-sec"><h3>Nx Cloud</h3><div class="nxjson-pills"><span class="nxjson-pill nxjson-cloud-ok">connected (token configured)</span></div></div>`
    : '';

  const miscBadges = [
    cacheDir ? `<span class="nxjson-badge">cache: ${esc(cacheDir)}</span>` : '',
    cfg.parallel ? `<span class="nxjson-badge">parallel: ${esc(cfg.parallel)}</span>` : '',
  ].filter(Boolean).join('');
  const miscHtml = miscBadges ? `<div class="nxjson-sec"><h3>Options</h3><div class="nxjson-pills">${miscBadges}</div></div>` : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="nxjson-title"><span class="badge-nxjson">Nx</span>nx.json</div>
<div class="nxjson-sub">${targetDefaults.length ? `${targetDefaults.length} target default${targetDefaults.length !== 1 ? 's' : ''}` : 'workspace config'}${plugins.length ? ` · ${plugins.length} plugin${plugins.length !== 1 ? 's' : ''}` : ''}</div>
${metaHtml}
${tasksRunnerHtml}
${targetsHtml}
${inputsHtml}
${pluginsHtml}
${cloudHtml}
${miscHtml}`;

  return { parentNode: host };
}
