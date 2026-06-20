import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.prc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-prc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#fab005;color:#1c1917;vertical-align:middle;margin-right:8px;}
.prc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.prc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.prc-repo{border:1px solid var(--border,#e0e0e0);border-radius:6px;margin:8px 0;}
.prc-repo-hd{padding:6px 12px;background:var(--bg-2,#f6f8fa);font-size:12px;font-weight:600;font-family:ui-monospace,monospace;border-radius:6px 6px 0 0;}
.prc-hooks{padding:6px 12px;display:flex;flex-wrap:wrap;gap:6px;}
.prc-pill{display:inline-flex;align-items:center;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.prc-rev{font:11px/1 ui-monospace,monospace;color:var(--fg-2,#888);margin-left:8px;}
`;

function shortRepo(url) {
  if (!url) return '?';
  const m = url.match(/github\.com\/([^/]+\/[^/]+)/);
  return m ? m[1] : url.replace(/^https?:\/\//, '').slice(0, 40);
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || \'\') || [])[0] || {};
  } catch { cfg = {}; }

  const repos = Array.isArray(cfg.repos) ? cfg.repos : [];
  const langVer = cfg.default_language_version
    ? Object.entries(cfg.default_language_version).map(([l, v]) => `${l}: ${v}`).join(', ')
    : null;
  const totalHooks = repos.reduce((n, r) => n + (Array.isArray(r.hooks) ? r.hooks.length : 0), 0);

  const reposHtml = repos.slice(0, 8).map((r) => {
    const hooks = Array.isArray(r.hooks) ? r.hooks : [];
    const name = shortRepo(r.repo);
    const rev = r.rev || '';
    return `<div class="prc-repo">
      <div class="prc-repo-hd">${esc(name)}${rev ? `<span class="prc-rev">${esc(rev)}</span>` : ''}</div>
      <div class="prc-hooks">${hooks.map((h) => `<span class="prc-pill">${esc(h.id || '?')}</span>`).join('')}</div>
    </div>`;
  }).join('');

  const host = document.createElement('div');
  host.className = 'prc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="prc-title"><span class="badge-prc">pre-commit</span>Hook config</div>
<div class="prc-sub">${repos.length} repo${repos.length !== 1 ? 's' : ''} · ${totalHooks} hook${totalHooks !== 1 ? 's' : ''}${langVer ? ` · ${esc(langVer)}` : ''}</div>
${reposHtml}${repos.length > 8 ? `<div style="font-size:12px;color:var(--fg-2,#888)">…and ${repos.length - 8} more repos</div>` : ''}`;
  return { parentNode: host };
}
