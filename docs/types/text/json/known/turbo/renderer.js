const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.turbojson-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-turbojson{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#EF4444;color:#fff;vertical-align:middle;margin-right:8px;}
.turbojson-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.turbojson-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.turbojson-schema{font-size:11px;color:var(--fg-2,#888);margin:-8px 0 10px;font-family:ui-monospace,monospace;}
.turbojson-sec{margin:14px 0;}
.turbojson-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.turbojson-table{width:100%;border-collapse:collapse;font-size:13px;}
.turbojson-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.turbojson-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.turbojson-task{font:12px/1.4 ui-monospace,monospace;font-weight:600;}
.turbojson-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.turbojson-chip.cache-off{background:#fef2f2;border-color:#fca5a5;color:#b91c1c;}
.turbojson-chip.cache-on{background:#f0fdf4;border-color:#86efac;color:#166534;}
.turbojson-pill{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px 3px 2px 0;}
.turbojson-extends{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0;}
.turbojson-pills{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0;}
`;

function pillsHtml(arr, cls = 'turbojson-pill') {
  if (!arr || !arr.length) return '<span style="color:var(--fg-2,#888);font-size:12px;">none</span>';
  return arr.map((v) => `<span class="${cls}">${esc(v)}</span>`).join('');
}

function depsHtml(deps) {
  if (!deps || !deps.length) return '<span style="color:var(--fg-2,#888);font-size:12px;">none</span>';
  return deps.map((d) => `<span class="turbojson-chip">${esc(d)}</span>`).join('');
}

function cacheChip(v) {
  if (v === false) return '<span class="turbojson-chip cache-off">no cache</span>';
  return '<span class="turbojson-chip cache-on">cached</span>';
}

export function render(intake) {
  let cfg;
  try { cfg = intake.parsed ?? JSON.parse(intake.text || '{}'); } catch {
    const host = document.createElement('div');
    host.className = 'turbojson-doc';
    host.innerHTML = `<style>${CSS}</style><div class="turbojson-title"><span class="badge-turbojson">Turborepo</span>Invalid JSON</div>`;
    return { parentNode: host };
  }

  // tasks can be in cfg.tasks (v2) or cfg.pipeline (v1)
  const tasksObj = cfg.tasks || cfg.pipeline || {};
  const taskNames = Object.keys(tasksObj).slice(0, 10);
  const totalTasks = Object.keys(tasksObj).length;
  const extendsVal = cfg.extends;
  const globalDeps = Array.isArray(cfg.globalDependencies) ? cfg.globalDependencies : [];
  const globalEnv = Array.isArray(cfg.globalEnv) ? cfg.globalEnv : [];
  const uiKey = cfg.ui ? ` · ${esc(cfg.ui)} UI` : '';

  // Extract schema version from URL
  let schemaDisplay = '';
  if (cfg.$schema) {
    const m = String(cfg.$schema).match(/turborepo\/([^/]+)\/schema/);
    schemaDisplay = m ? `Schema: ${m[1]}` : cfg.$schema;
  }

  const taskRows = taskNames.map((name) => {
    const t = tasksObj[name] || {};
    const deps = Array.isArray(t.dependsOn) ? t.dependsOn : [];
    const outputs = Array.isArray(t.outputs) ? t.outputs : [];
    const inputs = Array.isArray(t.inputs) ? t.inputs : [];
    const env = Array.isArray(t.env) ? t.env : [];
    const cacheVal = t.cache !== false;

    const outputsText = outputs.length ? outputs.slice(0, 3).map(esc).join(', ') + (outputs.length > 3 ? ', …' : '') : '—';
    const inputsHtml = inputs.length ? `<br><small style="color:var(--fg-2,#888)">inputs: ${inputs.slice(0, 2).map(esc).join(', ')}${inputs.length > 2 ? ', …' : ''}</small>` : '';
    const envHtml = env.length ? `<br><small style="color:var(--fg-2,#888)">env: ${env.slice(0, 3).map(esc).join(', ')}${env.length > 3 ? ', …' : ''}</small>` : '';

    return `<tr>
      <td><span class="turbojson-task">${esc(name)}</span></td>
      <td>${depsHtml(deps)}</td>
      <td>${cacheChip(cacheVal)}</td>
      <td style="font-size:12px;color:var(--fg-2,#888);">${outputsText}${inputsHtml}${envHtml}</td>
    </tr>`;
  }).join('');

  const extendsHtml = extendsVal ? `<div class="turbojson-sec">
    <h3>Extends</h3>
    <div class="turbojson-extends">
      ${(Array.isArray(extendsVal) ? extendsVal : [extendsVal]).map((e) => `<span class="turbojson-chip">${esc(e)}</span>`).join('')}
    </div>
  </div>` : '';

  const schemaHtml = schemaDisplay
    ? `<div class="turbojson-schema">${esc(schemaDisplay)}</div>`
    : '';

  const globalDepsHtml = globalDeps.length ? `<div class="turbojson-sec">
    <h3>Global dependencies</h3>
    <div class="turbojson-pills">${pillsHtml(globalDeps)}</div>
  </div>` : '';

  const globalEnvHtml = globalEnv.length ? `<div class="turbojson-sec">
    <h3>Global env</h3>
    <div class="turbojson-pills">${pillsHtml(globalEnv)}</div>
  </div>` : '';

  const truncNote = totalTasks > taskNames.length
    ? `<div style="font-size:11px;color:var(--fg-2,#888);margin-top:4px;">Showing ${taskNames.length} of ${totalTasks} tasks</div>`
    : '';

  const host = document.createElement('div');
  host.className = 'turbojson-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="turbojson-title"><span class="badge-turbojson">Turborepo</span>Turborepo config</div>
<div class="turbojson-sub">${totalTasks} task${totalTasks !== 1 ? 's' : ''}${extendsVal ? ' · extends' : ''}${uiKey}</div>
${schemaHtml}
${extendsHtml}
${globalDepsHtml}
${globalEnvHtml}
${totalTasks ? `<div class="turbojson-sec"><h3>Pipeline / Tasks</h3>
  <table class="turbojson-table">
    <thead><tr><th>Task</th><th>Depends on</th><th>Cache</th><th>Outputs / Inputs / Env</th></tr></thead>
    <tbody>${taskRows}</tbody>
  </table>
  ${truncNote}
</div>` : ''}`;

  return { parentNode: host };
}
