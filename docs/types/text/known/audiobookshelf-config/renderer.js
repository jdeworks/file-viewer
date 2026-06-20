const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.abs-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.abs-badge{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#1a7bc4;color:#fff;vertical-align:middle;margin-right:8px;}
.abs-title{font-size:18px;font-weight:700;margin:0 0 4px;display:inline;}
.abs-sub{font-size:12px;color:var(--fg-2,#888);margin:4px 0 14px;}
.abs-sec{margin:12px 0;}
.abs-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.abs-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px;padding:10px 14px;margin-bottom:8px;}
.abs-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;}
.abs-key{color:var(--fg-2,#888);font-size:12px;min-width:220px;flex-shrink:0;}
.abs-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.abs-chip{display:inline-block;font-size:11px;padding:1px 7px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:1px 2px 1px 0;}
.abs-masked{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#888);font-style:italic;}
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

const SENSITIVE = /secret|password|token|key|api|private/i;

function chip(val) {
  if (val == null || val === '') return '';
  const s = String(val);
  return `<span class="abs-chip">${esc(s.length > 80 ? s.slice(0, 77) + '…' : s)}</span>`;
}

function masked() {
  return '<span class="abs-masked">[configured]</span>';
}

function row(label, html) {
  if (!html) return '';
  return `<div class="abs-row"><span class="abs-key">${esc(label)}</span><span class="abs-val">${html}</span></div>`;
}

function valOrMasked(kv, key) {
  const val = kv[key];
  if (val == null || val === '') return '';
  return SENSITIVE.test(key) ? masked() : chip(val);
}

export function render(intake) {
  const kv = parseKV(intake.text || '');

  // Server section
  const serverRows = [
    kv['PORT'] != null ? row('PORT', chip(kv['PORT'])) : '',
    kv['HOST'] != null ? row('HOST', chip(kv['HOST'])) : '',
    kv['NODE_ENV'] != null ? row('NODE_ENV', chip(kv['NODE_ENV'])) : '',
  ].filter(Boolean).join('');

  // Paths section
  const pathRows = [
    kv['CONFIG_PATH'] != null ? row('CONFIG_PATH', chip(kv['CONFIG_PATH'])) : '',
    kv['METADATA_PATH'] != null ? row('METADATA_PATH', chip(kv['METADATA_PATH'])) : '',
  ].filter(Boolean).join('');

  // Auth section
  const authRows = [
    kv['TOKEN_SECRET'] != null ? row('TOKEN_SECRET', masked()) : '',
    kv['SOCIAL_AUTH'] != null && kv['SOCIAL_AUTH'] !== '' ? row('SOCIAL_AUTH', chip(kv['SOCIAL_AUTH'])) : '',
  ].filter(Boolean).join('');

  // System section
  const systemRows = [
    kv['AUDIOBOOKSHELF_UID'] != null ? row('AUDIOBOOKSHELF_UID', chip(kv['AUDIOBOOKSHELF_UID'])) : '',
    kv['AUDIOBOOKSHELF_GID'] != null ? row('AUDIOBOOKSHELF_GID', chip(kv['AUDIOBOOKSHELF_GID'])) : '',
    kv['TZ'] != null ? row('TZ', chip(kv['TZ'])) : '',
  ].filter(Boolean).join('');

  let body = '';
  if (serverRows) body += `<div class="abs-sec"><h3>Server</h3><div class="abs-card">${serverRows}</div></div>`;
  if (pathRows) body += `<div class="abs-sec"><h3>Paths</h3><div class="abs-card">${pathRows}</div></div>`;
  if (authRows) body += `<div class="abs-sec"><h3>Auth</h3><div class="abs-card">${authRows}</div></div>`;
  if (systemRows) body += `<div class="abs-sec"><h3>System</h3><div class="abs-card">${systemRows}</div></div>`;

  const host = document.createElement('div');
  host.className = 'abs-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="margin-bottom:4px;"><span class="abs-badge">Audiobookshelf</span><span class="abs-title">Config</span></div>
<div class="abs-sub">Audiobookshelf self-hosted audiobook and podcast server configuration</div>
${body || '<div style="color:var(--fg-2,#888);font-size:13px;">No configuration found.</div>'}`;

  return { parentNode: host };
}
