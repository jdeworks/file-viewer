// Enhanced go.mod view (parent pane, trusted DOM). Parses the module directive, the go version,
// and require directives (single-line and block form), linking each dependency to pkg.go.dev.
// indirect deps are tagged. Links are href-only (no request until clicked).
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const goDevUrl = (mod, ver) => 'https://pkg.go.dev/' + mod.split('/').map(encodeURIComponent).join('/') + (ver ? '@' + encodeURIComponent(ver) : '');
const ext = (href, text) => '<a class="pj-link" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + esc(text) + ' <span class="pj-ext">↗</span></a>';

export async function render(intake, _ctx) {
  const lines = (intake.text || '').split(/\r?\n/);
  let modulePath = '', goVersion = '';
  const requires = [];
  let inRequire = false;
  for (let raw of lines) {
    const trimmed = raw.trim();                          // keep comments — `// indirect` matters
    if (!trimmed) continue;
    const line = trimmed.replace(/\/\/.*$/, '').trim();  // comment-stripped, for directive matching
    if (inRequire) {
      if (line === ')') { inRequire = false; continue; }
      addRequire(trimmed);
      continue;
    }
    let m;
    if ((m = line.match(/^module\s+(.+)$/))) modulePath = m[1].trim();
    else if ((m = line.match(/^go\s+([\d.]+)/))) goVersion = m[1];
    else if (/^require\s*\($/.test(line)) inRequire = true;
    else if ((m = trimmed.match(/^require\s+(.+)$/))) addRequire(m[1]);   // single-line require
  }
  function addRequire(spec) {
    const indirect = /\/\/\s*indirect/.test(spec);
    const parts = spec.replace(/\/\/.*$/, '').trim().split(/\s+/);
    if (parts[0]) requires.push({ mod: parts[0], ver: parts[1] || '', indirect });
  }

  const rows = requires.map((r) => {
    const tag = r.indirect ? '<span class="kf-tag">indirect</span>' : '';
    return '<li class="kf-pat">' + ext(goDevUrl(r.mod, r.ver), r.mod) + tag
      + '<span style="flex:1"></span><code class="pj-ver">' + esc(r.ver) + '</code></li>';
  }).join('');

  const meta = [goVersion && 'go ' + goVersion, requires.length + ' module' + (requires.length === 1 ? '' : 's')]
    .filter(Boolean).map((m) => '<span class="pj-tag">' + esc(m) + '</span>').join('');

  const el = document.createElement('div');
  el.className = 'pj-doc';
  el.innerHTML =
    '<header class="pj-head"><div class="pj-title">🐹 ' + esc(modulePath || 'go.mod') + '</div>'
    + '<div class="pj-meta">' + meta + '</div></header>'
    + (requires.length
        ? '<section class="pj-sec"><h3>Require <span class="pj-count">' + requires.length + '</span></h3><ul class="kf-list">' + rows + '</ul></section>'
        : '<p class="kf-note">No required modules.</p>');
  return { parentNode: el };
}
