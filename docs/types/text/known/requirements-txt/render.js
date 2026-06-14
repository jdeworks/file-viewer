// Enhanced requirements.txt view (parent pane, trusted DOM). Each requirement line is parsed
// into { name, extras, version } and linked to its PyPI page (href-only — no request until the
// user clicks, so the zero-off-origin-at-runtime guarantee holds). Non-dependency lines
// (options like -r/-e, editable installs, comments) are summarized so the view stays scannable.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pypiUrl = (name) => 'https://pypi.org/project/' + encodeURIComponent(name) + '/';
const ext = (href, text) => '<a class="pj-link" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + esc(text) + ' <span class="pj-ext">↗</span></a>';

// A requirement: name[extras](constraint). Returns null for non-requirement lines.
function parseReq(line) {
  // Strip inline comments and surrounding whitespace.
  const body = line.replace(/\s+#.*$/, '').trim();
  if (!body) return null;
  if (body.startsWith('#')) return null;
  if (/^-/.test(body)) return { option: body };                 // -r, -e, --hash, -c, --index-url …
  // name (PEP 508): letters/digits/._- , optional [extras], then a constraint or URL.
  const m = body.match(/^([A-Za-z0-9][A-Za-z0-9._-]*)\s*(\[[^\]]*\])?\s*(.*)$/);
  if (!m) return { option: body };
  return { name: m[1], extras: (m[2] || '').replace(/[[\]]/g, ''), constraint: m[3].trim() };
}

export async function render(intake, _ctx) {
  const lines = (intake.text || '').split(/\r?\n/);
  const reqs = [], options = [];
  for (const ln of lines) {
    const p = parseReq(ln);
    if (!p) continue;
    if (p.option) options.push(p.option); else reqs.push(p);
  }

  const rows = reqs.map((r) => {
    const extras = r.extras ? '<span class="kf-tag">' + esc(r.extras) + '</span>' : '';
    const ver = r.constraint ? '<code class="pj-ver">' + esc(r.constraint) + '</code>' : '<span class="kf-note">(unpinned)</span>';
    return '<li class="kf-pat">' + ext(pypiUrl(r.name), r.name) + extras + '<span style="flex:1"></span>' + ver + '</li>';
  }).join('');

  const optHtml = options.length
    ? '<section class="pj-sec"><h3>Options <span class="pj-count">' + options.length + '</span></h3><ul class="kf-list">'
      + options.map((o) => '<li class="kf-pat"><code>' + esc(o) + '</code></li>').join('') + '</ul></section>'
    : '';

  const el = document.createElement('div');
  el.className = 'pj-doc';
  el.innerHTML =
    '<header class="pj-head"><div class="pj-title">🐍 ' + esc((intake.filename || 'requirements.txt').split('/').pop()) + '</div>'
    + '<div class="pj-meta">' + reqs.length + ' package' + (reqs.length === 1 ? '' : 's') + '</div></header>'
    + (reqs.length
        ? '<section class="pj-sec"><h3>Dependencies <span class="pj-count">' + reqs.length + '</span></h3><ul class="kf-list">' + rows + '</ul></section>'
        : '<p class="kf-note">No pinned packages found.</p>')
    + optHtml;
  return { parentNode: el };
}
