const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function topScalar(text, key) {
  const m = text.match(new RegExp('^' + key + '\\s*:\\s*(.+)$', 'm'));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null;
}

function parseConfig(text) {
  const cfgBlock = text.match(/^config\s*:\s*\n((?:\s{2,}.*\n?)*)/m);
  if (!cfgBlock) return [];
  const items = [];
  const block = cfgBlock[1];
  // Each config key is at 2-space indent
  const keyRe = /^ {2}([\w:/.@-]+)\s*:/gm;
  let m;
  while ((m = keyRe.exec(block)) !== null) {
    const key = m[1];
    const afterKey = block.slice(m.index + m[0].length).match(/^\s*(.+)/);
    const val = afterKey ? afterKey[1].trim().replace(/^['"]|['"]$/g, '') : '';
    // skip nested keys (would need indentation check)
    if (!key.includes('.') || key.split(':').length === 2) {
      items.push({ key, val: val.startsWith('{') || val.startsWith('[') ? '' : val });
    }
  }
  return items.slice(0, 12);
}

const RUNTIME_COLORS = {
  nodejs: '#026e00', python: '#3776ab', go: '#00add8', dotnet: '#512bd4',
  java: '#e87722', yaml: '#0f62fe',
};

const CSS = `
.pul-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-pul{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#8a3fc7;color:#fff;vertical-align:middle;margin-right:8px;}
.pul-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.pul-desc{font-size:13px;color:var(--fg-2,#777);margin:0 0 10px;}
.pul-runtime{display:inline-block;padding:2px 10px;border-radius:6px;font-size:12px;font-weight:700;color:#fff;margin-bottom:10px;}
.pul-sec{margin:12px 0;}
.pul-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.pul-table{width:100%;border-collapse:collapse;font-size:13px;}
.pul-table th{text-align:left;color:var(--fg-2,#888);font-size:11px;text-transform:uppercase;padding:3px 8px 3px 0;border-bottom:2px solid var(--border,#e0e0e0);}
.pul-table td{padding:4px 8px 4px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.pul-mono{font:12px ui-monospace,monospace;}
`;

export function render(intake) {
  const text = intake.text || '';
  const name = topScalar(text, 'name') || '';
  const description = topScalar(text, 'description') || '';
  const runtime = topScalar(text, 'runtime') || '';
  const sdkVersion = topScalar(text, 'sdkVersion') || '';
  const config = parseConfig(text);

  const host = document.createElement('div');
  host.className = 'pul-doc';

  const runtimeColor = RUNTIME_COLORS[runtime.toLowerCase()] || '#666';
  const runtimeHtml = runtime
    ? `<div><span class="pul-runtime" style="background:${runtimeColor}">${esc(runtime)}</span>${sdkVersion ? ` <span style="font-size:12px;color:var(--fg-2,#888)">SDK ${esc(sdkVersion)}</span>` : ''}</div>`
    : '';

  const configHtml = config.length
    ? `<div class="pul-sec"><h3>Config keys (${config.length})</h3><table class="pul-table">
<thead><tr><th>Key</th><th>Default</th></tr></thead>
<tbody>${config.map((c) => `<tr>
  <td><span class="pul-mono">${esc(c.key)}</span></td>
  <td>${c.val ? `<span class="pul-mono">${esc(c.val)}</span>` : '—'}</td>
</tr>`).join('')}</tbody></table></div>`
    : '';

  host.innerHTML = `<style>${CSS}</style>
<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
  <span class="badge-pul">Pulumi</span>
  <span class="pul-title">${esc(name) || 'project'}</span>
</div>
${description ? `<div class="pul-desc">${esc(description)}</div>` : ''}
${runtimeHtml}
${configHtml}`;

  return { parentNode: host };
}
