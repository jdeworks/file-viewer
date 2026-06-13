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
  for (let raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(/\s+/);
    const pattern = parts.shift();
    parts.forEach((o) => owners.add(o));
    rules.push({ pattern, owners: parts });
  }

  const rows = rules.map((r) => {
    const owns = r.owners.length ? r.owners.map(ownerHtml).join(' ') : '<span class="kf-note">(no owner)</span>';
    return '<li class="kf-pat"><code>' + esc(r.pattern) + '</code><span style="flex:1"></span>' + owns + '</li>';
  }).join('');

  const el = document.createElement('div');
  el.className = 'pj-doc';
  el.innerHTML =
    '<header class="pj-head"><div class="pj-title">👥 CODEOWNERS</div>'
    + '<div class="pj-meta"><span class="pj-tag">' + rules.length + ' rule' + (rules.length === 1 ? '' : 's') + '</span>'
    + '<span class="pj-tag">' + owners.size + ' owner' + (owners.size === 1 ? '' : 's') + '</span></div></header>'
    + (rules.length
        ? '<section class="pj-sec"><h3>Rules <span class="pj-count">' + rules.length + '</span></h3><ul class="kf-list">' + rows + '</ul></section>'
        : '<p class="kf-note">No ownership rules found.</p>');
  return { parentNode: el };
}
