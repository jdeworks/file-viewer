import { parseTOML } from '../../toml.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ruf-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-ruf{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#d7522a;color:#fff;vertical-align:middle;margin-right:8px;}
.ruf-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.ruf-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.ruf-sec{margin:12px 0;}
.ruf-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.ruf-pills{display:flex;flex-wrap:wrap;gap:5px;}
.ruf-pill{font-size:12px;padding:2px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.ruf-pill.sel{background:#eff6ff;border-color:#bfdbfe;color:#1e40af;}
.ruf-pill.ign{background:#fef2f2;border-color:#fecaca;color:#991b1b;text-decoration:line-through;}
.ruf-meta{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0;}
.ruf-badge{font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
`;

export function render(intake) {
  let cfg = {};
  try { cfg = parseTOML(intake.text || '') || {}; } catch { cfg = {}; }

  // ruff.toml can have keys at top level or under [tool.ruff] (when embedded in pyproject)
  const ruff = cfg.tool?.ruff || cfg;
  const lint = ruff.lint || ruff;

  const lineLength = ruff['line-length'] ?? ruff.line_length;
  const targetVersion = ruff['target-version'] ?? ruff.target_version;
  const select = Array.isArray(lint.select) ? lint.select : [];
  const ignore = Array.isArray(lint.ignore) ? lint.ignore : [];
  const extend = Array.isArray(lint['extend-select']) ? lint['extend-select'] : [];
  const fixable = Array.isArray(lint.fixable) ? lint.fixable : [];
  const exclude = Array.isArray(ruff.exclude) ? ruff.exclude : [];
  const perFile = ruff['per-file-ignores'] ?? lint['per-file-ignores'] ?? {};
  const perFileKeys = Object.keys(perFile);

  const host = document.createElement('div');
  host.className = 'ruf-doc';

  const metaParts = [
    lineLength !== undefined ? `line-length: ${lineLength}` : '',
    targetVersion ? `target: ${targetVersion}` : '',
  ].filter(Boolean);

  const pillHtml = (items, cls) =>
    items.slice(0, 20).map((i) => `<span class="ruf-pill ${cls}">${esc(i)}</span>`).join('') +
    (items.length > 20 ? `<span style="font-size:11px;color:var(--fg-2,#888)">+${items.length - 20} more</span>` : '');

  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-ruf">Ruff</span>
  <span class="ruf-title">Python linter config</span>
</div>
${metaParts.length ? `<div class="ruf-meta">${metaParts.map((p) => `<span class="ruf-badge">${esc(p)}</span>`).join('')}</div>` : ''}
${select.length ? `<div class="ruf-sec"><h3>Select rules (${select.length})</h3><div class="ruf-pills">${pillHtml(select, 'sel')}</div></div>` : ''}
${extend.length ? `<div class="ruf-sec"><h3>Extend-select (${extend.length})</h3><div class="ruf-pills">${pillHtml(extend, 'sel')}</div></div>` : ''}
${ignore.length ? `<div class="ruf-sec"><h3>Ignored rules (${ignore.length})</h3><div class="ruf-pills">${pillHtml(ignore, 'ign')}</div></div>` : ''}
${fixable.length ? `<div class="ruf-sec"><h3>Auto-fixable (${fixable.length})</h3><div class="ruf-pills">${pillHtml(fixable, 'sel')}</div></div>` : ''}
${perFileKeys.length ? `<div class="ruf-sec"><h3>Per-file ignores (${perFileKeys.length} patterns)</h3><div class="ruf-pills">${perFileKeys.slice(0, 8).map((k) => `<span class="ruf-pill">${esc(k)}</span>`).join('')}</div></div>` : ''}
${exclude.length ? `<div class="ruf-sec"><h3>Excluded paths (${exclude.length})</h3><div class="ruf-pills">${exclude.slice(0, 10).map((e) => `<span class="ruf-pill">${esc(e)}</span>`).join('')}</div></div>` : ''}`;

  return { parentNode: host };
}
