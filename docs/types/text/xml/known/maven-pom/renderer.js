const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.mvn-doc{padding:16px 18px;max-width:900px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;color:var(--fg,#24292f)}
.badge-mvn{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:#C71A36;color:#fff;vertical-align:middle;margin-right:8px}
.mvn-title{font-size:18px;font-weight:700;margin:0 0 3px;display:flex;align-items:center;flex-wrap:wrap;gap:4px}
.mvn-sub{font-size:12px;color:var(--fg-2,#888);margin:0 0 14px;font-family:ui-monospace,monospace}
.mvn-chip{display:inline-block;padding:2px 8px;border-radius:5px;font-size:11px;font-weight:600;background:#f3f4f6;border:1px solid var(--border,#e0e0e0);color:var(--fg,#24292f);margin-left:4px;vertical-align:middle}
.mvn-chip.jar{background:#dbeafe;border-color:#93c5fd;color:#1e40af}
.mvn-chip.war{background:#fef3c7;border-color:#fcd34d;color:#92400e}
.mvn-chip.pom{background:#f0fdf4;border-color:#86efac;color:#166534}
.mvn-chip.ear{background:#fce7f3;border-color:#f9a8d4;color:#9d174d}
.mvn-sec{margin:14px 0}
.mvn-sec h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);margin:0 0 7px}
.mvn-card{border:1px solid var(--border,#e0e0e0);border-radius:8px;padding:10px 14px;background:var(--bg,#fff);margin:6px 0}
.mvn-table{width:100%;border-collapse:collapse;font-size:13px}
.mvn-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--fg-2,#888);padding:4px 8px;border-bottom:1px solid var(--border,#e0e0e0)}
.mvn-table td{padding:5px 8px;border-bottom:1px solid var(--border,#e0e0e0);font-family:ui-monospace,monospace;font-size:12px;vertical-align:top}
.mvn-table tr:last-child td{border-bottom:none}
.mvn-scope{display:inline-block;font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;background:#f3f4f6;border:1px solid #d1d5db;color:#6b7280;text-transform:uppercase}
.mvn-scope.test{background:#fef3c7;border-color:#fcd34d;color:#92400e}
.mvn-scope.provided{background:#e0e7ff;border-color:#a5b4fc;color:#3730a3}
.mvn-scope.runtime{background:#f0fdf4;border-color:#86efac;color:#166534}
.mvn-scope.import{background:#fce7f3;border-color:#f9a8d4;color:#9d174d}
.mvn-kv{display:flex;gap:8px;font-size:12px;margin:3px 0}
.mvn-key{color:var(--fg-2,#888);min-width:80px;flex-shrink:0}
.mvn-val{font-family:ui-monospace,monospace;font-weight:600;word-break:break-all}
.mvn-link{color:inherit;text-decoration:underline;text-underline-offset:2px}
.mvn-link:hover{color:#C71A36}
.mvn-more{font-size:12px;color:var(--fg-2,#888);padding:4px 8px}
.mvn-err{color:#b91c1c;font-size:13px;padding:8px 0}
.mvn-prop-name{color:var(--fg-2,#666)}
`;

function childText(el, tag) {
  if (!el) return '';
  for (const c of el.children) {
    if (c.tagName === tag || c.tagName.endsWith(':' + tag)) return (c.textContent || '').trim();
  }
  return '';
}

function mvnUrl(g, a) {
  return 'https://mvnrepository.com/artifact/' + encodeURIComponent(g) + '/' + encodeURIComponent(a);
}

export async function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const doc = new DOMParser().parseFromString(text, 'text/xml');

  if (doc.getElementsByTagName('parsererror').length) {
    const d = document.createElement('div');
    d.className = 'mvn-doc';
    d.innerHTML = `<style>${CSS}</style><p class="mvn-err">Could not parse pom.xml as XML.</p>`;
    return { parentNode: d };
  }

  const project = doc.documentElement;
  const groupId = childText(project, 'groupId');
  const artifactId = childText(project, 'artifactId');
  const version = childText(project, 'version');
  const name = childText(project, 'name');
  const description = childText(project, 'description');
  const packaging = childText(project, 'packaging') || 'jar';
  const url = childText(project, 'url');

  // Parent POM
  const parentEl = project.querySelector(':scope > parent');
  const parentGroup = parentEl ? childText(parentEl, 'groupId') : '';
  const parentArtifact = parentEl ? childText(parentEl, 'artifactId') : '';
  const parentVersion = parentEl ? childText(parentEl, 'version') : '';

  // Dependencies (all, including from dependencyManagement)
  const allDeps = [...doc.getElementsByTagName('dependency')].map((dep) => ({
    g: childText(dep, 'groupId'),
    a: childText(dep, 'artifactId'),
    v: childText(dep, 'version'),
    scope: childText(dep, 'scope') || 'compile',
    optional: childText(dep, 'optional') === 'true',
  })).filter((d) => d.g && d.a);

  // Separate managed from direct
  const managedEl = project.querySelector(':scope > dependencyManagement');
  const managedSet = new Set();
  if (managedEl) {
    [...managedEl.getElementsByTagName('dependency')].forEach((dep) => {
      const g = childText(dep, 'groupId');
      const a = childText(dep, 'artifactId');
      if (g && a) managedSet.add(`${g}:${a}`);
    });
  }
  const directDeps = allDeps.filter((d) => !managedSet.has(`${d.g}:${d.a}`) || project.querySelector(`:scope > dependencies`));
  // Just use all declared <dependencies><dependency> (direct)
  const directDepsEl = project.querySelector(':scope > dependencies');
  const deps = directDepsEl
    ? [...directDepsEl.getElementsByTagName('dependency')].map((dep) => ({
        g: childText(dep, 'groupId'),
        a: childText(dep, 'artifactId'),
        v: childText(dep, 'version'),
        scope: childText(dep, 'scope') || 'compile',
        optional: childText(dep, 'optional') === 'true',
      })).filter((d) => d.g && d.a)
    : [];

  // Plugins
  const pluginsEl = project.querySelector(':scope > build > plugins');
  const plugins = pluginsEl
    ? [...pluginsEl.getElementsByTagName('plugin')].map((p) => ({
        g: childText(p, 'groupId') || 'org.apache.maven.plugins',
        a: childText(p, 'artifactId'),
        v: childText(p, 'version'),
      })).filter((p) => p.a)
    : [];

  // Properties
  const propsEl = project.querySelector(':scope > properties');
  const props = propsEl
    ? [...propsEl.children].map((c) => ({ key: c.tagName, val: (c.textContent || '').trim() })).filter((p) => p.key && !p.key.startsWith('#'))
    : [];

  // Build HTML sections
  const packagingChipClass = ['jar', 'war', 'pom', 'ear'].includes(packaging) ? packaging : '';
  const titleHtml = `<div class="mvn-title"><span class="badge-mvn">Maven POM</span>${esc(name || artifactId || 'pom.xml')}<span class="mvn-chip ${packagingChipClass}">${esc(packaging)}</span></div>`;

  const coords = [groupId, artifactId, version].filter(Boolean).join(':');
  const subHtml = `<div class="mvn-sub">${esc(coords)}</div>`;

  const descHtml = description
    ? `<div class="mvn-sec"><div class="mvn-card" style="font-size:13px;color:var(--fg-2,#666)">${esc(description)}</div></div>`
    : '';

  const parentHtml = parentEl
    ? `<div class="mvn-sec"><h3>Parent POM</h3><div class="mvn-card">
<div class="mvn-kv"><span class="mvn-key">groupId</span><span class="mvn-val">${esc(parentGroup)}</span></div>
<div class="mvn-kv"><span class="mvn-key">artifactId</span><span class="mvn-val"><a class="mvn-link" href="${esc(mvnUrl(parentGroup, parentArtifact))}" target="_blank" rel="noopener noreferrer">${esc(parentArtifact)}</a></span></div>
${parentVersion ? `<div class="mvn-kv"><span class="mvn-key">version</span><span class="mvn-val">${esc(parentVersion)}</span></div>` : ''}
</div></div>` : '';

  const scopeBadge = (scope, optional) => {
    const s = scope || 'compile';
    const cls = ['test', 'provided', 'runtime', 'import'].includes(s) ? s : '';
    return `<span class="mvn-scope ${cls}">${esc(s)}</span>${optional ? ' <span class="mvn-scope">optional</span>' : ''}`;
  };

  const SHOW_DEPS = 30;
  const depsHtml = deps.length
    ? `<div class="mvn-sec"><h3>Dependencies (${deps.length})</h3><div class="mvn-card">
<table class="mvn-table"><thead><tr><th>Group : Artifact</th><th>Version</th><th>Scope</th></tr></thead><tbody>
${deps.slice(0, SHOW_DEPS).map((d) => `<tr>
<td><a class="mvn-link" href="${esc(mvnUrl(d.g, d.a))}" target="_blank" rel="noopener noreferrer">${esc(d.g)}:${esc(d.a)}</a></td>
<td>${d.v ? esc(d.v) : '<span style="color:var(--fg-2,#888)">(managed)</span>'}</td>
<td>${scopeBadge(d.scope, d.optional)}</td>
</tr>`).join('')}
</tbody></table>
${deps.length > SHOW_DEPS ? `<div class="mvn-more">…and ${deps.length - SHOW_DEPS} more dependencies</div>` : ''}
</div></div>` : '';

  const pluginsHtml = plugins.length
    ? `<div class="mvn-sec"><h3>Plugins (${plugins.length})</h3><div class="mvn-card">
<table class="mvn-table"><thead><tr><th>Artifact</th><th>Version</th></tr></thead><tbody>
${plugins.map((p) => `<tr>
<td><a class="mvn-link" href="${esc(mvnUrl(p.g, p.a))}" target="_blank" rel="noopener noreferrer">${esc(p.a)}</a><span style="color:var(--fg-2,#888);margin-left:4px;font-size:11px">(${esc(p.g)})</span></td>
<td>${p.v ? esc(p.v) : '<span style="color:var(--fg-2,#888)">(managed)</span>'}</td>
</tr>`).join('')}
</tbody></table>
</div></div>` : '';

  const SHOW_PROPS = 20;
  const propsHtml = props.length
    ? `<div class="mvn-sec"><h3>Properties (${props.length})</h3><div class="mvn-card">
<table class="mvn-table"><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>
${props.slice(0, SHOW_PROPS).map((p) => `<tr><td class="mvn-prop-name">${esc(p.key)}</td><td>${esc(p.val)}</td></tr>`).join('')}
</tbody></table>
${props.length > SHOW_PROPS ? `<div class="mvn-more">…and ${props.length - SHOW_PROPS} more properties</div>` : ''}
</div></div>` : '';

  const host = document.createElement('div');
  host.className = 'mvn-doc';
  host.innerHTML = `<style>${CSS}</style>
${titleHtml}
${subHtml}
${descHtml}
${parentHtml}
${depsHtml}
${pluginsHtml}
${propsHtml}`;

  return { parentNode: host };
}
