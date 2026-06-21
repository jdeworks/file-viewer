// Enhanced HashiCorp Vault config (vault.hcl) viewer.
// Minimal regex HCL parsing — no eval, no execution. Credential-bearing values are masked.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.vlt-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-vlt{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#000;color:#ffd814;vertical-align:middle;margin-right:8px}
.vlt-title{font-size:18px;font-weight:700;margin:0 0 4px}
.vlt-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.vlt-sec{margin:12px 0}
.vlt-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px}
.vlt-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin-bottom:8px}
.vlt-card-title{font-size:13px;font-weight:600;margin:0 0 8px;color:var(--fg,#24292f)}
.vlt-chip{display:inline-block;font-size:11px;padding:1px 8px;border-radius:8px;background:#fff7d6;border:1px solid #ffe27a;color:#5a4a00;margin:1px 3px 1px 0;font-family:ui-monospace,monospace}
.vlt-row{display:flex;gap:8px;font-size:13px;padding:3px 0;border-bottom:1px solid var(--border,#f0f0f0)}
.vlt-row:last-child{border-bottom:none}
.vlt-key{color:var(--fg-2,#888);min-width:140px;flex-shrink:0;font-size:12px}
.vlt-val{font-family:ui-monospace,monospace;word-break:break-all}
.vlt-val.masked{color:var(--fg-2,#aaa)}
`;

// Keys whose values are credentials/secrets and must be redacted.
const SECRET_KEYS = /^(token|secret|password|passwd|client_secret|access_key|secret_key|tls_key|key_id|shared_secret|api_key|auth_token)$/i;

function maskUrl(url) {
  if (!url) return url;
  return url.replace(/:\/\/([^:@/?#]+):([^@/?#]+)@/, '://$1:***@');
}

function valHtml(key, raw) {
  const v = String(raw == null ? '' : raw);
  if (SECRET_KEYS.test(key)) return { html: '<span class="vlt-val masked">[redacted]</span>', masked: true };
  return { html: esc(maskUrl(v)), masked: false };
}

// Parse top-level HCL blocks: `type "label" "label2" { body }` and bare `key = value` lines.
function parseVaultHcl(text) {
  const cleaned = text.replace(/^[ \t]*#[^\n]*/mg, '').replace(/^[ \t]*\/\/[^\n]*/mg, '');
  const blocks = [];
  const topKv = {};

  // Block matcher allowing one level of nested braces inside the body.
  const blockRe = /(\w+)\s+(?:"([^"]*)"\s*)?(?:"([^"]*)"\s*)?\{((?:[^{}]|\{[^{}]*\})*)\}/g;
  let m;
  let lastIndex = 0;
  const blockSpans = [];
  while ((m = blockRe.exec(cleaned)) !== null) {
    blockSpans.push([m.index, m.index + m[0].length]);
    const type = m[1].toLowerCase();
    const label1 = m[2] || null;
    const label2 = m[3] || null;
    const body = m[4] || '';
    const kv = {};
    const kvRe = /(\w+)\s*=\s*"([^"]*)"/g;
    let km;
    while ((km = kvRe.exec(body)) !== null) kv[km[1]] = km[2];
    const kvU = /(\w+)\s*=\s*([a-zA-Z0-9._-]+)\b(?!\s*")/g;
    while ((km = kvU.exec(body)) !== null) { if (!(km[1] in kv)) kv[km[1]] = km[2]; }
    blocks.push({ type, label1, label2, kv });
  }

  // Top-level scalar assignments (outside any block span).
  const tlRe = /^([a-z_][a-z0-9_]*)\s*=\s*("([^"]*)"|[a-zA-Z0-9._-]+)\s*$/gm;
  while ((m = tlRe.exec(cleaned)) !== null) {
    const idx = m.index;
    const insideBlock = blockSpans.some(([s, e]) => idx >= s && idx < e);
    if (insideBlock) continue;
    topKv[m[1]] = m[3] != null ? m[3] : m[2];
  }
  void lastIndex;
  return { blocks, topKv };
}

function renderKv(kv) {
  return Object.entries(kv).map(([k, v]) => {
    const { html } = valHtml(k, v);
    return `<div class="vlt-row"><span class="vlt-key">${esc(k)}</span><span class="vlt-val">${html}</span></div>`;
  }).join('');
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const name = (intake.filename || intake.name || 'vault.hcl').split('/').pop();
  const { blocks, topKv } = parseVaultHcl(text);

  const byType = (t) => blocks.filter((b) => b.type === t);
  const storages = byType('storage');
  const listeners = byType('listener');
  const seals = byType('seal');
  const telemetry = byType('telemetry');

  function cards(items, titleFn) {
    return items.map((b) => `<div class="vlt-card"><div class="vlt-card-title">${titleFn(b)}</div>${renderKv(b.kv)}</div>`).join('');
  }

  const storageHtml = storages.length
    ? `<div class="vlt-sec"><h3>Storage</h3>${cards(storages, (b) => `storage <span class="vlt-chip">${esc(b.label1 || '')}</span>`)}</div>`
    : '';
  const listenerHtml = listeners.length
    ? `<div class="vlt-sec"><h3>Listeners (${listeners.length})</h3>${cards(listeners, (b) => `listener <span class="vlt-chip">${esc(b.label1 || '')}</span>`)}</div>`
    : '';
  const sealHtml = seals.length
    ? `<div class="vlt-sec"><h3>Seal</h3>${cards(seals, (b) => `seal <span class="vlt-chip">${esc(b.label1 || '')}</span>`)}</div>`
    : '';
  const telemetryHtml = telemetry.length
    ? `<div class="vlt-sec"><h3>Telemetry</h3>${cards(telemetry, () => 'telemetry')}</div>`
    : '';

  const topRows = renderKv(topKv);
  const topHtml = topRows
    ? `<div class="vlt-sec"><h3>Server</h3><div class="vlt-card">${topRows}</div></div>`
    : '';

  const host = document.createElement('div');
  host.className = 'vlt-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="vlt-title"><span class="badge-vlt">Vault</span>${esc(name)}</div>
<div class="vlt-sub">HashiCorp Vault server configuration</div>
${storageHtml}${listenerHtml}${sealHtml}${telemetryHtml}${topHtml}`;

  return { parentNode: host };
}
