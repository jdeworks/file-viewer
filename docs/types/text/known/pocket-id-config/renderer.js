const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pocketid-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-pocketid{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#4f46e5;color:#fff;vertical-align:middle;margin-right:8px;}
.pocketid-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.pocketid-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.pocketid-sec{margin:14px 0;}
.pocketid-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;}
.pocketid-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);}
.pocketid-row{display:flex;align-items:baseline;gap:6px;margin-bottom:4px;font-size:13px;}
.pocketid-key{color:var(--fg-2,#888);font:12px/1.6 ui-monospace,monospace;min-width:220px;flex-shrink:0;}
.pocketid-val{font:12px/1.6 ui-monospace,monospace;word-break:break-all;}
.pocketid-masked{font:12px/1.6 ui-monospace,monospace;color:var(--fg-2,#888);font-style:italic;}
`;

const SENSITIVE_PATTERN = /SECRET|PASSWORD|TOKEN|KEY|API|PRIVATE/i;

/** Parse KEY=VALUE config, skip # comments and blank lines. */
function parseKV(text) {
  const out = {};
  for (const raw of text.split('\n')) {
    let line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('export ')) line = line.slice(7).trim();
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key && !(key in out)) out[key] = val;
  }
  return out;
}

function masked() {
  return '<span class="pocketid-masked">[configured]</span>';
}

function row(label, value) {
  if (value == null || value === '') return '';
  const isSensitive = SENSITIVE_PATTERN.test(label);
  const display = isSensitive ? masked() : `<span class="pocketid-val">${esc(value)}</span>`;
  return `<div class="pocketid-row"><span class="pocketid-key">${esc(label)}</span>${display}</div>`;
}

export function render(intake) {
  const kv = parseKV(intake.text || '');

  // App section
  const appRows = [
    row('PUBLIC_APP_URL', kv['PUBLIC_APP_URL']),
    row('APP_NAME', kv['APP_NAME']),
    row('ENVIRONMENT', kv['ENVIRONMENT']),
  ].filter(Boolean).join('');

  // Security section
  const secRows = [
    row('TRUST_PROXY', kv['TRUST_PROXY']),
    row('SESSION_SECRET', kv['SESSION_SECRET']),
    row('MAX_LOGIN_ATTEMPTS', kv['MAX_LOGIN_ATTEMPTS']),
    row('LOCKOUT_DURATION', kv['LOCKOUT_DURATION']),
  ].filter(Boolean).join('');

  // SMTP section
  const smtpRows = [
    row('SMTP_HOST', kv['SMTP_HOST']),
    row('SMTP_PORT', kv['SMTP_PORT']),
    row('SMTP_FROM', kv['SMTP_FROM']),
    row('SMTP_USER', kv['SMTP_USER']),
    row('SMTP_PASSWORD', kv['SMTP_PASSWORD']),
  ].filter(Boolean).join('');

  // Auth section
  const authRows = [
    row('ALLOW_REGISTRATION', kv['ALLOW_REGISTRATION']),
    row('DISABLE_ANIMATIONS', kv['DISABLE_ANIMATIONS']),
  ].filter(Boolean).join('');

  let body = '';
  if (appRows) body += `<div class="pocketid-sec"><h3>App</h3><div class="pocketid-card">${appRows}</div></div>`;
  if (secRows) body += `<div class="pocketid-sec"><h3>Security</h3><div class="pocketid-card">${secRows}</div></div>`;
  if (smtpRows) body += `<div class="pocketid-sec"><h3>SMTP / Email</h3><div class="pocketid-card">${smtpRows}</div></div>`;
  if (authRows) body += `<div class="pocketid-sec"><h3>Auth</h3><div class="pocketid-card">${authRows}</div></div>`;

  const appUrl = kv['PUBLIC_APP_URL'] || '';
  const appName = kv['APP_NAME'] || 'Pocket ID';
  const env = kv['ENVIRONMENT'] || '';
  const subParts = [];
  if (appUrl) subParts.push(appUrl);
  if (env) subParts.push(env);
  const sub = subParts.join(' · ');

  const host = document.createElement('div');
  host.className = 'pocketid-doc';
  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-pocketid">Pocket ID</span>
  <span class="pocketid-title">${esc(appName)}</span>
</div>
<div class="pocketid-sub">${esc(sub || 'Pocket ID OIDC identity provider configuration')}</div>
${body}`;

  return { parentNode: host };
}
