import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.moon-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.moon-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f59e0b;color:#fff;vertical-align:middle;margin-right:8px;}
.moon-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.moon-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.moon-sec{margin:12px 0;}
.moon-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.moon-card{display:flex;flex-wrap:wrap;gap:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;font-size:13px;margin-bottom:4px;}
.moon-card-item{display:flex;flex-direction:column;gap:2px;}
.moon-card-label{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);}
.moon-card-value{font-weight:600;color:var(--fg,#24292f);}
.moon-table{width:100%;border-collapse:collapse;font-size:13px;}
.moon-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.moon-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.moon-cmd{font:12px/1.4 ui-monospace,monospace;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:1px 6px;}
.moon-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.moon-dep{display:inline-block;font-size:12px;padding:2px 10px;border-radius:8px;background:#fffbeb;border:1px solid #fde68a;color:#92400e;font-family:ui-monospace,monospace;margin:2px 3px 2px 0;}
`;

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
  const language = cfg.language || null;
  const tasks = cfg.tasks && typeof cfg.tasks === 'object' ? cfg.tasks : {};
  const dependsOn = Array.isArray(cfg.dependsOn) ? cfg.dependsOn : [];

  const taskEntries = Object.entries(tasks);
  const taskCount = taskEntries.length;
  const depCount = dependsOn.length;

  // Sub-line: "4 tasks · depends on 2 projects"
  const subParts = [];
  subParts.push(`${taskCount} task${taskCount !== 1 ? 's' : ''}`);
  if (depCount > 0) subParts.push(`depends on ${depCount} project${depCount !== 1 ? 's' : ''}`);

  // Project info card
  const cardItems = [];
  if (projectName) cardItems.push({ label: 'Name', value: projectName });
  if (projectType) cardItems.push({ label: 'Type', value: projectType });
  if (language) cardItems.push({ label: 'Language', value: language });

  const cardHtml = cardItems.length
    ? `<div class="moon-sec"><h3>Project</h3>
  <div class="moon-card">
    ${cardItems.map((i) => `<div class="moon-card-item"><span class="moon-card-label">${esc(i.label)}</span><span class="moon-card-value">${esc(i.value)}</span></div>`).join('')}
  </div>
</div>`
    : '';

  // Tasks table
  const taskRows = taskEntries.map(([name, def]) => {
    const d = def && typeof def === 'object' ? def : {};
    const command = d.command ? `<span class="moon-cmd">${esc(d.command)}</span>` : '—';
    const deps = Array.isArray(d.deps) ? d.deps : [];
    const depsHtml = deps.length
      ? deps.slice(0, 6).map((dep) => `<span class="moon-chip">${esc(dep)}</span>`).join('') + (deps.length > 6 ? `<span class="moon-chip">+${deps.length - 6}</span>` : '')
      : '—';
    return `<tr>
      <td><code style="font-size:12px;">${esc(name)}</code></td>
      <td>${command}</td>
      <td>${depsHtml}</td>
    </tr>`;
  }).join('');

  const tasksHtml = taskCount
    ? `<div class="moon-sec"><h3>Tasks</h3>
  <table class="moon-table">
    <thead><tr><th>Task</th><th>Command</th><th>Deps</th></tr></thead>
    <tbody>${taskRows}</tbody>
  </table>
</div>`
    : '';

  // Project dependencies list
  const depsHtml = depCount
    ? `<div class="moon-sec"><h3>Project dependencies</h3>
  <div>${dependsOn.map((d) => {
      const depId = typeof d === 'string' ? d : (d && d.id ? d.id : String(d));
      return `<span class="moon-dep">${esc(depId)}</span>`;
    }).join('')}
  </div>
</div>`
    : '';

  const host = document.createElement('div');
  host.className = 'moon-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="moon-title"><span class="moon-badge">Moonrepo</span>Moonrepo project</div>
<div class="moon-sub">${subParts.map(esc).join(' · ')}</div>
${cardHtml}${tasksHtml}${depsHtml}`;

  return { parentNode: host };
}
