import jsYaml from '../../../../vendor/js-yaml/js-yaml.min.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ao-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-ao{display:inline-block;background:#0175C2;color:#fff;padding:2px 9px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.04em;margin-bottom:10px;}
.ao-title{font-size:18px;font-weight:700;margin:0 0 12px;}
.ao-sec{margin:12px 0;}
.ao-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.ao-chips{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0;}
.ao-chip{display:inline-block;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#d1d9e0);border-radius:4px;padding:2px 8px;font:12px ui-monospace,monospace;}
.ao-chip.ao-on{background:#e3f2fd;border-color:#90caf9;color:#0d47a1;}
.ao-chip.ao-off{background:var(--bg-2,#f6f8fa);color:var(--fg-2,#888);text-decoration:line-through;}
.ao-table{width:100%;border-collapse:collapse;font-size:12px;}
.ao-table th{text-align:left;font-weight:600;padding:4px 8px;border-bottom:2px solid var(--border,#e0e0e0);}
.ao-table td{padding:3px 8px;border-bottom:1px solid var(--border,#e0e0e0);font:12px ui-monospace,monospace;}
.ao-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;margin:4px 0;}
.ao-k{font-size:12px;color:var(--fg-2,#888);}
.ao-v{font:12px ui-monospace,monospace;}
.ao-note{color:var(--fg-2,#888);font-style:italic;font-size:12px;}
`;

export function render(intake) {
  let cfg = {};
  try { cfg = jsYaml.load(intake.text || '') || {}; } catch { cfg = {}; }

  const analyzer = cfg.analyzer || {};
  const linter = cfg.linter || {};
  const rules = linter.rules || {};
  const errors = analyzer.errors || {};
  const exclude = Array.isArray(analyzer.exclude) ? analyzer.exclude : [];
  const strongMode = analyzer['strong-mode'];
  const include = cfg.include || null;

  // Rules can be array of strings or object with true/false
  let ruleList = [];
  if (Array.isArray(rules)) {
    for (const r of rules) {
      if (typeof r === 'string') ruleList.push({ name: r, enabled: true });
      else if (typeof r === 'object') {
        for (const [k, v] of Object.entries(r)) ruleList.push({ name: k, enabled: v !== false });
      }
    }
  } else if (typeof rules === 'object') {
    for (const [k, v] of Object.entries(rules)) ruleList.push({ name: k, enabled: v !== false });
  }

  const enabledRules = ruleList.filter((r) => r.enabled);
  const disabledRules = ruleList.filter((r) => !r.enabled);

  const errorRows = Object.entries(errors)
    .map(([code, severity]) => `<tr><td>${esc(code)}</td><td>${esc(severity)}</td></tr>`)
    .join('');

  const host = document.createElement('div');
  host.className = 'ao-doc';
  host.innerHTML = `<style>${CSS}</style>
<span class="badge-ao">Dart Analyzer</span>
<div class="ao-title">analysis_options.yaml</div>
${include ? `<div class="ao-sec"><div class="ao-kv"><span class="ao-k">Includes</span><span class="ao-v">${esc(include)}</span></div></div>` : ''}
${strongMode != null ? `<div class="ao-sec"><div class="ao-kv"><span class="ao-k">strong-mode</span><span class="ao-v">${esc(String(strongMode))}</span></div></div>` : ''}
${exclude.length ? `<div class="ao-sec"><h3>Excluded paths (${exclude.length})</h3><div class="ao-chips">${exclude.map((p) => `<span class="ao-chip">${esc(p)}</span>`).join('')}</div></div>` : ''}
${enabledRules.length ? `<div class="ao-sec"><h3>Enabled rules (${enabledRules.length})</h3><div class="ao-chips">${enabledRules.map((r) => `<span class="ao-chip ao-on">${esc(r.name)}</span>`).join('')}</div></div>` : ''}
${disabledRules.length ? `<div class="ao-sec"><h3>Disabled rules (${disabledRules.length})</h3><div class="ao-chips">${disabledRules.map((r) => `<span class="ao-chip ao-off">${esc(r.name)}</span>`).join('')}</div></div>` : ''}
${errorRows ? `<div class="ao-sec"><h3>Error overrides</h3><table class="ao-table"><thead><tr><th>Code</th><th>Severity</th></tr></thead><tbody>${errorRows}</tbody></table></div>` : ''}
${!ruleList.length && !exclude.length && !errorRows ? `<p class="ao-note">No analyzer rules or overrides configured.</p>` : ''}`;

  return { parentNode: host };
}
