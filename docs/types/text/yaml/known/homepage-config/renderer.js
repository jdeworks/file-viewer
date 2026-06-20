import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.homepage-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.homepage-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#6366f1;color:#fff;vertical-align:middle;margin-right:8px;}
.homepage-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.homepage-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.homepage-sec{margin:14px 0;}
.homepage-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.homepage-group{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:6px 0;background:var(--bg,#fff);}
.homepage-group-header{font-size:13px;font-weight:700;margin:0 0 6px;color:var(--fg,#24292f);}
.homepage-group-count{font-size:11px;color:var(--fg-2,#888);margin-left:6px;font-weight:normal;}
.homepage-service{font-size:12px;padding:4px 0;border-bottom:1px solid var(--border,#e0e0e0);display:flex;align-items:baseline;gap:8px;}
.homepage-service:last-child{border-bottom:none;}
.homepage-service-name{font-weight:600;min-width:120px;}
.homepage-service-url{color:var(--fg-2,#888);font-size:11px;font-family:ui-monospace,monospace;}
.homepage-service-desc{color:var(--fg-2,#888);font-size:11px;font-style:italic;}
.homepage-chip{display:inline-block;font-size:11px;padding:2px 8px;border-radius:10px;background:#e0e7ff;border:1px solid #a5b4fc;color:#3730a3;font-family:ui-monospace,monospace;margin:2px 3px 2px 0;}
.homepage-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.homepage-kv-k{color:var(--fg-2,#888);font-size:12px;min-width:140px;flex-shrink:0;}
.homepage-kv-v{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
`;

function urlHost(href) {
  if (!href) return '';
  try { return new URL(href).hostname; } catch { return ''; }
}

export async function render(intake) {
  let cfg = [];
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || [];
  } catch { cfg = intake.parsed || []; }

  const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();

  const host = document.createElement('div');
  host.className = 'homepage-doc';

  const style = document.createElement('style');
  style.textContent = CSS;
  host.appendChild(style);

  const inner = document.createElement('div');

  // ── Services (services.yaml) ──
  if (n === 'services.yaml') {
    const groups = Array.isArray(cfg) ? cfg : [];
    const totalServices = groups.reduce((sum, g) => {
      const items = g && typeof g === 'object' ? Object.values(g)[0] : [];
      return sum + (Array.isArray(items) ? items.length : 0);
    }, 0);

    const groupsHtml = groups.map((g) => {
      if (!g || typeof g !== 'object') return '';
      const groupName = Object.keys(g)[0] || '(group)';
      const services = Array.isArray(Object.values(g)[0]) ? Object.values(g)[0] : [];
      const servicesHtml = services.map((svc) => {
        if (!svc || typeof svc !== 'object') return '';
        const svcName = Object.keys(svc)[0] || '(service)';
        const svcInfo = Object.values(svc)[0] || {};
        const href = svcInfo.href || svcInfo.url || '';
        const desc = svcInfo.description || '';
        const host2 = urlHost(href);
        return `<div class="homepage-service">
          <span class="homepage-service-name">${esc(svcName)}</span>
          ${host2 ? `<span class="homepage-service-url">${esc(host2)}</span>` : ''}
          ${desc ? `<span class="homepage-service-desc">${esc(desc)}</span>` : ''}
        </div>`;
      }).join('');
      return `<div class="homepage-group">
        <div class="homepage-group-header">${esc(groupName)}<span class="homepage-group-count">${services.length} service${services.length !== 1 ? 's' : ''}</span></div>
        ${servicesHtml}
      </div>`;
    }).join('');

    inner.innerHTML = `
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="homepage-badge">Homepage</span>
  <span class="homepage-title">Services Configuration</span>
</div>
<div class="homepage-sub">Detected: services.yaml · ${groups.length} group${groups.length !== 1 ? 's' : ''}, ${totalServices} service${totalServices !== 1 ? 's' : ''}</div>
<div class="homepage-sec"><h3>Service Groups (${groups.length})</h3>${groupsHtml}</div>`.trim();

  // ── Bookmarks (bookmarks.yaml) ──
  } else if (n === 'bookmarks.yaml') {
    const groups = Array.isArray(cfg) ? cfg : [];
    const totalItems = groups.reduce((sum, g) => {
      const items = g && typeof g === 'object' ? Object.values(g)[0] : [];
      return sum + (Array.isArray(items) ? items.length : 0);
    }, 0);

    const groupsHtml = groups.map((g) => {
      if (!g || typeof g !== 'object') return '';
      const groupName = Object.keys(g)[0] || '(group)';
      const bookmarks = Array.isArray(Object.values(g)[0]) ? Object.values(g)[0] : [];
      const bHtml = bookmarks.map((bm) => {
        if (!bm || typeof bm !== 'object') return '';
        const bmName = bm.name || Object.keys(bm)[0] || '(item)';
        const bmAbbr = bm.abbr || '';
        const links = Array.isArray(bm.href) ? bm.href : (bm.href ? [bm.href] : []);
        return `<div class="homepage-service">
          <span class="homepage-service-name">${esc(bmName)}${bmAbbr ? ` <span class="homepage-service-url">[${esc(bmAbbr)}]</span>` : ''}</span>
          ${links.map((l) => `<span class="homepage-service-url">${esc(typeof l === 'object' ? l.href || JSON.stringify(l) : String(l))}</span>`).join('')}
        </div>`;
      }).join('');
      return `<div class="homepage-group">
        <div class="homepage-group-header">${esc(groupName)}<span class="homepage-group-count">${bookmarks.length} item${bookmarks.length !== 1 ? 's' : ''}</span></div>
        ${bHtml}
      </div>`;
    }).join('');

    inner.innerHTML = `
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="homepage-badge">Homepage</span>
  <span class="homepage-title">Bookmarks Configuration</span>
</div>
<div class="homepage-sub">Detected: bookmarks.yaml · ${groups.length} group${groups.length !== 1 ? 's' : ''}, ${totalItems} item${totalItems !== 1 ? 's' : ''}</div>
<div class="homepage-sec"><h3>Bookmark Groups (${groups.length})</h3>${groupsHtml}</div>`.trim();

  // ── Widgets (widgets.yaml) ──
  } else if (n === 'widgets.yaml') {
    const widgets = Array.isArray(cfg) ? cfg : [];
    const chipsHtml = widgets.map((w) => {
      if (!w || typeof w !== 'object') return '';
      const wType = w.type || Object.keys(w)[0] || '(widget)';
      return `<span class="homepage-chip">${esc(wType)}</span>`;
    }).join('');

    inner.innerHTML = `
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="homepage-badge">Homepage</span>
  <span class="homepage-title">Widgets Configuration</span>
</div>
<div class="homepage-sub">Detected: widgets.yaml · ${widgets.length} widget${widgets.length !== 1 ? 's' : ''}</div>
<div class="homepage-sec"><h3>Widgets (${widgets.length})</h3>
  <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;">${chipsHtml}</div>
</div>`.trim();

  // ── Settings (settings.yaml) ──
  } else if (n === 'settings.yaml') {
    const s = cfg && typeof cfg === 'object' && !Array.isArray(cfg) ? cfg : {};
    const kvRow = (k, v) => v != null && v !== '' ? `<div class="homepage-kv"><span class="homepage-kv-k">${esc(k)}</span><span class="homepage-kv-v">${esc(String(v))}</span></div>` : '';
    const settingsHtml = [
      kvRow('title', s.title),
      kvRow('description', s.description),
      kvRow('background', s.background),
      kvRow('theme', s.theme),
      kvRow('language', s.language),
      kvRow('color', s.color),
      kvRow('favicon', s.favicon),
      kvRow('hideVersion', s.hideVersion != null ? String(s.hideVersion) : null),
      kvRow('logpath', s.logpath),
    ].filter(Boolean).join('');

    inner.innerHTML = `
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="homepage-badge">Homepage</span>
  <span class="homepage-title">${esc(s.title || 'Homepage Settings')}</span>
</div>
<div class="homepage-sub">Detected: settings.yaml${s.description ? ' · ' + esc(String(s.description)) : ''}</div>
<div class="homepage-sec"><h3>Settings</h3>
  <div class="homepage-group">${settingsHtml || '<span style="color:var(--fg-2,#888);font-size:12px;">(no recognized settings)</span>'}</div>
</div>`.trim();

  // ── Fallback ──
  } else {
    inner.innerHTML = `
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="homepage-badge">Homepage</span>
  <span class="homepage-title">Homepage Configuration</span>
</div>
<div class="homepage-sub">Detected: ${esc(n)}</div>`.trim();
  }

  host.appendChild(inner);
  return { parentNode: host };
}
