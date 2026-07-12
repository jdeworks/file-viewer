// Enhanced .editorconfig view (parentNode DOM). INI-like: a preamble (root=true) then
// [glob] sections each holding key=value properties. We render a card per section and annotate
// the well-known keys so the intent is readable without consulting the spec.
import { describeCollectionCap } from '../../../../core/collection-cap.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.editorconfig-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.editorconfig-doc .ec-badge{display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;background:#E05E3B;color:#fff;vertical-align:middle;margin-right:8px;}
.editorconfig-doc .ec-chip-root{display:inline-block;padding:2px 9px;border-radius:8px;font-size:11px;font-weight:600;background:#fef9c3;border:1px solid #fde047;color:#854d0e;vertical-align:middle;margin-left:4px;}
.editorconfig-doc .ec-head{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin:0 0 16px;}
.editorconfig-doc .ec-title{font-size:18px;font-weight:700;margin:0;}
.editorconfig-doc .ec-sections-count{font-size:12px;color:var(--fg-2,#888);}
.editorconfig-doc .ec-section{border:1px solid var(--border,#e0e0e0);border-radius:8px;margin:0 0 12px;overflow:hidden;}
.editorconfig-doc .ec-section-head{background:var(--bg-2,#f6f8fa);padding:8px 14px;font-size:12px;font-weight:600;border-bottom:1px solid var(--border,#e0e0e0);}
.editorconfig-doc .ec-section-head code{font-family:ui-monospace,monospace;font-size:13px;color:var(--fg,#24292f);}
.editorconfig-doc .ec-kv-list{list-style:none;margin:0;padding:0;}
.editorconfig-doc .ec-kv{display:flex;align-items:center;gap:8px;padding:5px 14px;border-bottom:1px solid var(--border,#eee);font-size:13px;}
.editorconfig-doc .ec-kv:last-child{border-bottom:none;}
.editorconfig-doc .ec-key{font-family:ui-monospace,monospace;font-size:12px;font-weight:600;min-width:200px;flex-shrink:0;color:var(--fg,#24292f);}
.editorconfig-doc .ec-val{font-family:ui-monospace,monospace;font-size:12px;}
.editorconfig-doc .ec-note{font-size:11px;color:var(--fg-2,#888);margin-left:4px;}
.editorconfig-doc .ec-chip-indent{display:inline-block;padding:1px 7px;border-radius:6px;font-size:11px;font-weight:600;margin-left:6px;}
.editorconfig-doc .ec-chip-space{background:#dbeafe;border:1px solid #93c5fd;color:#1d4ed8;}
.editorconfig-doc .ec-chip-tab{background:#dcfce7;border:1px solid #86efac;color:#166534;}
.editorconfig-doc .ec-chip-eol{display:inline-block;padding:1px 7px;border-radius:6px;font-size:11px;font-weight:600;margin-left:6px;background:#fef3c7;border:1px solid #fcd34d;color:#92400e;}
.editorconfig-doc .ec-empty{color:var(--fg-2,#888);font-size:13px;padding:12px 0;}
`;

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

function indentChip(val) {
  if (val === 'space') return '<span class="ec-chip-indent ec-chip-space">space</span>';
  if (val === 'tab') return '<span class="ec-chip-indent ec-chip-tab">tab</span>';
  return '';
}

function eolChip(val) {
  const v = val.toLowerCase();
  if (v === 'lf' || v === 'crlf' || v === 'cr') return '<span class="ec-chip-eol">' + esc(val) + '</span>';
  return '';
}

export function render(intake) {
  const lines = (intake.text || '').split(/\r?\n/);
  const sections = [];
  let current = null;
  for (const raw of lines) {
    const line = raw.replace(/[;#].*$/, '').trim();
    if (!line) continue;
    let m;
    if ((m = line.match(/^\[(.+)\]$/))) {
      current = { glob: m[1], props: [] };
      sections.push(current);
      continue;
    }
    if ((m = line.match(/^([^=]+)=(.*)$/))) {
      const key = m[1].trim().toLowerCase();
      const val = m[2].trim();
      if (!current) {
        current = { glob: null, props: [] };
        sections.unshift(current);
      }
      current.props.push({ key, val });
    }
  }

  const isRoot = sections.some((s) => s.props.some((p) => p.key === 'root' && /^true$/i.test(p.val)));
  const allGlobSections = sections.filter((s) => s.glob !== null);
  const globSections = allGlobSections.slice(0, 10);
  const sectionCap = describeCollectionCap(allGlobSections, globSections.length);

  const sectionHtml = globSections.map((s) => {
    const rows = s.props.map((p) => {
      const note = NOTES[p.key] ? '<span class="ec-note"> — ' + esc(NOTES[p.key]) + '</span>' : '';
      let extra = '';
      if (p.key === 'indent_style') extra = indentChip(p.val.toLowerCase());
      if (p.key === 'end_of_line') extra = eolChip(p.val);
      return '<li class="ec-kv"><span class="ec-key">' + esc(p.key) + '</span>'
        + '<span class="ec-val">' + esc(p.val) + extra + '</span>'
        + note + '</li>';
    }).join('');
    return '<div class="ec-section">'
      + '<div class="ec-section-head"><code>' + esc(s.glob) + '</code></div>'
      + '<ul class="ec-kv-list">' + rows + '</ul>'
      + '</div>';
  }).join('');

  const host = document.createElement('div');
  host.className = 'editorconfig-doc';
  host.innerHTML = `<style>${CSS}</style>`
    + '<div class="ec-head">'
    + '<span class="ec-badge">EditorConfig</span>'
    + '<h2 class="ec-title">.editorconfig</h2>'
    + (isRoot ? '<span class="ec-chip-root">root = true</span>' : '')
    + '<span class="ec-sections-count">' + sectionCap.label + ' sections</span>'
    + '</div>'
    + (sectionHtml || '<p class="ec-empty">No sections found.</p>');

  return { parentNode: host };
}
