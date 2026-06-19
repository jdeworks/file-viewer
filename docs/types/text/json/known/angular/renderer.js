const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ngw-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-ngw{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#dd0031;color:#fff;vertical-align:middle;margin-right:8px;}
.ngw-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ngw-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.ngw-sec{margin:14px 0;}
.ngw-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.ngw-projects{display:grid;gap:8px;}
.ngw-proj{padding:10px 14px;border-radius:8px;border:1px solid var(--border,#e0e0e0);background:var(--bg-2,#f6f8fa);}
.ngw-proj-name{font-weight:600;font-size:13px;margin-bottom:4px;}
.ngw-proj-type{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:#dd003118;color:#dd0031;margin-right:6px;}
.ngw-proj-root{font-size:11px;color:var(--fg-2,#888);font-family:ui-monospace,monospace;}
.ngw-targets{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;}
.ngw-target{font-size:11px;padding:2px 8px;border-radius:10px;background:#e8f5e9;border:1px solid #a5d6a7;color:#1b5e20;}
.ngw-pills{display:flex;flex-wrap:wrap;gap:6px;}
.ngw-pill{font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
`;

export function render(intake) {
  let cfg = {};
  try { cfg = JSON.parse(intake.text || '{}'); } catch { cfg = {}; }

  const version = cfg.version || 1;
  const cli = cfg.cli || {};
  const defaultProject = cfg.defaultProject || cli.defaultConfiguration || null;
  const projects = cfg.projects ? Object.entries(cfg.projects) : [];

  const projectsHtml = projects.slice(0, 6).map(([name, proj]) => {
    const type = proj.projectType || 'app';
    const root = proj.root || proj.sourceRoot || '';
    const targets = proj.architect || proj.targets || {};
    const targetNames = Object.keys(targets);
    const targetsHtml = targetNames.slice(0, 8).map((t) => `<span class="ngw-target">${esc(t)}</span>`).join('');
    const isDefault = name === defaultProject ? ' <span style="color:#dd0031;font-size:11px">(default)</span>' : '';
    return `<div class="ngw-proj">
      <div class="ngw-proj-name">${esc(name)}${isDefault}</div>
      <span class="ngw-proj-type">${esc(type)}</span><span class="ngw-proj-root">${esc(root)}</span>
      ${targetsHtml ? `<div class="ngw-targets">${targetsHtml}</div>` : ''}
    </div>`;
  }).join('');

  const moreProjects = projects.length > 6 ? `<div style="font-size:12px;color:var(--fg-2,#888);margin-top:4px">…and ${projects.length - 6} more projects</div>` : '';

  const schematicHtml = cfg.schematics
    ? `<div class="ngw-sec"><h3>Schematics</h3><div class="ngw-pills">${
        Object.keys(cfg.schematics).slice(0, 6).map((k) => `<span class="ngw-pill">${esc(k)}</span>`).join('')
      }</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'ngw-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="ngw-title"><span class="badge-ngw">Angular</span>angular.json</div>
<div class="ngw-sub">Version ${esc(version)} · ${projects.length} project${projects.length !== 1 ? 's' : ''}${defaultProject ? ` · default: ${esc(defaultProject)}` : ''}</div>
${projects.length ? `<div class="ngw-sec"><h3>Projects</h3><div class="ngw-projects">${projectsHtml}${moreProjects}</div></div>` : ''}
${schematicHtml}`;
  return { parentNode: host };
}
