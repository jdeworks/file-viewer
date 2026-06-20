import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.thanoscfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-thanos{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00B4CC;color:#fff;vertical-align:middle;margin-right:8px;}
.thanoscfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.thanoscfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.thanoscfg-sec{margin:14px 0;}
.thanoscfg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.thanoscfg-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:6px 0;background:var(--bg,#fff);}
.thanoscfg-kv{display:flex;gap:8px;align-items:baseline;margin:2px 0;font-size:12px;}
.thanoscfg-kv-k{color:var(--fg-2,#888);min-width:130px;}
.thanoscfg-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.thanoscfg-pills{display:flex;flex-wrap:wrap;gap:6px;}
.thanoscfg-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.thanoscfg-tag{display:inline-block;font-size:11px;padding:2px 7px;border-radius:5px;background:#e0f7fa;border:1px solid #80deea;color:#006064;margin-left:4px;}
.thanoscfg-redacted{font-size:11px;padding:2px 6px;border-radius:4px;background:#f1f8e9;border:1px solid #aed581;color:#33691e;font-family:ui-monospace,monospace;}
`;

const REDACTED_KEYS = new Set(['secret_key', 'secret_access_key', 'password', 'token', 'private_key', 'client_secret']);

function kv(label, value, redact = false) {
  if (value == null || value === '') return '';
  const display = redact ? `<span class="thanoscfg-redacted">[configured]</span>` : `<span class="thanoscfg-kv-v">${esc(value)}</span>`;
  return `<div class="thanoscfg-kv"><span class="thanoscfg-kv-k">${esc(label)}</span>${display}</div>`;
}

function renderConfig(config) {
  if (!config || typeof config !== 'object') return '';
  return Object.entries(config)
    .filter(([, v]) => v != null && v !== '' && typeof v !== 'object')
    .map(([k, v]) => kv(k, String(v), REDACTED_KEYS.has(k)))
    .join('');
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || '') || [])[0] || {};
  } catch { cfg = {}; }

  const storageType = cfg.type || '';
  const config = cfg.config || {};
  const bucket = config.bucket || '';
  const endpoint = config.endpoint || '';
  const region = config.region || '';
  const prefix = config.prefix || '';

  const storageHtml = `
<div class="thanoscfg-sec"><h3>Object Storage</h3><div class="thanoscfg-card">
${kv('type', storageType)}
${kv('bucket', bucket)}
${kv('endpoint', endpoint)}
${kv('region', region)}
${prefix ? kv('prefix', prefix) : ''}
${renderConfig(config)}
</div></div>`;

  // HTTP config if present
  const httpConfig = config.http_config || {};
  const httpHtml = Object.keys(httpConfig).length ? `
<div class="thanoscfg-sec"><h3>HTTP Config</h3><div class="thanoscfg-card">
${Object.entries(httpConfig).filter(([, v]) => v != null && typeof v !== 'object').map(([k, v]) => kv(k, String(v))).join('')}
</div></div>` : '';

  const sub = [storageType, bucket ? `bucket: ${bucket}` : '', region].filter(Boolean).join(' · ');

  const host = document.createElement('div');
  host.className = 'thanoscfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-thanos">Thanos</span>
  <span class="thanoscfg-title">Object Storage Config</span>
  ${storageType ? `<span class="thanoscfg-tag">${esc(storageType)}</span>` : ''}
</div>
<div class="thanoscfg-sub">${esc(sub)}</div>
${storageHtml}${httpHtml}`;
  return { parentNode: host };
}
