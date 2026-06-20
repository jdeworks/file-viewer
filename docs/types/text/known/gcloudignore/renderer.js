// Enhanced .gcloudignore viewer: Google Cloud build context exclusions.
// Supports gitignore-style patterns + the #!include: directive.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.gcloudignore-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.gcloudignore-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#4285f4;color:#fff;vertical-align:middle;margin-right:8px}
.gci-title{font-size:18px;font-weight:700;margin:0 0 4px}
.gci-meta{margin:0 0 12px;display:flex;flex-wrap:wrap;gap:6px}
.gci-tag{display:inline-block;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);color:var(--fg,#24292f)}
.gci-include{display:inline-block;font-size:12px;padding:3px 10px;border-radius:8px;background:#e8f0fe;border:1px solid #aecbfa;color:#1a73e8;font-family:ui-monospace,monospace;margin-bottom:12px}
.pj-section-head{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:14px 0 5px;font-weight:600}
.pj-count{font-weight:400;color:var(--fg-2,#aaa);font-size:11px}
.kf-list{list-style:none;padding:0;margin:0 0 6px;display:flex;flex-wrap:wrap;gap:4px}
.kf-pat{display:flex;align-items:center;gap:4px}
.kf-pat code{font-size:12px;font-family:ui-monospace,monospace;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:5px;padding:2px 7px}
.kf-tag{font-size:10px;padding:1px 5px;border-radius:8px;background:#ffecd2;border:1px solid #f9c06a;color:#7d4700;margin-left:2px}
.kf-note{color:var(--fg-2,#888);font-size:12px;font-style:italic}
.pj-sec{margin:0 0 8px}
`;

function patternTag(p) {
  const t = [];
  if (p.startsWith('!')) t.push('exception');
  if (p.endsWith('/')) t.push('directory');
  if (/[*?[]/.test(p)) t.push('wildcard');
  return t.map((x) => '<span class="kf-tag">' + esc(x) + '</span>').join('');
}

export function render(intake) {
  const lines = (intake.text || '').split(/\r?\n/);

  // Parse include directives and sections
  const includes = [];
  const sections = [{ title: null, items: [] }];
  let cur = sections[0];
  let total = 0;
  const allPatterns = [];

  for (const raw of lines) {
    const l = raw.trim();
    if (!l) continue;
    if (l.startsWith('#!include:')) {
      includes.push(l.slice('#!include:'.length).trim());
      continue;
    }
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
    allPatterns.push(l);
    total++;
  }

  const negations = allPatterns.filter((p) => p.startsWith('!')).length;
  const renderSections = sections.filter((s) => s.items.length);

  let shown = 0;
  const body = renderSections.map((s) => {
    const visibleItems = s.items.filter(() => shown < 40);
    const rows = visibleItems.map((p) => {
      shown++;
      return '<li class="kf-pat"><code>' + esc(p) + '</code>' + patternTag(p) + '</li>';
    }).join('');
    const head = s.title
      ? '<h3 class="pj-section-head">' + esc(s.title) + ' <span class="pj-count">' + s.items.length + '</span></h3>'
      : '';
    return rows ? '<section class="pj-sec">' + head + '<ul class="kf-list">' + rows + '</ul></section>' : '';
  }).join('');

  const includeHtml = includes.map((inc) =>
    '<span class="gci-include">#!include:' + esc(inc) + '</span>'
  ).join(' ');

  const el = document.createElement('div');
  el.className = 'gcloudignore-doc';
  el.innerHTML = '<style>' + CSS + '</style>'
    + '<div class="gci-title"><span class="gcloudignore-badge">gcloudignore</span>.gcloudignore</div>'
    + '<div class="gci-meta">'
    + '<span class="gci-tag">' + total + ' pattern' + (total === 1 ? '' : 's') + '</span>'
    + (negations > 0 ? '<span class="gci-tag">' + negations + ' negation' + (negations === 1 ? '' : 's') + '</span>' : '')
    + (includes.length > 0 ? '<span class="gci-tag">' + includes.length + ' include directive' + (includes.length === 1 ? '' : 's') + '</span>' : '')
    + '</div>'
    + (includeHtml ? '<div style="margin-bottom:12px">' + includeHtml + '</div>' : '')
    + (body || '<p class="kf-note">No exclusion patterns found.</p>')
    + (total > 40 ? '<p class="kf-note">Showing first 40 of ' + total + ' patterns.</p>' : '');
  return { parentNode: el };
}
