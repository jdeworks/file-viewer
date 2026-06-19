const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.myp-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-myp{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#2a5ea4;color:#fff;vertical-align:middle;margin-right:8px;}
.myp-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.myp-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.myp-sec{margin:12px 0;}
.myp-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.myp-pills{display:flex;flex-wrap:wrap;gap:6px;}
.myp-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.myp-pill.on{background:#e8f5e9;border-color:#a5d6a7;color:#1b5e20;}
.myp-pill.off{background:#fef2f2;border-color:#fca5a5;color:#7f1d1d;}
.myp-table{width:100%;border-collapse:collapse;font-size:12px;}
.myp-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.myp-table td{padding:3px 8px 3px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
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

const BOOL_FLAGS = [
  'strict', 'disallow_untyped_defs', 'disallow_incomplete_defs',
  'check_untyped_defs', 'warn_return_any', 'warn_unused_ignores',
  'warn_redundant_casts', 'ignore_missing_imports',
  'disallow_any_generics', 'no_implicit_optional',
];

export function render(intake) {
  const ini = parseIni(intake.text || '');
  const mypy = ini['mypy'] || {};

  const pyVer = mypy['python_version'] || null;
  const strict = mypy['strict'] === 'True' || mypy['strict'] === 'true';

  const boolRows = BOOL_FLAGS
    .filter((f) => mypy[f] != null)
    .map((f) => {
      const val = mypy[f].toLowerCase();
      const isOn = val === 'true';
      const cls = isOn ? 'on' : 'off';
      return `<tr><td>${esc(f)}</td><td><span class="myp-pill ${cls}">${esc(mypy[f])}</span></td></tr>`;
    });

  const moduleOverrides = Object.keys(ini).filter((k) => k.startsWith('mypy-'));

  const mainHtml = (pyVer || strict)
    ? `<div class="myp-sec"><h3>Settings</h3><div class="myp-pills">
        ${pyVer ? `<span class="myp-pill">Python ${esc(pyVer)}</span>` : ''}
        ${strict ? `<span class="myp-pill on">strict mode</span>` : ''}
        ${mypy['follow_imports'] ? `<span class="myp-pill">follow: ${esc(mypy['follow_imports'])}</span>` : ''}
      </div></div>`
    : '';

  const flagHtml = boolRows.length
    ? `<div class="myp-sec"><h3>Flags</h3><table class="myp-table"><thead><tr><th>Flag</th><th>Value</th></tr></thead><tbody>${boolRows.join('')}</tbody></table></div>`
    : '';

  const overrideHtml = moduleOverrides.length
    ? `<div class="myp-sec"><h3>Per-module overrides (${moduleOverrides.length})</h3><div class="myp-pills">
        ${moduleOverrides.slice(0, 8).map((k) => `<span class="myp-pill">${esc(k.replace('mypy-', ''))}</span>`).join('')}
        ${moduleOverrides.length > 8 ? `<span class="myp-pill" style="color:var(--fg-2,#888)">+${moduleOverrides.length - 8} more</span>` : ''}
      </div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'myp-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="myp-title"><span class="badge-myp">mypy</span>mypy.ini</div>
<div class="myp-sub">${strict ? 'strict mode · ' : ''}${pyVer ? `Python ${esc(pyVer)} · ` : ''}${moduleOverrides.length ? `${moduleOverrides.length} module override${moduleOverrides.length !== 1 ? 's' : ''}` : 'type checking config'}</div>
${mainHtml}${flagHtml}${overrideHtml}`;
  return { parentNode: host };
}
