// Enhanced pom.xml view (parent pane, trusted DOM). Parses the Maven POM with DOMParser (data,
// never executed) → project coordinates + dependencies, each linked to mvnrepository.com. Scope
// (test/provided/…) is tagged. Links are href-only (no runtime request → zero off-origin holds).
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mvnUrl = (g, a) => 'https://mvnrepository.com/artifact/' + encodeURIComponent(g) + '/' + encodeURIComponent(a);
const ext = (href, text) => '<a class="pj-link" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + esc(text) + ' <span class="pj-ext">↗</span></a>';

const childText = (el, tag) => {
  if (!el) return '';
  for (const c of el.children) if (c.tagName === tag || c.tagName.endsWith(':' + tag)) return (c.textContent || '').trim();
  return '';
};

export async function render(intake, _ctx) {
  const doc = new DOMParser().parseFromString(intake.text || '', 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) {
    const d = document.createElement('div'); d.className = 'pj-doc';
    d.innerHTML = '<p class="pj-err">Could not parse pom.xml as XML.</p>'; return { parentNode: d };
  }
  const project = doc.documentElement;
  const coord = (g, a, v) => [g, a].filter(Boolean).join(':') + (v ? ':' + v : '');
  const groupId = childText(project, 'groupId');
  const artifactId = childText(project, 'artifactId');
  const version = childText(project, 'version');
  const name = childText(project, 'name');
  const packaging = childText(project, 'packaging') || 'jar';

  // Only direct <dependencies>/<dependency> of <project> (skip dependencyManagement/plugins noise
  // by accepting any <dependency> with groupId+artifactId — good enough for an overview).
  const deps = [...doc.getElementsByTagName('dependency')].map((dep) => ({
    g: childText(dep, 'groupId'), a: childText(dep, 'artifactId'),
    v: childText(dep, 'version'), scope: childText(dep, 'scope'),
  })).filter((d) => d.g && d.a);

  const rows = deps.map((d) => {
    const scope = d.scope ? '<span class="kf-tag">' + esc(d.scope) + '</span>' : '';
    const ver = d.v ? '<code class="pj-ver">' + esc(d.v) + '</code>' : '<span class="kf-note">(managed)</span>';
    return '<li class="kf-pat">' + ext(mvnUrl(d.g, d.a), d.g + ':' + d.a) + scope + '<span style="flex:1"></span>' + ver + '</li>';
  }).join('');

  const meta = [packaging, version && 'v' + version].filter(Boolean)
    .map((m) => '<span class="pj-tag">' + esc(m) + '</span>').join('');

  const el = document.createElement('div');
  el.className = 'pj-doc';
  el.innerHTML =
    '<header class="pj-head"><div class="pj-title">☕ ' + esc(name || coord(groupId, artifactId) || 'pom.xml') + '</div>'
    + '<div class="pj-meta">' + meta + '</div></header>'
    + (coord(groupId, artifactId, version) ? '<p class="pj-desc"><code>' + esc(coord(groupId, artifactId, version)) + '</code></p>' : '')
    + (deps.length
        ? '<section class="pj-sec"><h3>Dependencies <span class="pj-count">' + deps.length + '</span></h3><ul class="kf-list">' + rows + '</ul></section>'
        : '<p class="kf-note">No dependencies declared.</p>');
  return { parentNode: el };
}
