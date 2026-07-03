import { parseTOML } from '../../toml.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.clifftoml-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-clifftoml{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#F4511E;color:#fff;vertical-align:middle;margin-right:8px;}
.clifftoml-title{font-size:18px;font-weight:700;margin:0 0 2px;}
.clifftoml-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.clifftoml-sec{margin:12px 0;}
.clifftoml-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.clifftoml-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0;}
.clifftoml-pill{display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.clifftoml-pill.on{background:#f0fdf4;border-color:#bbf7d0;color:#166534;}
.clifftoml-pill.off{background:#fef2f2;border-color:#fecaca;color:#991b1b;}
.clifftoml-pill.skip{background:var(--bg-2,#f6f8fa);color:var(--fg-2,#888);text-decoration:line-through;}
.clifftoml-table{width:100%;border-collapse:collapse;font-size:13px;}
.clifftoml-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.clifftoml-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.clifftoml-mono{font:12px/1.4 ui-monospace,monospace;}
.clifftoml-template{font:12px/1.5 ui-monospace,monospace;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:6px 10px;white-space:pre-wrap;word-break:break-all;max-height:80px;overflow:hidden;color:var(--fg-2,#888);}
.clifftoml-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;}
.clifftoml-kv-k{font-size:12px;color:var(--fg-2,#888);min-width:140px;}
.clifftoml-kv-v{font-size:13px;font-family:ui-monospace,monospace;}
`;

export function render(intake) {
  let cfg = {};
  try { cfg = parseTOML(intake.text || '') || {}; } catch { cfg = {}; }

  const changelog = cfg.changelog || {};
  const git = cfg.git || {};
  const remote = cfg.remote || {};
  const remoteGithub = remote.github || null;

  const commitParsers = Array.isArray(git.commit_parsers) ? git.commit_parsers : [];
  const conventionalCommits = git.conventional_commits;
  const filterCommits = git.filter_commits;
  const filterUnconventional = git.filter_unconventional;
  const protectBreaking = git.protect_breaking_commits;
  const tagPattern = git.tag_pattern || '';
  const ignoreTags = git.ignore_tags;
  const trim = changelog.trim;
  const hasHeader = !!changelog.header;
  const hasFooter = !!changelog.footer;
  const bodyText = (changelog.body || '').slice(0, 120);

  const host = document.createElement('div');
  host.className = 'clifftoml-doc';

  // Changelog settings card
  const changelogChips = [];
  if (trim !== undefined) changelogChips.push(`<span class="clifftoml-pill ${trim ? 'on' : 'off'}">trim: ${trim ? 'yes' : 'no'}</span>`);
  if (hasHeader) changelogChips.push('<span class="clifftoml-pill on">has-header</span>');
  if (hasFooter) changelogChips.push('<span class="clifftoml-pill on">has-footer</span>');
  const changelogCard = changelogChips.length
    ? `<div class="clifftoml-sec"><h3>Changelog Settings</h3><div class="clifftoml-pills">${changelogChips.join('')}</div></div>` : '';

  // Git settings card
  const gitChips = [];
  if (conventionalCommits !== undefined) gitChips.push(`<span class="clifftoml-pill ${conventionalCommits ? 'on' : 'off'}">conventional_commits: ${conventionalCommits ? 'yes' : 'no'}</span>`);
  if (filterUnconventional !== undefined) gitChips.push(`<span class="clifftoml-pill ${filterUnconventional ? 'on' : 'off'}">filter_unconventional: ${filterUnconventional ? 'yes' : 'no'}</span>`);
  if (filterCommits !== undefined) gitChips.push(`<span class="clifftoml-pill ${filterCommits ? 'on' : 'off'}">filter_commits: ${filterCommits ? 'yes' : 'no'}</span>`);
  if (protectBreaking !== undefined) gitChips.push(`<span class="clifftoml-pill ${protectBreaking ? 'on' : 'off'}">protect_breaking_commits: ${protectBreaking ? 'yes' : 'no'}</span>`);

  const gitKvRows = [];
  if (tagPattern) gitKvRows.push(`<div class="clifftoml-kv"><span class="clifftoml-kv-k">tag_pattern</span><span class="clifftoml-kv-v clifftoml-mono">${esc(tagPattern)}</span></div>`);
  if (ignoreTags !== undefined && ignoreTags !== '') gitKvRows.push(`<div class="clifftoml-kv"><span class="clifftoml-kv-k">ignore_tags</span><span class="clifftoml-kv-v clifftoml-mono">${esc(ignoreTags)}</span></div>`);

  const gitCard = gitChips.length || gitKvRows.length
    ? `<div class="clifftoml-sec"><h3>Git Settings</h3><div class="clifftoml-pills">${gitChips.join('')}</div>${gitKvRows.join('')}</div>` : '';

  // Commit parsers table (up to 8 as spec says)
  const parsersHtml = commitParsers.length
    ? `<div class="clifftoml-sec"><h3>Commit Groups (${commitParsers.length})</h3><table class="clifftoml-table"><thead><tr><th>Pattern</th><th>Group / Action</th></tr></thead><tbody>${commitParsers.slice(0, 8).map((p) => {
        const pattern = p.message || p.footer || p.field || '—';
        const isSkip = p.skip === true;
        const action = isSkip ? '<span class="clifftoml-pill skip">skip</span>' : esc(p.group || '—');
        return `<tr><td><span class="clifftoml-mono">${esc(pattern)}</span></td><td>${action}</td></tr>`;
      }).join('')}${commitParsers.length > 8 ? `<tr><td colspan="2" style="color:var(--fg-2,#888);font-size:12px">…and ${commitParsers.length - 8} more</td></tr>` : ''}</tbody></table></div>`
    : '';

  // Body template preview
  const templateHtml = bodyText
    ? `<div class="clifftoml-sec"><h3>Body Template</h3><div class="clifftoml-template">${esc(bodyText)}…</div></div>` : '';

  // Remote GitHub section
  let remoteHtml = '';
  if (remoteGithub) {
    const owner = remoteGithub.owner || '';
    const repo = remoteGithub.repo || '';
    if (owner || repo) {
      remoteHtml = `<div class="clifftoml-sec"><h3>Remote</h3><div class="clifftoml-kv"><span class="clifftoml-kv-k">github</span><span class="clifftoml-kv-v clifftoml-mono">${esc(owner)}${owner && repo ? '/' : ''}${esc(repo)}</span></div></div>`;
    }
  }

  host.innerHTML = `<style>${CSS}</style>
<div class="clifftoml-title"><span class="badge-clifftoml">git-cliff</span>cliff.toml</div>
<div class="clifftoml-sub">Changelog generator config${commitParsers.length ? ` · ${commitParsers.length} commit parser${commitParsers.length !== 1 ? 's' : ''}` : ''}${conventionalCommits ? ' · conventional commits' : ''}</div>
${changelogCard}
${gitCard}
${parsersHtml}
${templateHtml}
${remoteHtml}`;

  return { parentNode: host };
}
