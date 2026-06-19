// Enhanced .gitattributes view: parse pattern → attributes table.
// Highlights well-known attributes (text, binary, eol, diff, linguist-*, export-ignore, etc.).
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const ATTR_NOTES = {
  'text': 'normalize line endings',
  'text=auto': 'auto-detect line endings',
  'binary': 'treat as binary (no text processing)',
  'eol=lf': 'force LF line endings',
  'eol=crlf': 'force CRLF line endings',
  'diff': 'enable text diff',
  '-diff': 'disable text diff',
  'merge': 'enable merge driver',
  '-merge': 'disable merging',
  'export-ignore': 'exclude from git archive',
  'export-subst': 'substitute keywords on export',
  'filter': 'apply smudge/clean filter',
  'merge=ours': 'keep ours on merge conflict',
};

const LINGUIST_RE = /^linguist-/;
const LFS_ATTRS = new Set(['filter=lfs', 'diff=lfs', 'merge=lfs', '-text']);

function attrTag(attr) {
  const note = ATTR_NOTES[attr] || (LINGUIST_RE.test(attr) ? 'Linguist override' : null);
  const isLfs = LFS_ATTRS.has(attr);
  const cls = isLfs ? 'kf-tag kf-tag-warn' : LINGUIST_RE.test(attr) ? 'kf-tag kf-tag-info' : 'kf-tag';
  return '<span class="' + cls + '" title="' + esc(note || '') + '">' + esc(attr) + '</span>';
}

function categorize(pattern) {
  if (/linguist-/.test(pattern)) return 'Linguist';
  if (/export-ignore/.test(pattern)) return 'Archive';
  if (/filter=lfs/.test(pattern)) return 'Git LFS';
  if (/binary|-text/.test(pattern)) return 'Binary';
  if (/eol=/.test(pattern)) return 'Line endings';
  if (/diff=/.test(pattern)) return 'Diff drivers';
  if (/merge=/.test(pattern)) return 'Merge strategies';
  if (/^text/.test(pattern)) return 'Text normalization';
  return 'Other';
}

export async function render(intake, _ctx) {
  const lines = (intake.text || '').split(/\r?\n/);

  // Parse into sections (comment headers) with rules
  const sections = [{ title: null, rules: [] }];
  let cur = sections[0];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#')) {
      // New comment section
      cur = { title: line.replace(/^#+\s*/, ''), rules: [] };
      sections.push(cur);
      continue;
    }
    const parts = line.split(/\s+/);
    const pattern = parts.shift();
    const attrs = parts;
    if (pattern) cur.rules.push({ pattern, attrs });
  }

  const nonEmpty = sections.filter((s) => s.rules.length);
  const totalRules = nonEmpty.reduce((n, s) => n + s.rules.length, 0);

  // Count unique attribute categories for summary
  const allAttrs = nonEmpty.flatMap((s) => s.rules.flatMap((r) => r.attrs));
  const hasLfs = allAttrs.some((a) => a === 'filter=lfs');
  const hasLinguist = allAttrs.some((a) => LINGUIST_RE.test(a));

  const body = nonEmpty.map((s) => {
    const rows = s.rules.map((r) => {
      const attrHtml = r.attrs.length
        ? r.attrs.map(attrTag).join(' ')
        : '<span class="kf-note">(no attrs)</span>';
      return '<li class="kf-pat"><code>' + esc(r.pattern) + '</code><span style="flex:1"></span><span class="kf-attr-list">' + attrHtml + '</span></li>';
    }).join('');
    const head = s.title
      ? '<h3>' + esc(s.title) + ' <span class="pj-count">' + s.rules.length + '</span></h3>'
      : '';
    return '<section class="pj-sec">' + head + '<ul class="kf-list">' + rows + '</ul></section>';
  }).join('');

  const tags = [
    '<span class="pj-tag">' + totalRules + ' rule' + (totalRules === 1 ? '' : 's') + '</span>',
    hasLfs ? '<span class="pj-tag">Git LFS</span>' : '',
    hasLinguist ? '<span class="pj-tag">Linguist</span>' : '',
  ].filter(Boolean).join('');

  const el = document.createElement('div');
  el.className = 'pj-doc gat-doc';
  el.innerHTML =
    '<header class="pj-head"><div class="pj-title">🗂 .gitattributes</div>'
    + '<div class="pj-meta">' + tags + '</div></header>'
    + (body || '<p class="kf-note">No attribute rules found.</p>');
  return { parentNode: el };
}
