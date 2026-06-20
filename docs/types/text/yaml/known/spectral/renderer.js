import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.spc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-spc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1A56DB;color:#fff;vertical-align:middle;margin-right:8px}
.spc-title{font-size:18px;font-weight:700;margin:0 0 4px}
.spc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px}
.spc-sec{margin:12px 0}
.spc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px}
.spc-pills{display:flex;flex-wrap:wrap;gap:6px}
.spc-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.spc-pill-off{background:#fee2e2;border-color:#fca5a5;color:#991b1b}
.spc-pill-warn{background:#fef9c3;border-color:#fde047;color:#713f12}
.spc-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0}
.spc-kv-k{font-size:12px;color:var(--fg-2,#888);min-width:130px}
.spc-kv-v{font-size:13px;font-family:ui-monospace,monospace}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || \'\') || [])[0] || {};
  } catch { cfg = {}; }

  // extends — can be a string, array, or array of [preset, severity]
  const rawExtends = cfg.extends;
  const extendsList = [];
  if (typeof rawExtends === 'string') {
    extendsList.push(rawExtends);
  } else if (Array.isArray(rawExtends)) {
    for (const item of rawExtends) {
      if (typeof item === 'string') extendsList.push(item);
      else if (Array.isArray(item)) extendsList.push(item[0]);
    }
  }

  // rules
  const rulesObj = cfg.rules || {};
  const ruleNames = Object.keys(rulesObj);
  const disabledRules = ruleNames.filter((r) => rulesObj[r] === 'off' || rulesObj[r]?.severity === 'off');
  const warnRules = ruleNames.filter((r) => rulesObj[r] === 'warn' || rulesObj[r]?.severity === 'warn');

  // aliases and functions
  const aliasCount = Object.keys(cfg.aliases || {}).length;
  const functionCount = Object.keys(cfg.functions || {}).length;

  // formats — infer from extends
  const formats = [];
  if (extendsList.some((e) => /oas|openapi/i.test(e))) formats.push('OpenAPI');
  if (extendsList.some((e) => /asyncapi/i.test(e))) formats.push('AsyncAPI');
  if (extendsList.some((e) => /aas/i.test(e))) formats.push('AAS');

  const parts = [];
  if (extendsList.length) parts.push(`extends ${extendsList.length} ruleset${extendsList.length !== 1 ? 's' : ''}`);
  if (ruleNames.length) parts.push(`${ruleNames.length} rule${ruleNames.length !== 1 ? 's' : ''}`);
  if (formats.length) parts.push(formats.join(', '));

  const extendsHtml = extendsList.length
    ? `<div class="spc-sec"><h3>Extends (${extendsList.length})</h3><div class="spc-pills">${extendsList.map((e) => `<span class="spc-pill">${esc(e)}</span>`).join('')}</div></div>`
    : '';

  const rulesHtml = ruleNames.length
    ? `<div class="spc-sec"><h3>Rules (${ruleNames.length})</h3><div class="spc-pills">
        ${ruleNames.filter((r) => !disabledRules.includes(r) && !warnRules.includes(r)).slice(0, 12).map((r) => `<span class="spc-pill">${esc(r)}</span>`).join('')}
        ${ruleNames.filter((r) => !disabledRules.includes(r) && !warnRules.includes(r)).length > 12 ? `<span class="spc-pill">+${ruleNames.filter((r) => !disabledRules.includes(r) && !warnRules.includes(r)).length - 12} more</span>` : ''}
        ${warnRules.map((r) => `<span class="spc-pill spc-pill-warn">${esc(r)}</span>`).join('')}
        ${disabledRules.map((r) => `<span class="spc-pill spc-pill-off">${esc(r)}</span>`).join('')}
      </div></div>`
    : '';

  const metaHtml = (aliasCount || functionCount || formats.length)
    ? `<div class="spc-sec"><h3>Details</h3>
        ${formats.length ? `<div class="spc-kv"><span class="spc-kv-k">Formats</span><span class="spc-kv-v">${formats.map(esc).join(', ')}</span></div>` : ''}
        ${aliasCount ? `<div class="spc-kv"><span class="spc-kv-k">Aliases</span><span class="spc-kv-v">${aliasCount}</span></div>` : ''}
        ${functionCount ? `<div class="spc-kv"><span class="spc-kv-k">Custom functions</span><span class="spc-kv-v">${functionCount}</span></div>` : ''}
      </div>`
    : '';

  const host = document.createElement('div');
  host.className = 'spc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="spc-title"><span class="badge-spc">Spectral</span>.spectral.yml</div>
<div class="spc-sub">${parts.length ? parts.join(' · ') : 'API linter config'}</div>
${extendsHtml}${rulesHtml}${metaHtml}`;
  return { parentNode: host };
}
