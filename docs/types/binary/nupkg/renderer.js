import { vendor, loadGlobal } from '../../../core/script-loader.js';

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function xmlText(doc, tag) {
  const el = doc.querySelector(tag);
  return el ? el.textContent.trim() : null;
}

async function parseNupkg(zip, filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  if (ext === 'nupkg') {
    // Look for .nuspec
    const nuspecEntry = Object.keys(zip.files).find(f => f.endsWith('.nuspec') && !f.includes('/'));
    if (nuspecEntry) {
      const xml = await zip.files[nuspecEntry].async('string');
      const doc = new DOMParser().parseFromString(xml, 'text/xml');
      const meta = doc.querySelector('metadata');
      return {
        kind: 'NuGet',
        id: xmlText(meta, 'id'),
        version: xmlText(meta, 'version'),
        authors: xmlText(meta, 'authors'),
        description: xmlText(meta, 'description'),
        projectUrl: xmlText(meta, 'projectUrl'),
        license: xmlText(meta, 'licenseExpression') || xmlText(meta, 'licenseUrl'),
        tags: xmlText(meta, 'tags'),
        deps: [...(meta?.querySelectorAll('dependency') || [])].slice(0, 15).map(d => ({
          id: d.getAttribute('id'), version: d.getAttribute('version'),
        })),
      };
    }
  }
  if (ext === 'vsix') {
    // Look for extension.vsixmanifest
    const mfEntry = Object.keys(zip.files).find(f => f.endsWith('extension.vsixmanifest'));
    if (mfEntry) {
      const xml = await zip.files[mfEntry].async('string');
      const doc = new DOMParser().parseFromString(xml, 'text/xml');
      const meta = doc.querySelector('Metadata, metadata');
      const identity = doc.querySelector('Identity, identity');
      return {
        kind: 'VS Extension',
        id: identity?.getAttribute('Id') || null,
        version: identity?.getAttribute('Version') || null,
        publisher: identity?.getAttribute('Publisher') || null,
        description: xmlText(meta, 'Description') || xmlText(meta, 'description'),
        displayName: xmlText(meta, 'DisplayName') || xmlText(meta, 'displayName'),
        tags: xmlText(meta, 'Tags') || xmlText(meta, 'tags'),
        deps: [],
      };
    }
  }
  if (ext === 'whl') {
    // Look for METADATA or PKG-INFO inside *.dist-info/
    const distInfoDir = Object.keys(zip.files).find(f => /\.dist-info\/METADATA$/.test(f));
    if (distInfoDir) {
      const txt = await zip.files[distInfoDir].async('string');
      const getField = (key) => {
        const m = txt.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
        return m ? m[1].trim() : null;
      };
      return {
        kind: 'Python Wheel',
        id: getField('Name'),
        version: getField('Version'),
        authors: getField('Author-email') || getField('Author'),
        description: getField('Summary'),
        projectUrl: getField('Home-page') || getField('Project-URL'),
        license: getField('License'),
        tags: getField('Keywords'),
        deps: (txt.match(/^Requires-Dist:\s*.+/gm) || []).slice(0, 15).map(l => {
          const m = l.match(/^Requires-Dist:\s*(\S+)(?:\s*\(([^)]+)\))?/);
          return m ? { id: m[1], version: m[2] || '' } : null;
        }).filter(Boolean),
      };
    }
  }
  if (ext === 'jar') {
    // Look for META-INF/MANIFEST.MF
    const mfEntry = zip.files['META-INF/MANIFEST.MF'];
    if (mfEntry) {
      const txt = await mfEntry.async('string');
      const getField = (key) => {
        const m = txt.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
        return m ? m[1].trim() : null;
      };
      const classes = Object.keys(zip.files).filter(f => f.endsWith('.class')).length;
      return {
        kind: 'Java JAR',
        id: getField('Implementation-Title') || getField('Bundle-Name') || null,
        version: getField('Implementation-Version') || getField('Bundle-Version') || null,
        authors: getField('Implementation-Vendor') || getField('Bundle-Vendor') || null,
        description: getField('Bundle-Description') || null,
        mainClass: getField('Main-Class') || null,
        classCount: classes,
        deps: [],
      };
    }
    const classes = Object.keys(zip.files).filter(f => f.endsWith('.class')).length;
    return { kind: 'Java JAR', id: null, version: null, authors: null, description: null, classCount: classes, deps: [] };
  }
  return null;
}

