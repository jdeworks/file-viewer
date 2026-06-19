const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const PLUGIN_DESCRIPTIONS = {
  '@semantic-release/commit-analyzer': 'Analyzes commits to determine release type',
  '@semantic-release/release-notes-generator': 'Generates changelog from commits',
  '@semantic-release/changelog': 'Writes/updates CHANGELOG file',
  '@semantic-release/npm': 'Publishes package to npm',
  '@semantic-release/github': 'Creates GitHub release with assets',
  '@semantic-release/git': 'Commits release artifacts back to repo',
  '@semantic-release/exec': 'Runs custom shell commands',
  '@semantic-release/gitlab': 'Creates GitLab release',
};

const CSS = `
.rls-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-rls{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2ea44f;color:#fff;vertical-align:middle;margin-right:8px;}
.rls-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.rls-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.rls-sec{margin:12px 0;}
.rls-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.rls-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0;}
.rls-pill{display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.rls-pill.pre{background:#fff7ed;border-color:#fed7aa;color:#9a3412;}
.rls-plugin-list{display:flex;flex-direction:column;gap:6px;margin:4px 0;}
.rls-plugin{display:flex;flex-direction:column;padding:6px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.rls-plugin-name{font:12px/1.4 ui-monospace,monospace;font-weight:600;color:var(--accent,#0969da);}
.rls-plugin-desc{font-size:12px;color:var(--fg-2,#888);}
.rls-mono{font:12px/1.4 ui-monospace,monospace;}
`;

export function render(intake) {
  let cfg;
  try { cfg = JSON.parse(intake.text || '{}'); } catch {
    const host = document.createElement('div');
    host.className = 'rls-doc';
    host.innerHTML = `<style>${CSS}</style><div class="rls-sub">Invalid JSON.</div>`;
    return { parentNode: host };
  }

  const branches = Array.isArray(cfg.branches) ? cfg.branches : (cfg.branches ? [cfg.branches] : []);
  const plugins = Array.isArray(cfg.plugins) ? cfg.plugins : [];
  const tagFormat = cfg.tagFormat || '';

  const host = document.createElement('div');
  host.className = 'rls-doc';

  const branchPills = branches.map((b) => {
    if (typeof b === 'string') return `<span class="rls-pill">${esc(b)}</span>`;
    const name = b.name || '?';
    const isPre = b.prerelease;
    return `<span class="rls-pill${isPre ? ' pre' : ''}">${esc(name)}${isPre ? ' (pre)' : ''}</span>`;
  }).join('');

  const branchHtml = branches.length
    ? `<div class="rls-sec"><h3>Branches (${branches.length})</h3><div class="rls-pills">${branchPills}</div></div>` : '';

  const pluginItems = plugins.map((p) => {
    const name = Array.isArray(p) ? p[0] : (typeof p === 'string' ? p : null);
    if (!name) return '';
    const desc = PLUGIN_DESCRIPTIONS[name] || '';
    return `<div class="rls-plugin"><span class="rls-plugin-name">${esc(name)}</span>${desc ? `<span class="rls-plugin-desc">${esc(desc)}</span>` : ''}</div>`;
  }).filter(Boolean).join('');

  const pluginsHtml = plugins.length
    ? `<div class="rls-sec"><h3>Plugins (${plugins.length})</h3><div class="rls-plugin-list">${pluginItems}</div></div>` : '';

  const tagHtml = tagFormat
    ? `<div class="rls-sec"><h3>Tag format</h3><span class="rls-mono">${esc(tagFormat)}</span></div>` : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="rls-title"><span class="badge-rls">semantic-release</span>Release automation</div>
<div class="rls-sub">${plugins.length} plugin${plugins.length !== 1 ? 's' : ''}${branches.length ? ` · ${branches.length} branch${branches.length !== 1 ? 'es' : ''}` : ''}</div>
${branchHtml}
${tagHtml}
${pluginsHtml}`;

  return { parentNode: host };
}
