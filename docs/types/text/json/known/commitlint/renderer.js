const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.cml-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-cml{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#3EB489;color:#fff;vertical-align:middle;margin-right:8px;}
.cml-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.cml-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.cml-sec{margin:12px 0;}
.cml-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.cml-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 3px 1px 0;}
.cml-chip-list{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0;}
.cml-table{width:100%;border-collapse:collapse;font-size:13px;}
.cml-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.cml-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.cml-rule{font:12px/1.4 ui-monospace,monospace;}
.cml-lv-error{color:#dc2626;font-weight:600;}
.cml-lv-warn{color:#ca8a04;font-weight:600;}
.cml-lv-off{color:var(--fg-2,#888);}
.cml-cond-always{font-size:11px;color:var(--fg-2,#888);}
.cml-cond-never{font-size:11px;color:#dc2626;}
`;

const LEVEL_LABELS = ['off', 'warn', 'error'];

function levelLabel(l) {
  const n = Number(l);
  if (n === 2) return '<span class="cml-lv-error">error</span>';
  if (n === 1) return '<span class="cml-lv-warn">warn</span>';
  return '<span class="cml-lv-off">off</span>';
}

export function render(intake) {
  let cfg;
  try { cfg = JSON.parse(intake.text || '{}'); } catch {
    const host = document.createElement('div');
    host.className = 'cml-doc';
    host.innerHTML = `<style>${CSS}</style><div class="cml-title"><span class="badge-cml">commitlint</span>Invalid JSON</div>`;
    return { parentNode: host };
  }

  const extendsArr = Array.isArray(cfg.extends) ? cfg.extends : cfg.extends ? [cfg.extends] : [];
  const plugins = Array.isArray(cfg.plugins) ? cfg.plugins : [];
  const rules = cfg.rules || {};
  const ruleKeys = Object.keys(rules);
  const parserPreset = cfg.parserPreset;
  const formatter = cfg.formatter;
  const ignores = Array.isArray(cfg.ignores) ? cfg.ignores : [];

  // Sort by severity descending
  const sevOf = (r) => { const v = rules[r]; return Array.isArray(v) ? Number(v[0]) : Number(v); };
  const sortedRules = ruleKeys.sort((a, b) => sevOf(b) - sevOf(a));
  const shownRules = sortedRules.slice(0, 20);

  const ruleRows = shownRules.map((k) => {
    const val = rules[k];
    const [level, condition, value] = Array.isArray(val) ? val : [val, undefined, undefined];
    const condHtml = condition === 'never'
      ? `<span class="cml-cond-never">never</span>`
      : condition === 'always' ? `<span class="cml-cond-always">always</span>` : '';
    const valStr = value != null ? (Array.isArray(value) ? value.slice(0, 5).map(String).join(', ') : String(value)) : '';
    return `<tr>
      <td><span class="cml-rule">${esc(k)}</span></td>
      <td>${levelLabel(level)}</td>
      <td>${condHtml}</td>
      <td style="font-size:11px;color:var(--fg-2,#888);font-family:ui-monospace,monospace;">${esc(valStr.slice(0, 40))}</td>
    </tr>`;
  }).join('');

  const extendsHtml = extendsArr.length ? `<div class="cml-sec"><h3>Extends</h3><div class="cml-chip-list">${extendsArr.map((e) => `<span class="cml-chip">${esc(e)}</span>`).join('')}</div></div>` : '';
  const pluginsHtml = plugins.length ? `<div class="cml-sec"><h3>Plugins</h3><div class="cml-chip-list">${plugins.map((p) => `<span class="cml-chip">${esc(p)}</span>`).join('')}</div></div>` : '';
  const parserHtml = parserPreset ? `<div style="font-size:12px;color:var(--fg-2,#888);margin-bottom:8px;">Parser preset: <span style="font-family:ui-monospace,monospace;">${esc(parserPreset)}</span></div>` : '';

  const host = document.createElement('div');
  host.className = 'cml-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="cml-title"><span class="badge-cml">commitlint</span>commitlint config</div>
<div class="cml-sub">${ruleKeys.length} rule${ruleKeys.length !== 1 ? 's' : ''}${extendsArr.length ? ` · extends ${extendsArr.length}` : ''}${plugins.length ? ` · ${plugins.length} plugin${plugins.length !== 1 ? 's' : ''}` : ''}</div>
${parserHtml}
${extendsHtml}
${pluginsHtml}
${shownRules.length ? `<div class="cml-sec"><h3>Rules${sortedRules.length > 20 ? ` (top 20 of ${sortedRules.length})` : ''}</h3>
  <table class="cml-table">
    <thead><tr><th>Rule</th><th>Level</th><th>Condition</th><th>Value</th></tr></thead>
    <tbody>${ruleRows}</tbody>
  </table>
</div>` : ''}`;

  return { parentNode: host };
}
