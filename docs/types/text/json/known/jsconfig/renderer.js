const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.jsc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-jsc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#3178c6;color:#fff;vertical-align:middle;margin-right:8px;}
.jsc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.jsc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.jsc-sec{margin:12px 0;}
.jsc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.jsc-pills{display:flex;flex-wrap:wrap;gap:6px;}
.jsc-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.jsc-pill.on{background:#e8f5e9;border-color:#a5d6a7;color:#1b5e20;}
.jsc-pill.off{background:#fef2f2;border-color:#fca5a5;color:#7f1d1d;}
.jsc-kv-table{width:100%;border-collapse:collapse;font-size:13px;}
.jsc-kv-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.jsc-kv-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.jsc-mono{font:12px/1.4 ui-monospace,monospace;}
`;

const KEY_OPTS = ['target', 'module', 'moduleResolution', 'jsx', 'baseUrl'];
const BOOL_OPTS = ['checkJs', 'strict', 'allowJs', 'noEmit', 'esModuleInterop', 'allowSyntheticDefaultImports'];

export function render(intake) {
  let cfg = {};
  try { cfg = JSON.parse(intake.text || '{}'); } catch { cfg = {}; }

  const co = cfg.compilerOptions || {};
  const ext = cfg.extends ? String(cfg.extends) : null;
  const include = Array.isArray(cfg.include) ? cfg.include : [];
  const exclude = Array.isArray(cfg.exclude) ? cfg.exclude : [];
  const paths = co.paths ? Object.entries(co.paths) : [];

  const keyRows = KEY_OPTS.filter((k) => co[k] != null)
    .map((k) => `<tr><td><span class="jsc-mono">${esc(k)}</span></td><td><span class="jsc-mono">${esc(co[k])}</span></td></tr>`)
    .join('');

  const boolHtml = BOOL_OPTS.filter((k) => co[k] != null).map((k) =>
    `<span class="jsc-pill ${co[k] ? 'on' : 'off'}">${esc(k)}: ${co[k] ? 'true' : 'false'}</span>`
  ).join('');

  const pathsHtml = paths.length
    ? `<div class="jsc-sec"><h3>Path aliases (${paths.length})</h3><table class="jsc-kv-table"><thead><tr><th>Alias</th><th>Target</th></tr></thead><tbody>
        ${paths.slice(0, 10).map(([k, v]) => `<tr><td><span class="jsc-mono">${esc(k)}</span></td><td><span class="jsc-mono">${esc([].concat(v).join(', '))}</span></td></tr>`).join('')}
        ${paths.length > 10 ? `<tr><td colspan="2" style="color:var(--fg-2,#888);font-size:12px">…and ${paths.length - 10} more</td></tr>` : ''}
      </tbody></table></div>`
    : '';

  const inclExcl = (include.length || exclude.length)
    ? `<div class="jsc-sec"><h3>Include / Exclude</h3><div class="jsc-pills">
        ${include.slice(0, 5).map((p) => `<span class="jsc-pill on">${esc(p)}</span>`).join('')}
        ${exclude.slice(0, 5).map((p) => `<span class="jsc-pill off">!${esc(p)}</span>`).join('')}
      </div></div>`
    : '';

  const optHtml = (keyRows || boolHtml)
    ? `<div class="jsc-sec"><h3>Compiler options</h3>
        ${keyRows ? `<table class="jsc-kv-table"><thead><tr><th>Option</th><th>Value</th></tr></thead><tbody>${keyRows}</tbody></table>` : ''}
        ${boolHtml ? `<div class="jsc-pills" style="margin-top:8px">${boolHtml}</div>` : ''}
      </div>`
    : '';

  const extHtml = ext ? `<div class="jsc-sec"><h3>Extends</h3><div class="jsc-pills"><span class="jsc-pill">${esc(ext)}</span></div></div>` : '';

  const sub = [co.target ? `target: ${co.target}` : '', include.length ? `${include.length} include` : ''].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'jsc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="jsc-title"><span class="badge-jsc">JS Config</span>jsconfig.json</div>
<div class="jsc-sub">${esc(sub) || 'JavaScript project configuration'}</div>
${extHtml}${optHtml}${pathsHtml}${inclExcl}`;
  return { parentNode: host };
}
