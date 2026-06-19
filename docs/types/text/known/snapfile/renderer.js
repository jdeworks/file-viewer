const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.sf-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-sf{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#f39c12;color:#fff;vertical-align:middle;margin-right:8px;}
.sf-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.sf-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.sf-sec{margin:14px 0;}
.sf-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 8px;}
.sf-tags{display:flex;flex-wrap:wrap;gap:4px;}
.sf-chip{display:inline-block;font-size:11px;padding:2px 9px;border-radius:8px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;}
.sf-card{background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;display:grid;grid-template-columns:max-content 1fr;gap:6px 14px;font-size:13px;}
.sf-lbl{color:var(--fg-2,#888);font-size:12px;}
.sf-val{font-family:ui-monospace,monospace;font-size:12px;}
`;

function extractArray(text, key) {
  const re = new RegExp(`^\\s*${key}\\s*\\(?\\[?([^\\]\\)\\n]+)`, 'm');
  const m = text.match(re);
  if (!m) return [];
  return [...m[1].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]);
}

function extractVal(text, key) {
  const re = new RegExp(`^\\s*${key}\\s+['\"]?([^'\"\\n]+)['\"]?`, 'm');
  const m = text.match(re);
  return m ? m[1].trim().replace(/['"]/g, '') : '';
}

export function render(intake) {
  const text = intake.text || '';
  const devices = extractArray(text, 'devices');
  const languages = extractArray(text, 'languages');
  const scheme = extractVal(text, 'scheme');
  const outputDir = extractVal(text, 'output_directory');
  const uiTestTarget = extractVal(text, 'ui_test_target');

  const host = document.createElement('div');
  host.className = 'sf-doc';

  let html = `<style>${CSS}</style>
<div class="sf-title"><span class="badge-sf">Snapshot</span>Snapfile</div>
<div class="sf-sub">Fastlane screenshot automation${scheme ? ` · ${esc(scheme)}` : ''}</div>`;

  const cardRows = [
    scheme && `<div class="sf-lbl">Scheme</div><div class="sf-val">${esc(scheme)}</div>`,
    uiTestTarget && `<div class="sf-lbl">UI test target</div><div class="sf-val">${esc(uiTestTarget)}</div>`,
    outputDir && `<div class="sf-lbl">Output dir</div><div class="sf-val">${esc(outputDir)}</div>`,
  ].filter(Boolean).join('');

  if (cardRows) {
    html += `<div class="sf-sec"><div class="sf-card">${cardRows}</div></div>`;
  }

  if (devices.length) {
    html += `<div class="sf-sec"><h3>Devices (${devices.length})</h3>
      <div class="sf-tags">${devices.map((d) => `<span class="sf-chip">${esc(d)}</span>`).join('')}</div></div>`;
  }

  if (languages.length) {
    html += `<div class="sf-sec"><h3>Languages (${languages.length})</h3>
      <div class="sf-tags">${languages.map((l) => `<span class="sf-chip">${esc(l)}</span>`).join('')}</div></div>`;
  }

  host.innerHTML = html;
  return { parentNode: host };
}
