const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.mypyini-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.mypyini-header{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:4px;}
.mypyini-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2a5aad;color:#fff;vertical-align:middle;margin-right:4px;}
.mypyini-title{font-size:18px;font-weight:700;}
.mypyini-chip{display:inline-block;font-size:12px;padding:2px 9px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.mypyini-chip.pyver{background:#eff6ff;border-color:#bfdbfe;color:#1e3a5f;}
.mypyini-sec{margin:14px 0;}
.mypyini-sec h3{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-2,#888);margin:0 0 7px;}
.mypyini-pills{display:flex;flex-wrap:wrap;gap:5px;}
.mypyini-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.mypyini-pill.on{background:#e8f5e9;border-color:#a5d6a7;color:#1b5e20;}
.mypyini-pill.off{background:#fef2f2;border-color:#fca5a5;color:#7f1d1d;}
.mypyini-pill.out{background:#f5f3ff;border-color:#c4b5fd;color:#4c1d95;}
.mypyini-table{width:100%;border-collapse:collapse;font-size:12px;margin:4px 0;}
.mypyini-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 10px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.mypyini-table td{padding:4px 10px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;vertical-align:middle;}
.mypyini-meta{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 10px;}
`;

function parseIni(text) {
  const secs = {};
  let cur = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const sec = line.match(/^\[([^\]]+)\]/);
    if (sec) { cur = sec[1]; secs[cur] = {}; continue; }
    if (cur) {
      const kv = line.match(/^([^=:]+)[=:](.*)/);
      if (kv) secs[cur][kv[1].trim()] = kv[2].trim();
    }
  }
  return secs;
}

const STRICTNESS_FLAGS = [
  'disallow_untyped_defs',
  'disallow_incomplete_defs',
  'check_untyped_defs',
  'warn_return_any',
  'warn_unused_configs',
  'warn_unused_ignores',
  'strict_optional',
  'strict_equality',
];

const OUTPUT_FLAGS = [
  'show_error_codes',
  'pretty',
  'color_output',
];

function boolVal(v) {
  if (v == null) return null;
  const lv = String(v).toLowerCase();
  if (lv === 'true') return true;
  if (lv === 'false') return false;
  return null;
}

export function render(intake) {
  const ini = parseIni(intake.text || '');
  const mypy = ini['mypy'] || {};

  const pyVer = mypy['python_version'] || null;

  // Strictness card
  const strictnessFlags = STRICTNESS_FLAGS
    .filter(f => mypy[f] != null)
    .map(f => {
      const v = boolVal(mypy[f]);
      const cls = v === true ? 'on' : v === false ? 'off' : '';
      return `<span class="mypyini-pill ${cls}">${esc(f)}: ${esc(mypy[f])}</span>`;
    });

  // Module overrides
  const moduleOverrides = Object.keys(ini).filter(k => k.startsWith('mypy-'));

  const overrideRows = moduleOverrides.slice(0, 20).map(k => {
    const mod = k.replace(/^mypy-/, '');
    const settings = ini[k];
    const chips = Object.entries(settings).map(([sk, sv]) => {
      const v = boolVal(sv);
      const cls = v === true ? 'on' : v === false ? 'off' : '';
      return `<span class="mypyini-pill ${cls}" style="font-size:11px">${esc(sk)}: ${esc(sv)}</span>`;
    }).join(' ');
    return `<tr><td>${esc(mod)}</td><td>${chips || '<span style="color:var(--fg-2,#888)">—</span>'}</td></tr>`;
  }).join('');

  // Output settings
  const outputFlags = OUTPUT_FLAGS
    .filter(f => mypy[f] != null)
    .map(f => {
      const v = boolVal(mypy[f]);
      const cls = v === true ? 'out' : '';
      return `<span class="mypyini-pill ${cls}">${esc(f)}: ${esc(mypy[f])}</span>`;
    });

  const host = document.createElement('div');
  host.className = 'mypyini-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="mypyini-header">
  <span class="mypyini-badge">mypy</span>
  <span class="mypyini-title">mypy.ini</span>
</div>
<div class="mypyini-meta">
  ${pyVer ? `<span class="mypyini-chip pyver">Python ${esc(pyVer)}</span>` : ''}
</div>
${strictnessFlags.length ? `<div class="mypyini-sec"><h3>Strictness</h3><div class="mypyini-pills">${strictnessFlags.join('')}</div></div>` : ''}
${moduleOverrides.length ? `<div class="mypyini-sec"><h3>Module overrides (${moduleOverrides.length})</h3>
  <table class="mypyini-table">
    <thead><tr><th>Module pattern</th><th>Settings</th></tr></thead>
    <tbody>${overrideRows}${moduleOverrides.length > 20 ? `<tr><td colspan="2" style="color:var(--fg-2,#888);font-size:11px">+${moduleOverrides.length - 20} more</td></tr>` : ''}</tbody>
  </table></div>` : ''}
${outputFlags.length ? `<div class="mypyini-sec"><h3>Output</h3><div class="mypyini-pills">${outputFlags.join('')}</div></div>` : ''}`;

  return { parentNode: host };
}
