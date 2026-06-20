import { parseTOML } from '../../toml.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rufftoml-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.rufftoml-header{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:4px;}
.rufftoml-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#d7ff64;color:#1a1a1a;vertical-align:middle;margin-right:4px;}
.rufftoml-title{font-size:18px;font-weight:700;}
.rufftoml-chip{display:inline-block;font-size:12px;padding:2px 9px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.rufftoml-chip.pyver{background:#eff6ff;border-color:#bfdbfe;color:#1e3a5f;}
.rufftoml-chip.len{background:#f0fdf4;border-color:#bbf7d0;color:#14532d;}
.rufftoml-sec{margin:14px 0;}
.rufftoml-sec h3{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-2,#888);margin:0 0 7px;}
.rufftoml-pills{display:flex;flex-wrap:wrap;gap:5px;}
.rufftoml-pill{font-size:12px;padding:2px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.rufftoml-pill.sel{background:#eff6ff;border-color:#bfdbfe;color:#1e40af;}
.rufftoml-pill.ign{background:#fef2f2;border-color:#fecaca;color:#991b1b;text-decoration:line-through;}
.rufftoml-pill.fix{background:#f0fdf4;border-color:#bbf7d0;color:#166534;}
.rufftoml-pill.fmt{background:#fdf4ff;border-color:#e9d5ff;color:#6b21a8;}
.rufftoml-table{width:100%;border-collapse:collapse;font-size:12px;margin:4px 0;}
.rufftoml-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 10px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.rufftoml-table td{padding:4px 10px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;vertical-align:top;}
.rufftoml-meta{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 10px;}
`;

// Rule codes to friendly labels
const RULE_LABELS = {
  E: 'pycodestyle (E)', F: 'Pyflakes', W: 'pycodestyle (W)', B: 'flake8-bugbear',
  I: 'isort', N: 'pep8-naming', UP: 'pyupgrade', YTT: 'flake8-2020',
  ANN: 'flake8-annotations', S: 'flake8-bandit', FBT: 'flake8-boolean-trap',
  A: 'flake8-builtins', C4: 'flake8-comprehensions', ISC: 'implicit-str-concat',
  ICN: 'flake8-import-conventions', PIE: 'flake8-pie', T20: 'flake8-print',
  PT: 'flake8-pytest-style', Q: 'flake8-quotes', RSE: 'flake8-raise',
  RET: 'flake8-return', SIM: 'flake8-simplify', TID: 'flake8-tidy-imports',
  TCH: 'flake8-type-checking', ARG: 'flake8-unused-arguments',
  PTH: 'flake8-use-pathlib', ERA: 'eradicate', PL: 'Pylint', RUF: 'Ruff',
};

export function render(intake) {
  let cfg = {};
  if (intake.parsed && typeof intake.parsed === 'object') {
    cfg = intake.parsed;
  } else {
    try { cfg = parseTOML(intake.text || '') || {}; } catch { cfg = {}; }
  }

  // ruff.toml can have top-level keys or be embedded under [tool.ruff]
  const ruff = cfg.tool?.ruff || cfg;
  const lint = ruff.lint || {};
  const format = ruff.format || {};

  const lineLength = ruff['line-length'] ?? ruff.line_length;
  const targetVersion = ruff['target-version'] ?? ruff.target_version;
  const select = Array.isArray(lint.select) ? lint.select : [];
  const ignore = Array.isArray(lint.ignore) ? lint.ignore : [];
  const extend = Array.isArray(lint['extend-select']) ? lint['extend-select'] : [];
  const fixable = Array.isArray(lint.fixable) ? lint.fixable : [];
  const perFileObj = lint['per-file-ignores'] ?? ruff['per-file-ignores'] ?? {};
  const perFileEntries = Object.entries(perFileObj);

  // Python version display
  const pyDisplay = targetVersion
    ? targetVersion.replace(/^py(\d)(\d+)$/, (_, maj, min) => `Python ${maj}.${min}`)
    : null;

  // Format section details
  const quoteStyle = format['quote-style'];
  const indentStyle = format['indent-style'];
  const lineEnding = format['line-ending'];
  const docFmt = format['docstring-code-format'];
  const hasFormat = quoteStyle || indentStyle || lineEnding || docFmt != null;

  // Plugin sub-sections (isort, pydocstyle, flake8-annotations, etc.)
  const pluginKeys = Object.keys(lint).filter(k =>
    !['select','ignore','extend-select','fixable','unfixable','per-file-ignores',
      'dummy-variable-rgx','exclude'].includes(k) && typeof lint[k] === 'object'
  );

  const pillHtml = (items, cls) => {
    const rendered = items.slice(0, 24).map(i => {
      const label = RULE_LABELS[i] ? `${i} <span style="opacity:.65;font-size:10px">${RULE_LABELS[i]}</span>` : esc(i);
      return `<span class="rufftoml-pill ${cls}">${label}</span>`;
    }).join('');
    const more = items.length > 24 ? `<span style="font-size:11px;color:var(--fg-2,#888)">+${items.length - 24} more</span>` : '';
    return rendered + more;
  };

  const perFileHtml = perFileEntries.length
    ? `<div class="rufftoml-sec"><h3>Per-file ignores (${perFileEntries.length} patterns)</h3>
        <table class="rufftoml-table">
          <thead><tr><th>Pattern</th><th>Ignored rules</th></tr></thead>
          <tbody>${perFileEntries.slice(0, 12).map(([pattern, rules]) => {
            const ruleList = Array.isArray(rules) ? rules.join(', ') : String(rules);
            return `<tr><td>${esc(pattern)}</td><td>${esc(ruleList)}</td></tr>`;
          }).join('')}${perFileEntries.length > 12 ? `<tr><td colspan="2" style="color:var(--fg-2,#888);font-size:11px">+${perFileEntries.length - 12} more patterns</td></tr>` : ''}
          </tbody>
        </table></div>`
    : '';

  const formatHtml = hasFormat
    ? `<div class="rufftoml-sec"><h3>Format</h3><div class="rufftoml-pills">
        ${quoteStyle ? `<span class="rufftoml-pill fmt">quotes: ${esc(quoteStyle)}</span>` : ''}
        ${indentStyle ? `<span class="rufftoml-pill fmt">indent: ${esc(indentStyle)}</span>` : ''}
        ${lineEnding ? `<span class="rufftoml-pill fmt">line-ending: ${esc(lineEnding)}</span>` : ''}
        ${docFmt != null ? `<span class="rufftoml-pill fmt">docstring-fmt: ${esc(String(docFmt))}</span>` : ''}
      </div></div>`
    : '';

  const pluginsHtml = pluginKeys.length
    ? `<div class="rufftoml-sec"><h3>Plugin settings</h3><div class="rufftoml-pills">
        ${pluginKeys.map(k => {
          const sub = lint[k];
          const kvs = Object.entries(sub).slice(0, 4).map(([pk, pv]) =>
            `<span class="rufftoml-pill">[${esc(k)}] ${esc(pk)}: ${esc(Array.isArray(pv) ? pv.join(', ') : String(pv))}</span>`
          ).join('');
          return kvs;
        }).join('')}
      </div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'rufftoml-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="rufftoml-header">
  <span class="rufftoml-badge">Ruff</span>
  <span class="rufftoml-title">ruff.toml</span>
</div>
<div class="rufftoml-meta">
  ${pyDisplay ? `<span class="rufftoml-chip pyver">${esc(pyDisplay)}</span>` : ''}
  ${lineLength !== undefined ? `<span class="rufftoml-chip len">line-length: ${esc(lineLength)}</span>` : ''}
</div>
${select.length ? `<div class="rufftoml-sec"><h3>Selected rule sets (${select.length})</h3><div class="rufftoml-pills">${pillHtml(select, 'sel')}</div></div>` : ''}
${extend.length ? `<div class="rufftoml-sec"><h3>Extend-select (${extend.length})</h3><div class="rufftoml-pills">${pillHtml(extend, 'sel')}</div></div>` : ''}
${ignore.length ? `<div class="rufftoml-sec"><h3>Ignored rules (${ignore.length})</h3><div class="rufftoml-pills">${pillHtml(ignore, 'ign')}</div></div>` : ''}
${fixable.length === 1 && fixable[0] === 'ALL' ? `<div class="rufftoml-sec"><h3>Fixable</h3><div class="rufftoml-pills"><span class="rufftoml-pill fix">ALL rules</span></div></div>` : fixable.length ? `<div class="rufftoml-sec"><h3>Auto-fixable (${fixable.length})</h3><div class="rufftoml-pills">${pillHtml(fixable, 'fix')}</div></div>` : ''}
${perFileHtml}
${formatHtml}
${pluginsHtml}`;

  return { parentNode: host };
}
