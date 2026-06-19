import { parseTOML } from '../../toml.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.wgl-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-wgl{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f48120;color:#fff;vertical-align:middle;margin-right:8px;}
.wgl-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.wgl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.wgl-sec{margin:12px 0;}
.wgl-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.wgl-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0;}
.wgl-pill{display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.wgl-pill.route{background:#fff7ed;border-color:#fed7aa;color:#9a3412;}
.wgl-pill.kv{background:#eff6ff;border-color:#bfdbfe;color:#1e40af;}
.wgl-pill.env{background:#f0fdf4;border-color:#bbf7d0;color:#166534;}
.wgl-kv{font-size:12px;display:flex;gap:8px;align-items:baseline;margin:3px 0;}
.wgl-key{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#888);}
.wgl-val{font:12px/1.4 ui-monospace,monospace;font-weight:600;}
.wgl-redacted{font-size:11px;background:var(--bg-3,#eee);padding:1px 6px;border-radius:4px;color:var(--fg-2,#888);}
`;

export function render(intake) {
  let cfg = {};
  try { cfg = parseTOML(intake.text || '') || {}; } catch { cfg = {}; }

  const name = cfg.name || '—';
  const main = cfg.main || '';
  const compatDate = cfg.compatibility_date || '';
  const accountId = cfg.account_id ? String(cfg.account_id).slice(0, 8) + '…' : null;

  const routes = Array.isArray(cfg.routes) ? cfg.routes
    : (cfg.route ? [cfg.route] : []);
  const kvNamespaces = Array.isArray(cfg.kv_namespaces) ? cfg.kv_namespaces : [];
  const durableObjects = cfg.durable_objects && Array.isArray(cfg.durable_objects.bindings)
    ? cfg.durable_objects.bindings : [];
  const envNames = cfg.env ? Object.keys(cfg.env) : [];

  const host = document.createElement('div');
  host.className = 'wgl-doc';

  const routesHtml = routes.length
    ? `<div class="wgl-sec"><h3>Routes (${routes.length})</h3><div class="wgl-pills">${routes.slice(0, 10).map((r) => {
        const pattern = typeof r === 'string' ? r : (r.pattern || JSON.stringify(r));
        return `<span class="wgl-pill route">${esc(pattern)}</span>`;
      }).join('')}</div></div>` : '';

  const kvHtml = kvNamespaces.length
    ? `<div class="wgl-sec"><h3>KV Namespaces (${kvNamespaces.length})</h3><div class="wgl-pills">${kvNamespaces.map((kv) => `<span class="wgl-pill kv">${esc(kv.binding || kv.id || '?')}</span>`).join('')}</div></div>` : '';

  const doHtml = durableObjects.length
    ? `<div class="wgl-sec"><h3>Durable Objects</h3><div class="wgl-pills">${durableObjects.map((b) => `<span class="wgl-pill">${esc(b.name || b.class_name || '?')}</span>`).join('')}</div></div>` : '';

  const envsHtml = envNames.length
    ? `<div class="wgl-sec"><h3>Environments</h3><div class="wgl-pills">${envNames.map((e) => `<span class="wgl-pill env">${esc(e)}</span>`).join('')}</div></div>` : '';

  const metaHtml = [
    main && `<div class="wgl-kv"><span class="wgl-key">main</span><span class="wgl-val">${esc(main)}</span></div>`,
    compatDate && `<div class="wgl-kv"><span class="wgl-key">compatibility_date</span><span class="wgl-val">${esc(compatDate)}</span></div>`,
    accountId && `<div class="wgl-kv"><span class="wgl-key">account_id</span><span class="wgl-redacted">${esc(accountId)}</span></div>`,
  ].filter(Boolean).join('');

  host.innerHTML = `<style>${CSS}</style>
<div class="wgl-title"><span class="badge-wgl">Wrangler</span>${esc(name)}</div>
<div class="wgl-sub">Cloudflare Worker${routes.length ? ` · ${routes.length} route${routes.length !== 1 ? 's' : ''}` : ''}${kvNamespaces.length ? ` · ${kvNamespaces.length} KV binding${kvNamespaces.length !== 1 ? 's' : ''}` : ''}</div>
${metaHtml ? `<div class="wgl-sec">${metaHtml}</div>` : ''}
${routesHtml}
${kvHtml}
${doHtml}
${envsHtml}`;

  return { parentNode: host };
}
