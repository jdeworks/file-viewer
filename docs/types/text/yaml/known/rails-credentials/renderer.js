import { loadGlobal, vendor } from '../../../../../core/script-loader.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.rc-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#CC0000;color:#fff;vertical-align:middle;margin-right:8px}
.rc-title{font-size:18px;font-weight:700;margin:0 0 4px}
.rc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.rc-sec{margin:14px 0}
.rc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.rc-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff)}
.rc-kv{display:flex;gap:8px;align-items:baseline;margin:3px 0;font-size:12px}
.rc-kv-k{color:var(--fg-2,#888);min-width:190px;font-family:ui-monospace,monospace;flex-shrink:0}
.rc-kv-v{font-family:ui-monospace,monospace;word-break:break-all}
.rc-masked{font-family:ui-monospace,monospace;color:var(--fg-2,#999);letter-spacing:2px}
.rc-info{display:flex;align-items:flex-start;gap:10px;background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:14px 16px;margin:0 0 14px;font-size:13px;color:#7f1d1d;line-height:1.6}
.rc-info-icon{font-size:22px;flex-shrink:0;margin-top:1px}
.rc-info ul{margin:6px 0 0 0;padding-left:18px}
.rc-info li{margin:2px 0}
.rc-warn{display:flex;align-items:center;gap:8px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:8px 12px;margin:0 0 12px;font-size:12px;color:#7c2d12}
`;

const ALWAYS_MASK = /secret_key_base|password|token|secret|credential|private.?key/i;

function renderRow(k, v) {
  const masked = ALWAYS_MASK.test(k);
  return `<div class="rc-kv">
    <span class="rc-kv-k">${esc(k)}</span>
    ${masked ? '<span class="rc-masked">••••••••</span>' : `<span class="rc-kv-v">${esc(String(v))}</span>`}
  </div>`;
}

function flatRows(obj, prefix = '') {
  const rows = [];
  if (!obj || typeof obj !== 'object') return rows;
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      rows.push(...flatRows(v, key));
    } else {
      rows.push([key, v]);
    }
  }
  return rows;
}

export async function render(intake) {
  const jsYaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
  const filename = (intake.name || intake.filename || '').split('/').pop() || 'credentials.yml';
  const isEncrypted = filename.endsWith('.enc');

  const host = document.createElement('div');
  host.className = 'rc-doc';

  if (isEncrypted) {
    host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px">
  <span class="rc-badge">Rails Credentials</span>
  <span class="rc-title">${esc(filename)}</span>
</div>
<div class="rc-sub">Encrypted Rails credentials file</div>
<div class="rc-info">
  <span class="rc-info-icon">&#128274;</span>
  <div>
    <strong>Encrypted file — content cannot be displayed</strong>
    <ul>
      <li>Decrypted at runtime using <code>config/master.key</code> or the <code>RAILS_MASTER_KEY</code> environment variable</li>
      <li>Edit with: <code>bin/rails credentials:edit</code></li>
      <li>View with: <code>bin/rails credentials:show</code></li>
      <li>Never commit <code>master.key</code> to version control</li>
    </ul>
  </div>
</div>`;
    return { parentNode: host };
  }

  // Plaintext credentials.yml
  const text = intake.text || '';
  let parsed = {};
  try { parsed = (jsYaml.loadAll(text) || [])[0] || {}; } catch { parsed = {}; }

  const rows = flatRows(parsed);

  const credHtml = rows.length
    ? rows.map(([k, v]) => renderRow(k, v)).join('')
    : '<div style="color:var(--fg-2);font-size:12px">No credentials found.</div>';

  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px">
  <span class="rc-badge">Rails Credentials</span>
  <span class="rc-title">${esc(filename)}</span>
</div>
<div class="rc-sub">Plaintext Rails credentials — all secret values are masked</div>
<div class="rc-warn">&#9888; Sensitive file — never commit plaintext credentials to version control</div>
<div class="rc-sec"><h3>Credentials (${rows.length})</h3>
<div class="rc-card">${credHtml}</div></div>`;

  return { parentNode: host };
}
