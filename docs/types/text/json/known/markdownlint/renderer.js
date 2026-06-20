const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.mdlint-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-mdlint{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#083fa1;color:#fff;vertical-align:middle;margin-right:8px;}
.mdlint-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.mdlint-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.mdlint-sec{margin:12px 0;}
.mdlint-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.mdlint-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0;}
.mdlint-pill{display:inline-block;font-size:12px;padding:3px 10px;border-radius:8px;font-family:ui-monospace,monospace;}
.mdlint-pill.disabled{background:#fee2e2;border:1px solid #fca5a5;color:#991b1b;}
.mdlint-pill.enabled{background:#dcfce7;border:1px solid #86efac;color:#166534;}
.mdlint-pill.configured{background:#eff6ff;border:1px solid #93c5fd;color:#1d4ed8;}
.mdlint-pill.kv{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);color:var(--fg,#24292f);}
.mdlint-table{width:100%;border-collapse:collapse;font-size:13px;margin:4px 0;}
.mdlint-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.mdlint-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top;font-family:ui-monospace,monospace;font-size:12px;}
`;

function isMdRule(key) {
  return /^MD\d+$/i.test(key);
}

export function render(intake) {
  let cfg;
  try { cfg = intake.parsed ?? JSON.parse(intake.text || '{}'); } catch {
    return { parentNode: Object.assign(document.createElement('div'), { textContent: 'Invalid JSON.' }) };
  }

  const filename = (intake.name || intake.filename || '').split('/').pop() || '.markdownlint.json';

  const disabled = [];
  const enabled = [];
  const configured = [];
  const kv = [];

  for (const [key, val] of Object.entries(cfg)) {
    if (key === 'default' || key === 'extends') continue;
    if (val === false) disabled.push(key);
    else if (val === true) enabled.push(key);
    else if (val !== null && typeof val === 'object') configured.push(key);
    else kv.push({ key, val });
  }

  // Sort: MD* rules numerically first, then aliases
  const sortRules = (a, b) => {
    const aIsMd = isMdRule(a), bIsMd = isMdRule(b);
    if (aIsMd && bIsMd) return parseInt(a.slice(2)) - parseInt(b.slice(2));
    if (aIsMd) return -1;
    if (bIsMd) return 1;
    return a.localeCompare(b);
  };
  disabled.sort(sortRules);
  enabled.sort(sortRules);
  configured.sort(sortRules);

  // Base config card
  const defaultVal = cfg.default;
  const extendsVal = cfg.extends;
  const baseItems = [];
  if (defaultVal !== undefined) {
    baseItems.push(`<span class="mdlint-pill ${defaultVal ? 'enabled' : 'disabled'}">default: ${defaultVal ? 'on' : 'off'}</span>`);
  }
  if (extendsVal !== null && extendsVal !== undefined) {
    baseItems.push(`<span class="mdlint-pill kv">extends: ${esc(extendsVal)}</span>`);
  }
  const baseHtml = baseItems.length
    ? `<div class="mdlint-sec"><h3>Base config</h3><div class="mdlint-pills">${baseItems.join('')}</div></div>`
    : '';

  const disabledHtml = disabled.length
    ? `<div class="mdlint-sec"><h3>Disabled (${disabled.length})</h3><div class="mdlint-pills">${disabled.map((k) => `<span class="mdlint-pill disabled">${esc(k)}</span>`).join('')}</div></div>`
    : '';

  const enabledHtml = enabled.length
    ? `<div class="mdlint-sec"><h3>Enabled (${enabled.length})</h3><div class="mdlint-pills">${enabled.map((k) => `<span class="mdlint-pill enabled">${esc(k)}</span>`).join('')}</div></div>`
    : '';

  // Configured rules table: rule name | key settings
  const configuredHtml = configured.length
    ? `<div class="mdlint-sec"><h3>Configured (${configured.length})</h3>
    <table class="mdlint-table">
      <thead><tr><th>Rule</th><th>Settings</th></tr></thead>
      <tbody>${configured.map((k) => {
        const opts = cfg[k];
        const settingsStr = Object.entries(opts).map(([ok, ov]) => `${ok}: ${esc(ov)}`).join(', ');
        return `<tr><td>${esc(k)}</td><td>${esc(settingsStr)}</td></tr>`;
      }).join('')}</tbody>
    </table></div>`
    : '';

  const kvHtml = kv.length
    ? `<div class="mdlint-sec"><h3>Values</h3><div class="mdlint-pills">${kv.map(({ key, val }) => `<span class="mdlint-pill kv">${esc(key)}: ${esc(val)}</span>`).join('')}</div></div>`
    : '';

  const total = disabled.length + enabled.length + configured.length + kv.length;
  const sub = [
    disabled.length ? `${disabled.length} disabled` : '',
    enabled.length ? `${enabled.length} enabled` : '',
    configured.length ? `${configured.length} configured` : '',
  ].filter(Boolean).join(' · ') || `${total} rule${total !== 1 ? 's' : ''}`;

  const host = document.createElement('div');
  host.className = 'mdlint-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="mdlint-title"><span class="badge-mdlint">markdownlint</span>${esc(filename)}</div>
<div class="mdlint-sub">${esc(sub)}</div>
${baseHtml}
${disabledHtml}
${enabledHtml}
${configuredHtml}
${kvHtml}`;

  return { parentNode: host };
}
