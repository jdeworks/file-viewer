import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.dashy-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-dashy{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00aff0;color:#fff;vertical-align:middle;margin-right:8px;}
.dashy-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.dashy-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.dashy-sec{margin:14px 0;}
.dashy-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.dashy-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:6px 0;background:var(--bg,#fff);}
.dashy-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.dashy-kv-k{color:var(--fg-2,#888);min-width:130px;flex-shrink:0;}
.dashy-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.dashy-section-name{font-size:13px;font-weight:700;margin-bottom:4px;}
.dashy-section-count{font-size:11px;color:var(--fg-2,#888);margin-left:6px;font-weight:normal;}
.dashy-item{font-size:12px;padding:3px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.dashy-item:last-child{border-bottom:none;}
.dashy-item-name{font-weight:600;}
.dashy-item-sub{color:var(--fg-2,#888);font-size:11px;margin-left:6px;}
.dashy-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;}
.dashy-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="dashy-kv"><span class="dashy-kv-k">${esc(label)}</span><span class="dashy-kv-v">${esc(String(value))}</span></div>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const pageInfo = cfg.pageInfo || {};
  const appConfig = cfg.appConfig || {};
  const sections = Array.isArray(cfg.sections) ? cfg.sections : [];

  // Page Info section
  const navLinksCount = Array.isArray(pageInfo.navLinks) ? pageInfo.navLinks.length : 0;
  const pageInfoItems = [
    kv('Title', pageInfo.title),
    kv('Description', pageInfo.description),
    pageInfo.logo ? kv('Logo', pageInfo.logo) : '',
    navLinksCount > 0 ? kv('Nav links', navLinksCount) : '',
  ].filter(Boolean).join('');
  const pageHtml = pageInfoItems
    ? `<div class="dashy-sec"><h3>Page</h3><div class="dashy-card">${pageInfoItems}</div></div>`
    : '';

  // App Config section
  const appConfigItems = [
    kv('Theme', appConfig.theme),
    kv('Layout', appConfig.layout),
    kv('Icon size', appConfig.iconSize),
    kv('Language', appConfig.language),
  ].filter(Boolean).join('');
  const appConfigHtml = appConfigItems
    ? `<div class="dashy-sec"><h3>App Config</h3><div class="dashy-card">${appConfigItems}</div></div>`
    : '';

  // Sections (up to 10)
  const shownSections = sections.slice(0, 10);
  const sectionsHtml = shownSections.length
    ? `<div class="dashy-sec"><h3>Sections (${sections.length})</h3>
${shownSections.map((sec) => {
  const items = Array.isArray(sec.items) ? sec.items : [];
  const itemsHtml = items.map((item) => {
    const sub = item.description || item.url || '';
    return `<div class="dashy-item"><span class="dashy-item-name">${esc(item.title || '(unnamed)')}</span>${sub ? `<span class="dashy-item-sub">${esc(sub.length > 50 ? sub.slice(0, 50) + '…' : sub)}</span>` : ''}</div>`;
  }).join('');
  return `<div class="dashy-card">
<div class="dashy-section-name">${esc(sec.name || '(section)')}<span class="dashy-section-count">${items.length} item${items.length !== 1 ? 's' : ''}</span></div>
${itemsHtml}
</div>`;
}).join('')}
${sections.length > 10 ? `<div style="font-size:12px;color:var(--fg-2,#888);padding-top:4px;">…and ${sections.length - 10} more sections</div>` : ''}
</div>`
    : '';

  // Items total
  const totalItems = sections.reduce((acc, s) => acc + (Array.isArray(s.items) ? s.items.length : 0), 0);
  const itemsTotalHtml = totalItems > 0
    ? `<div class="dashy-sec"><h3>Items</h3><div class="dashy-card">${kv('Total items', totalItems)}</div></div>`
    : '';

  const subParts = [
    pageInfo.title || '',
    sections.length ? `${sections.length} section${sections.length !== 1 ? 's' : ''}` : '',
    totalItems ? `${totalItems} item${totalItems !== 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'dashy-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-dashy">Dashy</span>
  <span class="dashy-title">${esc(pageInfo.title || 'Dashy Dashboard')}</span>
</div>
<div class="dashy-sub">${esc(subParts)}</div>
${pageHtml}${appConfigHtml}${sectionsHtml}${itemsTotalHtml}`;
  return { parentNode: host };
}
