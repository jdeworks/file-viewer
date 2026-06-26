import { ensureKnownUiStyle, issueList, sourcePreview, wireSourceLinks } from '../../../../../core/known-ui.js';

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
.awsc-reason{font-size:11px;color:var(--fg-2,#888);font-family:system-ui,sans-serif;letter-spacing:0;margin-left:6px;}
.awsc-line-btn{border:0;background:transparent;color:inherit;font:inherit;padding:0;text-align:left;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;}
.awsc-line-btn:hover{color:var(--accent,#2563eb);}
.awsc-count{display:inline-block;font-size:12px;color:var(--fg-2,#888);margin-left:6px;font-weight:400;}
`;

function parseIni(text) {
  const secs = {};
  let cur = null;
  const lines = (text || '').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const lineNo = i + 1;
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const sec = line.match(/^\[([^\]]+)\]/);
    if (sec) { cur = sec[1].trim(); secs[cur] = { __line: lineNo, __fields: {} }; continue; }
    if (cur) {
      const kv = line.match(/^([^=]+)=(.*)/);
      if (kv) {
        const key = kv[1].trim().toLowerCase();
        const val = kv[2].trim();
        if (!(key in secs[cur].__fields)) secs[cur].__fields[key] = { value: val, line: lineNo };
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

function field(fields, key) {
  return fields[key] || { value: '', line: 1 };
}

function row(label, entry, { masked = false, reason = '' } = {}) {
  const value = entry?.value || '';
  if (value == null || value === '') return '';
  const shown = masked ? maskKey(value) : value;
  return `<div class="awsc-row">
    <span class="awsc-key"><button class="awsc-line-btn" type="button" data-source-line="${entry.line}" title="Open ${esc(label)} in source">${esc(label)}</button></span>
    <span class="awsc-val${masked ? ' masked' : ''}" title="${esc(reason)}">${esc(shown)}</span>
    ${reason ? `<span class="awsc-reason">${esc(reason)}</span>` : ''}
  </div>`;
}

function secretRow(label, entry) {
  if (!entry?.value) return '';
  const reason = `masked because "${label}" is an AWS credential secret`;
  return `<div class="awsc-row">
    <span class="awsc-key"><button class="awsc-line-btn" type="button" data-source-line="${entry.line}" title="Open ${esc(label)} in source">${esc(label)}</button></span>
    <span class="awsc-val masked" title="${esc(reason)}">••••••••••••••••••••</span>
    <span class="awsc-reason">${esc(reason)}</span>
  </div>`;
}

function redactSource(text, profiles) {
  const lines = (text || '').split(/\r?\n/);
  for (const [, profile] of profiles) {
    const fields = profile.__fields || {};
    for (const [key, entry] of Object.entries(fields)) {
      if (!entry?.line) continue;
      if (!/aws_access_key_id|aws_secret_access_key|aws_session_token/i.test(key)) continue;
      const idx = entry.line - 1;
      const raw = lines[idx] || '';
      const eqIdx = raw.indexOf('=');
      const value = key === 'aws_access_key_id' ? maskKey(entry.value) : '••••••••••••••••••••';
      lines[idx] = eqIdx >= 0 ? raw.slice(0, eqIdx + 1) + ' ' + value : `${key} = ${value}`;
    }
  }
  return lines.join('\n');
}

function highlightIniLine(line) {
  let out = esc(line);
  out = out.replace(/^(\s*\[[^\]]+\])/, '<span style="color:#1d4ed8;font-weight:700">$1</span>');
  out = out.replace(/^(\s*[^=;\s][^=]*)(=)/, '<span style="color:#8250df">$1</span>$2');
  return out;
}

function collectIssues(profiles) {
  const issues = [];
  for (const [name, profile] of profiles) {
    const fields = profile.__fields || {};
    const key = field(fields, 'aws_access_key_id');
    if (key.value) {
      issues.push({
        severity: /prod/i.test(name) ? 'high' : 'warning',
        label: /prod/i.test(name) ? 'production key' : 'long-lived key',
        line: key.line,
        message: `${name} uses a static AWS access key. Prefer SSO, role assumption, or short-lived credentials where possible.`,
      });
    }
    const role = field(fields, 'role_arn');
    if (role.value && !fields.source_profile && !fields.credential_source) {
      issues.push({
        severity: 'info',
        label: 'role source',
        line: role.line,
        message: `${name} declares role_arn but no source_profile or credential_source in this file.`,
      });
    }
  }
  return issues;
}

export function render(intake) {
  const ini = parseIni(intake.text || '');
  const profiles = Object.entries(ini);

  const profilesHtml = profiles.map(([name, profile]) => {
    const fields = profile.__fields || {};
    const keyId = field(fields, 'aws_access_key_id');
    const secret = field(fields, 'aws_secret_access_key');
    const token = field(fields, 'aws_session_token');
    const region = field(fields, 'aws_region').value ? field(fields, 'aws_region') : field(fields, 'region');
    const roleArn = field(fields, 'role_arn');
    const sourceProfile = field(fields, 'source_profile');
    const isDefault = name === 'default';

    return `<div class="awsc-profile">
      <div class="awsc-profile-name">
        <button class="awsc-line-btn" type="button" data-source-line="${profile.__line || 1}" title="Open profile in source">${esc(name)}</button>${isDefault ? ' <span class="awsc-default-badge">default</span>' : ''}
      </div>
      ${row('aws_access_key_id', keyId, { masked: true, reason: 'masked to expose only the key fingerprint' })}
      ${secretRow('aws_secret_access_key', secret)}
      ${secretRow('aws_session_token', token)}
      ${row('region', region)}
      ${row('role_arn', roleArn)}
      ${row('source_profile', sourceProfile)}
    </div>`;
  }).join('');

  const sub = profiles.length === 1
    ? '1 profile'
    : `${profiles.length} profiles`;

  const host = document.createElement('div');
  ensureKnownUiStyle(host.ownerDocument || document);
  host.className = 'awsc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="awsc-title"><span class="badge-awsc">AWS Credentials</span>AWS Credentials<span class="awsc-count">${esc(sub)}</span></div>
<div class="awsc-sub">~/.aws/credentials — IAM access keys per profile</div>
<div class="awsc-warn"><span class="awsc-warn-icon">⚠️</span> Contains AWS credentials — handle with care. Never commit this file to version control.</div>
<div class="awsc-sec"><h3>Profiles (${profiles.length})</h3>${profilesHtml}</div>`;
  const issues = issueList(collectIssues(profiles), { title: 'Credential Review' });
  if (issues) host.insertBefore(issues, host.querySelector('.awsc-sec'));
  host.appendChild(sourcePreview(redactSource(intake.text || '', profiles), { title: 'Redacted source', collapsed: true, idPrefix: 'awsc-line', highlighter: highlightIniLine }));
  wireSourceLinks(host, { idPrefix: 'awsc-line' });
  return { parentNode: host };
}
