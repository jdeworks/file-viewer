const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.xc-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-xc{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#147efb;color:#fff;vertical-align:middle;margin-right:8px}
.xc-title{font-size:18px;font-weight:700;margin:0 0 4px}
.xc-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px}
.xc-sec{margin:14px 0}
.xc-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px;display:flex;align-items:center;gap:6px}
.xc-count{font-size:11px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:0 6px;color:var(--fg-2,#888)}
.xc-inc-list{list-style:none;margin:0 0 12px;padding:0;display:flex;flex-direction:column;gap:4px}
.xc-inc-item{font-size:12px;font-family:ui-monospace,monospace;padding:4px 10px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:6px}
.xc-table{width:100%;border-collapse:collapse;font-size:12px}
.xc-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px 4px 0;border-bottom:2px solid var(--border,#e0e0e0)}
.xc-table td{padding:5px 8px 5px 0;border-bottom:1px solid var(--border,#e0e0e0);vertical-align:top}
.xc-table tr:last-child td{border-bottom:none}
.xc-key{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg,#24292f);word-break:break-all}
.xc-val{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg-2,#555);word-break:break-all}
.xc-highlight{font-family:ui-monospace,monospace;font-size:12px;color:var(--fg,#24292f);font-weight:600}
.xc-note{color:var(--fg-2,#888);font-size:13px;font-style:italic}
`;

// Key settings to highlight at the top
const HIGHLIGHT_KEYS = [
  'SWIFT_VERSION',
  'IPHONEOS_DEPLOYMENT_TARGET',
  'MACOSX_DEPLOYMENT_TARGET',
  'TVOS_DEPLOYMENT_TARGET',
  'WATCHOS_DEPLOYMENT_TARGET',
  'PRODUCT_BUNDLE_IDENTIFIER',
  'PRODUCT_NAME',
  'CODE_SIGN_IDENTITY',
  'DEVELOPMENT_TEAM',
  'TARGETED_DEVICE_FAMILY',
];

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const filename = (intake.name || intake.filename || 'Config.xcconfig').split('/').pop();

  const includes = [];
  const settings = [];

  for (const raw of text.split(/\r?\n/)) {
    // Strip comments
    const line = raw.replace(/\/\/.*$/, '').trim();
    if (!line) continue;

    // #include "file.xcconfig"
    const incM = line.match(/^#include\s+"([^"]+)"/i);
    if (incM) { includes.push(incM[1]); continue; }

    // KEY = value (optional trailing // comment already stripped)
    const kvM = line.match(/^([A-Z_][A-Z0-9_]*)(?:\[.*?\])?\s*=\s*(.*)/);
    if (kvM) {
      settings.push({ key: kvM[1], value: kvM[2].trim() });
    }
  }

  // Split into highlighted and the rest
  const highlighted = HIGHLIGHT_KEYS
    .map((k) => settings.find((s) => s.key === k))
    .filter(Boolean);
  const highlightedKeys = new Set(highlighted.map((s) => s.key));
  const rest = settings.filter((s) => !highlightedKeys.has(s.key));

  const includesHtml = includes.length
    ? `<div class="xc-sec"><h3>Includes <span class="xc-count">${includes.length}</span></h3>
<ul class="xc-inc-list">${includes.map((i) => `<li class="xc-inc-item">#include "${esc(i)}"</li>`).join('')}</ul></div>`
    : '';

  const highlightHtml = highlighted.length
    ? `<div class="xc-sec"><h3>Key Settings <span class="xc-count">${highlighted.length}</span></h3>
<table class="xc-table"><thead><tr><th>Setting</th><th>Value</th></tr></thead><tbody>
${highlighted.map((s) => `<tr><td class="xc-key">${esc(s.key)}</td><td class="xc-highlight">${esc(s.value)}</td></tr>`).join('')}
</tbody></table></div>`
    : '';

  const allHtml = rest.length
    ? `<div class="xc-sec"><h3>All Settings <span class="xc-count">${settings.length}</span></h3>
<table class="xc-table"><thead><tr><th>Setting</th><th>Value</th></tr></thead><tbody>
${rest.map((s) => `<tr><td class="xc-key">${esc(s.key)}</td><td class="xc-val">${esc(s.value)}</td></tr>`).join('')}
</tbody></table></div>`
    : '';

  const subParts = [
    `${settings.length} setting${settings.length !== 1 ? 's' : ''}`,
    includes.length ? `${includes.length} include${includes.length !== 1 ? 's' : ''}` : '',
  ].filter(Boolean);

  const host = document.createElement('div');
  host.className = 'xc-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="xc-title"><span class="badge-xc">Xcode</span>${esc(filename)}</div>
<div class="xc-sub">${esc(subParts.join(' · '))}</div>
${settings.length === 0 ? '<p class="xc-note">No build settings found.</p>' : ''}
${includesHtml}
${highlightHtml}
${allHtml}`;
  return { parentNode: host };
}
