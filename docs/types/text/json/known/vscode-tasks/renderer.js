const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.vsc-tasks-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-vsc-tasks{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#007acc;color:#fff;vertical-align:middle;margin-right:8px;}
.vsc-tasks-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.vsc-tasks-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.vsc-tasks-sec{margin:12px 0;}
.vsc-tasks-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.vsc-tasks-table{width:100%;border-collapse:collapse;font-size:13px;}
.vsc-tasks-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.vsc-tasks-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.vsc-task-label{font-weight:600;}
.vsc-task-type{font:11px/1.4 ui-monospace,monospace;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.vsc-task-group{font-size:11px;padding:1px 7px;border-radius:8px;font-family:ui-monospace,monospace;}
.vsc-task-group.build{background:#e6f4ea;color:#1a7f37;border:1px solid #86efac;}
.vsc-task-group.test{background:#eff6ff;color:#1d4ed8;border:1px solid #93c5fd;}
.vsc-task-group.none{background:var(--bg-2,#f6f8fa);color:var(--fg-2,#888);border:1px solid var(--border,#e0e0e0);}
.vsc-task-default{font-size:10px;padding:1px 5px;border-radius:4px;background:#fef3c7;color:#92400e;border:1px solid #fcd34d;margin-left:4px;}
.vsc-mono{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#888);}
`;

export function render(intake) {
  let cfg;
  try { cfg = JSON.parse(intake.text || '{}'); } catch { return { parentNode: Object.assign(document.createElement('div'), { textContent: 'Invalid VS Code tasks JSON.' }) }; }

  const tasks = Array.isArray(cfg.tasks) ? cfg.tasks : [];
  const inputs = Array.isArray(cfg.inputs) ? cfg.inputs : [];

  const rows = tasks.map((t) => {
    const group = typeof t.group === 'object' ? (t.group.kind || 'none') : (t.group || 'none');
    const isDefault = typeof t.group === 'object' && t.group.isDefault;
    const cmd = t.command || (t.script ? `npm run ${t.script}` : '') || '';
    return `<tr>
      <td><span class="vsc-task-label">${esc(t.label || t.taskName || '?')}</span>${isDefault ? '<span class="vsc-task-default">default</span>' : ''}</td>
      <td><span class="vsc-task-type">${esc(t.type || '?')}</span></td>
      <td><span class="vsc-mono">${esc(cmd || '—')}</span></td>
      <td><span class="vsc-task-group ${esc(group)}">${esc(group)}</span></td>
    </tr>`;
  }).join('');

  const host = document.createElement('div');
  host.className = 'vsc-tasks-doc';

  host.innerHTML = `<style>${CSS}</style>
<div class="vsc-tasks-title"><span class="badge-vsc-tasks">VS Code</span>Tasks</div>
<div class="vsc-tasks-sub">${tasks.length} task${tasks.length !== 1 ? 's' : ''}${inputs.length ? ` · ${inputs.length} input${inputs.length !== 1 ? 's' : ''}` : ''}</div>
${tasks.length ? `<div class="vsc-tasks-sec"><h3>Tasks (${tasks.length})</h3>
  <table class="vsc-tasks-table">
    <thead><tr><th>Label</th><th>Type</th><th>Command</th><th>Group</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</div>` : '<div style="color:var(--fg-2,#888);font-size:13px">No tasks defined.</div>'}`;

  return { parentNode: host };
}
