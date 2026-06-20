// Enhanced CODEOWNERS view (parent pane, trusted DOM). Each non-comment line is `pattern owner…`.
// Owners that look like @user or @org/team link to their GitHub page (href-only, no runtime
// request); email owners are shown as-is. Comment headers group the rules so the file stays
// scannable. Section comments (lines starting with #) become subheadings.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ext = (href, text) => '<a class="pj-link" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + esc(text) + ' <span class="pj-ext">↗</span></a>';

function ownerHtml(owner) {
  if (/^@[\w-]+\/[\w-]+$/.test(owner)) {                 // @org/team
    const [org, team] = owner.slice(1).split('/');
    return ext('https://github.com/orgs/' + encodeURIComponent(org) + '/teams/' + encodeURIComponent(team), owner);
  }
  if (/^@[\w-]+$/.test(owner)) return ext('https://github.com/' + encodeURIComponent(owner.slice(1)), owner);
  return '<code class="ts-key">' + esc(owner) + '</code>';  // email or literal
}

export async function render(intake, _ctx) {
  const lines = (intake.text || '').split(/\r?\n/);
  const rules = [];
  let owners = new Set();
  // Collect rules and section headings in order
  const entries = []; // { type: 'rule'|'section', ... }
  for (let raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#')) {
      const heading = line.replace(/^#+\s*/, '').trim();
      if (heading) entries.push({ type: 'section', heading });
      continue;
    }
    const parts = line.split(/\s+/);
    const pattern = parts.shift();
    parts.forEach((o) => owners.add(o));
    rules.push({ pattern, owners: parts });
    entries.push({ type: 'rule', pattern, owners: parts });
  }

  // Build grouped HTML by section
  let bodyHtml = '';
  let currentSection = null;
  let sectionItems = [];
  const flushSection = () => {
    if (sectionItems.length === 0 && !currentSection) return;
    const heading = currentSection ? '<section class="pj-sec"><h3>' + esc(currentSection) + '</h3>' : '<section class="pj-sec">';
    const ul = sectionItems.length
      ? '<ul class="kf-list">' + sectionItems.join('') + '</ul>'
      : '';
    bodyHtml += heading + ul + '</section>';
    sectionItems = [];
    currentSection = null;
  };
  for (const entry of entries) {
    if (entry.type === 'section') {
      flushSection();
      currentSection = entry.heading;
    } else {
      const owns = entry.owners.length ? entry.owners.map(ownerHtml).join(' ') : '<span class="kf-note">(no owner)</span>';
      sectionItems.push('<li class="kf-pat"><code>' + esc(entry.pattern) + '</code><span style="flex:1"></span>' + owns + '</li>');
    }
  }
  flushSection();

  const el = document.createElement('div');
  el.className = 'codeowners-doc';
  el.innerHTML =
    '<header class="pj-head"><div class="pj-title">👥 CODEOWNERS</div>'
    + '<div class="pj-meta"><span class="pj-tag">' + rules.length + ' rule' + (rules.length === 1 ? '' : 's') + '</span>'
    + '<span class="pj-tag">' + owners.size + ' owner' + (owners.size === 1 ? '' : 's') + '</span></div></header>'
    + (bodyHtml || '<p class="kf-note">No ownership rules found.</p>');
  return { parentNode: el };
}
