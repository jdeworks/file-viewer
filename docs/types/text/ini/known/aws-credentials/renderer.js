const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.awsc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-awsc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f90;color:#fff;vertical-align:middle;margin-right:8px;}
.awsc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.awsc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 10px;}
.awsc-warn{display:flex;align-items:center;gap:8px;background:#fff8e1;border:1px solid #ffd54f;border-radius:8px;padding:8px 12px;margin:0 0 14px;font-size:12px;color:#795548;}
.awsc-warn-icon{font-size:18px;flex-shrink:0;}
.awsc-sec{margin:12px 0;}
.awsc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.awsc-profile{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:8px 0;background:var(--bg,#fff);}
.awsc-profile-name{font:13px/1.4 ui-monospace,monospace;font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:6px;}
.awsc-default-badge{display:inline-block;font-size:10px;padding:1px 7px;border-radius:8px;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;font-family:system-ui,sans-serif;font-weight:600;}
.awsc-row{display:flex;gap:8px;font-size:13px;padding:2px 0;}
.awsc-key{color:var(--fg-2,#888);min-width:180px;flex-shrink:0;font-size:12px;font-family:ui-monospace,monospace;}
.awsc-val{font-family:ui-monospace,monospace;word-break:break-all;}
.awsc-val.masked{color:var(--fg-2,#888);letter-spacing:0.05em;}
.awsc-count{display:inline-block;font-size:12px;color:var(--fg-2,#888);margin-left:6px;font-weight:400;}
`;

function parseIni(text) {
  const secs = {};
  let cur = null;
  for (const rawLine of (text || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const sec = line.match(/^\[([^\]]+)\]/);
    if (sec) { cur = sec[1].trim(); secs[cur] = {}; continue; }
    if (cur) {
      const kv = line.match(/^([^=]+)=(.*)/);
      if (kv) {
        const key = kv[1].trim().toLowerCase();
        const val = kv[2].trim();
        if (!(key in secs[cur])) secs[cur][key] = val;
      }
    }
  }
  return secs;
}

function maskKey(val) {
  if (!val) return '****';
  const s = String(val);
  if (s.length <= 8) return s.slice(0, 4) + '****';
  return s.slice(0, 4) + '••••••••' + s.slice(-4);
}

function row(label, value, masked = false) {
  if (value == null || value === '') return '';
  return `<div class="awsc-row"><span class="awsc-key">${esc(label)}</span><span class="awsc-val${masked ? ' masked' : ''}">${esc(value)}</span></div>`;
}

export function render(intake) {
  const ini = parseIni(intake.text || '');
  const profiles = Object.entries(ini);

  const profilesHtml = profiles.map(([name, fields]) => {
    const keyId = fields['aws_access_key_id'] || '';
    const region = fields['aws_region'] || fields['region'] || '';
    const roleArn = fields['role_arn'] || '';
    const isDefault = name === 'default';

    return `<div class="awsc-profile">
      <div class="awsc-profile-name">
        ${esc(name)}${isDefault ? ' <span class="awsc-default-badge">default</span>' : ''}
      </div>
      ${row('aws_access_key_id', keyId ? maskKey(keyId) : '', false)}
      ${row('aws_secret_access_key', '••••••••••••••••••••', true)}
      ${region ? row('region', region) : ''}
      ${roleArn ? row('role_arn', roleArn) : ''}
    </div>`;
  }).join('');

  const sub = profiles.length === 1
    ? '1 profile'
    : `${profiles.length} profiles`;

  const host = document.createElement('div');
  host.className = 'awsc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="awsc-title"><span class="badge-awsc">AWS Credentials</span>AWS Credentials<span class="awsc-count">${esc(sub)}</span></div>
<div class="awsc-sub">~/.aws/credentials — IAM access keys per profile</div>
<div class="awsc-warn"><span class="awsc-warn-icon">⚠️</span> Contains AWS credentials — handle with care. Never commit this file to version control.</div>
<div class="awsc-sec"><h3>Profiles (${profiles.length})</h3>${profilesHtml}</div>`;
  return { parentNode: host };
}
