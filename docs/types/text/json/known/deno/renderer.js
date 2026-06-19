const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.den-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-den{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#070707;color:#fff;vertical-align:middle;margin-right:8px;}
.den-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.den-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.den-sec{margin:12px 0;}
.den-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.den-pills{display:flex;flex-wrap:wrap;gap:6px;}
.den-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.den-task{padding:5px 8px;border-radius:5px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:3px 0;font-size:13px;}
.den-task-name{font-weight:600;margin-right:8px;}
.den-cmd{font:11px/1.4 ui-monospace,monospace;color:var(--fg-2,#888);}
.den-imp-table{width:100%;border-collapse:collapse;font-size:12px;}
.den-imp-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.den-imp-table td{padding:3px 8px 3px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
`;

export function render(intake) {
  let cfg = {};
  try { cfg = JSON.parse(intake.text || '{}'); } catch { cfg = {}; }

  const name = cfg.name || '';
  const version = cfg.version || '';
  const imports = cfg.imports ? Object.entries(cfg.imports) : [];
  const tasks = cfg.tasks ? Object.entries(cfg.tasks) : [];
  const lint = cfg.lint || null;
  const fmt = cfg.fmt || null;

  const importsHtml = imports.length
    ? `<div class="den-sec"><h3>Imports (${imports.length})</h3>
        <table class="den-imp-table"><thead><tr><th>Alias</th><th>Specifier</th></tr></thead>
        <tbody>${imports.slice(0, 10).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}
        ${imports.length > 10 ? `<tr><td colspan="2" style="color:var(--fg-2,#888)">…and ${imports.length - 10} more</td></tr>` : ''}
        </tbody></table></div>`
    : '';

  const tasksHtml = tasks.length
    ? `<div class="den-sec"><h3>Tasks (${tasks.length})</h3>
        ${tasks.slice(0, 8).map(([n, cmd]) => `<div class="den-task"><span class="den-task-name">${esc(n)}</span><span class="den-cmd">${esc(cmd)}</span></div>`).join('')}
        ${tasks.length > 8 ? `<div style="font-size:12px;color:var(--fg-2,#888)">…and ${tasks.length - 8} more</div>` : ''}
      </div>`
    : '';

  const lintHtml = lint
    ? `<div class="den-sec"><h3>Lint</h3><div class="den-pills">
        ${(lint.rules?.tags || []).map((t) => `<span class="den-pill">${esc(t)}</span>`).join('')}
        ${(lint.rules?.exclude || []).map((r) => `<span class="den-pill">−${esc(r)}</span>`).join('')}
      </div></div>`
    : '';

  const fmtHtml = fmt
    ? `<div class="den-sec"><h3>Fmt</h3><div class="den-pills">
        ${fmt.lineWidth != null ? `<span class="den-pill">lineWidth: ${esc(fmt.lineWidth)}</span>` : ''}
        ${fmt.singleQuote != null ? `<span class="den-pill">singleQuote: ${esc(fmt.singleQuote)}</span>` : ''}
        ${fmt.indentWidth != null ? `<span class="den-pill">indent: ${esc(fmt.indentWidth)}</span>` : ''}
      </div></div>`
    : '';

  const sub = [name, version, imports.length ? `${imports.length} imports` : '', tasks.length ? `${tasks.length} tasks` : ''].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'den-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="den-title"><span class="badge-den">Deno</span>${esc(name || 'deno.json')}</div>
<div class="den-sub">${esc(sub) || 'Deno runtime configuration'}</div>
${importsHtml}${tasksHtml}${lintHtml}${fmtHtml}`;
  return { parentNode: host };
}
