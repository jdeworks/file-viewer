import { parseTOML } from '../../toml.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.clf-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-clf{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a1a2e;color:#e2e8f0;vertical-align:middle;margin-right:8px;}
.clf-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.clf-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.clf-sec{margin:12px 0;}
.clf-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.clf-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0;}
.clf-pill{display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.clf-pill.feat{background:#eff6ff;border-color:#bfdbfe;color:#1e40af;}
.clf-pill.fix{background:#fef2f2;border-color:#fecaca;color:#991b1b;}
.clf-pill.skip{background:var(--bg-2,#f6f8fa);color:var(--fg-2,#888);text-decoration:line-through;}
.clf-table{width:100%;border-collapse:collapse;font-size:13px;}
.clf-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.clf-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.clf-mono{font:12px/1.4 ui-monospace,monospace;}
.clf-template{font:12px/1.5 ui-monospace,monospace;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:6px 10px;white-space:pre-wrap;word-break:break-all;max-height:80px;overflow:hidden;color:var(--fg-2,#888);}
.clf-flags{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0;}
.clf-flag{font-size:12px;padding:2px 8px;border-radius:6px;border:1px solid var(--border,#e0e0e0);}
.clf-flag.on{background:#f0fdf4;border-color:#bbf7d0;color:#166534;}
.clf-flag.off{background:#fef2f2;border-color:#fecaca;color:#991b1b;}
`;

export function render(intake) {
  let cfg = {};
  try { cfg = parseTOML(intake.text || '') || {}; } catch { cfg = {}; }

  const changelog = cfg.changelog || {};
  const git = cfg.git || {};
  const commitParsers = Array.isArray(git.commit_parsers) ? git.commit_parsers : [];
  const conventionalCommits = git.conventional_commits;
  const filterCommits = git.filter_commits;
  const filterUnconventional = git.filter_unconventional;

  const host = document.createElement('div');
  host.className = 'clf-doc';

  const headerText = (changelog.header || '').slice(0, 100);
  const bodyText = (changelog.body || '').slice(0, 120);

  const templateHtml = headerText || bodyText
    ? `<div class="clf-sec"><h3>Templates</h3>${headerText ? `<div style="font-size:11px;color:var(--fg-2,#888);margin-bottom:3px">header</div><div class="clf-template">${esc(headerText)}</div>` : ''}${bodyText ? `<div style="font-size:11px;color:var(--fg-2,#888);margin:6px 0 3px">body (excerpt)</div><div class="clf-template">${esc(bodyText)}</div>` : ''}</div>`
    : '';

  const flag = (val, label) => val !== undefined
    ? `<span class="clf-flag ${val ? 'on' : 'off'}">${label}: ${val ? 'yes' : 'no'}</span>` : '';
  const flagsHtml = [
    flag(conventionalCommits, 'conventional_commits'),
    flag(filterCommits, 'filter_commits'),
    flag(filterUnconventional, 'filter_unconventional'),
  ].filter(Boolean).join('');

  const parsersHtml = commitParsers.length
    ? `<div class="clf-sec"><h3>Commit parsers (${commitParsers.length})</h3><table class="clf-table"><thead><tr><th>Pattern</th><th>Group / Action</th></tr></thead><tbody>${commitParsers.slice(0, 10).map((p) => {
        const pattern = p.message || p.footer || p.field || '—';
        const action = p.skip ? '<em>skip</em>' : esc(p.group || '—');
        return `<tr><td><span class="clf-mono">${esc(pattern)}</span></td><td>${action}</td></tr>`;
      }).join('')}${commitParsers.length > 10 ? `<tr><td colspan="2" style="color:var(--fg-2,#888);font-size:12px">…and ${commitParsers.length - 10} more</td></tr>` : ''}</tbody></table></div>`
    : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="clf-title"><span class="badge-clf">git-cliff</span>Changelog config</div>
<div class="clf-sub">${commitParsers.length} commit parser${commitParsers.length !== 1 ? 's' : ''}${conventionalCommits ? ' · conventional commits' : ''}</div>
${flagsHtml ? `<div class="clf-sec"><h3>Settings</h3><div class="clf-flags">${flagsHtml}</div></div>` : ''}
${templateHtml}
${parsersHtml}`;

  return { parentNode: host };
}
