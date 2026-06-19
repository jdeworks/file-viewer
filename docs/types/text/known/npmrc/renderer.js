const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const REDACT_KEYS = /auth|token|password|secret|key|_auth/i;

const CSS = `
.npmrc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-npmrc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#cb3837;color:#fff;vertical-align:middle;margin-right:8px;}
.npmrc-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.npmrc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.npmrc-sec{margin:12px 0;}
.npmrc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.npmrc-table{width:100%;border-collapse:collapse;font-size:13px;}
.npmrc-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.npmrc-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;}
.npmrc-key{font:12px/1.4 ui-monospace,monospace;color:var(--accent,#0969da);}
.npmrc-val{font:12px/1.4 ui-monospace,monospace;}
.npmrc-redacted{font-size:11px;background:var(--bg-3,#eee);padding:1px 6px;border-radius:4px;color:var(--fg-2,#888);}
.npmrc-scope{font-size:11px;padding:1px 6px;border-radius:4px;background:#fee2e2;color:#991b1b;}
.npmrc-registry{font-size:12px;padding:4px 10px;border-radius:6px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;margin:4px 0;}
`;

export function render(intake) {
  const text = intake.text || '';
  const lines = text.split('\n');

  const registries = [];
  const settings = [];
  let commentCount = 0;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) { if (line.startsWith('#') || line.startsWith(';')) commentCount++; continue; }

    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim();

    if (key === 'registry' || key.endsWith(':registry')) {
      registries.push({ scope: key === 'registry' ? null : key.replace(':registry', ''), url: val });
    } else {
      const redact = REDACT_KEYS.test(key);
      settings.push({ key, val, redact });
    }
  }

  const host = document.createElement('div');
  host.className = 'npmrc-doc';

  const regHtml = registries.length
    ? `<div class="npmrc-sec"><h3>Registries (${registries.length})</h3>${registries.map((r) => `<div class="npmrc-registry">${r.scope ? `<span class="npmrc-scope">${esc(r.scope)}</span> ` : ''}${esc(r.url)}</div>`).join('')}</div>`
    : '';

  const settingRows = settings.map((s) => {
    const valHtml = s.redact
      ? `<span class="npmrc-redacted">[redacted]</span>`
      : `<span class="npmrc-val">${esc(s.val)}</span>`;
    return `<tr><td><span class="npmrc-key">${esc(s.key)}</span></td><td>${valHtml}</td></tr>`;
  }).join('');

  const settingsHtml = settings.length
    ? `<div class="npmrc-sec"><h3>Settings (${settings.length})</h3><table class="npmrc-table"><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>${settingRows}</tbody></table></div>`
    : '';

  const hasRedacted = settings.some((s) => s.redact);

  host.innerHTML = `<style>${CSS}</style>
<div class="npmrc-title"><span class="badge-npmrc">npm</span>.npmrc</div>
<div class="npmrc-sub">${commentCount} comment line${commentCount !== 1 ? 's' : ''}${hasRedacted ? ' · auth values redacted' : ''}</div>
${regHtml}
${settingsHtml}
${!registries.length && !settings.length ? '<div style="color:var(--fg-2,#888);font-size:13px">No configuration settings found.</div>' : ''}`;

  return { parentNode: host };
}