export async function render(intake) {
  const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
  const zip = await JSZip.loadAsync(intake.bytes);
  const info = await parseNupkg(zip, intake.filename);

  if (!info) {
    return { bodyHtml: '<p style="color:#90a4ae">Could not parse package manifest.</p>', hadUnsafe: false };
  }

  const ext = (intake.filename || '').split('.').pop().toLowerCase();
  const badgeClass = `badge-${ext}`;

  const metaRows = [
    info.id ? ['Package ID', info.id] : null,
    info.version ? ['Version', info.version] : null,
    info.authors ? ['Authors', info.authors] : null,
    info.publisher ? ['Publisher', info.publisher] : null,
    info.displayName ? ['Display name', info.displayName] : null,
    info.mainClass ? ['Main class', info.mainClass] : null,
    info.license ? ['License', info.license] : null,
    info.tags ? ['Tags', info.tags] : null,
    info.projectUrl ? ['URL', `<a href="${esc(info.projectUrl)}" target="_blank" rel="noopener noreferrer">${esc(info.projectUrl)}</a>`] : null,
    info.classCount !== undefined ? ['Class files', String(info.classCount)] : null,
  ].filter(Boolean);

  const overviewHtml = metaRows.map(([k, v]) =>
    `<div class="meta-row"><span class="meta-key">${esc(k)}</span><span class="meta-val">${v}</span></div>`
  ).join('');

  const descHtml = info.description
    ? `<div class="meta-section"><h4 class="meta-section-title">Description</h4><p style="font-size:0.9rem;color:#37474f;line-height:1.5">${esc(info.description.slice(0, 500))}</p></div>`
    : '';

  const depsHtml = info.deps?.length
    ? `<div class="meta-section"><h4 class="meta-section-title">Dependencies (${info.deps.length})</h4>
        <div style="display:flex;flex-wrap:wrap;gap:4px">
          ${info.deps.map(d => `<span class="pkg-dep">${esc(d.id)}${d.version ? ' ' + esc(d.version) : ''}</span>`).join('')}
        </div></div>`
    : '';

  const fileList = Object.keys(zip.files).filter(f => !f.endsWith('/')).slice(0, 20);
  const filesHtml = fileList.length
    ? `<div class="meta-section"><h4 class="meta-section-title">Contents (first ${fileList.length})</h4>
        <div style="font-size:0.8rem;font-family:monospace;color:#546e7a;line-height:1.8">
          ${fileList.map(f => `<div>${esc(f)}</div>`).join('')}
          ${Object.keys(zip.files).filter(f => !f.endsWith('/')).length > 20 ? `<div style="color:#90a4ae">… and ${Object.keys(zip.files).filter(f => !f.endsWith('/')).length - 20} more</div>` : ''}
        </div></div>`
    : '';

  return {
    bodyHtml: `
      <style>
        .badge-nupkg { background: #512bd4; color: #fff; }
        .badge-vsix  { background: #0078d4; color: #fff; }
        .badge-whl   { background: #3776ab; color: #fff; }
        .badge-jar   { background: #e76f00; color: #fff; }
        .pkg-dep { display:inline-block; background:#f5f5f5; border:1px solid #e0e0e0; border-radius:3px; padding:1px 7px; font-size:0.8rem; font-family:monospace; }
      </style>
      <div class="badge-row"><span class="badge ${badgeClass}">${esc(info.kind)}</span></div>
      <div class="meta-section">
        <h4 class="meta-section-title">Package Info</h4>
        ${overviewHtml}
      </div>
      ${descHtml}
      ${depsHtml}
      ${filesHtml}
    `,
    hadUnsafe: false,
  };
}
