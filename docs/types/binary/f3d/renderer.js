import { vendor, loadGlobal } from '../../../core/script-loader.js';

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmt(v) {
  if (!v) return null;
  if (typeof v === 'object' && v['$value'] !== undefined) return String(v['$value']);
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  return null;
}

export async function render(intake) {
  const b = intake.bytes;
  if (!b || b.length < 4) {
    return { bodyHtml: '<p class="viewer-message">File too small.</p>', hadUnsafe: false };
  }

  const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
  if (!JSZip) {
    return { bodyHtml: '<p class="viewer-message">Could not load ZIP library.</p>', hadUnsafe: false };
  }

  let zip;
  try { zip = await JSZip.loadAsync(b); } catch {
    return { bodyHtml: '<p class="viewer-message">Could not read ZIP archive.</p>', hadUnsafe: false };
  }

  const entries = Object.keys(zip.files);
  const isAssembly = intake.filename?.toLowerCase().endsWith('.f3z');

  // Try to find the design info JSON
  let designName = '';
  let description = '';
  let createdDate = '';
  let modifiedDate = '';
  let createdBy = '';
  let version = '';
  let thumbnailEntry = null;

  // Look for thumbnail and manifest
  for (const name of entries) {
    if (/thumbnail/i.test(name) && /\.(png|jpg|jpeg)$/i.test(name)) {
      thumbnailEntry = zip.files[name];
    }
    if (/manifest|rootcomp|design/i.test(name) && /\.json$/i.test(name)) {
      try {
        const text = await zip.files[name].async('text');
        const j = JSON.parse(text);
        designName = designName || fmt(j.name) || fmt(j.displayName) || fmt(j.documentName) || '';
        description = description || fmt(j.description) || '';
        createdDate = createdDate || fmt(j.createdDate) || fmt(j.created) || '';
        modifiedDate = modifiedDate || fmt(j.modifiedDate) || fmt(j.lastModified) || '';
        createdBy = createdBy || fmt(j.createdBy) || fmt(j.ownerId) || '';
        version = version || fmt(j.version) || fmt(j.revisionId) || '';
      } catch { /* skip */ }
    }
  }

  // thumbnail
  let thumbHtml = '';
  if (thumbnailEntry) {
    try {
      const blob = await thumbnailEntry.async('blob');
      const url = URL.createObjectURL(blob);
      thumbHtml = `<div style="margin:8px 0"><img src="${url}" alt="thumbnail" style="max-width:100%;max-height:200px;border-radius:4px;display:block"></div>`;
    } catch { /* skip */ }
  }

  const rows = [
    ['Format', isAssembly ? 'Fusion 360 Assembly (.f3z)' : 'Fusion 360 Design (.f3d)'],
    designName ? ['Design name', designName] : null,
    description ? ['Description', description] : null,
    createdBy ? ['Created by', createdBy] : null,
    version ? ['Revision', version] : null,
    createdDate ? ['Created', createdDate] : null,
    modifiedDate ? ['Modified', modifiedDate] : null,
    ['Files in archive', entries.length.toString()],
    ['File size', `${b.length.toLocaleString()} bytes`],
  ].filter(Boolean).map(([k, v]) =>
    `<div class="meta-row"><span class="meta-key">${esc(k)}</span><span class="meta-val">${esc(v)}</span></div>`
  ).join('');

  const fileList = entries.slice(0, 30).map(n => `<li style="font-size:0.8rem">${esc(n)}</li>`).join('');
  const more = entries.length > 30 ? `<li style="font-size:0.8rem;opacity:0.6">… and ${entries.length - 30} more</li>` : '';

  return {
    bodyHtml: `
      <style>.badge-f3d { background: #ff6d00; color: #fff; }</style>
      <div class="badge-row"><span class="badge badge-f3d">${isAssembly ? 'F3Z' : 'F3D'}</span></div>
      ${thumbHtml}
      <div class="meta-section">
        <h4 class="meta-section-title">Design Info</h4>
        ${rows}
      </div>
      <div class="meta-section">
        <h4 class="meta-section-title">Archive Contents</h4>
        <ul style="margin:0;padding-left:1.2em">${fileList}${more}</ul>
      </div>`,
    hadUnsafe: false,
  };
}
