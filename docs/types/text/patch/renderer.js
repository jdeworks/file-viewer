// Unified-diff / patch preview: colorize added / removed / hunk-header / file-header lines.
// Pure presentation of the text — no patching applied.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function classOf(line) {
  if (/^(diff --git|index |--- |\+\+\+ |new file|deleted file|rename |similarity )/.test(line)) return 'p-file';
  if (/^@@/.test(line)) return 'p-hunk';
  if (/^\+/.test(line)) return 'p-add';
  if (/^-/.test(line)) return 'p-del';
  return '';
}

export async function render(intake, _ctx) {
  const lines = (intake.text || '').split(/\r?\n/);
  const html = lines.map((l) => {
    const c = classOf(l);
    return '<span class="pl' + (c ? ' ' + c : '') + '">' + (esc(l) || '&nbsp;') + '</span>';
  }).join('');
  return { bodyHtml: '<div class="patch">' + html + '</div>', hadUnsafe: false };
}

// Quick stats for the metadata panel.
export function patchStats(text) {
  const lines = (text || '').split(/\r?\n/);
  let added = 0, removed = 0, files = 0, hunks = 0;
  for (const l of lines) {
    if (/^\+(?!\+\+ )/.test(l)) added++;
    else if (/^-(?!-- )/.test(l)) removed++;
    if (/^diff --git|^--- /.test(l)) files++;
    if (/^@@/.test(l)) hunks++;
  }
  return { added, removed, files, hunks };
}
