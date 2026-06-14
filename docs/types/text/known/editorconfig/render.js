// Enhanced .editorconfig view (parent pane, trusted DOM). INI-like: a preamble (root=true) then
// [glob] sections each holding key=value properties. We render a card per section and annotate
// the well-known keys so the intent is readable without consulting the spec.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const NOTES = {
  indent_style: 'tabs or spaces',
  indent_size: 'columns per indent level',
  tab_width: 'width of a tab character',
  end_of_line: 'line-ending style (lf / crlf / cr)',
  charset: 'file encoding',
  trim_trailing_whitespace: 'strip trailing spaces on save',
  insert_final_newline: 'ensure a trailing newline',
  max_line_length: 'wrap / ruler guide',
  root: 'stop searching parent folders for .editorconfig',
};

export async function render(intake, _ctx) {
  const lines = (intake.text || '').split(/\r?\n/);
  const sections = [];
  let current = { glob: '(top-level)', props: [] };
  sections.push(current);
  for (let raw of lines) {
    const line = raw.replace(/[;#].*$/, '').trim();
    if (!line) continue;
    let m;
    if ((m = line.match(/^\[(.+)\]$/))) { current = { glob: m[1], props: [] }; sections.push(current); continue; }
    if ((m = line.match(/^([^=]+)=(.*)$/))) current.props.push({ key: m[1].trim(), val: m[2].trim() });
  }

  const cards = sections.filter((s) => s.props.length).map((s) => {
    const rows = s.props.map((p) => {
      const note = NOTES[p.key.toLowerCase()] ? '<span class="ts-doc"> — ' + esc(NOTES[p.key.toLowerCase()]) + '</span>' : '';
      return '<li class="kf-pat"><code class="ts-key">' + esc(p.key) + '</code><span style="flex:1"></span><code class="pj-ver">' + esc(p.val) + '</code>' + note + '</li>';
    }).join('');
    const title = s.glob === '(top-level)' ? 'Top-level' : '<code>' + esc(s.glob) + '</code>';
    return '<section class="kf-svc"><h3>' + title + '</h3><ul class="kf-list">' + rows + '</ul></section>';
  }).join('');

  const isRoot = sections.some((s) => s.props.some((p) => /^root$/i.test(p.key) && /^true$/i.test(p.val)));
  const el = document.createElement('div');
  el.className = 'pj-doc';
  el.innerHTML =
    '<header class="pj-head"><div class="pj-title">⚙️ .editorconfig</div>'
    + '<div class="pj-meta">' + (isRoot ? '<span class="pj-tag">root</span>' : '')
    + '<span class="pj-tag">' + sections.filter((s) => s.glob !== '(top-level)').length + ' section(s)</span></div></header>'
    + (cards || '<p class="kf-note">No properties found.</p>');
  return { parentNode: el };
}
