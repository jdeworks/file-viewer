// Enhanced composer.json view (parent pane, trusted DOM). PHP's package manifest: name,
// description, type/license, and require / require-dev with links to Packagist. Platform
// requirements (php, ext-*) are shown but not linked. Links are href-only (no runtime request).
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const packagistUrl = (name) => 'https://packagist.org/packages/' + name.split('/').map(encodeURIComponent).join('/');
const ext = (href, text) => '<a class="pj-link" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + esc(text) + ' <span class="pj-ext">↗</span></a>';

// php / ext-* / lib-* are platform packages — not on Packagist.
const isPlatform = (name) => /^(php(-64bit)?|hhvm|ext-|lib-|composer(-.*)?)/i.test(name);

function depSection(title, deps) {
  const names = deps && typeof deps === 'object' ? Object.keys(deps) : [];
  if (!names.length) return '';
  const rows = names.sort().map((n) => {
    const label = isPlatform(n) ? '<code class="ts-key">' + esc(n) + '</code>' : ext(packagistUrl(n), n);
    return '<li class="kf-pat">' + label + '<span style="flex:1"></span><code class="pj-ver">' + esc(deps[n]) + '</code></li>';
  }).join('');
  return '<section class="pj-sec"><h3>' + esc(title) + ' <span class="pj-count">' + names.length + '</span></h3><ul class="kf-list">' + rows + '</ul></section>';
}

export async function render(intake, _ctx) {
  let pkg;
  try { pkg = JSON.parse(intake.text || '{}'); }
  catch (e) { const d = document.createElement('div'); d.className = 'pj-doc'; d.innerHTML = '<p class="pj-err">Invalid JSON: ' + esc(e.message) + '</p>'; return { parentNode: d }; }

  const links = [];
  if (pkg.homepage) links.push(ext(pkg.homepage, 'Homepage'));
  if (pkg.name) links.push(ext(packagistUrl(pkg.name), 'View on Packagist'));
  const support = pkg.support && typeof pkg.support === 'object' ? pkg.support : {};
  if (support.source) links.push(ext(support.source, 'Source'));
  if (support.issues) links.push(ext(support.issues, 'Issues'));

  const meta = [pkg.type, pkg.license && (Array.isArray(pkg.license) ? pkg.license.join(', ') : pkg.license)]
    .filter(Boolean).map((m) => '<span class="pj-tag">' + esc(m) + '</span>').join('');

  const el = document.createElement('div');
  el.className = 'pj-doc';
  el.innerHTML =
    '<header class="pj-head"><div class="pj-title">🐘 ' + esc(pkg.name || '(unnamed package)') + '</div>'
    + '<div class="pj-meta">' + meta + '</div></header>'
    + (pkg.description ? '<p class="pj-desc">' + esc(pkg.description) + '</p>' : '')
    + (links.length ? '<div class="pj-links">' + links.join('') + '</div>' : '')
    + depSection('require', pkg.require)
    + depSection('require-dev', pkg['require-dev']);
  return { parentNode: el };
}
