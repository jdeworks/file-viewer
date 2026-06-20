// Directory.Build.props / .targets renderer — MSBuild shared property files. Shows property
// groups, well-known properties, item groups, and package references that apply to all projects.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.db-doc{padding:16px 18px;max-width:860px;font-family:system-ui,sans-serif;font-size:14px;color:#c9d1d9}
.db-head{display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap}
.db-badge{background:#512BD4;color:#fff;font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;letter-spacing:.4px}
.db-title{font-size:18px;font-weight:700;color:#e6edf3}
.db-sec{margin-bottom:16px}
.db-sec h3{font-size:12px;font-weight:600;color:#8b949e;text-transform:uppercase;letter-spacing:.6px;margin:0 0 8px}
.db-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}
.db-item{display:flex;align-items:baseline;gap:8px;padding:5px 8px;background:#161b22;border-radius:6px;border:1px solid #30363d}
.db-key{color:#79c0ff;font-size:13px;font-family:monospace;flex:0 0 auto;min-width:160px}
.db-val{color:#e6edf3;font-size:13px;font-family:monospace;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.db-pkg{color:#79c0ff;font-size:13px;font-family:monospace;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.db-ver{color:#8b949e;font-size:12px;font-family:monospace;margin-left:auto;white-space:nowrap}
.db-note{color:#8b949e;font-size:12px;font-style:italic}
.db-err{color:#f85149;font-size:13px;padding:12px;background:#161b22;border-radius:6px}
.db-count{background:#21262d;border-radius:8px;font-size:11px;padding:1px 6px;margin-left:6px;color:#8b949e;vertical-align:middle}
.db-group{margin-bottom:12px}
.db-group-label{font-size:11px;color:#8b949e;margin-bottom:6px;padding-left:4px}
`;

// Properties we highlight explicitly because they're common and meaningful
const WELL_KNOWN = [
  'LangVersion', 'Nullable', 'ImplicitUsings', 'TreatWarningsAsErrors',
  'WarningLevel', 'Optimize', 'AllowUnsafeBlocks', 'Deterministic',
  'GenerateDocumentationFile', 'ManagePackageVersionsCentrally',
  'TargetFramework', 'TargetFrameworks', 'RootNamespace',
  'Authors', 'Company', 'Copyright', 'RepositoryUrl',
  'PackableLicense', 'PackageRequireLicenseAcceptance',
];

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const doc = new DOMParser().parseFromString(text, 'text/xml');

  if (doc.getElementsByTagName('parsererror').length) {
    const host = document.createElement('div');
    host.innerHTML = `<style>${CSS}</style><div class="db-doc"><p class="db-err">Could not parse as XML.</p></div>`;
    return { parentNode: host };
  }

  const filename = (intake.name || intake.filename || '').split('/').pop() || 'Directory.Build.props';

  // Collect all properties per PropertyGroup
  const propertyGroups = [];
  for (const pg of doc.getElementsByTagName('PropertyGroup')) {
    const props = [];
    for (const child of pg.children) {
      const name = child.tagName.includes(':') ? child.tagName.split(':').pop() : child.tagName;
      props.push({ name, value: child.textContent.trim() });
    }
    if (props.length) propertyGroups.push(props);
  }

  // Flatten all props for well-known extraction
  const allProps = propertyGroups.flat();
  const wellKnown = allProps.filter((p) => WELL_KNOWN.includes(p.name));
  const other = allProps.filter((p) => !WELL_KNOWN.includes(p.name));

  // Item groups
  const itemGroups = [];
  for (const ig of doc.getElementsByTagName('ItemGroup')) {
    const items = [];
    for (const child of ig.children) {
      const tag = child.tagName.includes(':') ? child.tagName.split(':').pop() : child.tagName;
      const inc = child.getAttribute('Include') || child.getAttribute('include') || '';
      items.push({ tag, include: inc });
    }
    if (items.length) itemGroups.push(items);
  }

  // Package references from ItemGroup
  const pkgRefs = itemGroups.flat().filter((i) => i.tag === 'PackageReference');
  const nonPkgItems = itemGroups.flat().filter((i) => i.tag !== 'PackageReference');

  const renderPropList = (props) =>
    `<ul class="db-list">${props.map((p) =>
      `<li class="db-item"><span class="db-key">${esc(p.name)}</span><span class="db-val">${esc(p.value || '(empty)')}</span></li>`
    ).join('')}</ul>`;

  const pkgHtml = pkgRefs.length
    ? `<ul class="db-list">${pkgRefs.map((p) =>
        `<li class="db-item"><span class="db-pkg">${esc(p.include)}</span></li>`
      ).join('')}</ul>`
    : '<p class="db-note">No package references.</p>';

  const host = document.createElement('div');
  let html = `<style>${CSS}</style><div class="db-doc">
    <div class="db-head">
      <span class="db-badge">MSBuild</span>
      <span class="db-title">${esc(filename)}</span>
    </div>`;

  if (wellKnown.length) {
    html += `<div class="db-sec"><h3>Common Properties <span class="db-count">${wellKnown.length}</span></h3>${renderPropList(wellKnown)}</div>`;
  }

  if (other.length) {
    html += `<div class="db-sec"><h3>Other Properties <span class="db-count">${other.length}</span></h3>${renderPropList(other)}</div>`;
  }

  if (!allProps.length) {
    html += `<p class="db-note">No property groups defined.</p>`;
  }

  html += `<div class="db-sec"><h3>Package References <span class="db-count">${pkgRefs.length}</span></h3>${pkgHtml}</div>`;

  if (nonPkgItems.length) {
    html += `<div class="db-sec"><h3>Item Groups <span class="db-count">${nonPkgItems.length}</span></h3>
      <ul class="db-list">${nonPkgItems.map((i) =>
        `<li class="db-item"><span class="db-key">${esc(i.tag)}</span><span class="db-val">${esc(i.include)}</span></li>`
      ).join('')}</ul></div>`;
  }

  html += `</div>`;
  host.innerHTML = html;
  return { parentNode: host };
}
