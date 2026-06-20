const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.antbuild-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.antbuild-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#A81C32;color:#fff;vertical-align:middle;margin-right:8px}
.antbuild-title{font-size:18px;font-weight:700;margin:0 0 4px}
.antbuild-sub{font-size:13px;color:var(--fg-2,#888);margin:0 0 16px}
.antbuild-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:12px 16px;margin:0 0 14px}
.antbuild-card h3{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-2,#888);margin:0 0 8px}
.antbuild-table{width:100%;border-collapse:collapse;font-size:13px}
.antbuild-table td{padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.antbuild-table td:first-child{font-size:12px;color:var(--fg-2,#666);white-space:nowrap;width:35%}
.antbuild-table td:last-child{font:13px/1.4 ui-monospace,monospace;word-break:break-all}
.antbuild-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}
.antbuild-target{display:flex;align-items:baseline;flex-wrap:wrap;gap:6px;padding:4px 8px;border-radius:6px;background:var(--bg,#fff);border:1px solid var(--border,#e0e0e0)}
.antbuild-tname{font:13px/1 ui-monospace,monospace;font-weight:600;color:var(--accent,#0969da)}
.antbuild-tdep{font:12px ui-monospace,monospace;color:var(--fg-2,#888)}
.antbuild-tdesc{font-size:12px;color:var(--fg-2,#666);font-style:italic}
.antbuild-default{display:inline-block;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;background:#fef3c7;border:1px solid #fcd34d;color:#92400e;margin-left:4px}
`;

export function render(intake) {
  const text = intake.text || '';
  const doc = new DOMParser().parseFromString(text, 'text/xml');

  const projectEl = doc.querySelector('project');
  const projectName = projectEl?.getAttribute('name') || null;
  const defaultTarget = projectEl?.getAttribute('default') || null;

  // Properties
  const properties = [...doc.querySelectorAll('property[name]')];
  const propertyCount = properties.length;

  // Targets
  const targets = [...doc.querySelectorAll('target[name]')].map((el) => ({
    name: el.getAttribute('name') || '',
    depends: el.getAttribute('depends') || '',
    description: el.getAttribute('description') || '',
  }));

  // Imports
  const imports = [...doc.querySelectorAll('import[file]')].map((el) => el.getAttribute('file') || '');

  // Taskdefs
  const taskdefs = [...doc.querySelectorAll('taskdef')].map((el) => el.getAttribute('resource') || el.getAttribute('name') || '').filter(Boolean);

  // Info table
  const infoRows = [];
  if (projectName) infoRows.push(['Project name', projectName]);
  if (defaultTarget) infoRows.push(['Default target', defaultTarget]);
  infoRows.push(['Targets', String(targets.length)]);
  if (propertyCount > 0) infoRows.push(['Properties', String(propertyCount)]);
  if (imports.length > 0) infoRows.push(['Imports', String(imports.length)]);

  const infoHtml = infoRows.length
    ? `<div class="antbuild-card"><table class="antbuild-table"><tbody>${
        infoRows.map(([l, v]) => `<tr><td>${esc(l)}</td><td>${esc(v)}</td></tr>`).join('')
      }</tbody></table></div>`
    : '';

  // Targets list
  const targetsHtml = targets.length
    ? `<div class="antbuild-card"><h3>Targets (${targets.length})</h3><ul class="antbuild-list">${
        targets.map((t) => {
          const isDefault = defaultTarget && t.name === defaultTarget;
          return `<li class="antbuild-target">` +
            `<span class="antbuild-tname">${esc(t.name)}</span>` +
            (isDefault ? `<span class="antbuild-default">default</span>` : '') +
            (t.depends ? `<span class="antbuild-tdep">depends: ${esc(t.depends)}</span>` : '') +
            (t.description ? `<span class="antbuild-tdesc">${esc(t.description)}</span>` : '') +
            `</li>`;
        }).join('')
      }</ul></div>`
    : '';

  // Taskdefs
  const taskdefHtml = taskdefs.length
    ? `<div class="antbuild-card"><h3>Task definitions (${taskdefs.length})</h3><ul class="antbuild-list">${
        taskdefs.map((r) => `<li class="antbuild-target"><span class="antbuild-tname">${esc(r)}</span></li>`).join('')
      }</ul></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'antbuild-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="antbuild-title"><span class="antbuild-badge">Ant</span>${esc(projectName || 'build.xml')}</div>
${defaultTarget ? `<div class="antbuild-sub">Default target: <strong>${esc(defaultTarget)}</strong></div>` : ''}
${infoHtml}${targetsHtml}${taskdefHtml}`;
  return { parentNode: host };
}
