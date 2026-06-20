const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.podfilelock-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.podfilelock-doc .badge{display:inline-block;background:#607D8B;color:#fff;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;letter-spacing:.04em;margin-right:8px;}
.podfilelock-doc .title{font-size:18px;font-weight:700;margin:0 0 4px;}
.podfilelock-doc .meta{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px;}
.podfilelock-doc .meta span{background:var(--bg-2,#f6f8fa);border-radius:6px;padding:2px 9px;font:12px ui-monospace,monospace;color:var(--fg,#24292f);}
.podfilelock-doc .sec{margin:12px 0;}
.podfilelock-doc .sec h3{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-2,#888);margin:0 0 6px;font-weight:700;}
.podfilelock-doc .list{list-style:none;margin:0;padding:0;}
.podfilelock-doc .list li{display:flex;justify-content:space-between;gap:12px;padding:3px 0;border-bottom:1px solid var(--border,#eaeaea);font-size:13px;}
.podfilelock-doc .list li:last-child{border-bottom:none;}
.podfilelock-doc .list li.indent{padding-left:16px;font-size:12px;color:var(--fg-2,#888);}
.podfilelock-doc .pod-name{font:12px ui-monospace,monospace;color:var(--accent,#0969da);}
.podfilelock-doc .pod-ver{font:12px ui-monospace,monospace;color:var(--fg-2,#888);flex-shrink:0;}
.podfilelock-doc .dep-line{font:12px ui-monospace,monospace;}
.podfilelock-doc .checksum-count{font-size:13px;color:var(--fg-2,#888);}
.podfilelock-doc .more{font-size:11px;color:var(--fg-2,#888);padding:4px 0;}
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
    // Root pods: "  - PodName (1.2.3):" or "  - PodName (1.2.3)"
    // Sub-deps:  "    - PodName/Sub (1.2.3)"
    const isRoot = /^\s{2}-/.test(line) && !/^\s{4}-/.test(line);
    const m = /^\s+-\s+([\w/.-]+(?:\s+\([^)]+\))?)\s*\(([^)]+)\)/.exec(line);
    if (m) {
      pods.push({ name: m[1], version: m[2], isRoot });
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
  const allPods = parsePods(t);
  const rootPods = allPods.filter((p) => p.isRoot);
  const deps = parseDeps(t);
  const checksums = parseChecksums(t);
  const cocoapodsVersion = parseScalar(t, 'COCOAPODS');

  const shownPods = allPods.slice(0, 25);
  const extraPods = allPods.length - shownPods.length;
  const shownDeps = deps.slice(0, 15);
  const extraDeps = deps.length - shownDeps.length;

  const host = document.createElement('div');
  host.className = 'podfilelock-doc';

  let html = `<style>${CSS}</style>
<div class="title"><span class="badge">Podfile.lock</span></div>
<div class="meta">
${rootPods.length ? `<span>${rootPods.length} root pod${rootPods.length !== 1 ? 's' : ''}</span>` : ''}
${deps.length ? `<span>${deps.length} direct dep${deps.length !== 1 ? 's' : ''}</span>` : ''}
${checksums.length ? `<span>${checksums.length} checksum${checksums.length !== 1 ? 's' : ''}</span>` : ''}
${cocoapodsVersion ? `<span>CocoaPods ${esc(cocoapodsVersion)}</span>` : ''}
</div>`;

  if (allPods.length) {
    html += `<div class="sec"><h3>PODS (${allPods.length} resolved)</h3><ul class="list">`;
    html += shownPods.map((p) =>
      `<li class="${p.isRoot ? '' : 'indent'}"><span class="pod-name">${esc(p.name)}</span><span class="pod-ver">${esc(p.version)}</span></li>`
    ).join('');
    if (extraPods > 0) html += `<li><span class="more">…and ${extraPods} more</span></li>`;
    html += '</ul></div>';
  }

  if (deps.length) {
    html += `<div class="sec"><h3>DEPENDENCIES (${deps.length})</h3><ul class="list">`;
    html += shownDeps.map((d) => `<li><span class="dep-line">${esc(d)}</span></li>`).join('');
    if (extraDeps > 0) html += `<li><span class="more">…and ${extraDeps} more</span></li>`;
    html += '</ul></div>';
  }

  if (checksums.length) {
    html += `<div class="sec"><h3>SPEC CHECKSUMS (${checksums.length})</h3>
<p class="checksum-count">${checksums.length} pod${checksums.length !== 1 ? 's' : ''} with checksums</p></div>`;
  }

  host.innerHTML = html;
  return { parentNode: host };
}
