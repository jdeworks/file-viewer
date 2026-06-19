import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rbc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-rbc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#CC342D;color:#fff;vertical-align:middle;margin-right:8px;}
.rbc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.rbc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.rbc-sec{margin:12px 0;}
.rbc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.rbc-pills{display:flex;flex-wrap:wrap;gap:6px;}
.rbc-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.rbc-pill.cat{background:#fff1f0;border-color:#fca5a5;color:#991b1b;}
.rbc-pill.on{background:#f0fdf4;border-color:#86efac;color:#166534;}
.rbc-kv{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:12px;margin:4px 0;}
.rbc-kv dt{font-weight:600;white-space:nowrap;}
.rbc-kv dd{margin:0;color:var(--fg-2,#555);}
`;

const KNOWN_CATEGORIES = ['Layout', 'Lint', 'Metrics', 'Migration', 'Naming', 'Performance', 'Security', 'Style', 'Bundler', 'Gemspec', 'Rails', 'RSpec'];

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = jsyaml.load(intake.text || '') || {};
  } catch { cfg = {}; }

  const allCops = cfg.AllCops || {};
  const targetVersion = allCops.TargetRubyVersion;
  const disabledByDefault = allCops.DisabledByDefault;
  const newCops = allCops.NewCops;
  const inheritFrom = cfg.inherit_from;

  const topLevelKeys = Object.keys(cfg).filter((k) => k !== 'AllCops' && k !== 'inherit_from' && k !== 'inherit_gem');
  const categories = KNOWN_CATEGORIES.filter((cat) => topLevelKeys.some((k) => k.startsWith(cat + '/')));
  const uncategorized = topLevelKeys.filter((k) => !KNOWN_CATEGORIES.some((cat) => k.startsWith(cat + '/')));

  const allCopsHtml = (targetVersion || disabledByDefault != null || newCops != null)
    ? `<div class="rbc-sec"><h3>AllCops Settings</h3><dl class="rbc-kv">
        ${targetVersion != null ? `<dt>TargetRubyVersion</dt><dd>${esc(targetVersion)}</dd>` : ''}
        ${disabledByDefault != null ? `<dt>DisabledByDefault</dt><dd>${esc(String(disabledByDefault))}</dd>` : ''}
        ${newCops != null ? `<dt>NewCops</dt><dd>${esc(String(newCops))}</dd>` : ''}
      </dl></div>`
    : '';

  const inheritHtml = inheritFrom
    ? `<div class="rbc-sec"><h3>Inherits From</h3><div class="rbc-pills">${(Array.isArray(inheritFrom) ? inheritFrom : [inheritFrom]).map((f) => `<span class="rbc-pill">${esc(f)}</span>`).join('')}</div></div>`
    : '';

  const catHtml = categories.length
    ? `<div class="rbc-sec"><h3>Configured Cop Categories</h3><div class="rbc-pills">${categories.map((c) => `<span class="rbc-pill cat">${esc(c)}</span>`).join('')}</div></div>`
    : '';

  const copCount = topLevelKeys.length;
  const copHtml = copCount > 0
    ? `<div class="rbc-sec"><h3>Configured Cops (${copCount})</h3><div class="rbc-pills">${topLevelKeys.slice(0, 16).map((k) => `<span class="rbc-pill on">${esc(k)}</span>`).join('')}${copCount > 16 ? `<span class="rbc-pill" style="color:var(--fg-2,#888)">+${copCount - 16} more</span>` : ''}</div></div>`
    : '';

  const sub = [targetVersion ? `Ruby ${targetVersion}` : '', copCount ? `${copCount} cop${copCount !== 1 ? 's' : ''} configured` : ''].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'rbc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="rbc-title"><span class="badge-rbc">RuboCop</span>Linter config</div>
<div class="rbc-sub">${esc(sub)}</div>
${allCopsHtml}${inheritHtml}${catHtml}${copHtml}`;
  return { parentNode: host };
}
