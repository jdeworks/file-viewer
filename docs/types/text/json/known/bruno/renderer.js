// Bruno workspace bruno.json enhanced view.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.brunows-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-bruno{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e38e00;color:#fff;vertical-align:middle;margin-right:8px;}
.brunows-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.brunows-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.brunows-sec{margin:14px 0;}
.brunows-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.brunows-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.brunows-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.brunows-kv-k{color:var(--fg-2,#888);min-width:160px;font-family:ui-monospace,monospace;}
.brunows-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.brunows-pills{display:flex;flex-wrap:wrap;gap:6px;}
.brunows-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.brunows-chip{display:inline-block;font-size:11px;padding:2px 8px;border-radius:5px;background:#fff7ed;border:1px solid #fed7aa;color:#c2410c;font-weight:600;}
.brunows-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;margin-left:4px;}
.brunows-masked{color:var(--fg-2,#888);font-family:ui-monospace,monospace;letter-spacing:.05em;}
`;

const SENSITIVE_HEADER = /authorization|token|secret|api.?key|x-api/i;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="brunows-kv"><span class="brunows-kv-k">${esc(label)}</span><span class="brunows-kv-v">${esc(String(value))}</span></div>`;
}

function kvMasked(label) {
  return `<div class="brunows-kv"><span class="brunows-kv-k">${esc(label)}</span><span class="brunows-masked">[configured]</span></div>`;
}

export function render(intake) {
  const cfg = intake.parsed ?? (() => { try { return JSON.parse(intake.text || '{}'); } catch { return {}; } })();

  const name = cfg.name || 'Bruno Workspace';
  const version = cfg.version || '';
  const type = cfg.type || '';
  const ignore = Array.isArray(cfg.ignore) ? cfg.ignore : [];

  // Proxy
  const proxy = cfg.proxy || null;
  let proxyUrl = '';
  let proxyHasAuth = false;
  if (proxy && typeof proxy === 'object') {
    const protocol = proxy.protocol || 'http';
    const proxyHost = proxy.hostname || proxy.host || '';
    const proxyPort = proxy.port ? `:${proxy.port}` : '';
    proxyUrl = proxyHost ? `${protocol}://${proxyHost}${proxyPort}` : '';
    proxyHasAuth = !!(proxy.auth && (proxy.auth.username || proxy.auth.password));
  } else if (typeof proxy === 'string') {
    proxyUrl = proxy;
  }

  // Global headers
  const headers = Array.isArray(cfg.headers) ? cfg.headers : [];

  // Scripts
  const scriptSection = cfg.script || cfg.scripts || null;
  const hasPreReqScript = !!(scriptSection && (scriptSection.req || scriptSection.request || scriptSection.preRequest));
  const hasPostResScript = !!(scriptSection && (scriptSection.res || scriptSection.response || scriptSection.postResponse));

  // dotenv
  const dotenvFiles = (() => {
    const de = cfg.dotenv;
    if (!de) return [];
    if (typeof de === 'string') return [de];
    if (de.files && Array.isArray(de.files)) return de.files;
    if (Array.isArray(de)) return de;
    return [];
  })();

  // Build subtitle
  const subParts = [];
  if (version) subParts.push(`v${version}`);
  if (type) subParts.push(type);

  // Header HTML (mask sensitive ones)
  const headersHtml = headers.length ? `
<div class="brunows-sec"><h3>Global Headers (${headers.length})</h3><div class="brunows-card">
<div class="brunows-pills">
${headers.map((h) => {
  const headerName = h.name || h.key || '';
  const isSensitive = SENSITIVE_HEADER.test(headerName);
  return `<span class="brunows-pill">${esc(headerName)}${isSensitive ? ' <span class="brunows-masked">[configured]</span>' : ''}</span>`;
}).join('')}
</div></div></div>` : '';

  // Ignore HTML
  const ignoreHtml = ignore.length ? `
<div class="brunows-sec"><h3>Ignore Patterns</h3><div class="brunows-card">
<div class="brunows-pills">
${ignore.map((p) => `<span class="brunows-pill">${esc(p)}</span>`).join('')}
</div></div></div>` : '';

  // Proxy HTML
  const proxyHtml = proxyUrl ? `
<div class="brunows-sec"><h3>Proxy</h3><div class="brunows-card">
${kv('url', proxyUrl)}
${proxyHasAuth ? kvMasked('auth') : ''}
</div></div>` : '';

  // Scripts HTML
  const scriptsHtml = (hasPreReqScript || hasPostResScript) ? `
<div class="brunows-sec"><h3>Scripts</h3><div class="brunows-card">
${hasPreReqScript ? `<div class="brunows-kv"><span class="brunows-kv-k">pre-request</span><span class="brunows-chip">configured</span></div>` : ''}
${hasPostResScript ? `<div class="brunows-kv"><span class="brunows-kv-k">post-response</span><span class="brunows-chip">configured</span></div>` : ''}
</div></div>` : '';

  // Dotenv HTML
  const dotenvHtml = dotenvFiles.length ? `
<div class="brunows-sec"><h3>Dotenv</h3><div class="brunows-card">
<div class="brunows-pills">
${dotenvFiles.map((f) => `<span class="brunows-pill">${esc(f)}</span>`).join('')}
</div></div></div>` : '';

  const host = document.createElement('div');
  host.className = 'brunows-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-bruno">Bruno</span>
  <span class="brunows-title">${esc(name)}</span>
  ${type ? `<span class="brunows-tag">${esc(type)}</span>` : ''}
</div>
<div class="brunows-sub">${esc(subParts.join(' · '))}</div>
<div class="brunows-sec"><h3>Overview</h3><div class="brunows-card">
${kv('version', version)}
${kv('type', type)}
</div></div>
${ignoreHtml}${proxyHtml}${headersHtml}${scriptsHtml}${dotenvHtml}`;

  return { parentNode: host };
}
