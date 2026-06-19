// Enhanced .mailmap view: Git author canonicalization.
// Format (any combination):
//   Canonical Name <canonical@email>
//   Canonical Name <canonical@email> <old@email>
//   Canonical Name <canonical@email> Old Name <old@email>
//   <canonical@email> <old@email>
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function parseMailmap(text) {
  const entries = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    // Extract all <email> tokens and the name fragments between them
    const emails = [];
    let rest = line;
    let m;
    const emailRe = /<([^>]*)>/g;
    const positions = [];
    while ((m = emailRe.exec(line)) !== null) {
      positions.push({ start: m.index, end: m.index + m[0].length, email: m[1] });
    }

    if (positions.length === 0) continue;

    let canonName = '';
    let canonEmail = '';
    let oldName = '';
    let oldEmail = '';

    if (positions.length === 1) {
      // "Canonical Name <canonical@email>" — no old identity specified
      canonEmail = positions[0].email;
      canonName = line.slice(0, positions[0].start).trim();
    } else if (positions.length >= 2) {
      // First email = canonical, second = old
      canonEmail = positions[0].email;
      canonName = line.slice(0, positions[0].start).trim();
      oldEmail = positions[1].email;
      // Name between the two emails
      oldName = line.slice(positions[0].end, positions[1].start).trim();
      if (!oldName && positions.length > 2) oldName = '';
    }

    entries.push({ canonName, canonEmail, oldName, oldEmail });
  }
  return entries;
}

export async function render(intake, _ctx) {
  const entries = parseMailmap(intake.text || '');

  const rows = entries.map((e) => {
    const canon = [e.canonName, e.canonEmail ? '&lt;' + esc(e.canonEmail) + '&gt;' : ''].filter(Boolean).join(' ');
    const old = [e.oldName, e.oldEmail ? '&lt;' + esc(e.oldEmail) + '&gt;' : ''].filter(Boolean).join(' ');
    return '<tr>'
      + '<td class="mm-canon"><span class="mm-name">' + esc(e.canonName) + '</span>'
      + (e.canonEmail ? ' <code class="mm-email">' + esc(e.canonEmail) + '</code>' : '') + '</td>'
      + '<td class="mm-old">'
      + (e.oldName ? '<span class="mm-name mm-dim">' + esc(e.oldName) + '</span>' : '')
      + (e.oldEmail ? ' <code class="mm-email mm-dim">' + esc(e.oldEmail) + '</code>' : '')
      + ((!e.oldName && !e.oldEmail) ? '<span class="kf-note">—</span>' : '')
      + '</td>'
      + '</tr>';
  }).join('');

  const el = document.createElement('div');
  el.className = 'pj-doc mm-doc';
  el.innerHTML =
    '<header class="pj-head"><div class="pj-title">📬 .mailmap</div>'
    + '<div class="pj-meta"><span class="pj-tag">' + entries.length + ' mapping' + (entries.length === 1 ? '' : 's') + '</span></div></header>'
    + (entries.length
      ? '<section class="pj-sec"><table class="mm-table">'
        + '<thead><tr><th>Canonical identity</th><th>Maps from</th></tr></thead>'
        + '<tbody>' + rows + '</tbody>'
        + '</table></section>'
      : '<p class="kf-note">No mailmap entries found.</p>');
  return { parentNode: el };
}
