// Enhanced Pipfile view (parent pane, trusted DOM). Pipfile is TOML; we do a light section scan
// ([packages] / [dev-packages] / [requires]) rather than a full TOML parse — enough to list each
// dependency with its version spec, linked to PyPI (href-only — no runtime request).
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pypiUrl = (name) => 'https://pypi.org/project/' + encodeURIComponent(name) + '/';
const ext = (href, text) => '<a class="pj-link" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + esc(text) + ' <span class="pj-ext">↗</span></a>';

// Parse `name = "version"` or `name = { version = "..." }` lines within named sections.
function parseSections(text) {
  const sections = {};
  let current = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    let m;
    if ((m = line.match(/^\[([^\]]+)\]$/))) { current = m[1].trim(); sections[current] = sections[current] || []; continue; }
    if (current && (m = line.match(/^["']?([A-Za-z0-9._-]+)["']?\s*=\s*(.+)$/))) {
      let ver = m[2].trim();
      const vm = ver.match(/version\s*=\s*["']([^"']+)["']/);     // inline table form
      if (vm) ver = vm[1];
      else ver = ver.replace(/^["']|["']$/g, '');
      sections[current].push({ name: m[1], version: ver });
    }
  }
  return sections;
}

function depSection(title, deps, link) {
  if (!deps || !deps.length) return '';
  const rows = deps.map((d) => {
    const label = link ? ext(pypiUrl(d.name), d.name) : '<code class="ts-key">' + esc(d.name) + '</code>';
    const ver = d.version && d.version !== '*' ? '<code class="pj-ver">' + esc(d.version) + '</code>' : '<span class="kf-note">(any)</span>';
    return '<li class="kf-pat">' + label + '<span style="flex:1"></span>' + ver + '</li>';
  }).join('');
  return '<section class="pj-sec"><h3>' + esc(title) + ' <span class="pj-count">' + deps.length + '</span></h3><ul class="kf-list">' + rows + '</ul></section>';
}

export async function render(intake, _ctx) {
  const sections = parseSections(intake.text || '');
  const requires = sections['requires'] || [];
  const pyVer = (requires.find((r) => /python_version|python_full_version/.test(r.name)) || {}).version;

  const el = document.createElement('div');
  el.className = 'pj-doc';
  el.innerHTML =
    '<header class="pj-head"><div class="pj-title">🐍 Pipfile</div>'
    + '<div class="pj-meta">' + (pyVer ? '<span class="pj-tag">Python ' + esc(pyVer) + '</span>' : '') + '</div></header>'
    + depSection('packages', sections['packages'], true)
    + depSection('dev-packages', sections['dev-packages'], true)
    + (!sections['packages'] && !sections['dev-packages'] ? '<p class="kf-note">No packages found.</p>' : '');
  return { parentNode: el };
}
