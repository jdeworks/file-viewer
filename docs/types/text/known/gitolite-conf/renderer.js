// Gitolite conf enhancement: show repos, groups, and permission summary.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.gitolite-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.gl-head{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:14px;}
.gl-title{font-size:20px;font-weight:700;margin:0;}
.gl-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#F05032;color:#fff;vertical-align:middle;margin-right:6px;}
.gl-chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 14px;}
.gl-chip{font-size:11px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);color:var(--fg-2,#555);}
.gl-section{margin:14px 0;}
.gl-section h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;font-weight:600;}
.gl-table{width:100%;border-collapse:collapse;font-size:13px;}
.gl-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);font-weight:600;padding:4px 8px 4px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.gl-table td{padding:6px 8px 6px 0;border-bottom:1px solid var(--border,#f0f0f0);vertical-align:top;}
.gl-table tr:last-child td{border-bottom:none;}
.gl-name{font-family:ui-monospace,monospace;font-weight:600;color:var(--fg,#24292f);}
.gl-members{font-family:ui-monospace,monospace;color:var(--fg-2,#555);font-size:12px;}
.gl-perm{font-size:12px;color:var(--fg-2,#444);line-height:1.7;}
.gl-perm-rw{color:#166534;font-weight:700;font-family:ui-monospace,monospace;}
.gl-perm-r{color:#0550ae;font-weight:700;font-family:ui-monospace,monospace;}
.gl-perm-deny{color:#9a1515;font-weight:700;font-family:ui-monospace,monospace;}
.gl-wild{font-size:11px;padding:2px 6px;border-radius:8px;background:#fef9c3;border:1px solid #fde047;color:#713f12;margin-left:4px;}
.gl-empty{color:var(--fg-2,#888);font-size:13px;padding:16px;text-align:center;}
`;

function parseGitolite(text) {
  const groups = {};
  const repos = [];
  let currentRepo = null;

  for (const rawLine of (text || '').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    // Group definitions: @groupname = member1 member2 ...
    if (line.startsWith('@')) {
      const eqIdx = line.indexOf('=');
      if (eqIdx !== -1) {
        const name = line.slice(0, eqIdx).trim();
        const members = line.slice(eqIdx + 1).trim().split(/\s+/).filter(Boolean);
        groups[name] = members;
      }
      continue;
    }

    // Repo block start
    if (line.startsWith('repo ')) {
      currentRepo = { name: line.slice(5).trim(), perms: [] };
      repos.push(currentRepo);
      continue;
    }

    // Permission lines inside repo block
    if (currentRepo && /^(RW\+?D?C?|R|W|-)\s/.test(line)) {
      currentRepo.perms.push(line);
      continue;
    }

    // git config lines inside repo block — just ignore
  }

  return { groups, repos };
}

function isWildcard(repoName) {
  return /CREATOR|@|[.*+?[\]{}()|\\]/.test(repoName);
}

function permClass(perm) {
  if (perm.startsWith('-')) return 'gl-perm-deny';
  if (perm.startsWith('R') && !perm.startsWith('RW')) return 'gl-perm-r';
  return 'gl-perm-rw';
}

function summarisePerms(perms) {
  if (!perms.length) return '<em style="color:var(--fg-2,#aaa);font-size:12px">no permissions defined</em>';
  return perms.map((line) => {
    const m = line.match(/^(RW\+?D?C?|R|W|-)\s*(?:refs\/\S+\s*)?=\s*(.+)$/);
    if (!m) return esc(line);
    const access = m[1];
    const principals = m[2].trim();
    return `<span class="${permClass(access)} ">${esc(access)}</span> for ${esc(principals)}`;
  }).join('<br>');
}

export function render(intake) {
  const { groups, repos } = parseGitolite(intake.text || '');

  const groupNames = Object.keys(groups);
  const wildcardRepos = repos.filter((r) => isWildcard(r.name));
  const normalRepos = repos.filter((r) => !isWildcard(r.name));

  const chips = [
    `<span class="gl-chip">${repos.length} repo${repos.length !== 1 ? 's' : ''}</span>`,
    groupNames.length ? `<span class="gl-chip">${groupNames.length} group${groupNames.length !== 1 ? 's' : ''}</span>` : '',
    wildcardRepos.length ? `<span class="gl-chip">${wildcardRepos.length} wildcard repo${wildcardRepos.length !== 1 ? 's' : ''}</span>` : '',
  ].filter(Boolean).join('');

  // Groups table
  let groupsHtml = '';
  if (groupNames.length) {
    const rows = groupNames.map((g) =>
      `<tr><td class="gl-name">${esc(g)}</td><td class="gl-members">${esc(groups[g].join('  '))}</td></tr>`
    ).join('');
    groupsHtml = `<div class="gl-section">
      <h3>Groups (${groupNames.length})</h3>
      <table class="gl-table">
        <thead><tr><th>Group</th><th>Members</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  // Repos table
  let reposHtml = '';
  if (repos.length) {
    const renderRepoRows = (repoList) => repoList.map((repo) => {
      const wildTag = isWildcard(repo.name) ? '<span class="gl-wild">wildcard</span>' : '';
      return `<tr>
        <td class="gl-name">${esc(repo.name)}${wildTag}</td>
        <td class="gl-perm">${summarisePerms(repo.perms)}</td>
      </tr>`;
    }).join('');

    reposHtml = `<div class="gl-section">
      <h3>Repositories (${repos.length})</h3>
      <table class="gl-table">
        <thead><tr><th>Repo</th><th>Permissions</th></tr></thead>
        <tbody>${renderRepoRows(normalRepos)}${renderRepoRows(wildcardRepos)}</tbody>
      </table>
    </div>`;
  }

  const isEmpty = !repos.length && !groupNames.length;

  const host = document.createElement('div');
  host.className = 'gitolite-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="gl-head">
  <h1 class="gl-title"><span class="gl-badge">Gitolite</span> gitolite.conf</h1>
</div>
${chips ? `<div class="gl-chips">${chips}</div>` : ''}
${isEmpty ? '<p class="gl-empty">No repos or groups found.</p>' : ''}
${groupsHtml}
${reposHtml}`;

  return { parentNode: host };
}
