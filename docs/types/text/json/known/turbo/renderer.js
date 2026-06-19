const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.turbo-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-turbo{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#EF4444;color:#fff;vertical-align:middle;margin-right:8px;}
.turbo-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.turbo-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.turbo-sec{margin:12px 0;}
.turbo-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.turbo-table{width:100%;border-collapse:collapse;font-size:13px;}
.turbo-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.turbo-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.turbo-task{font:12px/1.4 ui-monospace,monospace;font-weight:600;}
.turbo-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.turbo-chip.cache-off{background:#fef2f2;border-color:#fca5a5;color:#b91c1c;}
.turbo-chip.cache-on{background:#f0fdf4;border-color:#86efac;color:#166534;}
.turbo-extends{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0;}
`;

function depsHtml(deps) {
  if (!deps || !deps.length) return '<span style="color:var(--fg-2,#888);font-size:12px;">none</span>';
  return deps.map((d) => `<span class="turbo-chip">${esc(d)}</span>`).join('');
}

function cacheChip(v) {
  if (v === false) return '<span class="turbo-chip cache-off">no cache</span>';
  return '<span class="turbo-chip cache-on">cached</span>';
}

export function render(intake) {
  let cfg;
  try { cfg = JSON.parse(intake.text || '{}'); } catch {
    const host = document.createElement('div');
    host.className = 'turbo-doc';
    host.innerHTML = `<style>${CSS}</style><div class="turbo-title"><span class="badge-turbo">Turbo</span>Invalid JSON</div>`;
    return { parentNode: host };
  }

  // tasks can be in cfg.tasks (v2) or cfg.pipeline (v1)
  const tasksObj = cfg.tasks || cfg.pipeline || {};
  const taskNames = Object.keys(tasksObj);
  const schemaVersion = cfg.$schema || cfg.schemaVersion;
  const extendsVal = cfg.extends;

  const taskRows = taskNames.map((name) => {
    const t = tasksObj[name] || {};
    const deps = Array.isArray(t.dependsOn) ? t.dependsOn : [];
    const outputs = Array.isArray(t.outputs) ? t.outputs : [];
    const cacheVal = t.cache !== false;
    return `<tr>
      <td><span class="turbo-task">${esc(name)}</span></td>
      <td>${depsHtml(deps)}</td>
      <td>${cacheChip(cacheVal)}</td>
      <td style="font-size:12px;color:var(--fg-2,#888);">${outputs.slice(0, 3).map(esc).join(', ') || '—'}</td>
    </tr>`;
  }).join('');

  const extendsHtml = extendsVal ? `<div class="turbo-sec">
    <h3>Extends</h3>
    <div class="turbo-extends">
      ${(Array.isArray(extendsVal) ? extendsVal : [extendsVal]).map((e) => `<span class="turbo-chip">${esc(e)}</span>`).join('')}
    </div>
  </div>` : '';

  const schemaHtml = schemaVersion ? `<div style="font-size:11px;color:var(--fg-2,#888);margin-bottom:12px;font-family:ui-monospace,monospace;">${esc(typeof schemaVersion === 'string' ? schemaVersion.replace(/.*turborepo\/(\S+)\/schema.*/, 'Schema: $1') : schemaVersion)}</div>` : '';

  const host = document.createElement('div');
  host.className = 'turbo-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="turbo-title"><span class="badge-turbo">Turbo</span>Turborepo config</div>
<div class="turbo-sub">${taskNames.length} task${taskNames.length !== 1 ? 's' : ''}${extendsVal ? ' · extends' : ''}</div>
${schemaHtml}
${extendsHtml}
${taskNames.length ? `<div class="turbo-sec"><h3>Tasks</h3>
  <table class="turbo-table">
    <thead><tr><th>Task</th><th>Depends on</th><th>Cache</th><th>Outputs</th></tr></thead>
    <tbody>${taskRows}</tbody>
  </table>
</div>` : ''}`;

  return { parentNode: host };
}
