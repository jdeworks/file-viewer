const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rsh-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-rsh{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0066CC;color:#fff;vertical-align:middle;margin-right:8px;}
.rsh-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.rsh-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.rsh-sec{margin:12px 0;}
.rsh-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.rsh-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0;}
.rsh-pill{display:inline-flex;align-items:center;gap:6px;font-size:12px;padding:4px 10px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.rsh-pub{display:inline-block;font-size:10px;padding:1px 6px;border-radius:6px;background:#dcfce7;border:1px solid #86efac;color:#166534;}
.rsh-nopub{display:inline-block;font-size:10px;padding:1px 6px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);color:var(--fg-2,#888);}
.rsh-kv{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0;}
.rsh-kv-item{font-size:12px;display:flex;align-items:center;gap:4px;}
.rsh-kv-key{color:var(--fg-2,#888);}
.rsh-kv-val{font-family:ui-monospace,monospace;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:4px;padding:1px 6px;}
.rsh-more{font-size:11px;color:var(--fg-2,#888);margin-top:4px;}
`;

export function render(intake) {
  let cfg;
  try { cfg = JSON.parse(intake.text || '{}'); } catch {
    return { parentNode: Object.assign(document.createElement('div'), { textContent: 'Invalid JSON.' }) };
  }

  const rushVersion = cfg.rushVersion || '';
  const nodeSupportedVersionRange = cfg.nodeSupportedVersionRange || '';
  const projectFolderMaxDepth = cfg.projectFolderMaxDepth != null ? cfg.projectFolderMaxDepth : null;
  const projects = Array.isArray(cfg.projects) ? cfg.projects : [];
  const npmVersion = cfg.npmVersion || '';
  const pnpmVersion = cfg.pnpmVersion || '';
  const yarnVersion = cfg.yarnVersion || '';

  const displayProjects = projects.slice(0, 15);
  const extra = projects.length - displayProjects.length;

  const projectsHtml = projects.length
    ? `<div class="rsh-sec"><h3>Projects (${projects.length})</h3>
        <div class="rsh-pills">
          ${displayProjects.map((p) => {
            const name = esc(p.packageName || p.projectFolder || '?');
            const folder = p.projectFolder ? `<span style="color:var(--fg-2,#888)">${esc(p.projectFolder)}</span>` : '';
            const pub = p.shouldPublish
              ? `<span class="rsh-pub">publish</span>`
              : `<span class="rsh-nopub">private</span>`;
            return `<span class="rsh-pill">${name}${folder ? ' ' + folder : ''} ${pub}</span>`;
          }).join('')}
        </div>
        ${extra > 0 ? `<div class="rsh-more">…and ${extra} more project${extra !== 1 ? 's' : ''}</div>` : ''}
      </div>`
    : '';

  const hasPkgManager = npmVersion || pnpmVersion || yarnVersion;
  const pkgManagerHtml = hasPkgManager
    ? `<div class="rsh-sec"><h3>Package Manager</h3><div class="rsh-kv">
        ${npmVersion ? `<span class="rsh-kv-item"><span class="rsh-kv-key">npm:</span><span class="rsh-kv-val">${esc(npmVersion)}</span></span>` : ''}
        ${pnpmVersion ? `<span class="rsh-kv-item"><span class="rsh-kv-key">pnpm:</span><span class="rsh-kv-val">${esc(pnpmVersion)}</span></span>` : ''}
        ${yarnVersion ? `<span class="rsh-kv-item"><span class="rsh-kv-key">yarn:</span><span class="rsh-kv-val">${esc(yarnVersion)}</span></span>` : ''}
      </div></div>`
    : '';

  const hasOther = nodeSupportedVersionRange || projectFolderMaxDepth != null;
  const otherHtml = hasOther
    ? `<div class="rsh-sec"><h3>Other Settings</h3><div class="rsh-kv">
        ${nodeSupportedVersionRange ? `<span class="rsh-kv-item"><span class="rsh-kv-key">nodeSupportedVersionRange:</span><span class="rsh-kv-val">${esc(nodeSupportedVersionRange)}</span></span>` : ''}
        ${projectFolderMaxDepth != null ? `<span class="rsh-kv-item"><span class="rsh-kv-key">projectFolderMaxDepth:</span><span class="rsh-kv-val">${esc(projectFolderMaxDepth)}</span></span>` : ''}
      </div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'rsh-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="rsh-title"><span class="badge-rsh">Rush</span>rush.json</div>
<div class="rsh-sub">${rushVersion ? `rushVersion: ${esc(rushVersion)}` : 'Rush monorepo config'}${projects.length ? ` · ${projects.length} project${projects.length !== 1 ? 's' : ''}` : ''}</div>
${projectsHtml}
${pkgManagerHtml}
${otherHtml}`;

  return { parentNode: host };
}
