import { parseTOML } from '../../toml.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SHOPIFY_GREEN = '#008060';

const SECRET_RE = /secret|token|key|password|api_key/i;
function maskSecret(k, v) {
  return SECRET_RE.test(k) ? '[configured]' : String(v == null ? '' : v);
}

const CSS = `
.shopifyapp-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.shopifyapp-doc .badge-shopify{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#008060;color:#fff;vertical-align:middle;margin-right:8px;letter-spacing:.02em;}
.shopifyapp-doc .sha-title{font-size:18px;font-weight:700;margin:0 0 4px;display:flex;align-items:center;gap:6px;}
.shopifyapp-doc .sha-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.shopifyapp-doc .sha-sec{margin:14px 0;}
.shopifyapp-doc .sha-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.shopifyapp-doc .sha-grid{display:grid;grid-template-columns:max-content 1fr;gap:4px 14px;margin:4px 0;}
.shopifyapp-doc .sha-key{color:var(--fg-2,#888);font-size:12px;}
.shopifyapp-doc .sha-val{font:12px ui-monospace,monospace;word-break:break-all;color:var(--fg,#24292f);}
.shopifyapp-doc .sha-redacted{font-size:11px;background:var(--bg-3,#eee);padding:1px 6px;border-radius:4px;color:var(--fg-2,#888);font-family:ui-monospace,monospace;}
.shopifyapp-doc .sha-pills{display:flex;flex-wrap:wrap;gap:5px;margin:4px 0;}
.shopifyapp-doc .sha-pill{display:inline-block;font-size:12px;padding:2px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.shopifyapp-doc .sha-pill.scope{background:#f0fdf4;border-color:#bbf7d0;color:#166534;}
.shopifyapp-doc .sha-pill.ext{background:#eff6ff;border-color:#bfdbfe;color:#1e40af;}
.shopifyapp-doc .sha-pill.url{background:#fafafa;border-color:#e0e0e0;color:#555;word-break:break-all;font-size:11px;}
.shopifyapp-doc .sha-table{width:100%;border-collapse:collapse;font-size:12px;}
.shopifyapp-doc .sha-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.shopifyapp-doc .sha-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;word-break:break-all;}
`;

export function render(intake) {
  let cfg = {};
  try { cfg = parseTOML(intake.text || '') || {}; } catch { cfg = {}; }

  const appName = cfg.name || cfg.title || '—';
  const handle = cfg.handle || null;
  const clientId = cfg.client_id ? (String(cfg.client_id).length > 12 ? String(cfg.client_id).slice(0, 12) + '…' : cfg.client_id) : null;
  const appUrl = cfg.application_url || null;

  // Scopes
  const scopesRaw = cfg.access_scopes?.scopes || cfg.scopes || '';
  const scopes = typeof scopesRaw === 'string'
    ? scopesRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : (Array.isArray(scopesRaw) ? scopesRaw : []);

  // Webhooks
  const webhooks = cfg.webhooks?.subscriptions
    ? (Array.isArray(cfg.webhooks.subscriptions) ? cfg.webhooks.subscriptions : [])
    : [];

  // Extensions
  const extensions = Array.isArray(cfg.extension) ? cfg.extension
    : (Array.isArray(cfg.extensions) ? cfg.extensions : []);

  // Auth redirect URLs
  const redirectUrls = Array.isArray(cfg.auth?.redirect_urls) ? cfg.auth.redirect_urls : [];

  // POS
  const pos = cfg.pos || null;

  const host = document.createElement('div');
  host.className = 'shopifyapp-doc';

  // Identity section
  const identityLines = [
    clientId ? `<span class="sha-key">client_id</span><span class="sha-redacted">${esc(clientId)}</span>` : '',
    handle ? `<span class="sha-key">handle</span><span class="sha-val">${esc(handle)}</span>` : '',
    appUrl ? `<span class="sha-key">application_url</span><span class="sha-val">${esc(appUrl.slice(0, 60))}${appUrl.length > 60 ? '…' : ''}</span>` : '',
  ].filter(Boolean);

  const identityHtml = identityLines.length
    ? `<div class="sha-sec"><h3>App identity</h3><div class="sha-grid">${identityLines.join('')}</div></div>` : '';

  // Scopes
  const scopesHtml = scopes.length
    ? `<div class="sha-sec"><h3>OAuth scopes (${scopes.length})</h3><div class="sha-pills">${scopes.map((s) => `<span class="sha-pill scope">${esc(s)}</span>`).join('')}</div></div>` : '';

  // Webhooks
  const webhooksHtml = webhooks.length
    ? `<div class="sha-sec"><h3>Webhooks (${webhooks.length})</h3><table class="sha-table"><thead><tr><th>Topic</th><th>URI</th></tr></thead><tbody>${webhooks.slice(0, 10).map((w) => {
        const topic = w.topic || w.topics || '?';
        const uri = w.uri || w.endpoint || w.address || '?';
        const uriShort = String(uri).length > 50 ? String(uri).slice(0, 50) + '…' : String(uri);
        return `<tr><td>${esc(Array.isArray(topic) ? topic.join(', ') : topic)}</td><td>${esc(uriShort)}</td></tr>`;
      }).join('')}${webhooks.length > 10 ? `<tr><td colspan="2" style="color:var(--fg-2,#888);font-size:11px">+${webhooks.length - 10} more</td></tr>` : ''}</tbody></table></div>`
    : '';

  // Extensions
  const extensionsHtml = extensions.length
    ? `<div class="sha-sec"><h3>Extensions (${extensions.length})</h3><div class="sha-pills">${extensions.slice(0, 12).map((e) => {
        const label = e.handle || e.type || e.name || '?';
        return `<span class="sha-pill ext">${esc(label)}</span>`;
      }).join('')}</div></div>`
    : '';

  // Redirect URLs
  const redirectHtml = redirectUrls.length
    ? `<div class="sha-sec"><h3>Auth redirect URLs (${redirectUrls.length})</h3><div class="sha-pills">${redirectUrls.slice(0, 8).map((u) => `<span class="sha-pill url">${esc(u)}</span>`).join('')}${redirectUrls.length > 8 ? `<span style="font-size:11px;color:var(--fg-2,#888)">+${redirectUrls.length - 8} more</span>` : ''}</div></div>`
    : '';

  // POS section
  let posHtml = '';
  if (pos) {
    const embeddedInPos = pos.embedded_in_pos != null ? String(pos.embedded_in_pos) : null;
    posHtml = `<div class="sha-sec"><h3>POS</h3><div class="sha-grid">${embeddedInPos ? `<span class="sha-key">embedded_in_pos</span><span class="sha-val">${esc(embeddedInPos)}</span>` : '<span class="sha-key">configured</span><span class="sha-val">yes</span>'}</div></div>`;
  }

  const scopeSummary = scopes.length ? ` · ${scopes.length} scope${scopes.length !== 1 ? 's' : ''}` : '';
  const extSummary = extensions.length ? ` · ${extensions.length} extension${extensions.length !== 1 ? 's' : ''}` : '';

  host.innerHTML = `<style>${CSS}</style>
<div class="sha-title"><span class="badge-shopify">Shopify</span>${esc(appName)}</div>
<div class="sha-sub">Shopify CLI v3 app configuration${scopeSummary}${extSummary}</div>
${identityHtml}
${scopesHtml}
${webhooksHtml}
${extensionsHtml}
${redirectHtml}
${posHtml}`;

  return { parentNode: host };
}
