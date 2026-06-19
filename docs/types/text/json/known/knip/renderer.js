const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.knp-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-knp{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f59e0b;color:#fff;vertical-align:middle;margin-right:8px;}
.knp-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.knp-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.knp-sec{margin:12px 0;}
.knp-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.knp-pills{display:flex;flex-wrap:wrap;gap:6px;}
.knp-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.knp-pill.entry{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8;}
.knp-pill.ignore{background:#fef3c7;border-color:#fcd34d;color:#92400e;}
`;

export function render(intake) {
  let cfg = {};
  try { cfg = JSON.parse(intake.text || '{}'); } catch { cfg = {}; }

  const entry = Array.isArray(cfg.entry) ? cfg.entry : (cfg.entry ? [cfg.entry] : []);
  const project = Array.isArray(cfg.project) ? cfg.project : (cfg.project ? [cfg.project] : []);
  const ignoreDeps = Array.isArray(cfg.ignoreDependencies) ? cfg.ignoreDependencies : [];
  const ignoreExports = Array.isArray(cfg.ignoreExportsUsedInFile) ? cfg.ignoreExportsUsedInFile : [];
  const workspaces = cfg.workspaces ? Object.keys(cfg.workspaces) : [];
  const plugins = cfg.plugins ? Object.entries(cfg.plugins) : [];
  const ignore = Array.isArray(cfg.ignore) ? cfg.ignore : [];

  const entryHtml = entry.length
    ? `<div class="knp-sec"><h3>Entry points (${entry.length})</h3><div class="knp-pills">${entry.slice(0, 6).map((e) => `<span class="knp-pill entry">${esc(e)}</span>`).join('')}</div></div>`
    : '';

  const projectHtml = project.length
    ? `<div class="knp-sec"><h3>Project files</h3><div class="knp-pills">${project.slice(0, 6).map((p) => `<span class="knp-pill">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const wsHtml = workspaces.length
    ? `<div class="knp-sec"><h3>Workspaces (${workspaces.length})</h3><div class="knp-pills">${workspaces.slice(0, 6).map((w) => `<span class="knp-pill">${esc(w)}</span>`).join('')}</div></div>`
    : '';

  const ignoreHtml = (ignoreDeps.length || ignore.length)
    ? `<div class="knp-sec"><h3>Ignore</h3><div class="knp-pills">
        ${ignoreDeps.slice(0, 5).map((d) => `<span class="knp-pill ignore">dep: ${esc(d)}</span>`).join('')}
        ${ignore.slice(0, 5).map((d) => `<span class="knp-pill ignore">${esc(d)}</span>`).join('')}
      </div></div>`
    : '';

  const pluginsHtml = plugins.length
    ? `<div class="knp-sec"><h3>Plugins (${plugins.length})</h3><div class="knp-pills">${plugins.slice(0, 8).map(([k]) => `<span class="knp-pill">${esc(k)}</span>`).join('')}</div></div>`
    : '';

  const sub = [
    entry.length ? `${entry.length} entr${entry.length !== 1 ? 'ies' : 'y'}` : '',
    workspaces.length ? `${workspaces.length} workspace${workspaces.length !== 1 ? 's' : ''}` : '',
    plugins.length ? `${plugins.length} plugin${plugins.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'knp-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="knp-title"><span class="badge-knp">Knip</span>knip.json</div>
<div class="knp-sub">${esc(sub) || 'Dead code and unused dependency finder'}</div>
${entryHtml}${projectHtml}${wsHtml}${ignoreHtml}${pluginsHtml}`;
  return { parentNode: host };
}
