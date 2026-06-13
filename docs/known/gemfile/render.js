// Enhanced Gemfile view (parent pane, trusted DOM). Parses `gem 'name', '~> 1.2'` directives
// (with version constraints), the `source`, and the `ruby` version, linking each gem to
// rubygems.org. Group blocks (`group :development do … end`) annotate their gems. Ruby DSL is
// matched line-by-line — not executed. Links are href-only (no request until clicked).
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rubygemsUrl = (name) => 'https://rubygems.org/gems/' + encodeURIComponent(name);
const ext = (href, text) => '<a class="pj-link" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + esc(text) + ' <span class="pj-ext">↗</span></a>';

export async function render(intake, _ctx) {
  const lines = (intake.text || '').split(/\r?\n/);
  const gems = [];
  let source = '', ruby = '';
  const groupStack = [];
  for (let raw of lines) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    let m;
    if ((m = line.match(/^source\s+['"]([^'"]+)['"]/))) { source = m[1]; continue; }
    if ((m = line.match(/^ruby\s+['"]([^'"]+)['"]/))) { ruby = m[1]; continue; }
    // group :development, :test do
    if ((m = line.match(/^group\s+(.+?)\s+do\s*$/))) { groupStack.push(m[1].replace(/[:'"]/g, '').trim()); continue; }
    if (/^end\b/.test(line)) { groupStack.pop(); continue; }
    // gem 'name', '~> 1.2', require: false
    if ((m = line.match(/^gem\s+['"]([^'"]+)['"]\s*(.*)$/))) {
      const rest = m[2];
      const vers = [...rest.matchAll(/['"]([<>=~!\d][^'"]*)['"]/g)].map((x) => x[1]);
      gems.push({ name: m[1], version: vers.join(', '), group: groupStack[groupStack.length - 1] || '' });
    }
  }

  const rows = gems.map((g) => {
    const grp = g.group ? '<span class="kf-tag">' + esc(g.group) + '</span>' : '';
    const ver = g.version ? '<code class="pj-ver">' + esc(g.version) + '</code>' : '<span class="kf-note">(any)</span>';
    return '<li class="kf-pat">' + ext(rubygemsUrl(g.name), g.name) + grp + '<span style="flex:1"></span>' + ver + '</li>';
  }).join('');

  const meta = [ruby && 'ruby ' + ruby, gems.length + ' gem' + (gems.length === 1 ? '' : 's')]
    .filter(Boolean).map((m) => '<span class="pj-tag">' + esc(m) + '</span>').join('');
  const srcLink = source ? '<div class="pj-links">' + ext(source, source.replace(/^https?:\/\//, '')) + '</div>' : '';

  const el = document.createElement('div');
  el.className = 'pj-doc';
  el.innerHTML =
    '<header class="pj-head"><div class="pj-title">💎 Gemfile</div>'
    + '<div class="pj-meta">' + meta + '</div></header>' + srcLink
    + (gems.length
        ? '<section class="pj-sec"><h3>Gems <span class="pj-count">' + gems.length + '</span></h3><ul class="kf-list">' + rows + '</ul></section>'
        : '<p class="kf-note">No gems found.</p>');
  return { parentNode: el };
}
