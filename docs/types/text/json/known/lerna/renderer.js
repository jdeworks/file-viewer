const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.lrn-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-lrn{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#9333ea;color:#fff;vertical-align:middle;margin-right:8px;}
.lrn-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.lrn-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.lrn-sec{margin:12px 0;}
.lrn-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.lrn-pills{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0;}
.lrn-pill{display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.lrn-badge{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:2px 4px 2px 0;}
.lrn-badge.on{background:#dcfce7;border-color:#86efac;color:#166534;}
.lrn-badge.off{background:#fee2e2;border-color:#fca5a5;color:#991b1b;}
.lrn-kv{font-size:12px;color:var(--fg-2,#888);}
`;

export function render(intake) {
  let cfg;
  try { cfg = JSON.parse(intake.text || '{}'); } catch { return { parentNode: Object.assign(document.createElement('div'), { textContent: 'Invalid Lerna JSON.' }) }; }

  const version = cfg.version || cfg.$schema?.match(/v(\d+)/)?.[1] || null;
  const npmClient = cfg.npmClient || 'npm';
  const packages = Array.isArray(cfg.packages) ? cfg.packages : [];
  const useWorkspaces = cfg.useWorkspaces === true;
  const conventionalCommits = cfg.command?.publish?.conventionalCommits === true ||
    cfg.conventionalCommits === true;
  const independentVersions = cfg.version === 'independent';
  const stream = cfg.stream === true;
  const ci = cfg.ci === true;

  const host = document.createElement('div');
  host.className = 'lrn-doc';

  const pkgHtml = packages.length
    ? `<div class="lrn-sec"><h3>Packages (${packages.length})</h3><div class="lrn-pills">${packages.map((p) => `<span class="lrn-pill">${esc(p)}</span>`).join('')}</div></div>`
    : '';

  const settingsHtml = `<div class="lrn-sec"><h3>Settings</h3><div class="lrn-pills">
    <span class="lrn-badge">npm client: ${esc(npmClient)}</span>
    ${useWorkspaces ? '<span class="lrn-badge on">workspaces</span>' : ''}
    ${conventionalCommits ? '<span class="lrn-badge on">conventional commits</span>' : ''}
    ${independentVersions ? '<span class="lrn-badge on">independent versions</span>' : ''}
    ${stream ? '<span class="lrn-badge on">stream</span>' : ''}
    ${ci ? '<span class="lrn-badge on">CI mode</span>' : ''}
  </div></div>`;

  host.innerHTML = `<style>${CSS}</style>
<div class="lrn-title"><span class="badge-lrn">Lerna</span>lerna.json</div>
<div class="lrn-sub">${version ? `version: ${esc(version)}` : 'monorepo config'}${packages.length ? ` · ${packages.length} package glob${packages.length !== 1 ? 's' : ''}` : ''}</div>
${pkgHtml}
${settingsHtml}`;

  return { parentNode: host };
}
