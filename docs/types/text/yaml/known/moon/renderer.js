import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.moonyml-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-moonyml{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#4C6EF5;color:#fff;vertical-align:middle;margin-right:8px;}
.moonyml-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.moonyml-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.moonyml-sec{margin:14px 0;}
.moonyml-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.moonyml-card{display:flex;flex-wrap:wrap;gap:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;font-size:13px;margin-bottom:4px;}
.moonyml-card-item{display:flex;flex-direction:column;gap:2px;}
.moonyml-card-label{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);}
.moonyml-card-value{font-weight:600;color:var(--fg,#24292f);}
.moonyml-table{width:100%;border-collapse:collapse;font-size:13px;}
.moonyml-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.moonyml-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.moonyml-cmd{font:12px/1.4 ui-monospace,monospace;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:1px 6px;}
.moonyml-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.moonyml-chip.plat-node{background:#f0fdf4;border-color:#86efac;color:#166534;}
.moonyml-chip.plat-system{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8;}
.moonyml-chip.plat-deno{background:#fdf4ff;border-color:#d8b4fe;color:#7e22ce;}
.moonyml-chip.local{background:#fef9c3;border-color:#fde047;color:#713f12;}
.moonyml-dep{display:inline-block;font-size:12px;padding:2px 8px;border-radius:8px;background:#fffbeb;border:1px solid #fde68a;color:#92400e;font-family:ui-monospace,monospace;margin:2px 3px 2px 0;}
`;

function platformChip(platform) {
  if (!platform) return '';
  const cls = platform === 'node' ? 'plat-node' : platform === 'system' ? 'plat-system' : platform === 'deno' ? 'plat-deno' : '';
  return `<span class="moonyml-chip ${cls}">${esc(platform)}</span>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch {
    cfg = intake.parsed || {};
  }

  const project = cfg.project || {};
  const projectName = project.name || cfg.id || null;
  const projectType = project.type || null;
  const language = cfg.language || project.language || null;
  const workspace = cfg.workspace || null;
  const tasks = cfg.tasks && typeof cfg.tasks === 'object' ? cfg.tasks : {};
  const dependsOn = Array.isArray(cfg.dependsOn) ? cfg.dependsOn : [];

  const taskEntries = Object.entries(tasks).slice(0, 15);
  const totalTasks = Object.keys(tasks).length;
  const depCount = dependsOn.length;

  const subParts = [];
  subParts.push(`${totalTasks} task${totalTasks !== 1 ? 's' : ''}`);
  if (depCount > 0) subParts.push(`depends on ${depCount} project${depCount !== 1 ? 's' : ''}`);
  if (language) subParts.push(language);

  // Project info card
  const cardItems = [];
  if (projectName) cardItems.push({ label: 'Name', value: projectName });
  if (projectType) cardItems.push({ label: 'Type', value: projectType });
  if (language) cardItems.push({ label: 'Language', value: language });
  if (workspace) cardItems.push({ label: 'Workspace', value: workspace });

  const cardHtml = cardItems.length
    ? `<div class="moonyml-sec"><h3>Project</h3>
  <div class="moonyml-card">
    ${cardItems.map((i) => `<div class="moonyml-card-item"><span class="moonyml-card-label">${esc(i.label)}</span><span class="moonyml-card-value">${esc(i.value)}</span></div>`).join('')}
  </div>
</div>`
    : '';

  // Tasks table
  const taskRows = taskEntries.map(([name, def]) => {
    const d = def && typeof def === 'object' ? def : {};
    const rawCmd = d.command ? String(d.command) : null;
    const truncCmd = rawCmd ? (rawCmd.length > 60 ? rawCmd.slice(0, 57) + '…' : rawCmd) : null;
    const commandHtml = truncCmd ? `<span class="moonyml-cmd">${esc(truncCmd)}</span>` : '—';
    const platform = d.platform || null;
    const isLocal = d.local === true;
    const deps = Array.isArray(d.deps) ? d.deps : [];
    const inputs = Array.isArray(d.inputs) ? d.inputs : [];
    const outputs = Array.isArray(d.outputs) ? d.outputs : [];
    const depsHtml = deps.length
      ? deps.slice(0, 5).map((dep) => `<span class="moonyml-chip">${esc(dep)}</span>`).join('') + (deps.length > 5 ? `<span class="moonyml-chip">+${deps.length - 5}</span>` : '')
      : '—';
    const ioText = (inputs.length || outputs.length)
      ? `<span style="font-size:11px;color:var(--fg-2,#888)">in:${inputs.length} out:${outputs.length}</span>`
      : '';
    return `<tr>
      <td><code style="font-size:12px;">${esc(name)}</code></td>
      <td>${commandHtml}</td>
      <td>${platformChip(platform)}${isLocal ? '<span class="moonyml-chip local">local</span>' : ''}</td>
      <td>${depsHtml}</td>
      <td>${ioText || '—'}</td>
    </tr>`;
  }).join('');

  const truncNote = totalTasks > taskEntries.length
    ? `<div style="font-size:11px;color:var(--fg-2,#888);margin-top:4px;">Showing ${taskEntries.length} of ${totalTasks} tasks</div>`
    : '';

  const tasksHtml = totalTasks
    ? `<div class="moonyml-sec"><h3>Tasks</h3>
  <table class="moonyml-table">
    <thead><tr><th>Task</th><th>Command</th><th>Platform</th><th>Deps</th><th>I/O</th></tr></thead>
    <tbody>${taskRows}</tbody>
  </table>
  ${truncNote}
</div>`
    : '';

  // Project dependencies
  const projDepsHtml = depCount
    ? `<div class="moonyml-sec"><h3>Project dependencies</h3>
  <div>${dependsOn.map((d) => {
      const depId = typeof d === 'string' ? d : (d && d.id ? d.id : String(d));
      return `<span class="moonyml-dep">${esc(depId)}</span>`;
    }).join('')}
  </div>
</div>`
    : '';

  const host = document.createElement('div');
  host.className = 'moonyml-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="moonyml-title"><span class="badge-moonyml">Moon</span>Moonrepo project</div>
<div class="moonyml-sub">${subParts.map(esc).join(' · ')}</div>
${cardHtml}${tasksHtml}${projDepsHtml}`;

  return { parentNode: host };
}
