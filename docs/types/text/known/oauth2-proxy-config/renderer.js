const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.op2-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-op2{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#EC6731;color:#fff;vertical-align:middle;margin-right:8px;}
.op2-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.op2-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.op2-sec{margin:14px 0;}
.op2-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.op2-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.op2-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.op2-kv-k{color:var(--fg-2,#888);min-width:180px;flex-shrink:0;}
.op2-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.op2-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);letter-spacing:2px;}
.op2-pill{display:inline-flex;align-items:center;font-size:11px;padding:2px 8px;border-radius:10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:2px;}
`;

const SENSITIVE_KEYS = /^(client_secret|cookie[_-]secret|client_credentials|private_key|password|secret)$/i;

/**
 * Parse oauth2-proxy.cfg / TOML-like format: key = "value" or key = value
 * Also handles #-prefixed comments and multi-value keys (arrays).
 */
function parseOAuth2ProxyCfg(text) {
  const cfg = {};
  for (const rawLine of (text || '').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx < 0) continue;
    const key = line.slice(0, eqIdx).trim().replace(/-/g, '_');
    let value = line.slice(eqIdx + 1).trim();
    // Strip inline comments (crude: only if value is not quoted)
    if (!value.startsWith('"') && !value.startsWith("'")) {
      const ci = value.indexOf(' #');
      if (ci >= 0) value = value.slice(0, ci).trim();
    }
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    // Handle repeated keys as arrays
    if (key in cfg) {
      cfg[key] = Array.isArray(cfg[key]) ? [...cfg[key], value] : [cfg[key], value];
    } else {
      cfg[key] = value;
    }
  }
  return cfg;
}

function kv(label, key, value) {
  if (value == null || value === '') return '';
  if (SENSITIVE_KEYS.test(key)) {
    return `<div class="op2-kv"><span class="op2-kv-k">${esc(label)}</span><span class="op2-masked">••••••••</span></div>`;
  }
  return `<div class="op2-kv"><span class="op2-kv-k">${esc(label)}</span><span class="op2-kv-v">${esc(String(value))}</span></div>`;
}

export function render(intake) {
  const cfg = parseOAuth2ProxyCfg(intake.text || '');

  const provider = cfg.provider || '—';
  const clientId = cfg.client_id || '—';
  const upstreams = Array.isArray(cfg.upstreams || cfg.upstream)
    ? (cfg.upstreams || cfg.upstream)
    : (cfg.upstream ? [cfg.upstream] : (cfg.upstreams ? [cfg.upstreams] : []));
  const cookieDomain = cfg.cookie_domain || '';
  const emailDomains = Array.isArray(cfg.email_domains) ? cfg.email_domains : (cfg.email_domains ? [cfg.email_domains] : []);
  const allowedEmails = Array.isArray(cfg.authenticated_emails_file)
    ? cfg.authenticated_emails_file
    : (cfg.authenticated_emails_file ? [cfg.authenticated_emails_file] : []);
  const skipAuthRoutes = Array.isArray(cfg.skip_auth_routes) ? cfg.skip_auth_routes : (cfg.skip_auth_routes ? [cfg.skip_auth_routes] : []);
  const oidcIssuer = cfg.oidc_issuer_url || '';
  const redirectUrl = cfg.redirect_url || '';
  const httpAddr = cfg.http_address || '';

  const subParts = [
    `provider: ${provider}`,
    upstreams.length ? `${upstreams.length} upstream${upstreams.length !== 1 ? 's' : ''}` : null,
    cookieDomain ? `cookie: ${cookieDomain}` : null,
    emailDomains.length ? `${emailDomains.length} email domain${emailDomains.length !== 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(' · ');

  const providerHtml = `<div class="op2-sec"><h3>Provider</h3><div class="op2-card">
${kv('provider', 'provider', provider)}
${kv('client_id', 'client_id', clientId)}
${cfg.client_secret != null ? kv('client_secret', 'client_secret', cfg.client_secret) : ''}
${oidcIssuer ? kv('oidc_issuer_url', 'oidc_issuer_url', oidcIssuer) : ''}
${redirectUrl ? kv('redirect_url', 'redirect_url', redirectUrl) : ''}
</div></div>`;

  const serverHtml = (httpAddr || cfg.https_address) ? `<div class="op2-sec"><h3>Server</h3><div class="op2-card">
${httpAddr ? kv('http_address', 'http_address', httpAddr) : ''}
${cfg.https_address ? kv('https_address', 'https_address', cfg.https_address) : ''}
</div></div>` : '';

  const upstreamsHtml = upstreams.length ? `<div class="op2-sec"><h3>Upstreams (${upstreams.length})</h3><div class="op2-card">
${upstreams.map((u) => `<div class="op2-kv"><span class="op2-kv-v">${esc(u)}</span></div>`).join('')}
</div></div>` : '';

  const cookieHtml = (cookieDomain || cfg.cookie_secret != null || cfg.cookie_name || cfg.cookie_secure != null) ? `<div class="op2-sec"><h3>Cookie</h3><div class="op2-card">
${cookieDomain ? kv('cookie_domain', 'cookie_domain', cookieDomain) : ''}
${cfg.cookie_name ? kv('cookie_name', 'cookie_name', cfg.cookie_name) : ''}
${cfg.cookie_secret != null ? kv('cookie_secret', 'cookie_secret', cfg.cookie_secret) : ''}
${cfg.cookie_secure != null ? kv('cookie_secure', 'cookie_secure', cfg.cookie_secure) : ''}
${cfg.cookie_expire ? kv('cookie_expire', 'cookie_expire', cfg.cookie_expire) : ''}
</div></div>` : '';

  const authHtml = (emailDomains.length || cfg.htpasswd_file || skipAuthRoutes.length) ? `<div class="op2-sec"><h3>Authorization</h3><div class="op2-card">
${emailDomains.length ? `<div class="op2-kv"><span class="op2-kv-k">email_domains</span><span class="op2-kv-v">${emailDomains.map((d) => `<span class="op2-pill">${esc(d)}</span>`).join('')}</span></div>` : ''}
${cfg.htpasswd_file ? kv('htpasswd_file', 'htpasswd_file', cfg.htpasswd_file) : ''}
${skipAuthRoutes.length ? `<div class="op2-kv"><span class="op2-kv-k">skip_auth_routes</span><span class="op2-kv-v">${skipAuthRoutes.map((r) => `<span class="op2-pill">${esc(r)}</span>`).join('')}</span></div>` : ''}
</div></div>` : '';

  const host = document.createElement('div');
  host.className = 'op2-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-op2">OAuth2 Proxy</span>
  <span class="op2-title">Configuration</span>
</div>
<div class="op2-sub">${esc(subParts)}</div>
${providerHtml}${serverHtml}${upstreamsHtml}${cookieHtml}${authHtml}`;
  return { parentNode: host };
}
