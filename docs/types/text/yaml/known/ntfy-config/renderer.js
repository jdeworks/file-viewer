import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ntfy-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-ntfy{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#4f46e5;color:#fff;vertical-align:middle;margin-right:8px;}
.ntfy-title{font-size:20px;font-weight:700;margin:0 0 2px;font-family:ui-monospace,monospace;}
.ntfy-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 16px;}
.ntfy-sec{margin:14px 0;}
.ntfy-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.ntfy-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.ntfy-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:13px;}
.ntfy-kv-k{color:var(--fg-2,#888);min-width:180px;flex-shrink:0;}
.ntfy-kv-v{font-family:ui-monospace,monospace;word-break:break-all;}
.ntfy-bool-yes{color:#1b5e20;font-weight:600;}
.ntfy-bool-no{color:#b71c1c;font-weight:600;}
.ntfy-chip{display:inline-block;padding:1px 8px;border-radius:9px;font-size:11px;font-weight:700;}
.ntfy-chip-green{background:#d4edda;color:#1b5e20;}
.ntfy-chip-orange{background:#fff3cd;color:#7c4a00;}
.ntfy-chip-red{background:#fde8e8;color:#7f1d1d;}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="ntfy-kv"><span class="ntfy-kv-k">${esc(label)}</span><span class="ntfy-kv-v">${esc(String(value))}</span></div>`;
}

function bool(label, value) {
  if (value == null) return '';
  const on = value === true || value === 'true';
  return `<div class="ntfy-kv"><span class="ntfy-kv-k">${esc(label)}</span><span class="${on ? 'ntfy-bool-yes' : 'ntfy-bool-no'}">${on ? 'yes' : 'no'}</span></div>`;
}

function accessChip(value) {
  if (value == null || value === '') return '';
  let cls = 'ntfy-chip-green';
  if (value === 'read-only') cls = 'ntfy-chip-orange';
  else if (value === 'deny-all') cls = 'ntfy-chip-red';
  return `<div class="ntfy-kv"><span class="ntfy-kv-k">auth-default-access</span><span class="ntfy-chip ${cls}">${esc(value)}</span></div>`;
}

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = jsyaml.load(intake.text || '') || {};
  } catch { cfg = intake.parsed || {}; }

  const title = cfg['base-url'] || 'ntfy Notification Server';

  // Server section
  const serverHtml = `<div class="ntfy-sec"><h3>Server</h3><div class="ntfy-card">
${kv('base-url', cfg['base-url'])}
${kv('listen-http', cfg['listen-http'])}
${kv('listen-https', cfg['listen-https'])}
${bool('behind-proxy', cfg['behind-proxy'])}
</div></div>`;

  // Auth section
  const authHtml = `<div class="ntfy-sec"><h3>Auth</h3><div class="ntfy-card">
${accessChip(cfg['auth-default-access'])}
${kv('auth-file', cfg['auth-file'])}
</div></div>`;

  // Cache section
  const cacheHtml = (cfg['cache-file'] || cfg['cache-duration'] || cfg['cache-startup-queries'] != null) ? `<div class="ntfy-sec"><h3>Cache</h3><div class="ntfy-card">
${kv('cache-file', cfg['cache-file'])}
${kv('cache-duration', cfg['cache-duration'])}
${kv('cache-startup-queries', cfg['cache-startup-queries'])}
</div></div>` : '';

  // Attachments section
  const attachHtml = (cfg['attachment-cache-dir'] || cfg['attachment-total-size-limit'] || cfg['attachment-file-size-limit']) ? `<div class="ntfy-sec"><h3>Attachments</h3><div class="ntfy-card">
${kv('attachment-cache-dir', cfg['attachment-cache-dir'])}
${kv('attachment-total-size-limit', cfg['attachment-total-size-limit'])}
${kv('attachment-file-size-limit', cfg['attachment-file-size-limit'])}
</div></div>` : '';

  // Email (SMTP) section — only if cfg.smtp exists
  const smtpHtml = cfg['smtp'] ? `<div class="ntfy-sec"><h3>Email (SMTP)</h3><div class="ntfy-card">
${kv('listen-addr', cfg['smtp']['listen-addr'])}
${kv('domain', cfg['smtp']['domain'])}
</div></div>` : '';

  // Upstream section — only if set
  const upstreamHtml = cfg['upstream-base-url'] ? `<div class="ntfy-sec"><h3>Upstream</h3><div class="ntfy-card">
${kv('upstream-base-url', cfg['upstream-base-url'])}
</div></div>` : '';

  const host = document.createElement('div');
  host.className = 'ntfy-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-ntfy">ntfy</span>
  <span class="ntfy-title">${esc(title)}</span>
</div>
<div class="ntfy-sub">${esc(cfg['listen-http'] ? `listening on ${cfg['listen-http']}` : '')}</div>
${serverHtml}${authHtml}${cacheHtml}${attachHtml}${smtpHtml}${upstreamHtml}`;
  return { parentNode: host };
}
