const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.awscfg-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-awscfg{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f90;color:#fff;vertical-align:middle;margin-right:8px;}
.awscfg-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.awscfg-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.awscfg-sec{margin:12px 0;}
.awscfg-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.awscfg-profile{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;margin:8px 0;background:var(--bg,#fff);}
.awscfg-profile-name{font:13px/1.4 ui-monospace,monospace;font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:6px;}
.awscfg-default-badge{display:inline-block;font-size:10px;padding:1px 7px;border-radius:8px;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;font-family:system-ui,sans-serif;font-weight:600;}
.awscfg-row{display:flex;gap:8px;font-size:13px;padding:2px 0;}
.awscfg-key{color:var(--fg-2,#888);min-width:180px;flex-shrink:0;font-size:12px;font-family:ui-monospace,monospace;}
.awscfg-val{font-family:ui-monospace,monospace;word-break:break-all;}
.awscfg-count{display:inline-block;font-size:12px;color:var(--fg-2,#888);margin-left:6px;font-weight:400;}
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

function row(label, value) {
  if (value == null || value === '') return '';
  return `<div class="awscfg-row"><span class="awscfg-key">${esc(label)}</span><span class="awscfg-val">${esc(value)}</span></div>`;
}

export function render(intake) {
  const ini = parseIni(intake.text || '');

  // Normalize section names: "profile foo" -> display "foo", "default" -> "default"
  const profiles = Object.entries(ini).map(([rawName, fields]) => {
    const displayName = rawName.startsWith('profile ') ? rawName.slice(8).trim() : rawName;
    return { displayName, isDefault: rawName === 'default', fields };
  });

  const profilesHtml = profiles.map(({ displayName, isDefault, fields }) => {
    const region = fields['region'] || '';
    const output = fields['output'] || '';
    const roleArn = fields['role_arn'] || '';
    const sourceProfile = fields['source_profile'] || '';
    const mfaSerial = fields['mfa_serial'] || '';

    return `<div class="awscfg-profile">
      <div class="awscfg-profile-name">
        ${esc(displayName)}${isDefault ? ' <span class="awscfg-default-badge">default</span>' : ''}
      </div>
      ${row('region', region)}
      ${row('output', output)}
      ${row('role_arn', roleArn)}
      ${row('source_profile', sourceProfile)}
      ${row('mfa_serial', mfaSerial)}
    </div>`;
  }).join('');

  const sub = profiles.length === 1 ? '1 profile' : `${profiles.length} profiles`;

  const host = document.createElement('div');
  host.className = 'awscfg-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="awscfg-title"><span class="badge-awscfg">AWS Config</span>AWS Config<span class="awscfg-count">${esc(sub)}</span></div>
<div class="awscfg-sub">~/.aws/config — CLI settings and profile configuration</div>
<div class="awscfg-sec"><h3>Profiles (${profiles.length})</h3>${profilesHtml}</div>`;
  return { parentNode: host };
}
