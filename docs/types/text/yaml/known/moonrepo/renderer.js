import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.moon-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-moon{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7C3AED;color:#fff;vertical-align:middle;margin-right:8px;}
.moon-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.moon-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.moon-schema{font-size:11px;color:var(--fg-2,#888);margin:-8px 0 10px;font-family:ui-monospace,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.moon-sec{margin:12px 0;}
.moon-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.moon-kv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px;margin:4px 0;}
.moon-kv-item{display:flex;align-items:center;gap:6px;font-size:12px;padding:4px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.moon-kv-key{color:var(--fg-2,#888);font-family:ui-monospace,monospace;}
.moon-kv-val{font-family:ui-monospace,monospace;font-weight:600;}
.moon-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0;}
.moon-pill{display:inline-block;font-size:12px;padding:3px 10px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.moon-badge-on{display:inline-block;font-size:11px;padding:1px 6px;border-radius:6px;background:#dcfce7;border:1px solid #86efac;color:#166534;}
.moon-badge-off{display:inline-block;font-size:11px;padding:1px 6px;border-radius:6px;background:#fee2e2;border:1px solid #fca5a5;color:#991b1b;}
.moon-keys{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0;}
.moon-key{font-size:12px;padding:2px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;color:var(--fg-2,#888);}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || \'\') || [])[0] || {};
  } catch { cfg = {}; }

  const filename = (intake.filename || '').split('/').pop() || 'moon.yml';
  const schema = cfg.$schema || '';

  // VCS section
  const vcs = cfg.vcs || {};
  const vcsSystem = vcs.system || '';
  const vcsDefaultBranch = vcs.defaultBranch || '';

  // Node section
  const node = cfg.node || {};
  const nodeVersion = node.version || '';
  const packageManager = node.packageManager || '';
  const pmVersion = node[packageManager]?.version || node.pnpm?.version || node.npm?.version || node.yarn?.version || '';

  // TypeScript
  const tsEnabled = cfg.typescript != null;

  // Projects/sources
  const projects = cfg.projects;
  const projectEntries = typeof projects === 'object' && !Array.isArray(projects)
    ? Object.entries(projects).slice(0, 8)
    : null;
  const projectGlobs = Array.isArray(projects) ? projects.slice(0, 8) : null;

  // Top-level keys summary
  const topKeys = Object.keys(cfg).filter((k) => k !== '$schema');

  const schemaHtml = schema
    ? `<div class="moon-schema">${esc(schema)}</div>`
    : '';

  const vcsHtml = (vcsSystem || vcsDefaultBranch)
    ? `<div class="moon-sec"><h3>VCS</h3><div class="moon-kv-grid">
        ${vcsSystem ? `<div class="moon-kv-item"><span class="moon-kv-key">system</span><span class="moon-kv-val">${esc(vcsSystem)}</span></div>` : ''}
        ${vcsDefaultBranch ? `<div class="moon-kv-item"><span class="moon-kv-key">defaultBranch</span><span class="moon-kv-val">${esc(vcsDefaultBranch)}</span></div>` : ''}
      </div></div>`
    : '';

  const nodeHtml = (nodeVersion || packageManager)
    ? `<div class="moon-sec"><h3>Node</h3><div class="moon-kv-grid">
        ${nodeVersion ? `<div class="moon-kv-item"><span class="moon-kv-key">version</span><span class="moon-kv-val">${esc(nodeVersion)}</span></div>` : ''}
        ${packageManager ? `<div class="moon-kv-item"><span class="moon-kv-key">packageManager</span><span class="moon-kv-val">${esc(packageManager)}</span></div>` : ''}
        ${pmVersion ? `<div class="moon-kv-item"><span class="moon-kv-key">${esc(packageManager || 'pm')} version</span><span class="moon-kv-val">${esc(pmVersion)}</span></div>` : ''}
      </div></div>`
    : '';

  const tsHtml = tsEnabled
    ? `<div class="moon-sec"><h3>TypeScript</h3><div class="moon-keys"><span class="moon-badge-on">enabled</span></div></div>`
    : '';

  let projectsHtml = '';
  if (projectGlobs && projectGlobs.length) {
    projectsHtml = `<div class="moon-sec"><h3>Projects</h3><div class="moon-pills">${projectGlobs.map((g) => `<span class="moon-pill">${esc(String(g))}</span>`).join('')}${projects.length > 8 ? `<span class="moon-pill" style="color:var(--fg-2,#888)">…${projects.length - 8} more</span>` : ''}</div></div>`;
  } else if (projectEntries && projectEntries.length) {
    projectsHtml = `<div class="moon-sec"><h3>Projects</h3><div class="moon-kv-grid">${projectEntries.map(([k, v]) => `<div class="moon-kv-item"><span class="moon-kv-key">${esc(k)}</span><span class="moon-kv-val">${esc(String(v))}</span></div>`).join('')}</div></div>`;
  }

  const summaryHtml = topKeys.length
    ? `<div class="moon-sec"><h3>Top-level sections</h3><div class="moon-keys">${topKeys.map((k) => `<span class="moon-key">${esc(k)}</span>`).join('')}</div></div>`
    : '';

  const sub = [
    vcsSystem ? `vcs: ${esc(vcsSystem)}` : '',
    nodeVersion ? `node ${esc(nodeVersion)}` : '',
    packageManager ? `${esc(packageManager)}${pmVersion ? ` ${esc(pmVersion)}` : ''}` : '',
  ].filter(Boolean).join(' · ') || 'Moon workspace config';

  const host = document.createElement('div');
  host.className = 'moon-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="moon-title"><span class="badge-moon">Moon</span>${esc(filename)}</div>
<div class="moon-sub">${sub}</div>
${schemaHtml}
${vcsHtml}
${nodeHtml}
${tsHtml}
${projectsHtml}
${summaryHtml}`;

  return { parentNode: host };
}
