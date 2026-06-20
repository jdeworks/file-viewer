const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.spb-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-spb{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#EF7C1A;color:#fff;vertical-align:middle;margin-right:8px}
.spb-title{font-size:18px;font-weight:700;margin:0 0 4px}
.spb-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.spb-sec{margin:14px 0}
.spb-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.spb-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin:6px 0}
.sb-table{width:100%;border-collapse:collapse;font-size:13px}
.sb-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.sb-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:12px;vertical-align:top;word-break:break-all}
.sb-table tr:last-child td{border-bottom:none}
.sb-match{border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:8px 12px;margin:6px 0;background:var(--bg,#fff)}
.sb-match-row{display:flex;gap:8px;flex-wrap:wrap;margin:2px 0;font-size:12px;font-family:ui-monospace,monospace}
.sb-label{color:var(--fg-2,#888);flex-shrink:0;min-width:60px}
.sb-val{font-weight:600;color:var(--fg,#24292f);word-break:break-all}
.sb-pills{display:flex;flex-wrap:wrap;gap:4px}
.sb-pill{display:inline-flex;align-items:center;gap:3px;font-size:12px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.sb-more{font-size:12px;color:var(--fg-2,#888);padding:4px 0}
.sb-err{color:#b91c1c;font-size:13px;padding:8px 0}
`;

function attr(el, name) {
  return (el.getAttribute(name) || '').trim();
}

function renderMatch(matchEl, index) {
  const bugEl = matchEl.querySelector(':scope > Bug');
  const classEl = matchEl.querySelector(':scope > Class');
  const methodEl = matchEl.querySelector(':scope > Method');
  const fieldEl = matchEl.querySelector(':scope > Field');
  const packageEl = matchEl.querySelector(':scope > Package');

  const parts = [];
  if (bugEl) {
    const pattern = attr(bugEl, 'pattern');
    const category = attr(bugEl, 'category');
    if (pattern) parts.push(`<div class="spb-match-row"><span class="spb-label">Bug</span><span class="spb-val">${esc(pattern)}${category ? ` <span style="color:var(--fg-2,#888);font-weight:400">(${esc(category)})</span>` : ''}</span></div>`);
  }
  if (classEl) {
    const name = attr(classEl, 'name');
    const role = attr(classEl, 'role');
    if (name) parts.push(`<div class="spb-match-row"><span class="spb-label">Class</span><span class="spb-val">${esc(name)}${role ? ` <span style="color:var(--fg-2,#888)">[${esc(role)}]</span>` : ''}</span></div>`);
  }
  if (methodEl) {
    const name = attr(methodEl, 'name');
    const params = attr(methodEl, 'params');
    const returns = attr(methodEl, 'returns');
    if (name) parts.push(`<div class="spb-match-row"><span class="spb-label">Method</span><span class="spb-val">${esc(name)}${params || returns ? `(${esc(params)})${returns ? ':' + esc(returns) : ''}` : ''}</span></div>`);
  }
  if (fieldEl) {
    const name = attr(fieldEl, 'name');
    if (name) parts.push(`<div class="spb-match-row"><span class="spb-label">Field</span><span class="spb-val">${esc(name)}</span></div>`);
  }
  if (packageEl) {
    const name = attr(packageEl, 'name');
    if (name) parts.push(`<div class="spb-match-row"><span class="spb-label">Package</span><span class="spb-val">${esc(name)}</span></div>`);
  }

  if (!parts.length) return '';

  return `<div class="spb-match">
<div style="font-size:11px;color:var(--fg-2,#888);margin-bottom:4px">Rule ${index + 1}</div>
${parts.join('')}
</div>`;
}

export async function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const doc = new DOMParser().parseFromString(text, 'text/xml');

  if (doc.getElementsByTagName('parsererror').length) {
    const d = document.createElement('div');
    d.className = 'spb-doc';
    d.innerHTML = `<style>${CSS}</style><p class="spb-err">Could not parse as XML.</p>`;
    return { parentNode: d };
  }

  const root = doc.documentElement;
  const rootTag = root.tagName;
  const filename = (intake.name || intake.filename || '').split('/').pop() || 'spotbugs.xml';

  const isFilter = rootTag === 'FindBugsFilter';
  const matches = [...root.querySelectorAll(':scope > Match')];

  // Collect bug patterns excluded/included
  const bugPatterns = [...new Set(
    [...root.querySelectorAll('Bug')].map((b) => attr(b, 'pattern')).filter(Boolean)
  )];

  // Collect bug categories
  const bugCategories = [...new Set(
    [...root.querySelectorAll('Bug')].map((b) => attr(b, 'category')).filter(Boolean)
  )];

  // Collect classes
  const classes = [...new Set(
    [...root.querySelectorAll('Class')].map((c) => attr(c, 'name')).filter(Boolean)
  )];

  // Collect packages
  const packages = [...new Set(
    [...root.querySelectorAll('Package')].map((p) => attr(p, 'name')).filter(Boolean)
  )];

  const filterType = filename.includes('exclude') ? 'Exclude' : filename.includes('include') ? 'Include' : isFilter ? 'Filter' : 'Config';

  const subParts = [
    `${matches.length} match rule${matches.length !== 1 ? 's' : ''}`,
    bugPatterns.length ? `${bugPatterns.length} bug pattern${bugPatterns.length !== 1 ? 's' : ''}` : '',
    classes.length ? `${classes.length} class filter${classes.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(' · ');

  // Bug patterns pills
  const SHOW_PILLS = 30;
  const patternsHtml = bugPatterns.length
    ? `<div class="spb-sec"><h3>Bug Patterns (${bugPatterns.length})</h3>
<div class="spb-pills">
${bugPatterns.slice(0, SHOW_PILLS).map((p) => `<span class="spb-pill">${esc(p)}</span>`).join('')}
${bugPatterns.length > SHOW_PILLS ? `<span class="spb-pill" style="color:var(--fg-2,#888)">+${bugPatterns.length - SHOW_PILLS} more</span>` : ''}
</div></div>` : '';

  // Bug categories pills
  const categoriesHtml = bugCategories.length
    ? `<div class="spb-sec"><h3>Categories</h3>
<div class="spb-pills">
${bugCategories.map((c) => `<span class="spb-pill">${esc(c)}</span>`).join('')}
</div></div>` : '';

  // Class filters
  const classesHtml = classes.length
    ? `<div class="spb-sec"><h3>Class Filters (${classes.length})</h3>
<div class="spb-pills">
${classes.slice(0, SHOW_PILLS).map((c) => `<span class="spb-pill">${esc(c)}</span>`).join('')}
${classes.length > SHOW_PILLS ? `<span class="spb-pill" style="color:var(--fg-2,#888)">+${classes.length - SHOW_PILLS} more</span>` : ''}
</div></div>` : '';

  // Package filters
  const packagesHtml = packages.length
    ? `<div class="spb-sec"><h3>Package Filters</h3>
<div class="spb-pills">
${packages.map((p) => `<span class="spb-pill">${esc(p)}</span>`).join('')}
</div></div>` : '';

  // Match rules detail
  const SHOW_MATCHES = 20;
  const matchesHtml = matches.length
    ? `<div class="spb-sec"><h3>Match Rules (${matches.length})</h3>
${matches.slice(0, SHOW_MATCHES).map((m, i) => renderMatch(m, i)).join('')}
${matches.length > SHOW_MATCHES ? `<div class="spb-more">…and ${matches.length - SHOW_MATCHES} more rules</div>` : ''}
</div>` : '';

  const host = document.createElement('div');
  host.className = 'spb-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="spb-title"><span class="badge-sb">SpotBugs</span>${esc(filename)} <span style="font-size:13px;font-weight:400;color:var(--fg-2,#888)">${esc(filterType)}</span></div>
<div class="spb-sub">${esc(subParts)}</div>
${patternsHtml}
${categoriesHtml}
${classesHtml}
${packagesHtml}
${matchesHtml}`;

  return { parentNode: host };
}
