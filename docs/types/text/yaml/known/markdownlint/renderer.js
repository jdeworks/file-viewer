import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.mdl-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-mdl{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#000;color:#fff;vertical-align:middle;margin-right:8px;}
.mdl-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.mdl-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.mdl-sec{margin:12px 0;}
.mdl-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.mdl-pills{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0;}
.mdl-pill{display:inline-block;font-size:12px;padding:3px 10px;border-radius:8px;font-family:ui-monospace,monospace;}
.mdl-pill.disabled{background:#fee2e2;border:1px solid #fca5a5;color:#991b1b;}
.mdl-pill.enabled{background:#dcfce7;border:1px solid #86efac;color:#166534;}
.mdl-pill.configured{background:#eff6ff;border:1px solid #93c5fd;color:#1d4ed8;}
.mdl-pill.kv{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);color:var(--fg,#24292f);}
`;

export async function render(intake) {
  let cfg = {};
  try {
    const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
    cfg = (jsyaml.loadAll(intake.text || \'\') || [])[0] || {};
  } catch { cfg = {}; }

  const filename = (intake.filename || '').split('/').pop() || '.markdownlint.yml';

  const disabled = [];
  const enabled = [];
  const configured = [];
  const kv = [];

  for (const [key, val] of Object.entries(cfg)) {
    if (val === false) disabled.push(key);
    else if (val === true) enabled.push(key);
    else if (val !== null && typeof val === 'object') configured.push(key);
    else kv.push({ key, val });
  }

  const disabledHtml = disabled.length
    ? `<div class="mdl-sec"><h3>Disabled (${disabled.length})</h3><div class="mdl-pills">${disabled.map((k) => `<span class="mdl-pill disabled">${esc(k)}</span>`).join('')}</div></div>`
    : '';

  const enabledHtml = enabled.length
    ? `<div class="mdl-sec"><h3>Enabled (${enabled.length})</h3><div class="mdl-pills">${enabled.map((k) => `<span class="mdl-pill enabled">${esc(k)}</span>`).join('')}</div></div>`
    : '';

  const configuredHtml = configured.length
    ? `<div class="mdl-sec"><h3>Configured (${configured.length})</h3><div class="mdl-pills">${configured.map((k) => `<span class="mdl-pill configured">${esc(k)}</span>`).join('')}</div></div>`
    : '';

  const kvHtml = kv.length
    ? `<div class="mdl-sec"><h3>Values</h3><div class="mdl-pills">${kv.map(({ key, val }) => `<span class="mdl-pill kv">${esc(key)}: ${esc(val)}</span>`).join('')}</div></div>`
    : '';

  const total = disabled.length + enabled.length + configured.length + kv.length;
  const sub = [
    disabled.length ? `${disabled.length} disabled` : '',
    enabled.length ? `${enabled.length} enabled` : '',
    configured.length ? `${configured.length} configured` : '',
  ].filter(Boolean).join(' · ') || `${total} rule${total !== 1 ? 's' : ''}`;

  const host = document.createElement('div');
  host.className = 'mdl-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="mdl-title"><span class="badge-mdl">markdownlint</span>${esc(filename)}</div>
<div class="mdl-sub">${esc(sub)}</div>
${disabledHtml}
${enabledHtml}
${configuredHtml}
${kvHtml}`;

  return { parentNode: host };
}
