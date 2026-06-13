// Enhanced Cargo.toml view — rendered in the parent pane (trusted generated DOM). Dependency
// names link to crates.io + docs.rs; links are href-only (no request until clicked), so the
// zero-off-origin-at-runtime guarantee holds.
import { parseTOML } from '../../types/toml/toml.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ext = (href, text) => '<a class="pj-link" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + esc(text) + ' <span class="pj-ext">↗</span></a>';

function verOf(spec) {
  if (spec == null) return '';
  if (typeof spec === 'string') return spec;
  if (typeof spec === 'object') return spec.version || (spec.git ? 'git' : spec.path ? 'path' : '');
  return String(spec);
}

function depSection(title, deps) {
  const names = deps && typeof deps === 'object' ? Object.keys(deps) : [];
  if (!names.length) return '';
  const rows = names.sort().map((n) => {
    const links = ext('https://crates.io/crates/' + encodeURIComponent(n), n)
      + ' <a class="pj-ext-min" href="https://docs.rs/' + encodeURIComponent(n) + '" target="_blank" rel="noopener noreferrer">docs.rs</a>';
    return '<li><span class="pj-dep">' + links + '</span><span class="pj-ver">' + esc(verOf(deps[n])) + '</span></li>';
  }).join('');
  return '<section class="pj-sec"><h3>' + esc(title) + ' <span class="pj-count">' + names.length + '</span></h3><ul class="pj-deps">' + rows + '</ul></section>';
}

export async function render(intake, _ctx) {
  const host = document.createElement('div');
  host.className = 'pj-doc';
  let toml;
  try { toml = parseTOML(intake.text || ''); }
  catch (e) { host.innerHTML = '<p class="pj-err">Invalid TOML: ' + esc(e.message) + '</p>'; return { parentNode: host }; }

  const pkg = toml.package || {};
  const links = [];
  if (pkg.homepage) links.push(ext(pkg.homepage, 'Homepage'));
  if (pkg.repository) links.push(ext(pkg.repository, 'Repository'));
  if (pkg.documentation) links.push(ext(pkg.documentation, 'Docs'));
  if (pkg.name) links.push(ext('https://crates.io/crates/' + encodeURIComponent(pkg.name), 'View on crates.io'));

  const head = '<header class="pj-head"><h2>' + esc(pkg.name || 'Cargo package')
    + (pkg.version ? ' <span class="pj-pkgver">' + esc(pkg.version) + '</span>' : '') + '</h2>'
    + (pkg.description ? '<p class="pj-desc">' + esc(pkg.description) + '</p>' : '')
    + (pkg.edition ? '<p class="pj-meta">edition ' + esc(pkg.edition) + (pkg.license ? ' · ' + esc(pkg.license) : '') + '</p>' : '')
    + (links.length ? '<div class="pj-links">' + links.join('') + '</div>' : '') + '</header>';

  host.innerHTML = head
    + depSection('Dependencies', toml.dependencies)
    + depSection('Dev dependencies', toml['dev-dependencies'])
    + depSection('Build dependencies', toml['build-dependencies']);
  return { parentNode: host };
}
