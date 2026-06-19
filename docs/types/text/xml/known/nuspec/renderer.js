// .nuspec renderer — NuGet package specification. Shows package identity, description,
// license, tags, repository URL, and the dependency list.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.ns-doc{padding:16px 18px;max-width:860px;font-family:system-ui,sans-serif;font-size:14px;color:#c9d1d9}
.ns-head{display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap}
.ns-badge{background:#004880;color:#fff;font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;letter-spacing:.4px}
.ns-title{font-size:18px;font-weight:700;color:#e6edf3}
.ns-version{font-size:13px;color:#8b949e;font-family:monospace}
.ns-desc{color:#c9d1d9;font-size:13px;line-height:1.5;margin:0 0 14px;padding:10px 12px;background:#161b22;border-radius:6px;border:1px solid #30363d}
.ns-grid{display:grid;grid-template-columns:140px 1fr;gap:4px 12px;margin-bottom:16px}
.ns-key{color:#8b949e;font-size:12px;display:flex;align-items:center}
.ns-val{color:#e6edf3;font-size:13px;font-family:monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ns-link{color:#79c0ff;text-decoration:none}
.ns-link:hover{text-decoration:underline}
.ns-sec{margin-bottom:16px}
.ns-sec h3{font-size:12px;font-weight:600;color:#8b949e;text-transform:uppercase;letter-spacing:.6px;margin:0 0 8px}
.ns-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}
.ns-item{display:flex;align-items:baseline;gap:8px;padding:5px 8px;background:#161b22;border-radius:6px;border:1px solid #30363d}
.ns-pkg{color:#79c0ff;font-size:13px;font-family:monospace;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ns-ver{color:#8b949e;font-size:12px;font-family:monospace;margin-left:auto;white-space:nowrap}
.ns-fw{color:#8b949e;font-size:11px;font-family:monospace}
.ns-tags{display:flex;flex-wrap:wrap;gap:6px}
.ns-tag{background:#21262d;border:1px solid #30363d;border-radius:12px;font-size:11px;padding:2px 8px;color:#79c0ff}
.ns-note{color:#8b949e;font-size:12px;font-style:italic}
.ns-err{color:#f85149;font-size:13px;padding:12px;background:#161b22;border-radius:6px}
.ns-count{background:#21262d;border-radius:8px;font-size:11px;padding:1px 6px;margin-left:6px;color:#8b949e;vertical-align:middle}
.ns-more{color:#8b949e;font-size:11px;font-style:italic;margin-top:4px}
`;

function childText(el, tag) {
  if (!el) return '';
  const lower = tag.toLowerCase();
  for (const c of el.children) {
    const local = (c.tagName.includes(':') ? c.tagName.split(':').pop() : c.tagName).toLowerCase();
    if (local === lower) return (c.textContent || '').trim();
  }
  return '';
}

export function render(intake) {
  const text = intake.text || new TextDecoder().decode(intake.bytes || new Uint8Array());
  const doc = new DOMParser().parseFromString(text, 'text/xml');

  if (doc.getElementsByTagName('parsererror').length) {
    const host = document.createElement('div');
    host.innerHTML = `<style>${CSS}</style><div class="ns-doc"><p class="ns-err">Could not parse as XML.</p></div>`;
    return { parentNode: host };
  }

  // nuspec metadata is inside <metadata> element
  const meta = doc.querySelector('metadata') || doc.documentElement;

  const id = childText(meta, 'id') || childText(meta, 'packageId') || '';
  const version = childText(meta, 'version') || '';
  const authors = childText(meta, 'authors') || '';
  const owners = childText(meta, 'owners') || '';
  const description = childText(meta, 'description') || '';
  const license = childText(meta, 'license') || '';
  const licenseUrl = childText(meta, 'licenseUrl') || '';
  const projectUrl = childText(meta, 'projectUrl') || '';
  const repoUrl = (() => {
    const repo = meta.querySelector('repository');
    return repo ? (repo.getAttribute('url') || '') : '';
  })();
  const tags = childText(meta, 'tags') || '';
  const copyright = childText(meta, 'copyright') || '';
  const requireLicense = childText(meta, 'requireLicenseAcceptance') || '';

  // Truncate description
  const shortDesc = description.length > 100 ? description.slice(0, 100) + '…' : description;

  // Dependencies — grouped by target framework
  const allDeps = [];
  const depGroups = [...doc.querySelectorAll('dependencies > group')];
  if (depGroups.length) {
    for (const g of depGroups) {
      const fw = g.getAttribute('targetFramework') || '';
      for (const d of g.querySelectorAll('dependency')) {
        allDeps.push({
          name: d.getAttribute('id') || '',
          version: d.getAttribute('version') || '',
          fw,
        });
      }
    }
  } else {
    // flat deps (no groups)
    for (const d of doc.querySelectorAll('dependencies > dependency')) {
      allDeps.push({
        name: d.getAttribute('id') || '',
        version: d.getAttribute('version') || '',
        fw: '',
      });
    }
  }
  const shownDeps = allDeps.slice(0, 8);
  const extraDeps = allDeps.length - shownDeps.length;

  const tagList = tags.split(/[\s,;]+/).map((t) => t.trim()).filter(Boolean);

  // Grid metadata rows
  const infoRows = [
    authors && ['Authors', authors],
    owners && owners !== authors && ['Owners', owners],
    copyright && ['Copyright', copyright],
    requireLicense && requireLicense !== 'false' && ['License Required', requireLicense],
    (license || licenseUrl) && ['License', license || licenseUrl],
    projectUrl && ['Project URL', projectUrl, projectUrl],
    repoUrl && ['Repository', repoUrl, repoUrl],
  ].filter(Boolean);

  const gridHtml = infoRows.map(([k, v, href]) =>
    `<div class="ns-key">${esc(k)}</div><div class="ns-val">${
      href
        ? `<a class="ns-link" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(v)}</a>`
        : esc(v)
    }</div>`
  ).join('');

  const depsHtml = shownDeps.length
    ? `<ul class="ns-list">${shownDeps.map((d) =>
        `<li class="ns-item"><span class="ns-pkg">${esc(d.name)}</span>${d.fw ? `<span class="ns-fw">${esc(d.fw)}</span>` : ''}<span class="ns-ver">${esc(d.version)}</span></li>`
      ).join('')}</ul>${extraDeps > 0 ? `<p class="ns-more">…and ${extraDeps} more</p>` : ''}`
    : '<p class="ns-note">No dependencies declared.</p>';

  const tagsHtml = tagList.length
    ? `<div class="ns-tags">${tagList.map((t) => `<span class="ns-tag">${esc(t)}</span>`).join('')}</div>`
    : '<p class="ns-note">No tags.</p>';

  const host = document.createElement('div');
  host.innerHTML = `<style>${CSS}</style><div class="ns-doc">
    <div class="ns-head">
      <span class="ns-badge">NuGet</span>
      <span class="ns-title">${esc(id || 'package.nuspec')}</span>
      ${version ? `<span class="ns-version">${esc(version)}</span>` : ''}
    </div>
    ${shortDesc ? `<p class="ns-desc">${esc(shortDesc)}</p>` : ''}
    ${gridHtml ? `<div class="ns-grid">${gridHtml}</div>` : ''}
    <div class="ns-sec">
      <h3>Dependencies <span class="ns-count">${allDeps.length}</span></h3>
      ${depsHtml}
    </div>
    ${tagList.length ? `<div class="ns-sec"><h3>Tags</h3>${tagsHtml}</div>` : ''}
  </div>`;
  return { parentNode: host };
}
