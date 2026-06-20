const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.pfl-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-pfl{display:inline-block;background:#0175C2;color:#fff;padding:2px 9px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.04em;margin-bottom:10px;}
.pfl-title{font-size:18px;font-weight:700;margin:0 0 12px;}
.pfl-sec{margin:12px 0;}
.pfl-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.pfl-list{list-style:none;margin:0;padding:0;}
.pfl-list li{display:flex;justify-content:space-between;gap:12px;padding:3px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.pfl-name{font:12px ui-monospace,monospace;color:var(--accent,#0969da);}
.pfl-ver{font:12px ui-monospace,monospace;color:var(--fg-2,#888);}
.pfl-table{width:100%;border-collapse:collapse;font-size:12px;}
.pfl-table th{text-align:left;font-weight:600;padding:4px 8px;border-bottom:2px solid var(--border,#e0e0e0);}
.pfl-table td{padding:3px 8px;border-bottom:1px solid var(--border,#e0e0e0);font:12px ui-monospace,monospace;word-break:break-all;}
.pfl-meta{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px;}
.pfl-meta span{background:var(--bg-2,#f6f8fa);border-radius:4px;padding:2px 8px;font:12px ui-monospace,monospace;}
`;

function parseSection(text, header) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.trim() === header + ':');
  if (start < 0) return [];
  const result = [];
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    if (l.trim() === '' || (l.trim() !== '' && !l.startsWith(' '))) break;
    result.push(l);
  }
  return result;
}

function parsePods(text) {
  const section = parseSection(text, 'PODS');
  const pods = [];
  for (const line of section) {
    // Lines like: "  - PodName (1.2.3):" or "  - PodName (1.2.3)"
    const m = /^\s+-\s+([\w/.-]+)\s*\(([^)]+)\)/.exec(line);
    if (m && line.match(/^\s{2}-/)) {
      pods.push({ name: m[1], version: m[2] });
    }
  }
  return pods;
}

function parseDeps(text) {
  const section = parseSection(text, 'DEPENDENCIES');
  return section
    .map((l) => { const m = /^\s+-\s+(.+)/.exec(l); return m ? m[1].trim() : null; })
    .filter(Boolean);
}

function parseChecksums(text) {
  const section = parseSection(text, 'SPEC CHECKSUMS');
  const result = [];
  for (const line of section) {
    const m = /^\s+([\w/.-]+):\s+(\w+)/.exec(line);
    if (m) result.push({ name: m[1], checksum: m[2] });
  }
  return result;
}

function parseScalar(text, key) {
  const m = new RegExp('^' + key + ':\\s*(.+)', 'm').exec(text);
  return m ? m[1].trim() : null;
}

export function render(intake) {
  const t = intake.text || '';
  const pods = parsePods(t);
  const deps = parseDeps(t);
  const checksums = parseChecksums(t);
  const cocoapodsVersion = parseScalar(t, 'COCOAPODS');

  const host = document.createElement('div');
  host.className = 'pfl-doc';

  let html = `<style>${CSS}</style>
<span class="badge-pfl">CocoaPods Lock</span>
<div class="pfl-title">Podfile.lock</div>
<div class="pfl-meta">
${pods.length ? `<span>${pods.length} pod${pods.length !== 1 ? 's' : ''}</span>` : ''}
${deps.length ? `<span>${deps.length} direct dep${deps.length !== 1 ? 's' : ''}</span>` : ''}
${cocoapodsVersion ? `<span>CocoaPods ${esc(cocoapodsVersion)}</span>` : ''}
</div>`;

  if (pods.length) {
    html += `<div class="pfl-sec"><h3>Installed Pods (${pods.length})</h3><ul class="pfl-list">`;
    html += pods.map((p) => `<li><span class="pfl-name">${esc(p.name)}</span><span class="pfl-ver">${esc(p.version)}</span></li>`).join('');
    html += '</ul></div>';
  }

  if (deps.length) {
    html += `<div class="pfl-sec"><h3>Direct Dependencies (${deps.length})</h3><ul class="pfl-list">`;
    html += deps.map((d) => `<li><span class="pfl-name">${esc(d)}</span></li>`).join('');
    html += '</ul></div>';
  }

  if (checksums.length) {
    html += `<div class="pfl-sec"><h3>Spec Checksums (${checksums.length})</h3>
<table class="pfl-table"><thead><tr><th>Pod</th><th>SHA1</th></tr></thead><tbody>`;
    html += checksums.map((c) => `<tr><td>${esc(c.name)}</td><td>${esc(c.checksum)}</td></tr>`).join('');
    html += '</tbody></table></div>';
  }

  host.innerHTML = html;
  return { parentNode: host };
}
