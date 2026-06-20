const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.eslint-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-eslint{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#4b32c3;color:#fff;vertical-align:middle;margin-right:8px;}
.eslint-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.eslint-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.eslint-sec{margin:12px 0;}
.eslint-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.eslint-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 3px 1px 0;}
.eslint-chip-list{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0;}
.eslint-table{width:100%;border-collapse:collapse;font-size:13px;}
.eslint-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.eslint-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.eslint-rule{font:12px/1.4 ui-monospace,monospace;}
.eslint-sev-error{color:#dc2626;font-weight:600;}
.eslint-sev-warn{color:#ca8a04;font-weight:600;}
.eslint-sev-off{color:var(--fg-2,#888);}
`;

function sevLabel(v) {
  if (v === 'error' || v === 2) return '<span class="eslint-sev-error">error</span>';
  if (v === 'warn' || v === 1) return '<span class="eslint-sev-warn">warn</span>';
  return '<span class="eslint-sev-off">off</span>';
}

function sevFromRule(val) {
  if (Array.isArray(val)) return val[0];
  return val;
}

export function render(intake) {
  let cfg;
  try { cfg = JSON.parse(intake.text || '{}'); } catch {
    const host = document.createElement('div');
    host.className = 'eslint-doc';
    host.innerHTML = `<style>${CSS}</style><div class="eslint-title"><span class="badge-eslint">ESLint</span>Invalid JSON</div>`;
    return { parentNode: host };
  }

  const parser = cfg.parser || (cfg.languageOptions && cfg.languageOptions.parser) || null;
  const extendsArr = Array.isArray(cfg.extends) ? cfg.extends : cfg.extends ? [cfg.extends] : [];
  const plugins = Array.isArray(cfg.plugins) ? cfg.plugins : cfg.plugins ? Object.keys(cfg.plugins) : [];
  const rules = cfg.rules || {};
  const ruleKeys = Object.keys(rules);
  const overrides = Array.isArray(cfg.overrides) ? cfg.overrides : [];
  const env = cfg.env || {};
  const envNames = Object.keys(env).filter((k) => env[k]);

  // Sort rules by severity: errors first, then warns, then off
  const sevOrder = (v) => { const s = sevFromRule(v); return s === 'error' || s === 2 ? 0 : s === 'warn' || s === 1 ? 1 : 2; };
  const sortedRules = ruleKeys.sort((a, b) => sevOrder(rules[a]) - sevOrder(rules[b]));
  const shownRules = sortedRules.slice(0, 20);

  const ruleRows = shownRules.map((k) => {
    const val = rules[k];
    const sev = sevFromRule(val);
    const opts = Array.isArray(val) && val.length > 1 ? JSON.stringify(val[1]).slice(0, 40) : '';
    return `<tr>
      <td><span class="eslint-rule">${esc(k)}</span></td>
      <td>${sevLabel(sev)}</td>
      <td style="font-size:11px;color:var(--fg-2,#888);font-family:ui-monospace,monospace;">${esc(opts)}</td>
    </tr>`;
  }).join('');

  const extendsHtml = extendsArr.length ? `<div class="eslint-sec"><h3>Extends</h3><div class="eslint-chip-list">${extendsArr.map((e) => `<span class="eslint-chip">${esc(e)}</span>`).join('')}</div></div>` : '';
  const pluginsHtml = plugins.length ? `<div class="eslint-sec"><h3>Plugins</h3><div class="eslint-chip-list">${plugins.map((p) => `<span class="eslint-chip">${esc(p)}</span>`).join('')}</div></div>` : '';
  const envHtml = envNames.length ? `<div class="eslint-sec"><h3>Environments</h3><div class="eslint-chip-list">${envNames.map((e) => `<span class="eslint-chip">${esc(e)}</span>`).join('')}</div></div>` : '';
  const parserHtml = parser ? `<div style="font-size:12px;color:var(--fg-2,#888);margin-bottom:10px;">Parser: <span style="font-family:ui-monospace,monospace;">${esc(parser)}</span></div>` : '';

  const host = document.createElement('div');
  host.className = 'eslint-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="eslint-title"><span class="badge-eslint">ESLint</span>ESLint config</div>
<div class="eslint-sub">${ruleKeys.length} rule${ruleKeys.length !== 1 ? 's' : ''}${plugins.length ? ` · ${plugins.length} plugin${plugins.length !== 1 ? 's' : ''}` : ''}${overrides.length ? ` · ${overrides.length} override${overrides.length !== 1 ? 's' : ''}` : ''}</div>
${parserHtml}
${extendsHtml}
${pluginsHtml}
${envHtml}
${shownRules.length ? `<div class="eslint-sec"><h3>Rules${sortedRules.length > 20 ? ` (top 20 of ${sortedRules.length})` : ''}</h3>
  <table class="eslint-table">
    <thead><tr><th>Rule</th><th>Severity</th><th>Options</th></tr></thead>
    <tbody>${ruleRows}</tbody>
  </table>
</div>` : ''}`;

  return { parentNode: host };
}
