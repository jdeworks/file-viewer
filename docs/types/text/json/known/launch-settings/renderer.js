// Enhanced launchSettings.json view. Rendered in the parent pane (trusted DOM).
// Shows each launch profile with commandName, applicationUrl, environmentVariables,
// and dotnetRunMessages.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ls-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.ls-head{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
.badge-ls{display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;background:#1e7e34;color:#fff;vertical-align:middle;}
.ls-title{font-size:18px;font-weight:700;margin:0;}
.ls-count{font-size:13px;color:var(--fg-2,#888);margin-bottom:12px;}
.ls-profile{border:1px solid var(--border,#e8eaed);border-radius:8px;padding:12px 14px;margin-bottom:12px;}
.ls-profile-name{font-size:15px;font-weight:700;color:var(--fg,#24292f);margin-bottom:6px;display:flex;align-items:center;gap:8px;}
.ls-cmd{display:inline-block;padding:1px 8px;border-radius:8px;font-size:11px;font-weight:600;background:#e8f5e9;color:#1e7e34;border:1px solid #9ae6b4;font-family:ui-monospace,monospace;}
.ls-url-list{list-style:none;margin:4px 0;padding:0;}
.ls-url{font-family:ui-monospace,monospace;font-size:13px;color:#0366d6;}
.ls-env-section{margin-top:8px;}
.ls-env-label{font-size:11px;font-weight:600;color:var(--fg-2,#888);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;}
.ls-env-list{list-style:none;margin:0;padding:0;}
.ls-env-item{display:grid;grid-template-columns:180px 1fr;gap:8px;font-size:12px;padding:2px 0;}
.ls-env-key{font-family:ui-monospace,monospace;font-weight:600;color:#1e7e34;}
.ls-env-val{font-family:ui-monospace,monospace;color:var(--fg,#24292f);}
.ls-env-val.env-dev{color:#1e7e34;}
.ls-env-val.env-prod{color:#c62828;}
.ls-meta-row{display:flex;gap:6px;align-items:center;font-size:12px;color:var(--fg-2,#888);margin-top:4px;}
.ls-tag{display:inline-block;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:600;background:#f0faf0;color:#1e7e34;border:1px solid #9ae6b4;}
.ls-empty{color:var(--fg-2,#888);font-size:13px;font-style:italic;}
.ls-err{color:#c62828;font-size:13px;}
`;

function envClass(val) {
  if (/^development$/i.test(val)) return ' env-dev';
  if (/^production$/i.test(val)) return ' env-prod';
  return '';
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const host = document.createElement('div');
  host.className = 'ls-doc';

  let data = null;
  try { data = JSON.parse(text); } catch (e) {
    host.innerHTML = `<style>${CSS}</style><p class="ls-err">Failed to parse JSON: ${esc(e.message)}</p>`;
    return { parentNode: host };
  }

  const profiles = (data && typeof data.profiles === 'object' && data.profiles !== null)
    ? Object.entries(data.profiles)
    : [];

  if (!profiles.length) {
    host.innerHTML = `<style>${CSS}</style>
<div class="ls-head"><span class="badge-ls">ASP.NET Core</span><div class="ls-title">launchSettings.json</div></div>
<p class="ls-empty">No launch profiles defined.</p>`;
    return { parentNode: host };
  }

  const profileCards = profiles.map(([name, prof]) => {
    const cmdName = prof.commandName || '';
    const appUrl = prof.applicationUrl || '';
    const envVars = (prof.environmentVariables && typeof prof.environmentVariables === 'object')
      ? Object.entries(prof.environmentVariables) : [];
    const dotnetRunMessages = prof.dotnetRunMessages;
    const launchBrowser = prof.launchBrowser;
    const launchUrl = prof.launchUrl || '';

    const urls = appUrl ? appUrl.split(';').map((u) => u.trim()).filter(Boolean) : [];
    const urlHtml = urls.length
      ? `<ul class="ls-url-list">${urls.map((u) => `<li class="ls-url">${esc(u)}</li>`).join('')}</ul>`
      : '';

    const envHtml = envVars.length
      ? `<div class="ls-env-section"><div class="ls-env-label">Environment Variables</div><ul class="ls-env-list">${envVars.map(([k, v]) =>
          `<li class="ls-env-item"><span class="ls-env-key">${esc(k)}</span><span class="ls-env-val${envClass(String(v))}">${esc(String(v))}</span></li>`
        ).join('')}</ul></div>`
      : '';

    const metaParts = [];
    if (dotnetRunMessages != null) metaParts.push(`dotnetRunMessages: ${esc(String(dotnetRunMessages))}`);
    if (launchBrowser != null) metaParts.push(`launchBrowser: ${esc(String(launchBrowser))}`);
    if (launchUrl) metaParts.push(`launchUrl: ${esc(launchUrl)}`);
    const metaHtml = metaParts.length
      ? `<div class="ls-meta-row">${metaParts.join(' · ')}</div>`
      : '';

    return `<div class="ls-profile">
      <div class="ls-profile-name">${esc(name)}${cmdName ? `<span class="ls-cmd">${esc(cmdName)}</span>` : ''}</div>
      ${urlHtml}
      ${envHtml}
      ${metaHtml}
    </div>`;
  }).join('');

  host.innerHTML = `<style>${CSS}</style>
<div class="ls-head">
  <span class="badge-ls">ASP.NET Core</span>
  <div class="ls-title">launchSettings.json</div>
</div>
<div class="ls-count">${profiles.length} launch profile${profiles.length !== 1 ? 's' : ''}</div>
${profileCards}`;

  return { parentNode: host };
}
