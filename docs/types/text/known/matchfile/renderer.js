const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.mf-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-mf{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00b4a0;color:#fff;vertical-align:middle;margin-right:8px;}
.mf-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.mf-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.mf-sec{margin:14px 0;}
.mf-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.mf-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;display:grid;grid-template-columns:max-content 1fr;gap:6px 14px;font-size:13px;}
.mf-lbl{color:var(--fg-2,#888);font-size:12px;white-space:nowrap;align-self:start;padding-top:1px;}
.mf-val{font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;}
.mf-chip{display:inline-block;font-size:11px;padding:2px 9px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);margin:1px 3px 1px 0;}
.mf-chip.appstore{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8;}
.mf-chip.adhoc{background:#fef9c3;border-color:#fde047;color:#854d0e;}
.mf-chip.development{background:#f0fdf4;border-color:#86efac;color:#166534;}
.mf-chip.enterprise{background:#faf5ff;border-color:#d8b4fe;color:#7e22ce;}
.mf-ids{display:flex;flex-wrap:wrap;gap:4px;}
`;

function extractVal(text, key) {
  // matches: storage_mode("val") or storage_mode "val" or storage_mode('val')
  const re = new RegExp(`^\\s*${key}\\s*[\\(\\s]['"\\[]?([^'"\\]\\)\\n]+)['"\\]\\)]?`, 'm');
  const m = text.match(re);
  return m ? m[1].trim() : '';
}

function extractArray(text, key) {
  // matches: app_identifier(["a", "b"]) or app_identifier ["a"] or single string
  const re = new RegExp(`^\\s*${key}\\s*[\\(\\s]([^\\n]+)`, 'm');
  const m = text.match(re);
  if (!m) return [];
  const chunk = m[1];
  const vals = [...chunk.matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]);
  return vals;
}

function redactUrl(url) {
  try {
    const u = new URL(url);
    if (u.password) u.password = '***';
    if (u.username) u.username = '***';
    // also redact tokens in path segments that look like secrets (long hex/base64)
    u.pathname = u.pathname.replace(/\/[a-f0-9]{20,}(\/|$)/gi, '/***$1');
    return u.toString();
  } catch {
    return url.replace(/:[^@]{6,}@/, ':***@');
  }
}

const STORAGE_LABELS = { git: 'Git', s3: 'Amazon S3', google_cloud: 'Google Cloud', gitlab: 'GitLab', 's3-bucket': 'Amazon S3' };

export function render(intake) {
  const text = intake.text || '';

  const storageMode = extractVal(text, 'storage_mode') || extractVal(text, 'storage_mode');
  const gitUrl = extractVal(text, 'git_url') || extractVal(text, 'git_url');
  const username = extractVal(text, 'username');
  const teamId = extractVal(text, 'team_id');
  const type = extractVal(text, 'type');

  // app_identifier can be a single string or array
  let appIds = extractArray(text, 'app_identifier');
  if (!appIds.length) {
    const single = extractVal(text, 'app_identifier');
    if (single) appIds = [single];
  }

  // type can be single or comma-split
  const types = type ? type.split(',').map((t) => t.trim().replace(/['"]/g, '')).filter(Boolean) : [];

  const storageName = STORAGE_LABELS[storageMode] || storageMode;
  const redactedUrl = gitUrl ? redactUrl(gitUrl) : '';

  const cardRows = [
    storageMode && `<div class="mf-lbl">Storage mode</div><div class="mf-val">${esc(storageName || storageMode)}</div>`,
    types.length && `<div class="mf-lbl">Cert type${types.length !== 1 ? 's' : ''}</div><div class="mf-val">${types.map((t) => `<span class="mf-chip ${esc(t)}">${esc(t)}</span>`).join('')}</div>`,
    username && `<div class="mf-lbl">Apple ID</div><div class="mf-val">${esc(username)}</div>`,
    teamId && `<div class="mf-lbl">Team ID</div><div class="mf-val">${esc(teamId)}</div>`,
    redactedUrl && `<div class="mf-lbl">Repository</div><div class="mf-val">${esc(redactedUrl)}</div>`,
  ].filter(Boolean).join('');

  const host = document.createElement('div');
  host.className = 'mf-doc';

  host.innerHTML = `<style>${CSS}</style>
<div class="mf-title"><span class="badge-mf">Match</span>Matchfile</div>
<div class="mf-sub">Fastlane Match · certificate management${storageName ? ` · ${esc(storageName)}` : ''}</div>
${cardRows ? `<div class="mf-sec"><div class="mf-card">${cardRows}</div></div>` : ''}
${appIds.length ? `<div class="mf-sec"><h3>App identifier${appIds.length !== 1 ? 's' : ''}</h3>
  <div class="mf-ids">${appIds.map((id) => `<span class="mf-chip">${esc(id)}</span>`).join('')}</div>
</div>` : ''}`;

  return { parentNode: host };
}
