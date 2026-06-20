import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ins-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-ins{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#7400E0;color:#fff;vertical-align:middle;margin-right:8px}
.ins-title{font-size:18px;font-weight:700;margin:0 0 4px}
.ins-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.ins-type-chip{display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;background:#ede9fe;color:#6d28d9;margin-left:4px;vertical-align:middle}
.ins-sec{margin:14px 0}
.ins-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.ins-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin:6px 0}
.ins-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px}
.ins-kv-k{color:var(--fg-2,#888);min-width:120px;flex-shrink:0}
.ins-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.ins-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0}
.ins-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.ins-method{display:inline-block;font-size:11px;font-weight:700;padding:2px 6px;border-radius:4px;margin-right:6px;font-family:ui-monospace,monospace;min-width:52px;text-align:center}
.ins-m-GET{background:#e6f4ea;color:#1a7f37}
.ins-m-POST{background:#e1effe;color:#1d4ed8}
.ins-m-PUT{background:#fff3cd;color:#9a6700}
.ins-m-DELETE{background:#fde8e8;color:#b91c1c}
.ins-m-PATCH{background:#ede9fe;color:#6d28d9}
.ins-m-default{background:#f3f4f6;color:#374151}
.ins-folder{font-weight:600;margin:8px 0 4px;font-size:13px;color:var(--fg,#24292f)}
.ins-folder-icon{margin-right:4px;opacity:0.6}
.ins-item{margin:2px 0 2px 12px;font-size:13px;display:flex;align-items:center}
`;

function methodBadge(method) {
  const m = (method || 'GET').toUpperCase();
  const cls = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(m) ? `ins-m-${m}` : 'ins-m-default';
  return `<span class="ins-method ${cls}">${esc(m)}</span>`;
}

function maskAuth(auth) {
  if (!auth || typeof auth !== 'object') return null;
  const type = auth.type || auth.scheme || '';
  return type ? `${type} [configured]` : '[configured]';
}

function renderItems(items, depth) {
  if (!Array.isArray(items) || items.length === 0) return '';
  let html = '';
  for (const item of items) {
    if (Array.isArray(item.children) || Array.isArray(item.requests)) {
      // folder
      html += `<div class="ins-folder"><span class="ins-folder-icon">&#128193;</span>${esc(item.name || item.meta?.name || 'Folder')}</div>`;
      if (depth < 2) {
        const sub = item.children || item.requests || [];
        html += renderItems(sub, depth + 1);
      }
    } else if (item.method || item.url || item.type === 'Request') {
      const method = item.method || 'GET';
      html += `<div class="ins-item">${methodBadge(method)}${esc(item.name || item.meta?.name || item.url || '—')}</div>`;
    }
  }
  return html;
}

function countRequests(items) {
  if (!Array.isArray(items)) return 0;
  let n = 0;
  for (const item of items) {
    if (item.method || item.type === 'Request') n++;
    if (Array.isArray(item.children)) n += countRequests(item.children);
    if (Array.isArray(item.requests)) n += countRequests(item.requests);
  }
  return n;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = intake.parsed || {}; }

  const name = cfg.name || cfg.meta?.name || 'Insomnia Workspace';
  const type = cfg.type || '';
  const collection = cfg.collection || cfg.resources || cfg.items || [];
  const environments = Array.isArray(cfg.environments) ? cfg.environments : [];
  const meta = cfg.meta || {};

  // Try to find requests at top level or nested in collection
  const topItems = Array.isArray(collection) ? collection : [];
  const totalRequests = countRequests(topItems);

  // Created / modified from meta or top-level keys
  const created = meta.created || cfg.created || '';
  const modified = meta.modified || cfg.modified || '';

  // Auth at workspace level
  const wsAuth = cfg.authentication || cfg.auth || null;
  const wsAuthStr = wsAuth ? maskAuth(wsAuth) : null;

  const subParts = [
    type ? `${type}` : '',
    totalRequests ? `${totalRequests} request${totalRequests !== 1 ? 's' : ''}` : '',
    environments.length ? `${environments.length} environment${environments.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean);

  // Overview card
  const overviewRows = [
    type ? `<div class="ins-kv"><span class="ins-kv-k">Type</span><span class="ins-kv-v">${esc(type)}</span></div>` : '',
    wsAuthStr ? `<div class="ins-kv"><span class="ins-kv-k">Auth</span><span class="ins-kv-v">${esc(wsAuthStr)}</span></div>` : '',
    created ? `<div class="ins-kv"><span class="ins-kv-k">Created</span><span class="ins-kv-v">${esc(String(created))}</span></div>` : '',
    modified ? `<div class="ins-kv"><span class="ins-kv-k">Modified</span><span class="ins-kv-v">${esc(String(modified))}</span></div>` : '',
    totalRequests ? `<div class="ins-kv"><span class="ins-kv-k">Total requests</span><span class="ins-kv-v">${totalRequests}</span></div>` : '',
  ].filter(Boolean).join('');

  const overviewHtml = overviewRows
    ? `<div class="ins-sec"><h3>Overview</h3><div class="ins-card">${overviewRows}</div></div>`
    : '';

  // Structure
  const structHtml = topItems.length
    ? `<div class="ins-sec"><h3>Structure</h3><div class="ins-card">${renderItems(topItems, 0)}</div></div>`
    : '';

  // Environments
  const envsHtml = environments.length
    ? `<div class="ins-sec"><h3>Environments (${environments.length})</h3><div class="ins-pills">
${environments.map((e) => `<span class="ins-pill">${esc(typeof e === 'object' ? (e.name || e.meta?.name || '?') : e)}</span>`).join('')}
</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'insomnia-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-ins">Insomnia</span>
  <span class="ins-title">${esc(name)}</span>${type ? `<span class="ins-type-chip">${esc(type)}</span>` : ''}
</div>
<div class="ins-sub">${esc(subParts.join(' · '))}</div>
${overviewHtml}${structHtml}${envsHtml}`;
  return { parentNode: host };
}
