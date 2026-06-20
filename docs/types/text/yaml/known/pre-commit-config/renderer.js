import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.precommit-doc { padding: 16px 18px; max-width: 880px; margin: 0 auto; font: 14px/1.55 system-ui, sans-serif; color: var(--fg, #24292f); }
.precommit-doc .pc-header { margin-bottom: 16px; }
.precommit-doc .pc-badge { display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 11px; font-weight: 700; background: #fab040; color: #1c1917; vertical-align: middle; margin-right: 8px; }
.precommit-doc .pc-title { font-size: 18px; font-weight: 700; margin: 0 0 3px; }
.precommit-doc .pc-sub { font-size: 12px; color: var(--fg-2, #888); margin: 0 0 14px; }
.precommit-doc .pc-table-wrap { overflow-x: auto; margin-bottom: 14px; }
.precommit-doc table.pc-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.precommit-doc table.pc-table th { text-align: left; padding: 6px 10px; border-bottom: 2px solid var(--border, #e0e0e0); font-weight: 600; color: var(--fg-2, #666); font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
.precommit-doc table.pc-table td { padding: 7px 10px; border-bottom: 1px solid var(--border, #e8e8e8); vertical-align: top; }
.precommit-doc table.pc-table tr:last-child td { border-bottom: none; }
.precommit-doc .pc-repo-name { font-family: ui-monospace, monospace; font-size: 12px; font-weight: 600; }
.precommit-doc .pc-rev { font-family: ui-monospace, monospace; font-size: 11px; color: var(--fg-2, #888); white-space: nowrap; }
.precommit-doc .pc-local-badge { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; background: #6366f1; color: #fff; vertical-align: middle; }
.precommit-doc .pc-hooks { display: flex; flex-wrap: wrap; gap: 5px; }
.precommit-doc .pc-hook-chip { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 10px; font-size: 11px; background: var(--bg-2, #f6f8fa); border: 1px solid var(--border, #e0e0e0); font-family: ui-monospace, monospace; }
.precommit-doc .pc-card { border: 1px solid var(--border, #e0e0e0); border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; }
.precommit-doc .pc-card h3 { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--fg-2, #666); margin: 0 0 8px; }
.precommit-doc .pc-kv { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 12px; }
.precommit-doc .pc-kv span { color: var(--fg-2, #888); }
.precommit-doc .pc-kv code { font-family: ui-monospace, monospace; font-size: 12px; }
.precommit-doc .pc-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.precommit-doc .pc-chip { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 10px; font-size: 12px; background: var(--bg-2, #f6f8fa); border: 1px solid var(--border, #e0e0e0); }
`;

function shortRepo(url) {
  if (!url || url === 'local') return null;
  const m = url.match(/github\.com\/([^/]+\/[^/]+)/);
  if (m) return m[1].replace(/\.git$/, '');
  return url.replace(/^https?:\/\//, '').slice(0, 50);
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  const repos = Array.isArray(cfg.repos) ? cfg.repos : [];
  const totalHooks = repos.reduce((n, r) => n + (Array.isArray(r.hooks) ? r.hooks.length : 0), 0);
  const ci = cfg.ci && typeof cfg.ci === 'object' ? cfg.ci : null;
  const langVer = cfg.default_language_version && typeof cfg.default_language_version === 'object'
    ? cfg.default_language_version : null;

  // Build repos table rows
  const rows = repos.map((r) => {
    const isLocal = !r.repo || r.repo === 'local';
    const name = isLocal ? null : shortRepo(r.repo);
    const hooks = Array.isArray(r.hooks) ? r.hooks : [];
    const hooksHtml = hooks.length
      ? `<div class="pc-hooks">${hooks.map((h) => `<span class="pc-hook-chip">${esc(h.id || '?')}</span>`).join('')}</div>`
      : '<span style="color:var(--fg-2,#999);font-size:12px">—</span>';
    const nameCell = isLocal
      ? `<span class="pc-local-badge">local</span>`
      : `<span class="pc-repo-name">${esc(name)}</span>`;
    const revCell = r.rev ? `<span class="pc-rev">${esc(r.rev)}</span>` : '—';
    return `<tr><td>${nameCell}</td><td>${revCell}</td><td>${hooksHtml}</td></tr>`;
  }).join('');

  // CI card
  let ciHtml = '';
  if (ci) {
    const ciEntries = [];
    if (ci.autofix_commit_msg) ciEntries.push(`<div><span>Autofix message:</span> <code>${esc(ci.autofix_commit_msg)}</code></div>`);
    if (ci.autoupdate_schedule) ciEntries.push(`<div><span>Autoupdate schedule:</span> <code>${esc(ci.autoupdate_schedule)}</code></div>`);
    if (ci.autoupdate_commit_msg) ciEntries.push(`<div><span>Autoupdate message:</span> <code>${esc(ci.autoupdate_commit_msg)}</code></div>`);
    if (ciEntries.length) {
      ciHtml = `<div class="pc-card"><h3>CI settings</h3><div class="pc-kv">${ciEntries.join('')}</div></div>`;
    }
  }

  // Default language versions card
  let langHtml = '';
  if (langVer) {
    const chips = Object.entries(langVer).map(([lang, ver]) =>
      `<span class="pc-chip"><strong>${esc(lang)}</strong>&nbsp;${esc(ver)}</span>`
    ).join('');
    if (chips) langHtml = `<div class="pc-card"><h3>Default language versions</h3><div class="pc-chips">${chips}</div></div>`;
  }

  const filename = (intake.name || intake.filename || '').split('/').pop() || '.pre-commit-config.yaml';

  const host = document.createElement('div');
  host.className = 'precommit-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="pc-header">
  <div class="pc-title"><span class="pc-badge">pre-commit</span>${esc(filename)}</div>
  <div class="pc-sub">${repos.length} repo${repos.length !== 1 ? 's' : ''} · ${totalHooks} hook${totalHooks !== 1 ? 's' : ''} total</div>
</div>
${repos.length ? `<div class="pc-table-wrap"><table class="pc-table">
  <thead><tr><th>Repository</th><th>Rev</th><th>Hooks</th></tr></thead>
  <tbody>${rows}</tbody>
</table></div>` : '<p style="color:var(--fg-2,#999);font-size:13px">No repos defined.</p>'}
${ciHtml}${langHtml}`;

  return { parentNode: host };
}
