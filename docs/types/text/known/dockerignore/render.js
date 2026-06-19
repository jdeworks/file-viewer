// Enhanced .dockerignore view: Docker build context exclusions.
// Groups patterns by comment headers and annotates well-known categories.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Well-known pattern categories (checked in order)
function autoCategory(p) {
  if (/^!/.test(p)) return 'Exceptions (re-included)';
  if (/node_modules/.test(p)) return 'Dependencies';
  if (/^\.git(\/|$)/.test(p) || /^\.gitignore$/.test(p) || /^\.gitattributes$/.test(p)) return 'Git files';
  if (/Dockerfile|docker-compose/.test(p)) return 'Docker files';
  if (/\.(env|local)$/.test(p) || /^\.env/.test(p)) return 'Environment / secrets';
  if (/test|spec|__tests__/.test(p)) return 'Tests';
  if (/\.(log|tmp|cache)$/.test(p) || /\/cache\//.test(p)) return 'Logs / temp';
  if (/README|CHANGELOG|LICENCE|LICENSE|\.md$/.test(p)) return 'Docs';
  if (/dist\/|build\/|out\/|\.next\/|\.nuxt\//.test(p)) return 'Build output';
  return null;
}

function patternTag(p) {
  const t = [];
  if (p.startsWith('!')) t.push('exception');
  if (p.endsWith('/')) t.push('directory');
  if (/[*?[]/.test(p)) t.push('wildcard');
  return t.map((x) => '<span class="kf-tag">' + esc(x) + '</span>').join('');
}

export async function render(intake, _ctx) {
  const lines = (intake.text || '').split(/\r?\n/);

  // First pass: parse into comment-headed sections
  const sections = [{ title: null, items: [] }];
  let cur = sections[0];
  let total = 0;
  for (const raw of lines) {
    const l = raw.trim();
    if (!l) continue;
    if (l.startsWith('#')) {
      cur = { title: l.replace(/^#+\s*/, ''), items: [] };
      sections.push(cur);
      continue;
    }
    cur.items.push(l);
    total++;
  }

  const commentSections = sections.filter((s) => s.items.length && s.title !== null);
  const uncategorized = sections.filter((s) => s.items.length && s.title === null);

  // If there are no comment sections, auto-categorize by pattern
  let renderSections;
  if (commentSections.length === 0 && uncategorized.length > 0) {
    const catMap = new Map();
    for (const s of uncategorized) {
      for (const item of s.items) {
        const cat = autoCategory(item) || 'Other';
        if (!catMap.has(cat)) catMap.set(cat, []);
        catMap.get(cat).push(item);
      }
    }
    renderSections = Array.from(catMap.entries()).map(([title, items]) => ({ title, items }));
  } else {
    renderSections = sections.filter((s) => s.items.length);
  }

  const hasExceptions = lines.some((l) => l.trim().startsWith('!'));

  const body = renderSections.map((s) => {
    const rows = s.items.map((p) =>
      '<li class="kf-pat"><code>' + esc(p) + '</code>' + patternTag(p) + '</li>'
    ).join('');
    const head = s.title
      ? '<h3>' + esc(s.title) + ' <span class="pj-count">' + s.items.length + '</span></h3>'
      : '';
    return '<section class="pj-sec">' + head + '<ul class="kf-list">' + rows + '</ul></section>';
  }).join('');

  const el = document.createElement('div');
  el.className = 'pj-doc dig-doc';
  el.innerHTML =
    '<header class="pj-head"><div class="pj-title">🐳 .dockerignore</div>'
    + '<div class="pj-meta">'
    + '<span class="pj-tag">' + total + ' rule' + (total === 1 ? '' : 's') + '</span>'
    + (hasExceptions ? '<span class="pj-tag">has exceptions</span>' : '')
    + '</div></header>'
    + (body || '<p class="kf-note">No exclusion rules found.</p>');
  return { parentNode: el };
}
