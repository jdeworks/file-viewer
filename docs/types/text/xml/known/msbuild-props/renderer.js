// MSBuild .props/.targets renderer — SDK-style shared MSBuild files. Shows PropertyGroup
// entries as a key-value table, ItemGroup items, Import elements, and Target elements.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.mb-doc{padding:16px 18px;max-width:860px;font-family:system-ui,sans-serif;font-size:14px;color:#c9d1d9}
.mb-head{display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap}
.mb-badge{background:#512BD4;color:#fff;font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;letter-spacing:.4px}
.mb-title{font-size:18px;font-weight:700;color:#e6edf3}
.mb-sec{margin-bottom:16px}
.mb-sec h3{font-size:12px;font-weight:600;color:#8b949e;text-transform:uppercase;letter-spacing:.6px;margin:0 0 8px}
.mb-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}
.mb-item{display:flex;align-items:baseline;gap:8px;padding:5px 8px;background:#161b22;border-radius:6px;border:1px solid #30363d}
.mb-key{color:#79c0ff;font-size:13px;font-family:monospace;flex:0 0 auto;min-width:180px}
.mb-val{color:#e6edf3;font-size:13px;font-family:monospace;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mb-tag{background:#21262d;border:1px solid #30363d;border-radius:4px;font-size:11px;padding:1px 5px;color:#8b949e;margin-right:4px}
.mb-note{color:#8b949e;font-size:12px;font-style:italic}
.mb-err{color:#f85149;font-size:13px;padding:12px;background:#161b22;border-radius:6px}
.mb-count{background:#21262d;border-radius:8px;font-size:11px;padding:1px 6px;margin-left:6px;color:#8b949e;vertical-align:middle}
.mb-cond{color:#8b949e;font-size:11px;font-family:monospace;margin-left:auto;flex-shrink:0;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
`;

function tagName(el) {
  const t = el.tagName || '';
  return t.includes(':') ? t.split(':').pop() : t;
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const doc = new DOMParser().parseFromString(text, 'text/xml');

  if (doc.getElementsByTagName('parsererror').length) {
    const host = document.createElement('div');
    host.innerHTML = `<style>${CSS}</style><div class="mb-doc"><p class="mb-err">Could not parse as XML.</p></div>`;
    return { parentNode: host };
  }

  const filename = (intake.name || intake.filename || '').split('/').pop() || 'build.props';

  // PropertyGroup entries
  const props = [];
  for (const pg of doc.getElementsByTagName('PropertyGroup')) {
    const cond = pg.getAttribute('Condition') || '';
    for (const child of pg.children) {
      props.push({ name: tagName(child), value: child.textContent.trim(), cond });
    }
  }

  // ItemGroup entries (exclude PackageReference shown separately)
  const items = [];
  const pkgVersions = [];
  for (const ig of doc.getElementsByTagName('ItemGroup')) {
    for (const child of ig.children) {
      const t = tagName(child);
      const inc = child.getAttribute('Include') || child.getAttribute('include') || child.getAttribute('Update') || '';
      const ver = child.getAttribute('Version') || child.getAttribute('version') || '';
      if (t === 'PackageReference' || t === 'PackageVersion') {
        pkgVersions.push({ name: inc, version: ver });
      } else {
        items.push({ tag: t, include: inc });
      }
    }
  }

  // Import elements
  const imports = [...doc.getElementsByTagName('Import')].map((el) => ({
    project: el.getAttribute('Project') || '',
    condition: el.getAttribute('Condition') || '',
  })).filter((i) => i.project);

  // Target elements
  const targets = [...doc.getElementsByTagName('Target')].map((el) => ({
    name: el.getAttribute('Name') || '',
    dependsOn: el.getAttribute('DependsOnTargets') || '',
    afterTargets: el.getAttribute('AfterTargets') || '',
    beforeTargets: el.getAttribute('BeforeTargets') || '',
  })).filter((t) => t.name);

  const renderProps = (list) =>
    list.length
      ? `<ul class="mb-list">${list.map((p) =>
          `<li class="mb-item">
            <span class="mb-key">${esc(p.name)}</span>
            <span class="mb-val">${esc(p.value || '(empty)')}</span>
            ${p.cond ? `<span class="mb-cond" title="${esc(p.cond)}">${esc(p.cond)}</span>` : ''}
          </li>`
        ).join('')}</ul>`
      : `<p class="mb-note">No properties defined.</p>`;

  let html = `<style>${CSS}</style><div class="mb-doc">
    <div class="mb-head">
      <span class="mb-badge">MSBuild</span>
      <span class="mb-title">${esc(filename)}</span>
    </div>`;

  if (props.length) {
    html += `<div class="mb-sec"><h3>Properties <span class="mb-count">${props.length}</span></h3>${renderProps(props)}</div>`;
  }

  if (pkgVersions.length) {
    html += `<div class="mb-sec"><h3>Package Versions <span class="mb-count">${pkgVersions.length}</span></h3>
      <ul class="mb-list">${pkgVersions.map((p) =>
        `<li class="mb-item"><span class="mb-key">${esc(p.name)}</span><span class="mb-val">${esc(p.version || '(no version)')}</span></li>`
      ).join('')}</ul></div>`;
  }

  if (imports.length) {
    html += `<div class="mb-sec"><h3>Imports <span class="mb-count">${imports.length}</span></h3>
      <ul class="mb-list">${imports.map((i) =>
        `<li class="mb-item">
          <span class="mb-key" style="min-width:0;flex:1;">${esc(i.project)}</span>
          ${i.condition ? `<span class="mb-cond" title="${esc(i.condition)}">${esc(i.condition)}</span>` : ''}
        </li>`
      ).join('')}</ul></div>`;
  }

  if (targets.length) {
    html += `<div class="mb-sec"><h3>Targets <span class="mb-count">${targets.length}</span></h3>
      <ul class="mb-list">${targets.map((t) => {
        const deps = [t.dependsOn, t.afterTargets && `After: ${t.afterTargets}`, t.beforeTargets && `Before: ${t.beforeTargets}`].filter(Boolean).join('; ');
        return `<li class="mb-item">
          <span class="mb-key">${esc(t.name)}</span>
          ${deps ? `<span class="mb-val" style="color:#8b949e;">${esc(deps)}</span>` : ''}
        </li>`;
      }).join('')}</ul></div>`;
  }

  if (items.length) {
    html += `<div class="mb-sec"><h3>Items <span class="mb-count">${items.length}</span></h3>
      <ul class="mb-list">${items.map((i) =>
        `<li class="mb-item"><span class="mb-tag">${esc(i.tag)}</span><span class="mb-val">${esc(i.include)}</span></li>`
      ).join('')}</ul></div>`;
  }

  if (!props.length && !pkgVersions.length && !imports.length && !targets.length && !items.length) {
    html += `<p class="mb-note">No MSBuild content found.</p>`;
  }

  html += `</div>`;

  const host = document.createElement('div');
  host.innerHTML = html;
  return { parentNode: host };
}
