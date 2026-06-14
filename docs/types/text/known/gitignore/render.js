// Enhanced .gitignore view: comment lines become section headers; each pattern is listed with
// small tags describing what it does. Parent-pane generated DOM.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function tags(p) {
  const t = [];
  if (p.startsWith('!')) t.push('un-ignore');
  if (p.endsWith('/')) t.push('directory');
  if (p.startsWith('/')) t.push('anchored to root');
  if (/[*?[]/.test(p)) t.push('wildcard');
  if (p.startsWith('**') || p.includes('/**')) t.push('recursive');
  return t.map((x) => '<span class="kf-tag">' + esc(x) + '</span>').join('');
}

export async function render(intake, _ctx) {
  const host = document.createElement('div');
  host.className = 'pj-doc';
  const lines = (intake.text || '').split(/\r?\n/);

  const sections = [{ title: null, items: [] }];
  let cur = sections[0];
  let count = 0;
  for (const raw of lines) {
    const l = raw.trim();
    if (!l) continue;
    if (l.startsWith('#')) { cur = { title: l.replace(/^#+\s*/, ''), items: [] }; sections.push(cur); continue; }
    cur.items.push(l); count++;
  }

  const body = sections.filter((s) => s.items.length).map((s) => {
    const rows = s.items.map((p) => '<li class="kf-pat"><code>' + esc(p) + '</code>' + tags(p) + '</li>').join('');
    const head = s.title ? '<h3>' + esc(s.title) + ' <span class="pj-count">' + s.items.length + '</span></h3>' : '';
    return '<section class="pj-sec">' + head + '<ul class="kf-list">' + rows + '</ul></section>';
  }).join('');

  host.innerHTML = '<header class="pj-head"><h2>.gitignore</h2><p class="pj-meta">' + count + ' pattern' + (count === 1 ? '' : 's') + '</p></header>' + body;
  return { parentNode: host };
}
