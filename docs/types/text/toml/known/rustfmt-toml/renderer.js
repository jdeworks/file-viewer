const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rustfmt-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.rustfmt-header{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:2px;}
.rustfmt-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#b7410e;color:#fff;vertical-align:middle;margin-right:4px;}
.rustfmt-title{font-size:18px;font-weight:700;}
.rustfmt-subtitle{font-size:12px;color:var(--fg-2,#888);margin:2px 0 10px;}
.rustfmt-meta{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 12px;}
.rustfmt-chip{display:inline-block;font-size:12px;padding:2px 9px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.rustfmt-chip.edition{background:#fff3e0;border-color:#ffb74d;color:#7a3000;}
.rustfmt-chip.ver{background:#e8f5e9;border-color:#a5d6a7;color:#1b5e20;}
.rustfmt-chip.on{background:#f0fdf4;border-color:#bbf7d0;color:#166534;}
.rustfmt-chip.off{background:#fef2f2;border-color:#fecaca;color:#991b1b;}
.rustfmt-sec{margin:14px 0;}
.rustfmt-sec h3{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-2,#888);margin:0 0 7px;}
.rustfmt-pills{display:flex;flex-wrap:wrap;gap:5px;}
.rustfmt-pill{font-size:12px;padding:2px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.rustfmt-pill.bool-on{background:#f0fdf4;border-color:#bbf7d0;color:#166534;}
.rustfmt-pill.bool-off{background:#fef2f2;border-color:#fecaca;color:#991b1b;}
`;

function boolChip(label, val) {
  if (val == null) return '';
  const on = val === true || val === 'true';
  return `<span class="rustfmt-chip ${on ? 'on' : 'off'}">${esc(label)}: ${on ? 'true' : 'false'}</span>`;
}

function boolPill(label, val) {
  if (val == null) return '';
  const on = val === true || val === 'true';
  return `<span class="rustfmt-pill ${on ? 'bool-on' : 'bool-off'}">${esc(label)}: ${on ? 'true' : 'false'}</span>`;
}

export function render(intake) {
  let cfg = {};
  if (intake.parsed && typeof intake.parsed === 'object') {
    cfg = intake.parsed;
  }

  const edition = cfg.edition;
  const maxWidth = cfg.max_width;
  const commentWidth = cfg.comment_width;
  const tabSpaces = cfg.tab_spaces;
  const useTabs = cfg.use_tabs;
  const hardTabs = cfg.hard_tabs;
  const newlineStyle = cfg.newline_style;
  const indentStyle = cfg.indent_style;
  const wrapComments = cfg.wrap_comments;
  const formatCodeInDocComments = cfg.format_code_in_doc_comments;
  const reorderImports = cfg.reorder_imports;
  const mergeDevires = cfg.merge_derives;
  const useSmallHeuristics = cfg.use_small_heuristics;
  const importsGranularity = cfg.imports_granularity;
  const groupImports = cfg.group_imports;
  const requiredVersion = cfg.required_version;

  const host = document.createElement('div');
  host.className = 'rustfmt-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="rustfmt-header">
  <span class="rustfmt-badge">rustfmt</span>
  <span class="rustfmt-title">rustfmt.toml</span>
</div>
<div class="rustfmt-subtitle">Rust code formatter</div>
<div class="rustfmt-meta">
  ${edition != null ? `<span class="rustfmt-chip edition">edition ${esc(edition)}</span>` : ''}
  ${requiredVersion != null ? `<span class="rustfmt-chip ver">rustfmt ${esc(requiredVersion)}</span>` : ''}
</div>

${(maxWidth != null || commentWidth != null) ? `<div class="rustfmt-sec"><h3>Width</h3><div class="rustfmt-pills">
  ${maxWidth != null ? `<span class="rustfmt-pill">max_width: ${esc(maxWidth)}</span>` : ''}
  ${commentWidth != null ? `<span class="rustfmt-pill">comment_width: ${esc(commentWidth)}</span>` : ''}
</div></div>` : ''}

${(tabSpaces != null || useTabs != null || hardTabs != null) ? `<div class="rustfmt-sec"><h3>Indentation</h3><div class="rustfmt-pills">
  ${tabSpaces != null ? `<span class="rustfmt-pill">tab_spaces: ${esc(tabSpaces)}</span>` : ''}
  ${useTabs != null ? boolPill('use_tabs', useTabs) : ''}
  ${hardTabs != null ? boolPill('hard_tabs', hardTabs) : ''}
</div></div>` : ''}

${(newlineStyle != null || indentStyle != null || useSmallHeuristics != null || importsGranularity != null || groupImports != null) ? `<div class="rustfmt-sec"><h3>Style</h3><div class="rustfmt-pills">
  ${newlineStyle != null ? `<span class="rustfmt-pill">newline_style: ${esc(newlineStyle)}</span>` : ''}
  ${indentStyle != null ? `<span class="rustfmt-pill">indent_style: ${esc(indentStyle)}</span>` : ''}
  ${useSmallHeuristics != null ? `<span class="rustfmt-pill">heuristics: ${esc(useSmallHeuristics)}</span>` : ''}
  ${importsGranularity != null ? `<span class="rustfmt-pill">imports: ${esc(importsGranularity)}</span>` : ''}
  ${groupImports != null ? `<span class="rustfmt-pill">group_imports: ${esc(groupImports)}</span>` : ''}
</div></div>` : ''}

${(wrapComments != null || formatCodeInDocComments != null || reorderImports != null || mergeDevires != null) ? `<div class="rustfmt-sec"><h3>Features</h3><div class="rustfmt-pills">
  ${wrapComments != null ? boolPill('wrap_comments', wrapComments) : ''}
  ${formatCodeInDocComments != null ? boolPill('format_code_in_doc_comments', formatCodeInDocComments) : ''}
  ${reorderImports != null ? boolPill('reorder_imports', reorderImports) : ''}
  ${mergeDevires != null ? boolPill('merge_derives', mergeDevires) : ''}
</div></div>` : ''}`;

  return { parentNode: host };
}
