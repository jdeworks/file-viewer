const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CSS = `
.pod-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-pod{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#e74c3c;color:#fff;vertical-align:middle;margin-right:8px;}
.pod-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.pod-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 12px;}
.pod-sec{margin:12px 0;}
.pod-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.pod-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px;}
.pod-item{display:flex;align-items:baseline;gap:8px;font-size:13px;padding:4px 0;border-bottom:1px solid var(--border,#e0e0e0);}
.pod-item:last-child{border-bottom:none;}
.pod-name{font-family:ui-monospace,monospace;font-size:12px;}
.pod-ver{font-size:11px;color:var(--fg-2,#888);}
.pod-tag{display:inline-block;font-size:10px;padding:1px 6px;border-radius:6px;background:#fde8e8;border:1px solid #e74c3c;color:#c0392b;font-weight:600;}
`;
export function render(intake) {
  const text = intake.text || '';
  const lines = text.split(/\r?\n/);
  const pods = [];
  let platform = '', minVer = '', target = '';
  for (const raw of lines) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    let m;
    if ((m = line.match(/^platform\s+:([^,]+)(?:,\s*['"]?([^'"]+)['"]?)?/))) { platform = m[1].trim(); minVer = m[2] ? m[2].trim() : ''; continue; }
    if ((m = line.match(/^target\s+['"]([^'"]+)['"]/))) { target = m[1]; continue; }
    if ((m = line.match(/^pod\s+['"]([^'"]+)['"]\s*,?\s*['"]?([^'"]+)?['"]?/))) {
      pods.push({ name: m[1], version: m[2] ? m[2].trim().replace(/[,\s]+$/, '') : '' });
    }
  }
  const rows = pods.map((p) => `<li class="pod-item"><span class="pod-name">${esc(p.name)}</span>${p.version ? `<span class="pod-ver">${esc(p.version)}</span>` : ''}</li>`).join('');
  const host = document.createElement('div');
  host.className = 'pod-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="pod-title"><span class="badge-pod">CocoaPods</span>Podfile</div>
<div class="pod-sub">${platform ? `${esc(platform)}${minVer ? ' ' + esc(minVer) : ''} · ` : ''}${pods.length} pod${pods.length !== 1 ? 's' : ''}${target ? ` · target: ${esc(target)}` : ''}</div>
${pods.length ? `<div class="pod-sec"><h3>Pods (${pods.length})</h3><ul class="pod-list">${rows}</ul></div>` : '<p style="color:var(--fg-2,#888);font-size:13px;">No pods found.</p>'}`;
  return { parentNode: host };
}
