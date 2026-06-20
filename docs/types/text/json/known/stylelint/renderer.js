const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.stylelint-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.stylelint-doc .badge-stl{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#263238;color:#fff;vertical-align:middle;margin-right:8px;}
.stylelint-doc .stl-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.stylelint-doc .stl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.stylelint-doc .stl-sec{margin:12px 0;}
.stylelint-doc .stl-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.stylelint-doc .stl-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 3px 1px 0;}
.stylelint-doc .stl-chip-list{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0;}
.stylelint-doc .stl-table{width:100%;border-collapse:collapse;font-size:13px;}
.stylelint-doc .stl-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.stylelint-doc .stl-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.stylelint-doc .stl-rule{font:12px/1.4 ui-monospace,monospace;}
.stylelint-doc .stl-sev-error{color:#dc2626;font-weight:600;}
.stylelint-doc .stl-sev-warn{color:#ca8a04;font-weight:600;}
.stylelint-doc .stl-sev-null{color:var(--fg-2,#888);}
`;

function sevLabel(v) {
  if (v === 'error' || v === 2) return '<span class="stl-sev-error">error</span>';
  if (v === 'warn' || v === 1) return '<span class="stl-sev-warn">warn</span>';
  if (v === null || v === 'null') return '<span class="stl-sev-null">null</span>';
  return `<span class="stl-sev-error">${esc(v)}</span>`;
}

function sevFromRule(val) {
  if (Array.isArray(val)) return val[0];
  return val;
}

export function render(intake) {
  let cfg;
  try { cfg = intake.parsed ?? JSON.parse(intake.text || '{}'); } catch {
    const host = document.createElement('div');
    host.className = 'stylelint-doc';
    host.innerHTML = `<style>${CSS}</style><div class="stl-title"><span class="badge-stl">Stylelint</span>Invalid JSON</div>`;
    return { parentNode: host };
  }

  const extendsArr = Array.isArray(cfg.extends) ? cfg.extends : cfg.extends ? [cfg.extends] : [];
  const plugins = Array.isArray(cfg.plugins) ? cfg.plugins : [];
  const rules = cfg.rules || {};
  const ruleKeys = Object.keys(rules);
  const overrides = Array.isArray(cfg.overrides) ? cfg.overrides : [];
  const ignoreFiles = Array.isArray(cfg.ignoreFiles) ? cfg.ignoreFiles : cfg.ignoreFiles ? [cfg.ignoreFiles] : [];

  const sevOrder = (v) => { const s = sevFromRule(v); return s === null ? 3 : s === 'error' || s === 2 ? 0 : s === 'warn' || s === 1 ? 1 : 2; };
  const sortedRules = ruleKeys.sort((a, b) => sevOrder(rules[a]) - sevOrder(rules[b]));
  const shownRules = sortedRules.slice(0, 20);

  const ruleRows = shownRules.map((k) => {
    const val = rules[k];
    const sev = sevFromRule(val);
    return `<tr>
      <td><span class="stl-rule">${esc(k)}</span></td>
      <td>${sevLabel(sev)}</td>
    </tr>`;
  }).join('');

  const extendsHtml = extendsArr.length ? `<div class="stl-sec"><h3>Extends</h3><div class="stl-chip-list">${extendsArr.map((e) => `<span class="stl-chip">${esc(e)}</span>`).join('')}</div></div>` : '';
  const pluginsHtml = plugins.length ? `<div class="stl-sec"><h3>Plugins</h3><div class="stl-chip-list">${plugins.map((p) => `<span class="stl-chip">${esc(p)}</span>`).join('')}</div></div>` : '';
  const ignoreHtml = ignoreFiles.length ? `<div class="stl-sec"><h3>Ignore files</h3><div class="stl-chip-list">${ignoreFiles.map((f) => `<span class="stl-chip">${esc(f)}</span>`).join('')}</div></div>` : '';

  const host = document.createElement('div');
  host.className = 'stylelint-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="stl-title"><span class="badge-stl">Stylelint</span>Stylelint config</div>
<div class="stl-sub">${ruleKeys.length} rule${ruleKeys.length !== 1 ? 's' : ''}${plugins.length ? ` · ${plugins.length} plugin${plugins.length !== 1 ? 's' : ''}` : ''}${overrides.length ? ` · ${overrides.length} override${overrides.length !== 1 ? 's' : ''}` : ''}</div>
${extendsHtml}
${pluginsHtml}
${ignoreHtml}
${shownRules.length ? `<div class="stl-sec"><h3>Rules${sortedRules.length > 20 ? ` (top 20 of ${sortedRules.length})` : ''}</h3>
  <table class="stl-table">
    <thead><tr><th>Rule</th><th>Severity</th></tr></thead>
    <tbody>${ruleRows}</tbody>
  </table>
</div>` : ''}`;

  return { parentNode: host };
}
