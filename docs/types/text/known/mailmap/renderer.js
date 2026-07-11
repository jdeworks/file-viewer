// Enhanced .mailmap view: Git author canonicalization.
// Format (any combination):
//   Canonical Name <canonical@email>
//   Canonical Name <canonical@email> <old@email>
//   Canonical Name <canonical@email> Old Name <old@email>
//   <canonical@email> <old@email>
import { describeCollectionCap } from '../../../../core/collection-cap.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.mailmap-doc{padding:16px 18px;max-width:960px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.mailmap-doc .mm-badge{display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;background:#F05032;color:#fff;vertical-align:middle;margin-right:8px;}
.mailmap-doc .mm-head{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin:0 0 16px;}
.mailmap-doc .mm-title{font-size:18px;font-weight:700;margin:0;}
.mailmap-doc .mm-count{font-size:12px;color:var(--fg-2,#888);}
.mailmap-doc .mm-table{width:100%;border-collapse:collapse;font-size:13px;}
.mailmap-doc .mm-table th{text-align:left;font-size:11px;font-weight:600;color:var(--fg-2,#888);padding:6px 12px;border-bottom:2px solid var(--border,#e0e0e0);white-space:nowrap;}
.mailmap-doc .mm-table td{padding:6px 12px;border-bottom:1px solid var(--border,#eee);vertical-align:top;}
.mailmap-doc .mm-table tr:last-child td{border-bottom:none;}
.mailmap-doc .mm-name{font-weight:600;}
.mailmap-doc .mm-email{font-family:ui-monospace,monospace;font-size:11px;color:#0969da;background:#f0f6ff;border:1px solid #d0e4ff;padding:1px 5px;border-radius:4px;display:inline-block;margin-left:4px;}
.mailmap-doc .mm-dim{color:var(--fg-2,#888);}
.mailmap-doc .mm-empty{color:var(--fg-2,#888);font-size:13px;padding:12px 0;}
.mailmap-doc .mm-none{color:var(--fg-2,#bbb);font-size:12px;}
`;

function parseMailmap(text) {
  const entries = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    const emailRe = /<([^>]*)>/g;
    const positions = [];
    let m;
    while ((m = emailRe.exec(line)) !== null) {
      positions.push({ start: m.index, end: m.index + m[0].length, email: m[1] });
    }

    if (positions.length === 0) continue;

    let canonName = '';
    let canonEmail = '';
    let oldName = '';
    let oldEmail = '';

    if (positions.length === 1) {
      canonEmail = positions[0].email;
      canonName = line.slice(0, positions[0].start).trim();
    } else {
      canonEmail = positions[0].email;
      canonName = line.slice(0, positions[0].start).trim();
      oldEmail = positions[1].email;
      oldName = line.slice(positions[0].end, positions[1].start).trim();
    }

    entries.push({ canonName, canonEmail, oldName, oldEmail });
  }
  return entries;
}

export function render(intake) {
  const allEntries = parseMailmap(intake.text || '');
  const entries = allEntries.slice(0, 30);
  const entryCap = describeCollectionCap(allEntries, entries);

  const rows = entries.map((e) => {
    return '<tr>'
      + '<td class="mm-canon">'
      + (e.canonName ? '<span class="mm-name">' + esc(e.canonName) + '</span>' : '')
      + (e.canonEmail ? '<code class="mm-email">' + esc(e.canonEmail) + '</code>' : '')
      + '</td>'
      + '<td class="mm-old">'
      + (e.oldName ? '<span class="mm-name mm-dim">' + esc(e.oldName) + '</span>' : '')
      + (e.oldEmail ? '<code class="mm-email mm-dim">' + esc(e.oldEmail) + '</code>' : '')
      + ((!e.oldName && !e.oldEmail) ? '<span class="mm-none">—</span>' : '')
      + '</td>'
      + '</tr>';
  }).join('');

  const host = document.createElement('div');
  host.className = 'mailmap-doc mm-doc';
  host.innerHTML = `<style>${CSS}</style>`
    + '<div class="mm-head">'
    + '<span class="mm-badge">Git Mailmap</span>'
    + '<h2 class="mm-title">.mailmap</h2>'
    + '<span class="mm-count">' + entryCap.label + ' entries</span>'
    + '</div>'
    + (entries.length
      ? '<table class="mm-table"><thead><tr><th>Canonical Identity</th><th>Maps From</th></tr></thead>'
        + '<tbody>' + rows + '</tbody></table>'
      : '<p class="mm-empty">No mailmap entries found.</p>');

  return { parentNode: host };
}
