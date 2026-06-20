// Enhanced .prettierignore viewer: Prettier file exclusion patterns grouped by comment headers.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.prettierignore-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.prettierignore-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#F7B93E;color:#1a1a1a;vertical-align:middle;margin-right:8px}
.pi-title{font-size:18px;font-weight:700;margin:0 0 4px}
.pi-meta{margin:0 0 12px;display:flex;flex-wrap:wrap;gap:6px}
.pi-tag{display:inline-block;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);color:var(--fg,#24292f)}
.pj-section-head{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:14px 0 5px;font-weight:600}
.pj-count{font-weight:400;color:var(--fg-2,#aaa);font-size:11px}
.kf-list{list-style:none;padding:0;margin:0 0 6px;display:flex;flex-wrap:wrap;gap:4px}
.kf-pat{display:flex;align-items:center;gap:4px}
.kf-pat code{font-size:12px;font-family:ui-monospace,monospace;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:5px;padding:2px 7px}
.kf-tag{font-size:10px;padding:1px 5px;border-radius:8px;background:#ffecd2;border:1px solid #f9c06a;color:#7d4700;margin-left:2px}
.kf-neg{font-size:10px;padding:1px 5px;border-radius:8px;background:#fff3e0;border:1px solid #ffb74d;color:#e65100;font-weight:700;margin-left:2px}
.kf-note{color:var(--fg-2,#888);font-size:12px;font-style:italic}
.pj-sec{margin:0 0 8px}
`;

function patternTag(p) {
  const t = [];
  if (p.startsWith('!')) t.push('<span class="kf-neg">negation</span>');
  if (p.endsWith('/')) t.push('<span class="kf-tag">directory</span>');
  if (/[*?[]/.test(p)) t.push('<span class="kf-tag">wildcard</span>');
  return t.join('');
}

export function render(intake) {
  const lines = (intake.text || '').split(/\r?\n/);

  const sections = [{ title: null, items: [] }];
  let cur = sections[0];
  let total = 0;
  let negations = 0;

  for (const raw of lines) {
    const l = raw.trim();
    if (!l) continue;
    if (l.startsWith('#')) {
      if (cur.items.length > 0 || cur.title !== null) {
        cur = { title: l.replace(/^#+\s*/, ''), items: [] };
        sections.push(cur);
      } else {
        cur.title = l.replace(/^#+\s*/, '');
      }
      continue;
    }
    cur.items.push(l);
    total++;
    if (l.startsWith('!')) negations++;
  }

  const renderSections = sections.filter((s) => s.items.length);
  let shown = 0;

  const body = renderSections.map((s) => {
    const visibleItems = s.items.filter(() => shown < 50);
    const rows = visibleItems.map((p) => {
      shown++;
      return '<li class="kf-pat"><code>' + esc(p) + '</code>' + patternTag(p) + '</li>';
    }).join('');
    const head = s.title
      ? '<h3 class="pj-section-head">' + esc(s.title) + ' <span class="pj-count">' + s.items.length + '</span></h3>'
      : '';
    return rows ? '<section class="pj-sec">' + head + '<ul class="kf-list">' + rows + '</ul></section>' : '';
  }).join('');

  const el = document.createElement('div');
  el.className = 'prettierignore-doc';
  el.innerHTML = '<style>' + CSS + '</style>'
    + '<div class="pi-title"><span class="prettierignore-badge">Prettier</span>.prettierignore</div>'
    + '<div class="pi-meta">'
    + '<span class="pi-tag">' + total + ' pattern' + (total === 1 ? '' : 's') + '</span>'
    + (negations > 0 ? '<span class="pi-tag">' + negations + ' negation' + (negations === 1 ? '' : 's') + '</span>' : '')
    + '</div>'
    + (body || '<p class="kf-note">No ignore patterns found.</p>')
    + (total > 50 ? '<p class="kf-note">Showing first 50 of ' + total + ' patterns.</p>' : '');
  return { parentNode: el };
}
