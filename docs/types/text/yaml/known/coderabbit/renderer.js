import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.crb-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-crb{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#F97316;color:#fff;vertical-align:middle;margin-right:8px;}
.crb-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.crb-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.crb-sec{margin:12px 0;}
.crb-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.crb-kv{display:grid;grid-template-columns:auto 1fr;gap:4px 14px;font-size:12px;margin:4px 0;}
.crb-kv dt{font-weight:600;white-space:nowrap;color:var(--fg,#24292f);}
.crb-kv dd{margin:0;color:var(--fg-2,#555);font-family:ui-monospace,monospace;}
.crb-pills{display:flex;flex-wrap:wrap;gap:6px;}
.crb-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.crb-pill-tool{background:#fff7ed;border-color:#fdba74;color:#9a3412;}
.crb-on{color:#166534;font-weight:600;}
.crb-off{color:#991b1b;font-weight:600;}
`;

function boolLabel(val) {
  if (val === true) return '<span class="crb-on">enabled</span>';
  if (val === false) return '<span class="crb-off">disabled</span>';
  return '<span style="color:var(--fg-2,#888)">not set</span>';
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = jsyaml.load(intake.text || '') || {};
  } catch { cfg = {}; }

  const reviews = cfg.reviews && typeof cfg.reviews === 'object' ? cfg.reviews : {};
  const autoReview = reviews.auto_review && typeof reviews.auto_review === 'object' ? reviews.auto_review : (typeof reviews.auto_review === 'boolean' ? { enabled: reviews.auto_review } : {});
  const autoReviewEnabled = autoReview.enabled;
  const draftReview = reviews.draft ?? autoReview.drafts ?? null;
  const prDesc = reviews.profile || cfg.auto_review?.auto_title || null;
  const autoDesc = cfg.auto_description ?? reviews.auto_description ?? null;

  const pathFilters = Array.isArray(cfg.path_filters) ? cfg.path_filters
    : Array.isArray(reviews.path_filters) ? reviews.path_filters
    : [];

  const tools = cfg.tools && typeof cfg.tools === 'object' ? cfg.tools : {};
  const toolNames = Object.keys(tools);

  const language = cfg.language || cfg.locale || '';

  const subParts = [];
  if (autoReviewEnabled === true) subParts.push('auto-review on');
  else if (autoReviewEnabled === false) subParts.push('auto-review off');
  if (pathFilters.length) subParts.push(`${pathFilters.length} path filter${pathFilters.length !== 1 ? 's' : ''}`);
  if (toolNames.length) subParts.push(`${toolNames.length} tool${toolNames.length !== 1 ? 's' : ''}`);

  const reviewHtml = `<div class="crb-sec"><h3>Review Settings</h3><dl class="crb-kv">
    <dt>Auto-review</dt><dd>${boolLabel(autoReviewEnabled)}</dd>
    ${draftReview != null ? `<dt>Draft PRs</dt><dd>${boolLabel(draftReview)}</dd>` : ''}
    ${autoDesc != null ? `<dt>Auto-description</dt><dd>${boolLabel(autoDesc)}</dd>` : ''}
    ${language ? `<dt>Language</dt><dd>${esc(language)}</dd>` : ''}
  </dl></div>`;

  const pathFiltersHtml = pathFilters.length
    ? `<div class="crb-sec"><h3>Path Filters (${pathFilters.length})</h3><div class="crb-pills">${pathFilters.slice(0, 8).map((p) => `<span class="crb-pill">${esc(p)}</span>`).join('')}${pathFilters.length > 8 ? `<span class="crb-pill">+${pathFilters.length - 8} more</span>` : ''}</div></div>`
    : '';

  const toolsHtml = toolNames.length
    ? `<div class="crb-sec"><h3>Tools (${toolNames.length})</h3><div class="crb-pills">${toolNames.map((t) => `<span class="crb-pill crb-pill-tool">${esc(t)}</span>`).join('')}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'crb-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="crb-title"><span class="badge-crb">CodeRabbit</span>AI review config</div>
<div class="crb-sub">${esc(subParts.join(' · ') || 'Code review configuration')}</div>
${reviewHtml}${pathFiltersHtml}${toolsHtml}`;
  return { parentNode: host };
}
