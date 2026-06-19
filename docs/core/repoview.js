// Git branch/commit browser, rendered directly into the parent pane (trusted, interactive
// content — not the sandboxed iframe). Shows the branches, the recent commit list for the
// selected branch, and per-commit details. Driven by an openRepo() handle (see git.js).

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const short = (sha) => (sha || '').slice(0, 7);
function relTime(d) {
  if (!d) return '';
  const s = (Date.now() - d.getTime()) / 1000;
  for (const [n, sec] of [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]]) {
    const v = Math.floor(s / sec);
    if (v >= 1) return v + ' ' + n + (v > 1 ? 's' : '') + ' ago';
  }
  return 'just now';
}

export async function renderRepoView(host, repo, options = {}) {
  const WALK_LIMIT = options.walkLimit || 50;
  host.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'repo-view';

  const head = document.createElement('div');
  head.className = 'repo-head';
  head.innerHTML = '<div class="repo-title"><span class="repo-icon">⎇</span> <span class="repo-name">' + esc(repo.repoName) + '</span></div>';
  const branchSel = document.createElement('select');
  branchSel.className = 'repo-branch';
  for (const b of repo.branches) branchSel.add(new Option((b.current ? '● ' : '') + b.name, b.sha));
  if (repo.head.detached) branchSel.add(new Option('(detached) ' + short(repo.head.sha), repo.head.sha, true, true));
  head.appendChild(branchSel);
  wrap.appendChild(head);

  const cols = document.createElement('div');
  cols.className = 'repo-cols';
  const list = document.createElement('div');
  list.className = 'repo-list';
  const detail = document.createElement('div');
  detail.className = 'repo-detail';
  detail.innerHTML = '<p class="repo-hint">Select a commit to see its details.</p>';
  cols.append(list, detail);
  wrap.appendChild(cols);
  host.appendChild(wrap);
  let detailToken = 0;
  const repoPath = (path) => repo.repoRoot ? repo.repoRoot + '/' + path : path;
  const canOpenPath = (path) => typeof options.canOpenFile === 'function' && options.canOpenFile(repoPath(path));
  const deltaText = (f) => Number.isFinite(f.additions) || Number.isFinite(f.deletions)
    ? '<span class="rc-delta"><span class="rc-add">+' + esc(f.additions || 0) + '</span> <span class="rc-del">-' + esc(f.deletions || 0) + '</span></span>'
    : '';
  function fileRow(f) {
    const linked = f.status !== 'D' && canOpenPath(f.path);
    const path = linked
      ? '<button type="button" class="rc-path rc-path-link" data-path="' + esc(repoPath(f.path)) + '">' + esc(f.path) + '</button>'
      : '<span class="rc-path">' + esc(f.path) + '</span>';
    return '<li><span class="rc-status rc-status-' + esc(f.status.toLowerCase()) + '">' + esc(f.status)
      + '</span>' + path + deltaText(f) + '</li>';
  }

  async function showDetail(c) {
    const token = ++detailToken;
    const sameIdent = c.committer && c.author && c.committer.name === c.author.name
      && c.committer.email === c.author.email && +c.committer.date === +c.author.date;
    detail.innerHTML =
      '<div class="rc-sha">commit ' + esc(c.sha) + '</div>'
      + '<dl class="rc-meta">'
      + '<dt>Author</dt><dd>' + esc(c.author && c.author.name) + ' &lt;' + esc(c.author && c.author.email) + '&gt;'
      + '<br><span class="rc-date">' + (c.author && c.author.date ? c.author.date.toLocaleString() : '') + '</span></dd>'
      + (c.committer && !sameIdent
        ? '<dt>Committer</dt><dd>' + esc(c.committer.name) + ' &lt;' + esc(c.committer.email) + '&gt;'
          + '<br><span class="rc-date">' + (c.committer.date ? c.committer.date.toLocaleString() : '') + '</span></dd>' : '')
      + '<dt>Parents</dt><dd>' + (c.parents.length ? c.parents.map(short).join(', ') : '(root commit)') + '</dd>'
      + '<dt>Tree</dt><dd>' + esc(short(c.tree)) + '</dd>'
      + '</dl>'
      + '<pre class="rc-message">' + esc(c.message.trimEnd()) + '</pre>'
      + '<div class="rc-files"><h3>Changed files</h3><p class="repo-hint">Reading changed files…</p></div>';
    const filesHost = detail.querySelector('.rc-files');
    try {
      const result = await repo.changedFiles(c);
      if (token !== detailToken) return;
      if (!result.files.length) {
        filesHost.innerHTML = '<h3>Changed files</h3><p class="repo-hint">No file changes found.</p>';
        return;
      }
      filesHost.innerHTML = '<h3>Changed files</h3><ul class="rc-file-list">'
        + result.files.map(fileRow).join('')
        + '</ul>' + (result.truncated ? '<p class="repo-note">Showing the first ' + result.files.length + ' changed files.</p>' : '');
      filesHost.querySelectorAll('.rc-path-link').forEach((button) => {
        button.addEventListener('click', () => options.openFile?.(button.dataset.path));
      });
    } catch {
      if (token === detailToken) filesHost.innerHTML = '<h3>Changed files</h3><p class="repo-hint">Could not read changed files.</p>';
    }
  }

  function commitRow(id, subject, who) {
    const row = document.createElement('div');
    row.className = 'repo-commit';
    row.tabIndex = 0;
    row.innerHTML = '<span class="rc-id">' + esc(id) + '</span><span class="rc-subject">' + esc(subject)
      + '</span><span class="rc-who">' + esc(who) + '</span>';
    return row;
  }

  let loadMoreBtn = null;

  function appendCommits(commits) {
    for (const c of commits) {
      const row = commitRow(short(c.sha), c.subject, (c.author && c.author.name) + ' · ' + relTime(c.author && c.author.date));
      const select = () => {
        list.querySelectorAll('.repo-commit.active').forEach((n) => n.classList.remove('active'));
        row.classList.add('active');
        showDetail(c);
      };
      row.addEventListener('click', select);
      row.addEventListener('keydown', (e) => { if (e.key === 'Enter') select(); });
      list.insertBefore(row, loadMoreBtn);
    }
  }

  function setLoadMore(nextSha) {
    if (loadMoreBtn) { loadMoreBtn.remove(); loadMoreBtn = null; }
    if (!nextSha) return;
    const btn = document.createElement('button');
    btn.className = 'repo-load-more';
    btn.textContent = 'Load 50 more commits';
    btn.onclick = async () => {
      btn.disabled = true;
      btn.textContent = 'Loading…';
      const { commits, packed } = await repo.walk(nextSha, WALK_LIMIT);
      appendCommits(commits);
      const next = (!packed && commits.length > 0 && commits[commits.length - 1].parents.length > 0)
        ? commits[commits.length - 1].parents[0] : null;
      setLoadMore(next);
      if (packed) {
        const note = document.createElement('p');
        note.className = 'repo-note';
        note.textContent = 'Older history is packed and not expanded.';
        list.appendChild(note);
      }
    };
    loadMoreBtn = btn;
    list.appendChild(btn);
  }

  async function load(sha) {
    const cached = repo.peekWalk?.(sha, WALK_LIMIT);
    if (!cached) list.innerHTML = '<p class="repo-hint">Reading commits…</p>';
    const { commits, packed } = cached || await repo.walk(sha, WALK_LIMIT);
    list.innerHTML = '';
    loadMoreBtn = null;
    detail.innerHTML = '<p class="repo-hint">Select a commit to see its details.</p>';

    if (!commits.length) {
      // Loose objects unavailable (packed repo) — fall back to the reflog.
      if (repo.reflog.length) {
        const note = document.createElement('p');
        note.className = 'repo-note';
        note.textContent = 'Commit objects are packed; showing recent activity from the reflog.';
        list.appendChild(note);
        for (const r of repo.reflog.slice(0, 50)) {
          list.appendChild(commitRow(short(r.to), r.message, r.name + ' · ' + relTime(r.date)));
        }
      } else {
        list.innerHTML = '<p class="repo-hint">No loose commits found (history is fully packed).</p>';
      }
      return;
    }

    appendCommits(commits);
    if (!packed && commits.length > 0 && commits[commits.length - 1].parents.length > 0) {
      setLoadMore(commits[commits.length - 1].parents[0]);
    } else if (packed) {
      const note = document.createElement('p');
      note.className = 'repo-note';
      note.textContent = 'Older history is packed and not expanded.';
      list.appendChild(note);
    }

    // Auto-select first commit
    const first = list.querySelector('.repo-commit');
    if (first) first.click();
  }

  branchSel.addEventListener('change', () => load(branchSel.value));
  await load(repo.head.sha || (repo.branches[0] && repo.branches[0].sha));
}
