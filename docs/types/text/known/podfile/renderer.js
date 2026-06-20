const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.podfile-doc{padding:16px 18px;max-width:860px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f);}
.podfile-doc .badge{display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;background:#E74430;color:#fff;vertical-align:middle;margin-right:8px;}
.podfile-doc .title{font-size:18px;font-weight:700;margin:0 0 4px;}
.podfile-doc .sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 10px;}
.podfile-doc .chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px;}
.podfile-doc .chip{display:inline-block;font-size:10px;padding:2px 8px;border-radius:6px;background:#fde8e8;border:1px solid #E74430;color:#c0392b;font-weight:600;}
.podfile-doc .sec{margin:12px 0;}
.podfile-doc .sec h3{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-2,#888);margin:0 0 6px;font-weight:700;}
.podfile-doc .list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:3px;}
.podfile-doc .row{display:flex;align-items:baseline;gap:8px;font-size:13px;padding:4px 0;border-bottom:1px solid var(--border,#eaeaea);}
.podfile-doc .row:last-child{border-bottom:none;}
.podfile-doc .pod-name{font-family:ui-monospace,monospace;font-size:12px;font-weight:600;}
.podfile-doc .pod-ver{font-size:11px;color:var(--fg-2,#888);flex-shrink:0;}
.podfile-doc .pod-tag{display:inline-block;font-size:10px;padding:1px 5px;border-radius:4px;background:#fff3cd;border:1px solid #f0ad4e;color:#856404;font-weight:600;margin-left:4px;}
.podfile-doc .source-url{font-family:ui-monospace,monospace;font-size:11px;color:var(--accent,#0969da);word-break:break-all;}
.podfile-doc .target-name{font-family:ui-monospace,monospace;font-size:12px;font-weight:600;color:var(--accent,#0969da);}
.podfile-doc .more{font-size:11px;color:var(--fg-2,#888);padding:4px 0;}
`;

export function render(intake) {
  const text = intake.text || '';
  const lines = text.split(/\r?\n/);

  let platform = '';
  let minVer = '';
  const targets = [];
  const sources = [];
  const pods = [];
  const flags = [];
  let currentTarget = null;

  for (const raw of lines) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    let m;

    if ((m = line.match(/^platform\s+:([a-z_]+)(?:,\s*['"]?([^'")\s,]+)['"]?)?/i))) {
      platform = m[1].trim();
      minVer = m[2] ? m[2].trim() : '';
      continue;
    }

    if ((m = line.match(/^source\s+['"]([^'"]+)['"]/))) {
      sources.push(m[1]);
      continue;
    }

    if (line === 'use_frameworks!' || line === 'use_frameworks! :linkage => :static') {
      if (!flags.includes('use_frameworks!')) flags.push('use_frameworks!');
      continue;
    }
    if (line === 'use_modular_headers!') {
      if (!flags.includes('use_modular_headers!')) flags.push('use_modular_headers!');
      continue;
    }
    if (line === 'inhibit_all_warnings!') {
      if (!flags.includes('inhibit_all_warnings!')) flags.push('inhibit_all_warnings!');
      continue;
    }

    if ((m = line.match(/^target\s+['"]([^'"]+)['"]\s+do/))) {
      currentTarget = m[1];
      if (!targets.includes(currentTarget)) targets.push(currentTarget);
      continue;
    }

    if (line === 'end') {
      currentTarget = null;
      continue;
    }

    if ((m = line.match(/^pod\s+['"]([^'"]+)['"](.*)?/))) {
      const podName = m[1];
      const rest = (m[2] || '').trim();
      let version = '';
      let isGit = false;
      let isSubspec = podName.includes('/');

      const gitM = rest.match(/:git\s*=>\s*['"]([^'"]+)['"]/);
      if (gitM) {
        isGit = true;
        version = gitM[1];
      } else {
        const verM = rest.match(/^,?\s*['"]([^'"]+)['"]/);
        if (verM) version = verM[1].trim();
      }

      pods.push({ name: podName, version, isGit, isSubspec, target: currentTarget });
    }
  }

  const shown = pods.slice(0, 20);
  const extra = pods.length - shown.length;

  const podRows = shown.map((p) => {
    const tags = [];
    if (p.isSubspec) tags.push('subspec');
    if (p.isGit) tags.push('git');
    const tagHtml = tags.map((t) => `<span class="pod-tag">${t}</span>`).join('');
    const verDisplay = p.isGit ? `git: ${esc(p.version)}` : esc(p.version);
    return `<li class="row">
      <span class="pod-name">${esc(p.name)}${tagHtml}</span>
      ${p.version ? `<span class="pod-ver">${verDisplay}</span>` : ''}
    </li>`;
  }).join('');

  const host = document.createElement('div');
  host.className = 'podfile-doc';
  host.innerHTML = `<style>${CSS}</style>
<div class="title"><span class="badge">CocoaPods</span>Podfile</div>
<div class="sub">${platform ? `Platform: ${esc(platform)}${minVer ? ' ' + esc(minVer) : ''}` : ''}${pods.length ? ` &middot; ${pods.length} pod${pods.length !== 1 ? 's' : ''}` : ''}${targets.length ? ` &middot; ${targets.length} target${targets.length !== 1 ? 's' : ''}` : ''}</div>
${flags.length ? `<div class="chips">${flags.map((f) => `<span class="chip">${esc(f)}</span>`).join('')}</div>` : ''}
${sources.length ? `<div class="sec"><h3>Sources (${sources.length})</h3><ul class="list">${sources.map((s) => `<li class="row"><span class="source-url">${esc(s)}</span></li>`).join('')}</ul></div>` : ''}
${targets.length ? `<div class="sec"><h3>Targets (${targets.length})</h3><ul class="list">${targets.map((t) => `<li class="row"><span class="target-name">${esc(t)}</span></li>`).join('')}</ul></div>` : ''}
${pods.length ? `<div class="sec"><h3>Pods (${pods.length})</h3><ul class="list">${podRows}</ul>${extra > 0 ? `<p class="more">…and ${extra} more pod${extra !== 1 ? 's' : ''}</p>` : ''}</div>` : '<p style="color:var(--fg-2,#888);font-size:13px;margin:12px 0;">No pods found.</p>'}`;
  return { parentNode: host };
}
