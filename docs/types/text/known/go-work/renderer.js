const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ext = (href, text) => `<a class="gw-link" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(text)} <span class="gw-exticon">↗</span></a>`;
const goDevUrl = (mod, ver) => 'https://pkg.go.dev/' + mod.split('/').map(encodeURIComponent).join('/') + (ver ? '@' + encodeURIComponent(ver) : '');

const CSS = `
.gw-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.badge-gowork{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#00ACD7;color:#fff;vertical-align:middle;margin-right:8px;}
.gw-title{font-size:18px;font-weight:700;margin:0 0 4px;}
.gw-meta{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;}
.gw-sec{margin:14px 0;}
.gw-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 6px;}
.gw-list{list-style:none;margin:0;padding:0;}
.gw-list li{display:flex;align-items:center;gap:12px;padding:4px 0;border-bottom:1px solid var(--border,#e5e7eb);}
.gw-path{font:13px ui-monospace,monospace;color:var(--accent,#0969da);}
.gw-ver{font:11px ui-monospace,monospace;color:var(--fg-2,#888);background:var(--bg-2,#f6f8fa);padding:1px 6px;border-radius:4px;}
.gw-tag{display:inline-block;font-size:11px;padding:1px 6px;border-radius:4px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#e5e7eb);margin-right:4px;}
.gw-link{color:var(--accent,#0969da);text-decoration:none;}
.gw-link:hover{text-decoration:underline;}
.gw-exticon{font-size:10px;opacity:.6;}
`;

export function render(intake) {
  const lines = (intake.text || '').split(/\r?\n/);
  const isSum = (intake.filename || '').endsWith('.sum');

  if (isSum) {
    // go.work.sum: show a count + first few entries
    const entries = lines.filter((l) => l.trim() && !l.startsWith('//'));
    const host = document.createElement('div');
    host.innerHTML = `<style>${CSS}</style>
<div class="gw-doc">
  <span class="badge-gowork">Go Workspace</span>
  <div class="gw-title">go.work.sum</div>
  <div class="gw-meta"><span class="gw-tag">${entries.length} checksum entries</span></div>
  <p style="color:var(--fg-2,#888);font-size:13px">Checksum database for workspace modules — managed automatically by go tooling.</p>
</div>`;
    return { parentNode: host };
  }

  let goVersion = '';
  const useModules = [];
  const requires = [];
  const replaces = [];
  let inUse = false, inRequire = false, inReplace = false;

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;
    const line = trimmed.replace(/\/\/.*$/, '').trim();

    if (inUse) {
      if (line === ')') { inUse = false; continue; }
      if (line) useModules.push(line);
      continue;
    }
    if (inRequire) {
      if (line === ')') { inRequire = false; continue; }
      const parts = line.split(/\s+/);
      if (parts[0]) requires.push({ mod: parts[0], ver: parts[1] || '' });
      continue;
    }
    if (inReplace) {
      if (line === ')') { inReplace = false; continue; }
      const m = line.match(/^(\S+)(?:\s+\S+)?\s*=>\s*(\S+)(?:\s+(\S+))?/);
      if (m) replaces.push({ from: m[1], to: m[2], ver: m[3] || '' });
      continue;
    }

    let m;
    if ((m = line.match(/^go\s+([\d.]+)/))) { goVersion = m[1]; }
    else if (/^use\s*\($/.test(line)) { inUse = true; }
    else if ((m = line.match(/^use\s+(.+)$/))) { useModules.push(m[1].trim()); }
    else if (/^require\s*\($/.test(line)) { inRequire = true; }
    else if ((m = line.match(/^require\s+(\S+)\s+(\S+)/))) { requires.push({ mod: m[1], ver: m[2] }); }
    else if (/^replace\s*\($/.test(line)) { inReplace = true; }
    else if ((m = line.match(/^replace\s+(\S+)(?:\s+\S+)?\s*=>\s*(\S+)(?:\s+(\S+))?/))) {
      replaces.push({ from: m[1], to: m[2], ver: m[3] || '' });
    }
  }

  const usesHtml = useModules.length
    ? `<div class="gw-sec"><h3>Workspace modules (${useModules.length})</h3><ul class="gw-list">${
        useModules.map((p) => `<li><span class="gw-path">${esc(p)}</span></li>`).join('')
      }</ul></div>`
    : '';

  const requiresHtml = requires.length
    ? `<div class="gw-sec"><h3>Require (${requires.length})</h3><ul class="gw-list">${
        requires.map((r) => `<li>${ext(goDevUrl(r.mod, r.ver), r.mod)}<span style="flex:1"></span><span class="gw-ver">${esc(r.ver)}</span></li>`).join('')
      }</ul></div>`
    : '';

  const replacesHtml = replaces.length
    ? `<div class="gw-sec"><h3>Replace (${replaces.length})</h3><ul class="gw-list">${
        replaces.map((r) => `<li><span class="gw-path">${esc(r.from)}</span><span style="color:var(--fg-2);font-size:12px">→</span><span class="gw-path">${esc(r.to)}${r.ver ? ` <span class="gw-ver">${esc(r.ver)}</span>` : ''}</span></li>`).join('')
      }</ul></div>`
    : '';

  const host = document.createElement('div');
  host.innerHTML = `<style>${CSS}</style>
<div class="gw-doc">
  <span class="badge-gowork">Go Workspace</span>
  <div class="gw-title">go.work</div>
  <div class="gw-meta">
    ${goVersion ? `<span class="gw-tag">go ${esc(goVersion)}</span>` : ''}
    ${useModules.length ? `<span class="gw-tag">${useModules.length} module${useModules.length !== 1 ? 's' : ''}</span>` : ''}
  </div>
  ${usesHtml}
  ${requiresHtml}
  ${replacesHtml}
</div>`;
  return { parentNode: host };
}
