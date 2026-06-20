import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.bd-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-bd{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#dc2626;color:#fff;vertical-align:middle;margin-right:8px;}
.bd-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.bd-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.bd-sec{margin:12px 0;}
.bd-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.bd-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.bd-row{display:flex;gap:8px;font-size:13px;padding:3px 0;}
.bd-key{color:var(--fg-2,#888);min-width:160px;flex-shrink:0;font-size:12px;font-family:ui-monospace,monospace;}
.bd-val{font-family:ui-monospace,monospace;word-break:break-all;}
.bd-chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;}
.bd-chip{display:inline-block;font-size:11px;padding:2px 8px;border-radius:8px;background:#fef2f2;border:1px solid #fca5a5;color:#b91c1c;font-family:ui-monospace,monospace;}
.bd-chip.path{background:#f0fdf4;border-color:#86efac;color:#166534;}
.bd-chip.plain{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);color:var(--fg,#24292f);}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || \'\') || [])[0] || {};
  } catch { cfg = {}; }

  // skips — array of test IDs to skip
  const skips = Array.isArray(cfg.skips) ? cfg.skips
    : (cfg.skips ? String(cfg.skips).split(',').map((s) => s.trim()).filter(Boolean) : []);

  // tests — array of test IDs to run
  const tests = Array.isArray(cfg.tests) ? cfg.tests
    : (cfg.tests ? String(cfg.tests).split(',').map((s) => s.trim()).filter(Boolean) : []);

  // exclude_dirs
  const excludeDirs = Array.isArray(cfg.exclude_dirs) ? cfg.exclude_dirs
    : (cfg.exclude_dirs ? [String(cfg.exclude_dirs)] : []);

  // severity / confidence filters
  const severity = cfg.severity || cfg.level || '';
  const confidence = cfg.confidence || '';

  // plugin overrides (blacklist/whitelist keys at top level or under plugins key)
  const plugins = cfg.plugins || {};
  const pluginKeys = Object.keys(plugins);

  // assert_used
  const assertUsed = cfg.assert_used;

  const skipsHtml = skips.length ? `
<div class="bd-sec"><h3>Skipped tests (${skips.length})</h3>
<div class="bd-chips">${skips.slice(0, 30).map((s) => `<span class="bd-chip">${esc(s)}</span>`).join('')}${skips.length > 30 ? `<span class="bd-chip plain">+${skips.length - 30} more</span>` : ''}</div>
</div>` : '';

  const testsHtml = tests.length ? `
<div class="bd-sec"><h3>Enabled tests (${tests.length})</h3>
<div class="bd-chips">${tests.slice(0, 30).map((s) => `<span class="bd-chip plain">${esc(s)}</span>`).join('')}${tests.length > 30 ? `<span class="bd-chip plain">+${tests.length - 30} more</span>` : ''}</div>
</div>` : '';

  const excludeHtml = excludeDirs.length ? `
<div class="bd-sec"><h3>Excluded directories (${excludeDirs.length})</h3>
<div class="bd-chips">${excludeDirs.map((d) => `<span class="bd-chip path">${esc(d)}</span>`).join('')}</div>
</div>` : '';

  const filtersEntries = [
    severity ? `<div class="bd-row"><span class="bd-key">severity_filter</span><span class="bd-val">${esc(severity)}</span></div>` : '',
    confidence ? `<div class="bd-row"><span class="bd-key">confidence_filter</span><span class="bd-val">${esc(confidence)}</span></div>` : '',
    assertUsed != null ? `<div class="bd-row"><span class="bd-key">assert_used</span><span class="bd-val">${esc(JSON.stringify(assertUsed))}</span></div>` : '',
  ].filter(Boolean);
  const filtersHtml = filtersEntries.length ? `
<div class="bd-sec"><h3>Filters</h3><div class="bd-card">${filtersEntries.join('')}</div></div>` : '';

  const pluginsHtml = pluginKeys.length ? `
<div class="bd-sec"><h3>Plugin overrides (${pluginKeys.length})</h3><div class="bd-card">
${pluginKeys.map((k) => {
    const v = plugins[k];
    return `<div class="bd-row"><span class="bd-key">${esc(k)}</span><span class="bd-val">${esc(typeof v === 'object' ? JSON.stringify(v) : String(v))}</span></div>`;
  }).join('')}
</div></div>` : '';

  const subParts = [];
  if (skips.length) subParts.push(`${skips.length} skip${skips.length !== 1 ? 's' : ''}`);
  if (tests.length) subParts.push(`${tests.length} test${tests.length !== 1 ? 's' : ''}`);
  if (excludeDirs.length) subParts.push(`${excludeDirs.length} excluded dir${excludeDirs.length !== 1 ? 's' : ''}`);
  if (severity) subParts.push(`severity: ${severity}`);
  if (confidence) subParts.push(`confidence: ${confidence}`);
  const sub = subParts.join(' · ') || 'Bandit security linter configuration';

  const host = document.createElement('div');
  host.className = 'bd-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="bd-title"><span class="badge-bd">Bandit</span>Bandit Security Configuration</div>
<div class="bd-sub">${esc(sub)}</div>
${filtersHtml}${skipsHtml}${testsHtml}${excludeHtml}${pluginsHtml}`;
  return { parentNode: host };
}
