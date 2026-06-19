import { parseTOML } from '../../toml.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sbc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-sbc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#3ecf8e;color:#1a1a1a;vertical-align:middle;margin-right:8px;}
.sbc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.sbc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.sbc-sec{margin:12px 0;}
.sbc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.sbc-kv{font-size:12px;display:flex;gap:8px;align-items:baseline;margin:3px 0;}
.sbc-key{font:12px/1.4 ui-monospace,monospace;color:var(--fg-2,#888);}
.sbc-val{font:12px/1.4 ui-monospace,monospace;font-weight:600;}
.sbc-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0;}
.sbc-pill{display:inline-flex;align-items:center;font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.sbc-bool-true{color:#166534;font-weight:700;}
.sbc-bool-false{color:var(--fg-2,#888);}
`;

function kv(label, value) {
  if (value == null || value === '') return '';
  return `<div class="sbc-kv"><span class="sbc-key">${esc(label)}</span><span class="sbc-val">${esc(value)}</span></div>`;
}

function boolKv(label, value) {
  if (value == null) return '';
  const cls = value ? 'sbc-bool-true' : 'sbc-bool-false';
  return `<div class="sbc-kv"><span class="sbc-key">${esc(label)}</span><span class="sbc-val ${cls}">${value ? 'true' : 'false'}</span></div>`;
}

export function render(intake) {
  let cfg = {};
  try { cfg = parseTOML(intake.text || '') || {}; } catch { cfg = {}; }

  const projectId = cfg.project_id || '';
  const api = cfg.api || {};
  const db = cfg.db || {};
  const auth = cfg.auth || {};

  const apiPort = api.port;
  const apiSchemas = Array.isArray(api.schemas) ? api.schemas : [];
  const dbPort = db.port;
  const dbMajorVersion = db.major_version;
  const externalUrl = auth.site_url || auth.external_url || '';
  const emailAutoconfirm = auth.email && auth.email.enable_signup != null
    ? auth.email.enable_signup
    : (auth.email_autoconfirm != null ? auth.email_autoconfirm : null);

  const host = document.createElement('div');
  host.className = 'sbc-doc';

  const dbHtml = (dbPort || dbMajorVersion)
    ? `<div class="sbc-sec"><h3>Database</h3>${kv('port', dbPort)}${kv('major_version', dbMajorVersion)}</div>` : '';

  const apiHtml = (apiPort || apiSchemas.length)
    ? `<div class="sbc-sec"><h3>API</h3>${kv('port', apiPort)}${apiSchemas.length ? `<div class="sbc-kv"><span class="sbc-key">schemas</span><div class="sbc-pills" style="display:inline-flex;margin:0 0 0 4px">${apiSchemas.map((s) => `<span class="sbc-pill">${esc(s)}</span>`).join('')}</div></div>` : ''}</div>` : '';

  const authHtml = (externalUrl || emailAutoconfirm != null)
    ? `<div class="sbc-sec"><h3>Auth</h3>${kv('external_url', externalUrl)}${boolKv('email_autoconfirm', emailAutoconfirm)}</div>` : '';

  const subParts = [
    projectId ? `project: ${projectId}` : '',
    dbPort ? `db :${dbPort}` : '',
    apiPort ? `api :${apiPort}` : '',
  ].filter(Boolean);

  host.innerHTML = `<style>${CSS}</style>
<div class="sbc-title"><span class="badge-sbc">Supabase</span>${esc(projectId || 'config.toml')}</div>
<div class="sbc-sub">${esc(subParts.join(' · ') || 'Supabase project configuration')}</div>
${dbHtml}${apiHtml}${authHtml}`;

  return { parentNode: host };
}
