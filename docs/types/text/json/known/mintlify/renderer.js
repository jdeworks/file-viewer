const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.mfy-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-mfy{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00D492;color:#fff;vertical-align:middle;margin-right:8px}
.mfy-title{font-size:18px;font-weight:700;margin:0 0 4px}
.mfy-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.mfy-sec{margin:14px 0}
.mfy-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.mfy-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin:6px 0}
.mfy-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px}
.mfy-kv-k{color:var(--fg-2,#888);min-width:130px;flex-shrink:0}
.mfy-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.mfy-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0}
.mfy-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace}
.mfy-color{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:5px;vertical-align:middle;border:1px solid var(--border,#ccc)}
.mfy-tab{display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-size:13px;margin:3px 0}
.mfy-tab-icon{font-size:14px;opacity:0.7}
.mfy-group{font-weight:600;font-size:13px;padding:4px 0 2px;border-bottom:1px solid var(--border,#eee);margin:6px 0 4px}
.mfy-page{font-size:12px;padding:2px 0 2px 14px;color:var(--fg-2,#555);font-family:ui-monospace,monospace}
`;

/** Only allow hex/rgb/hsl/named CSS colors as a style value — rejects url(), expression(), etc. so an
 * off-origin-triggering value in config JSON can never reach an inline style attribute. */
function safeCssColor(v) {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (/^#[0-9a-f]{3,8}$/i.test(s)) return s;
  if (/^(rgba?|hsla?)\(\s*[\d.]+%?\s*(,\s*[\d.]+%?\s*){2,3}(,\s*[\d.]+\s*)?\)$/i.test(s)) return s;
  if (/^[a-z]+$/i.test(s)) return s;
  return null;
}

function countPages(navArr) {
  let count = 0;
  function walk(v) {
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (typeof v === 'string') { count++; return; }
    if (v && typeof v === 'object') {
      if (Array.isArray(v.pages)) walk(v.pages);
    }
  }
  (navArr || []).forEach(walk);
  return count;
}

export function render(intake) {
  const cfg = intake.parsed ?? (() => { try { return JSON.parse(intake.text || '{}'); } catch { return {}; } })();

  const name = cfg.name || 'Mintlify Config';
  const colors = cfg.colors || {};
  const primaryColor = colors.primary || null;
  const tabs = Array.isArray(cfg.tabs) ? cfg.tabs : [];
  const navigation = Array.isArray(cfg.navigation) ? cfg.navigation : [];
  const anchors = Array.isArray(cfg.anchors) ? cfg.anchors : [];
  const versions = Array.isArray(cfg.versions) ? cfg.versions : [];
  const api = cfg.api || null;
  const integrations = cfg.integrations || {};
  const logo = cfg.logo || {};
  const favicon = cfg.favicon || '';

  const totalPages = countPages(navigation);
  const topGroupNames = navigation.map((g) => (typeof g === 'object' ? g.group : null)).filter(Boolean);

  // Gather integrations keys (flatten one level)
  const integrationKeys = [];
  for (const [k, v] of Object.entries(integrations)) {
    if (v && typeof v === 'object') {
      for (const k2 of Object.keys(v)) integrationKeys.push(`${k}.${k2}`);
    } else {
      integrationKeys.push(k);
    }
  }

  // API auth type
  const apiAuth = api ? (
    Array.isArray(api.auth)
      ? api.auth.map((a) => (typeof a === 'object' ? a.method || a.type : String(a))).join(', ')
      : (api.auth ? (typeof api.auth === 'object' ? api.auth.method || api.auth.type || 'configured' : String(api.auth)) : null)
  ) : null;

  const subParts = [
    `${totalPages} page${totalPages !== 1 ? 's' : ''}`,
    navigation.length ? `${navigation.length} group${navigation.length !== 1 ? 's' : ''}` : '',
    tabs.length ? `${tabs.length} tab${tabs.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean);

  // Branding card
  const logoLight = typeof logo === 'string' ? logo : (logo.light || logo.src || '');
  const logoDark = typeof logo === 'string' ? '' : (logo.dark || '');
  const brandingRows = [
    logoLight ? `<div class="mfy-kv"><span class="mfy-kv-k">Logo (light)</span><span class="mfy-kv-v">${esc(logoLight)}</span></div>` : '',
    logoDark ? `<div class="mfy-kv"><span class="mfy-kv-k">Logo (dark)</span><span class="mfy-kv-v">${esc(logoDark)}</span></div>` : '',
    favicon ? `<div class="mfy-kv"><span class="mfy-kv-k">Favicon</span><span class="mfy-kv-v">${esc(favicon)}</span></div>` : '',
    primaryColor ? `<div class="mfy-kv"><span class="mfy-kv-k">Primary color</span><span class="mfy-kv-v">${safeCssColor(primaryColor) ? `<span class="mfy-color" style="background:${safeCssColor(primaryColor)}"></span>` : ''}${esc(primaryColor)}</span></div>` : '',
    colors.light ? `<div class="mfy-kv"><span class="mfy-kv-k">Light bg</span><span class="mfy-kv-v">${safeCssColor(colors.light) ? `<span class="mfy-color" style="background:${safeCssColor(colors.light)}"></span>` : ''}${esc(colors.light)}</span></div>` : '',
    colors.dark ? `<div class="mfy-kv"><span class="mfy-kv-k">Dark bg</span><span class="mfy-kv-v">${safeCssColor(colors.dark) ? `<span class="mfy-color" style="background:${safeCssColor(colors.dark)}"></span>` : ''}${esc(colors.dark)}</span></div>` : '',
  ].filter(Boolean).join('');
  const brandingHtml = brandingRows
    ? `<div class="mfy-sec"><h3>Branding</h3><div class="mfy-card">${brandingRows}</div></div>`
    : '';

  // Tabs
  const tabsHtml = tabs.length
    ? `<div class="mfy-sec"><h3>Navigation Tabs (${tabs.length})</h3>${tabs.map((t) => {
        const tname = typeof t === 'string' ? t : (t.name || t.label || '?');
        const ticon = typeof t === 'object' && t.icon ? t.icon : '';
        return `<div class="mfy-tab">${ticon ? `<span class="mfy-tab-icon">${esc(ticon)}</span>` : ''}<span>${esc(tname)}</span></div>`;
      }).join('')}</div>`
    : '';

  // Navigation groups
  const groupsHtml = topGroupNames.length
    ? `<div class="mfy-sec"><h3>Navigation Groups (${navigation.length})</h3><div class="mfy-card">
${navigation.map((g) => {
      if (typeof g !== 'object') return '';
      const pages = Array.isArray(g.pages) ? g.pages : [];
      const pageCount = countPages([g]);
      return `<div class="mfy-group">${esc(g.group || '—')} <span style="font-weight:400;font-size:11px;color:var(--fg-2,#888)">${pageCount} page${pageCount !== 1 ? 's' : ''}</span></div>
${pages.slice(0, 4).map((p) => {
        if (typeof p === 'string') return `<div class="mfy-page">${esc(p)}</div>`;
        if (p && typeof p === 'object' && p.group) return `<div class="mfy-page" style="font-weight:600">${esc(p.group)}</div>`;
        return '';
      }).join('')}${pageCount > 4 ? `<div class="mfy-page" style="color:var(--fg-2,#aaa)">+${pageCount - 4} more</div>` : ''}`;
    }).join('')}
</div></div>`
    : '';

  // API settings
  const apiHtml = api
    ? `<div class="mfy-sec"><h3>API Settings</h3><div class="mfy-card">
${api.baseUrl ? `<div class="mfy-kv"><span class="mfy-kv-k">Base URL</span><span class="mfy-kv-v">${esc(api.baseUrl)}</span></div>` : ''}
${apiAuth ? `<div class="mfy-kv"><span class="mfy-kv-k">Auth</span><span class="mfy-kv-v">${esc(apiAuth)}</span></div>` : ''}
${api.playground !== undefined ? `<div class="mfy-kv"><span class="mfy-kv-k">Playground</span><span class="mfy-kv-v">${esc(String(api.playground))}</span></div>` : ''}
</div></div>`
    : '';

  // Integrations
  const intHtml = integrationKeys.length
    ? `<div class="mfy-sec"><h3>Integrations (${integrationKeys.length})</h3><div class="mfy-pills">
${integrationKeys.map((k) => `<span class="mfy-pill">${esc(k)}</span>`).join('')}
</div></div>`
    : '';

  // Versions
  const versHtml = versions.length
    ? `<div class="mfy-sec"><h3>Versions</h3><div class="mfy-pills">
${versions.map((v) => `<span class="mfy-pill">${esc(typeof v === 'object' ? (v.name || JSON.stringify(v)) : v)}</span>`).join('')}
</div></div>`
    : '';

  // Anchors
  const ancHtml = anchors.length
    ? `<div class="mfy-sec"><h3>Anchors (${anchors.length})</h3><div class="mfy-pills">
${anchors.map((a) => `<span class="mfy-pill">${esc(typeof a === 'object' ? (a.name || a.url || '?') : a)}</span>`).join('')}
</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'mintlify-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-mfy">Mintlify</span>
  <span class="mfy-title">${esc(name)}</span>
</div>
<div class="mfy-sub">${esc(subParts.join(' · '))}</div>
${brandingHtml}${tabsHtml}${groupsHtml}${apiHtml}${intHtml}${versHtml}${ancHtml}`;
  return { parentNode: host };
}
