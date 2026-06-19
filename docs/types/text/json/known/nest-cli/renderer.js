const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.nst-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-nst{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e0234e;color:#fff;vertical-align:middle;margin-right:8px;}
.nst-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.nst-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.nst-sec{margin:12px 0;}
.nst-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.nst-grid{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;margin:8px 0;}
.nst-key{font-size:12px;color:var(--fg-2,#888);}
.nst-val{font:12px ui-monospace,monospace;color:var(--accent,#0969da);}
.nst-pill{display:inline-block;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:2px 8px;font:12px ui-monospace,monospace;margin:2px;}
.nst-pill.app{background:#fff0f0;border-color:#fca5a5;color:#b91c1c;}
.nst-pill.lib{background:#f0f0ff;border-color:#a5b4fc;color:#4338ca;}
`;

export function render(intake) {
  let cfg = {};
  try { cfg = JSON.parse(intake.text || '{}'); } catch { cfg = {}; }

  const isMonorepo = cfg.monorepo === true;
  const collection = cfg.collection || '';
  const sourceRoot = cfg.sourceRoot || '';
  const projects = cfg.projects ? Object.entries(cfg.projects) : [];
  const compilerOpts = cfg.compilerOptions || {};

  let projectsHtml = '';
  if (projects.length) {
    projectsHtml = `<div class="nst-sec"><h3>Projects (${projects.length})</h3><div>`;
    for (const [pname, proj] of projects) {
      const type = proj?.type || 'application';
      const cls = type === 'library' ? 'lib' : 'app';
      projectsHtml += `<span class="nst-pill ${cls}">${esc(pname)} <span style="opacity:.7;font-size:10px">${esc(type)}</span></span>`;
    }
    projectsHtml += '</div></div>';
  }

  const host = document.createElement('div');
  host.className = 'nst-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="nst-title"><span class="badge-nst">NestJS</span>nest-cli.json</div>
<div class="nst-sub">${isMonorepo ? 'Monorepo workspace' : 'Single-app project'}${projects.length ? ` · ${projects.length} project${projects.length !== 1 ? 's' : ''}` : ''}</div>
<div class="nst-sec"><div class="nst-grid">
${isMonorepo ? '<span class="nst-key">Mode</span><span class="nst-val">monorepo</span>' : ''}
${collection ? `<span class="nst-key">Collection</span><span class="nst-val">${esc(collection)}</span>` : ''}
${sourceRoot ? `<span class="nst-key">Source root</span><span class="nst-val">${esc(sourceRoot)}</span>` : ''}
${Object.keys(compilerOpts).length ? `<span class="nst-key">Compiler opts</span><span class="nst-val">${esc(Object.keys(compilerOpts).join(', '))}</span>` : ''}
</div></div>
${projectsHtml}`;
  return { parentNode: host };
}
