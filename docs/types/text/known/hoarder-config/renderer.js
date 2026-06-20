const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.hoarder-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.hoarder-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f59e0b;color:#fff;vertical-align:middle;margin-right:8px;}
.hoarder-title{font-size:20px;font-weight:700;margin:0 0 2px;font-family:ui-monospace,monospace;}
.hoarder-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.hoarder-sec{margin:14px 0;}
.hoarder-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.hoarder-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.hoarder-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.hoarder-kv-k{color:var(--fg-2,#888);min-width:200px;flex-shrink:0;}
.hoarder-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.hoarder-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);font-style:italic;}
`;

function parseKV(text) {
  const result = {};
  for (const line of (text || '').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    result[t.slice(0, eq).trim()] = val;
  }
  return result;
}

const SENSITIVE_RE = /SECRET|TOKEN|KEY|API|PASSWORD/i;

function isSensitive(key) {
  return SENSITIVE_RE.test(key);
}

function kv(label, value, masked) {
  if (value == null || value === '') return '';
  const valHtml = masked
    ? `<span class="hoarder-masked">[configured]</span>`
    : `<span class="hoarder-kv-v">${esc(String(value))}</span>`;
  return `<div class="hoarder-kv"><span class="hoarder-kv-k">${esc(label)}</span>${valHtml}</div>`;
}

function row(cfg, key, masked) {
  const val = cfg[key];
  if (val == null || val === '') return '';
  const useMasked = masked || isSensitive(key);
  return kv(key, val, useMasked);
}

export function render(intake) {
  const cfg = parseKV(intake.text);

  const appUrl = cfg['NEXTAUTH_URL'] || '';
  const version = cfg['HOARDER_VERSION'] || cfg['KARAKEEP_VERSION'] || '';
  const subParts = [appUrl, version ? `v${version}` : null].filter(Boolean).join(' · ');

  // App section
  const appHtml = `<div class="hoarder-sec"><h3>App</h3><div class="hoarder-card">
${row(cfg, 'NEXTAUTH_URL')}
${row(cfg, 'HOARDER_VERSION')}
${row(cfg, 'KARAKEEP_VERSION')}
${row(cfg, 'NODE_ENV')}
</div></div>`;

  // Auth section
  const authHtml = `<div class="hoarder-sec"><h3>Auth</h3><div class="hoarder-card">
${row(cfg, 'NEXTAUTH_SECRET', true)}
${row(cfg, 'HOARDER_SERVER_SECRET_KEY', true)}
</div></div>`;

  // Search section
  const searchHtml = `<div class="hoarder-sec"><h3>Search</h3><div class="hoarder-card">
${row(cfg, 'MEILI_ADDR')}
${row(cfg, 'MEILI_MASTER_KEY', true)}
</div></div>`;

  // AI/Inference section
  const aiHtml = `<div class="hoarder-sec"><h3>AI / Inference</h3><div class="hoarder-card">
${row(cfg, 'OPENAI_API_KEY', true)}
${row(cfg, 'INFERENCE_TEXT_MODEL')}
${row(cfg, 'INFERENCE_IMAGE_MODEL')}
${row(cfg, 'OLLAMA_BASE_URL')}
</div></div>`;

  // Storage section
  const storageHtml = `<div class="hoarder-sec"><h3>Storage</h3><div class="hoarder-card">
${row(cfg, 'DATA_DIR')}
${row(cfg, 'MAX_ASSET_SIZE_MB')}
</div></div>`;

  const host = document.createElement('div');
  host.className = 'hoarder-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="hoarder-badge">Hoarder / Karakeep</span>
  <span class="hoarder-title">Hoarder / Karakeep Bookmark Manager</span>
</div>
<div class="hoarder-sub">${esc(subParts)}</div>
${appHtml}${authHtml}${searchHtml}${aiHtml}${storageHtml}`;
  return { parentNode: host };
}
