// Enhanced .npmignore view: npm publish exclusion rules grouped by comment headers.
// Annotates patterns (negation, directory, wildcard) similar to the .gitignore viewer.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function tags(p) {
  const t = [];
  if (p.startsWith('!')) t.push('include');
  if (p.endsWith('/')) t.push('directory');
  if (p.startsWith('/')) t.push('anchored');
  if (/[*?[]/.test(p)) t.push('wildcard');
  if (p.startsWith('**') || p.includes('/**')) t.push('recursive');
  return t.map((x) => '<span class="kf-tag">' + esc(x) + '</span>').join('');
}

export async function render(intake, _ctx) {
  const lines = (intake.text || '').split(/\r?\n/);

  const sections = [{ title: null, items: [] }];
  let cur = sections[0];
  let count = 0;
  for (const raw of lines) {
    const l = raw.trim();
    if (!l) continue;
    if (l.startsWith('#')) {
      cur = { title: l.replace(/^#+\s*/, ''), items: [] };
      sections.push(cur);
      continue;
    }
    cur.items.push(l);
    count++;
  }

  const nonEmpty = sections.filter((s) => s.items.length);
  const hasNegations = nonEmpty.some((s) => s.items.some((p) => p.startsWith('!')));

  const body = nonEmpty.map((s) => {
    const rows = s.items.map((p) =>
      '<li class="kf-pat"><code>' + esc(p) + '</code>' + tags(p) + '</li>'
    ).join('');
    const head = s.title
      ? '<h3>' + esc(s.title) + ' <span class="pj-count">' + s.items.length + '</span></h3>'
      : '';
    return '<section class="pj-sec">' + head + '<ul class="kf-list">' + rows + '</ul></section>';
  }).join('');

  const el = document.createElement('div');
  el.className = 'pj-doc nig-doc';
  el.innerHTML =
    '<header class="pj-head"><div class="pj-title">📦 .npmignore</div>'
    + '<div class="pj-meta">'
    + '<span class="pj-tag">' + count + ' rule' + (count === 1 ? '' : 's') + '</span>'
    + (hasNegations ? '<span class="pj-tag">has inclusions</span>' : '')
    + '</div></header>'
    + (body || '<p class="kf-note">No ignore rules found.</p>');
  return { parentNode: el };
}
