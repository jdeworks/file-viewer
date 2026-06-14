// Enhanced package.json view. Rendered in the PARENT pane (trusted, generated DOM) so the
// external links work without loosening the iframe sandbox. The links are href-only — no
// request is made until the user clicks — so the zero-off-origin-at-runtime guarantee holds.
// Each external link is marked ↗ and opens in a new tab with rel="noopener".
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const npmUrl = (name) => 'https://www.npmjs.com/package/' + name.split('/').map(encodeURIComponent).join('/');
const ext = (href, text) => '<a class="pj-link" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + esc(text) + ' <span class="pj-ext">↗</span></a>';

function depSection(title, deps) {
  const names = deps && typeof deps === 'object' ? Object.keys(deps) : [];
  if (!names.length) return '';
  const rows = names.sort().map((n) =>
    '<li><span class="pj-dep">' + ext(npmUrl(n), n) + '</span><span class="pj-ver">' + esc(deps[n]) + '</span></li>').join('');
  return '<section class="pj-sec"><h3>' + esc(title) + ' <span class="pj-count">' + names.length + '</span></h3><ul class="pj-deps">' + rows + '</ul></section>';
}

function repoUrl(repo) {
  if (!repo) return null;
  let u = typeof repo === 'string' ? repo : repo.url;
  if (!u) return null;
  u = u.replace(/^git\+/, '').replace(/\.git$/, '').replace(/^git:\/\//, 'https://').replace(/^github:/, 'https://github.com/');
  return /^https?:\/\//.test(u) ? u : null;
}

export async function render(intake, _ctx) {
  let pkg;
  try { pkg = JSON.parse(intake.text || '{}'); }
  catch (e) { const d = document.createElement('div'); d.className = 'pj-doc'; d.innerHTML = '<p class="pj-err">Invalid JSON: ' + esc(e.message) + '</p>'; return { parentNode: d }; }

  const links = [];
  if (pkg.homepage) links.push(ext(pkg.homepage, 'Homepage'));
  const repo = repoUrl(pkg.repository);
  if (repo) links.push(ext(repo, 'Repository'));
  if (pkg.bugs) links.push(ext(typeof pkg.bugs === 'string' ? pkg.bugs : pkg.bugs.url, 'Issues'));
  if (pkg.name) links.push(ext(npmUrl(pkg.name), 'View on npm'));

  const scripts = pkg.scripts && typeof pkg.scripts === 'object' ? Object.entries(pkg.scripts) : [];
  const scriptHtml = scripts.length
    ? '<section class="pj-sec"><h3>Scripts <span class="pj-count">' + scripts.length + '</span></h3><ul class="pj-scripts">'
      + scripts.map(([k, v]) => '<li><code class="pj-skey">' + esc(k) + '</code><code class="pj-scmd">' + esc(v) + '</code></li>').join('') + '</ul></section>'
    : '';

  const meta = [pkg.version && 'v' + pkg.version, pkg.license, pkg.private && 'private']
    .filter(Boolean).map((m) => '<span class="pj-tag">' + esc(m) + '</span>').join('');

  const el = document.createElement('div');
  el.className = 'pj-doc';
  el.innerHTML =
    '<header class="pj-head"><div class="pj-title">📦 ' + esc(pkg.name || '(unnamed package)') + '</div>'
    + '<div class="pj-meta">' + meta + '</div></header>'
    + (pkg.description ? '<p class="pj-desc">' + esc(pkg.description) + '</p>' : '')
    + (links.length ? '<div class="pj-links">' + links.join('') + '</div>' : '')
    + depSection('dependencies', pkg.dependencies)
    + depSection('devDependencies', pkg.devDependencies)
    + depSection('peerDependencies', pkg.peerDependencies)
    + scriptHtml;
  return { parentNode: el };
}
