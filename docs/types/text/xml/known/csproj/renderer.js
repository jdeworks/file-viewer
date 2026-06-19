// .csproj renderer — SDK-style C# project file. Surfaces target framework, output type,
// package references, project references, and key build settings.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.cs-doc{padding:16px 18px;max-width:860px;font-family:system-ui,sans-serif;font-size:14px;color:#c9d1d9}
.cs-head{display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap}
.cs-badge{background:#6f42c1;color:#fff;font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;letter-spacing:.4px}
.cs-title{font-size:18px;font-weight:700;color:#e6edf3}
.cs-sdk{font-size:11px;color:#8b949e;margin-left:auto}
.cs-grid{display:grid;grid-template-columns:160px 1fr;gap:4px 12px;margin-bottom:16px}
.cs-key{color:#8b949e;font-size:12px;display:flex;align-items:center}
.cs-val{color:#e6edf3;font-size:13px;font-family:monospace}
.cs-sec{margin-bottom:16px}
.cs-sec h3{font-size:12px;font-weight:600;color:#8b949e;text-transform:uppercase;letter-spacing:.6px;margin:0 0 8px}
.cs-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}
.cs-item{display:flex;align-items:baseline;gap:8px;padding:5px 8px;background:#161b22;border-radius:6px;border:1px solid #30363d}
.cs-pkg{color:#79c0ff;font-size:13px;font-family:monospace;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cs-ver{color:#8b949e;font-size:12px;font-family:monospace;margin-left:auto;white-space:nowrap}
.cs-projref{color:#a5d6ff;font-size:12px;font-family:monospace;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cs-tag{background:#21262d;border:1px solid #30363d;border-radius:4px;font-size:11px;padding:1px 5px;color:#79c0ff}
.cs-note{color:#8b949e;font-size:12px;font-style:italic}
.cs-err{color:#f85149;font-size:13px;padding:12px;background:#161b22;border-radius:6px}
.cs-count{background:#21262d;border-radius:8px;font-size:11px;padding:1px 6px;margin-left:6px;color:#8b949e;vertical-align:middle}
`;

function childText(el, tag) {
  if (!el) return '';
  for (const c of el.children) {
    const local = c.tagName.includes(':') ? c.tagName.split(':').pop() : c.tagName;
    if (local === tag) return (c.textContent || '').trim();
  }
  return '';
}

function allText(doc, tag) {
  return [...doc.getElementsByTagName(tag)].map((e) => e.textContent.trim()).filter(Boolean);
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const doc = new DOMParser().parseFromString(text, 'text/xml');

  if (doc.getElementsByTagName('parsererror').length) {
    const host = document.createElement('div');
    host.innerHTML = `<style>${CSS}</style><div class="cs-doc"><p class="cs-err">Could not parse as XML.</p></div>`;
    return { parentNode: host };
  }

  const root = doc.documentElement;
  const sdk = root.getAttribute('Sdk') || '';
  const isSdkStyle = !!sdk;

  // Extract properties from all PropertyGroup elements
  const props = {};
  for (const pg of doc.getElementsByTagName('PropertyGroup')) {
    for (const child of pg.children) {
      const name = child.tagName.includes(':') ? child.tagName.split(':').pop() : child.tagName;
      if (!props[name]) props[name] = child.textContent.trim();
    }
  }

  const targetFramework = props['TargetFramework'] || props['TargetFrameworks'] || '';
  const assemblyName = props['AssemblyName'] || '';
  const outputType = props['OutputType'] || 'Library';
  const nullable = props['Nullable'] || '';
  const langVersion = props['LangVersion'] || '';
  const defineConstants = props['DefineConstants'] || '';
  const rootNamespace = props['RootNamespace'] || '';
  const version = props['Version'] || props['AssemblyVersion'] || '';

  // Package references
  const pkgRefs = [...doc.getElementsByTagName('PackageReference')].map((el) => ({
    name: el.getAttribute('Include') || el.getAttribute('include') || '',
    version: el.getAttribute('Version') || el.getAttribute('version') || childText(el, 'Version') || '',
  })).filter((p) => p.name);

  // Project references
  const projRefs = [...doc.getElementsByTagName('ProjectReference')].map((el) => {
    const inc = el.getAttribute('Include') || el.getAttribute('include') || '';
    // extract just the project name from path
    return inc.split(/[/\\]/).pop() || inc;
  }).filter(Boolean);

  const filename = (intake.name || intake.filename || '').split('/').pop() || 'project.csproj';

  // Build info rows
  const infoRows = [
    targetFramework && ['Target Framework', targetFramework],
    outputType && ['Output Type', outputType],
    assemblyName && ['Assembly Name', assemblyName],
    version && ['Version', version],
    rootNamespace && ['Root Namespace', rootNamespace],
    nullable && ['Nullable', nullable],
    langVersion && ['Lang Version', langVersion],
    defineConstants && ['Define Constants', defineConstants],
    isSdkStyle && ['SDK', sdk],
  ].filter(Boolean);

  const gridHtml = infoRows.map(([k, v]) =>
    `<div class="cs-key">${esc(k)}</div><div class="cs-val">${esc(v)}</div>`
  ).join('');

  const pkgHtml = pkgRefs.length
    ? `<ul class="cs-list">${pkgRefs.map((p) =>
        `<li class="cs-item"><span class="cs-pkg">${esc(p.name)}</span>${p.version ? `<span class="cs-ver">${esc(p.version)}</span>` : '<span class="cs-note">no version pin</span>'}</li>`
      ).join('')}</ul>`
    : '<p class="cs-note">No package references.</p>';

  const projRefHtml = projRefs.length
    ? `<ul class="cs-list">${projRefs.map((r) =>
        `<li class="cs-item"><span class="cs-projref">${esc(r)}</span></li>`
      ).join('')}</ul>`
    : '';

  const host = document.createElement('div');
  host.innerHTML = `<style>${CSS}</style><div class="cs-doc">
    <div class="cs-head">
      <span class="cs-badge">.NET / C#</span>
      <span class="cs-title">${esc(filename)}</span>
      ${isSdkStyle ? `<span class="cs-sdk">SDK-style</span>` : ''}
    </div>
    ${gridHtml ? `<div class="cs-grid">${gridHtml}</div>` : ''}
    <div class="cs-sec">
      <h3>Package References <span class="cs-count">${pkgRefs.length}</span></h3>
      ${pkgHtml}
    </div>
    ${projRefs.length ? `<div class="cs-sec">
      <h3>Project References <span class="cs-count">${projRefs.length}</span></h3>
      ${projRefHtml}
    </div>` : ''}
  </div>`;
  return { parentNode: host };
}
