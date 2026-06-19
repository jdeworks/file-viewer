import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.yml-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-yml{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#E6C200;color:#1c1917;vertical-align:middle;margin-right:8px;}
.yml-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.yml-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.yml-sec{margin:12px 0;}
.yml-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.yml-kv{display:grid;grid-template-columns:auto 1fr;gap:4px 14px;font-size:12px;margin:4px 0;}
.yml-kv dt{font-weight:600;white-space:nowrap;color:var(--fg,#24292f);}
.yml-kv dd{margin:0;color:var(--fg-2,#555);font-family:ui-monospace,monospace;}
.yml-pills{display:flex;flex-wrap:wrap;gap:6px;}
.yml-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.yml-strict{display:inline-block;padding:2px 8px;border-radius:8px;font-size:11px;font-weight:600;}
.yml-strict-yes{background:#fee2e2;border:1px solid #fca5a5;color:#991b1b;}
.yml-strict-no{background:#dcfce7;border:1px solid #86efac;color:#166534;}
.yml-strict-mid{background:#fef9c3;border:1px solid #fde047;color:#713f12;}
`;

function getRuleValue(rule, key) {
  if (!rule || rule === 'disable' || rule === 'enable') return null;
  if (typeof rule === 'object') return rule[key] ?? null;
  return null;
}

function ruleEnabled(rule) {
  if (rule === 'disable') return false;
  if (rule === 'enable') return true;
  if (rule && typeof rule === 'object') return rule.level !== 'disable';
  return rule != null;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = jsyaml.load(intake.text || '') || {};
  } catch { cfg = {}; }

  const ext = cfg.extends || '';
  const rules = cfg.rules && typeof cfg.rules === 'object' ? cfg.rules : {};
  const ruleKeys = Object.keys(rules);

  // Key rule details
  const lineLength = rules['line-length'];
  const lineLengthMax = getRuleValue(lineLength, 'max');
  const indentation = rules['indentation'];
  const indentSpaces = getRuleValue(indentation, 'spaces');
  const truthy = rules['truthy'];
  const truthyAllowed = getRuleValue(truthy, 'allowed-values');

  // Strictness heuristic
  let strictness = 'moderate';
  if (ext === 'relaxed') strictness = 'permissive';
  else if (ext === 'default') {
    const disabledCount = ruleKeys.filter((k) => !ruleEnabled(rules[k])).length;
    const enabledCount = ruleKeys.filter((k) => ruleEnabled(rules[k])).length;
    if (disabledCount > enabledCount) strictness = 'permissive';
    else if (enabledCount > 3) strictness = 'strict';
  } else if (!ext) {
    strictness = ruleKeys.length > 5 ? 'strict' : 'moderate';
  }

  const subParts = [];
  if (ext) subParts.push(`extends: ${ext}`);
  subParts.push(`${ruleKeys.length} rule${ruleKeys.length !== 1 ? 's' : ''}`);

  const strictLabel = strictness === 'strict' ? 'Strict' : strictness === 'permissive' ? 'Permissive' : 'Moderate';
  const strictClass = strictness === 'strict' ? 'yml-strict-yes' : strictness === 'permissive' ? 'yml-strict-no' : 'yml-strict-mid';

  const baseHtml = `<div class="yml-sec"><h3>Base Config</h3><dl class="yml-kv">
    ${ext ? `<dt>Extends</dt><dd>${esc(ext)}</dd>` : '<dt>Extends</dt><dd>(none)</dd>'}
    <dt>Rules defined</dt><dd>${ruleKeys.length}</dd>
    <dt>Strictness</dt><dd><span class="yml-strict ${strictClass}">${strictLabel}</span></dd>
  </dl></div>`;

  const keyRulesHtml = (lineLengthMax != null || indentSpaces != null || truthy != null)
    ? `<div class="yml-sec"><h3>Key Rules</h3><dl class="yml-kv">
      ${lineLengthMax != null ? `<dt>Line length max</dt><dd>${esc(lineLengthMax)}</dd>` : ''}
      ${indentSpaces != null ? `<dt>Indent spaces</dt><dd>${esc(indentSpaces)}</dd>` : ''}
      ${truthyAllowed != null ? `<dt>Truthy values</dt><dd>${esc(Array.isArray(truthyAllowed) ? truthyAllowed.join(', ') : truthyAllowed)}</dd>` : truthy ? `<dt>Truthy</dt><dd>${ruleEnabled(truthy) ? 'enabled' : 'disabled'}</dd>` : ''}
    </dl></div>`
    : '';

  const allRulesHtml = ruleKeys.length
    ? `<div class="yml-sec"><h3>All Rules (${ruleKeys.length})</h3><div class="yml-pills">${ruleKeys.map((k) => `<span class="yml-pill">${esc(k)}</span>`).join('')}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'yml-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="yml-title"><span class="badge-yml">yamllint</span>YAML lint config</div>
<div class="yml-sub">${esc(subParts.join(' · '))}</div>
${baseHtml}${keyRulesHtml}${allRulesHtml}`;
  return { parentNode: host };
}
