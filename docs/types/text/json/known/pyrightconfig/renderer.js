const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pyr-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-pyr{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#3178c6;color:#fff;vertical-align:middle;margin-right:8px;}
.pyr-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.pyr-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.pyr-sec{margin:12px 0;}
.pyr-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.pyr-pills{display:flex;flex-wrap:wrap;gap:6px;}
.pyr-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.pyr-pill.strict{background:#fef3c7;border-color:#fcd34d;color:#92400e;font-weight:700;}
.pyr-pill.on{background:#e8f5e9;border-color:#a5d6a7;color:#1b5e20;}
.pyr-pill.warn{background:#fff7ed;border-color:#fdba74;color:#9a3412;}
.pyr-table{width:100%;border-collapse:collapse;font-size:13px;}
.pyr-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.pyr-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:12px;}
`;

const MODE_COLORS = { strict: 'strict', standard: 'on', basic: 'pill', off: '' };
const BOOL_FLAGS = ['reportMissingImports', 'reportMissingTypeStubs', 'reportUnusedImport', 'reportUnusedVariable', 'reportPrivateUsage', 'useLibraryCodeForTypes'];

export function render(intake) {
  let cfg = {};
  try { cfg = JSON.parse(intake.text || '{}'); } catch { cfg = {}; }

  const mode = cfg.typeCheckingMode || 'off';
  const pyVer = cfg.pythonVersion || null;
  const pyPlatform = cfg.pythonPlatform || null;
  const venvPath = cfg.venvPath || null;
  const venv = cfg.venv || null;
  const include = Array.isArray(cfg.include) ? cfg.include : [];
  const exclude = Array.isArray(cfg.exclude) ? cfg.exclude : [];

  const modeColor = MODE_COLORS[mode] || 'pill';
  const modeHtml = `<div class="pyr-sec"><h3>Type checking mode</h3>
    <div class="pyr-pills"><span class="pyr-pill ${modeColor}">${esc(mode)}</span></div></div>`;

  const envHtml = (pyVer || pyPlatform || venvPath || venv)
    ? `<div class="pyr-sec"><h3>Python environment</h3><div class="pyr-pills">
        ${pyVer ? `<span class="pyr-pill">Python ${esc(pyVer)}</span>` : ''}
        ${pyPlatform ? `<span class="pyr-pill">${esc(pyPlatform)}</span>` : ''}
        ${venv ? `<span class="pyr-pill">${esc(venvPath ? `${venvPath}/${venv}` : venv)}</span>` : ''}
      </div></div>`
    : '';

  const flagHtml = BOOL_FLAGS.filter((f) => cfg[f] != null).length
    ? `<div class="pyr-sec"><h3>Check flags</h3><table class="pyr-table"><thead><tr><th>Flag</th><th>Value</th></tr></thead><tbody>
        ${BOOL_FLAGS.filter((f) => cfg[f] != null).map((f) => {
          const val = cfg[f];
          const cls = val === true ? 'on' : val === 'warning' ? 'warn' : '';
          return `<tr><td>${esc(f)}</td><td><span class="pyr-pill ${cls}">${esc(val)}</span></td></tr>`;
        }).join('')}
      </tbody></table></div>`
    : '';

  const pathHtml = (include.length || exclude.length)
    ? `<div class="pyr-sec"><h3>Include / Exclude</h3><div class="pyr-pills">
        ${include.slice(0, 5).map((p) => `<span class="pyr-pill on">${esc(p)}</span>`).join('')}
        ${exclude.slice(0, 5).map((p) => `<span class="pyr-pill">${esc(p)}</span>`).join('')}
      </div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'pyr-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="pyr-title"><span class="badge-pyr">Pyright</span>pyrightconfig.json</div>
<div class="pyr-sub">${esc(mode)} mode${pyVer ? ` · Python ${esc(pyVer)}` : ''}</div>
${modeHtml}${envHtml}${flagHtml}${pathHtml}`;
  return { parentNode: host };
}
