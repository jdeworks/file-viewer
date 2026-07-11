import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
import { describeCollectionCap } from '../../../../../core/collection-cap.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.clangtidy-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.clangtidy-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#0066CC;color:#fff;vertical-align:middle;margin-right:8px;}
.clangtidy-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.clangtidy-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.clangtidy-sec{margin:12px 0;}
.clangtidy-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.clangtidy-checks-row{display:flex;gap:12px;margin:0 0 8px;flex-wrap:wrap;}
.clangtidy-count{display:flex;flex-direction:column;align-items:center;padding:8px 16px;border-radius:8px;border:1px solid var(--border,#e0e0e0);background:var(--bg-2,#f6f8fa);min-width:80px;}
.clangtidy-count-num{font-size:22px;font-weight:700;}
.clangtidy-count-label{font-size:11px;color:var(--fg-2,#888);}
.clangtidy-count.enabled{border-color:#86efac;background:#f0fdf4;color:#166534;}
.clangtidy-count.enabled .clangtidy-count-num{color:#166534;}
.clangtidy-count.disabled{border-color:#fca5a5;background:#fef2f2;color:#991b1b;}
.clangtidy-count.disabled .clangtidy-count-num{color:#991b1b;}
.clangtidy-tags{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0;}
.clangtidy-tag{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;background:#dbeafe;color:#1d4ed8;border:1px solid #93c5fd;}
.clangtidy-kv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:6px;margin:4px 0;}
.clangtidy-kv-item{display:flex;align-items:center;gap:6px;font-size:12px;padding:4px 8px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);}
.clangtidy-kv-key{color:var(--fg-2,#888);font-family:ui-monospace,monospace;word-break:break-all;}
.clangtidy-kv-val{font-family:ui-monospace,monospace;font-weight:600;color:var(--fg,#24292f);margin-left:auto;white-space:nowrap;}
.clangtidy-warn-error{display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;background:#fef9c3;color:#854d0e;border:1px solid #fde047;}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const filename = (intake.name || intake.filename || '').split('/').pop() || '.clang-tidy';

  // Parse checks string
  const checksStr = String(cfg.Checks || '');
  const rawChecks = checksStr.split(',').map((s) => s.trim()).filter(Boolean);
  const enabledChecks = rawChecks.filter((c) => !c.startsWith('-'));
  const disabledChecks = rawChecks.filter((c) => c.startsWith('-'));

  // Extract categories from enabled checks (e.g. "modernize-*" → "modernize")
  const categorySet = new Set();
  for (const c of enabledChecks) {
    const m = c.match(/^([a-z][a-z0-9-]*?)[-*]/);
    if (m) categorySet.add(m[1]);
  }
  const allCategories = [...categorySet];
  const categories = allCategories.slice(0, 10);
  const categoryCap = describeCollectionCap(allCategories, categories);

  const checksCountHtml = checksStr
    ? `<div class="clangtidy-checks-row">
        <div class="clangtidy-count enabled"><span class="clangtidy-count-num">${enabledChecks.length}</span><span class="clangtidy-count-label">enabled</span></div>
        <div class="clangtidy-count disabled"><span class="clangtidy-count-num">${disabledChecks.length}</span><span class="clangtidy-count-label">disabled</span></div>
      </div>`
    : '';

  const categoriesHtml = categories.length
    ? `<div class="clangtidy-sec"><h3>Check Categories (${categoryCap.label})</h3><div class="clangtidy-tags">${categories.map((c) => `<span class="clangtidy-tag">${esc(c)}</span>`).join('')}</div></div>`
    : '';

  const checksSecHtml = checksStr
    ? `<div class="clangtidy-sec"><h3>Checks</h3>${checksCountHtml}</div>`
    : '';

  // WarningsAsErrors
  const waeVal = cfg.WarningsAsErrors != null ? String(cfg.WarningsAsErrors) : null;
  const waeHtml = waeVal
    ? `<div class="clangtidy-sec"><h3>Warnings as Errors</h3><span class="clangtidy-warn-error">${esc(waeVal)}</span></div>`
    : '';

  // HeaderFileExtensions
  const hfeVal = cfg.HeaderFileExtensions;
  const hfeHtml = hfeVal
    ? `<div class="clangtidy-sec"><h3>Header File Extensions</h3><div class="clangtidy-tags">${[].concat(hfeVal).map((e) => `<span class="clangtidy-tag">${esc(e)}</span>`).join('')}</div></div>`
    : '';

  // CheckOptions key-value pairs (up to 10)
  const checkOpts = Array.isArray(cfg.CheckOptions) ? cfg.CheckOptions : [];
  const shownCheckOpts = checkOpts
    .slice(0, 10);
  const checkOptionCap = describeCollectionCap(checkOpts, shownCheckOpts);
  const checkOptsHtml = shownCheckOpts.length
    ? `<div class="clangtidy-sec"><h3>Check Options (${checkOptionCap.label})</h3><div class="clangtidy-kv-grid">${shownCheckOpts.map((opt) => {
        const key = esc(opt.key || opt.Key || '');
        const val = esc(String(opt.value ?? opt.Value ?? ''));
        return `<div class="clangtidy-kv-item"><span class="clangtidy-kv-key">${key}</span><span class="clangtidy-kv-val">${val}</span></div>`;
      }).join('')}</div></div>`
    : '';

  const sub = [
    enabledChecks.length ? `${enabledChecks.length} check${enabledChecks.length !== 1 ? 's' : ''} enabled` : '',
    disabledChecks.length ? `${disabledChecks.length} disabled` : '',
    allCategories.length ? `families: ${allCategories.slice(0, 4).join(', ')}${allCategories.length > 4 ? '…' : ''}` : '',
  ].filter(Boolean).join(' · ') || 'clang-tidy linter config';

  const host = document.createElement('div');
  host.className = 'clangtidy-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="clangtidy-title"><span class="clangtidy-badge">clang-tidy</span>${esc(filename)}</div>
<div class="clangtidy-sub">${sub}</div>
${checksSecHtml}
${categoriesHtml}
${waeHtml}
${hfeHtml}
${checkOptsHtml}`;

  return { parentNode: host };
}
