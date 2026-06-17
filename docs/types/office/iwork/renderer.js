import { loadGlobal, vendor } from '../../../core/script-loader.js';

export async function render(intake) {
  const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');

  const ext = '.' + (intake.filename || '').split('.').pop().toLowerCase();
  const NAMES = { '.pages': 'Pages Document', '.numbers': 'Numbers Spreadsheet', '.keynote': 'Keynote Presentation' };
  const typeName = NAMES[ext] || 'iWork Document';

  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;padding:24px;gap:16px;';

  // Partial-support banner
  const banner = document.createElement('div');
  banner.style.cssText = 'max-width:480px;padding:10px 14px;background:var(--bg-warn,#fef3c7);color:var(--text-warn,#92400e);border-radius:6px;font-size:13px;text-align:center;';
  banner.textContent = '⚠ Apple ' + typeName + ' — showing embedded thumbnail only. Full document content requires the iWork format (Protobuf/IWA), which is not yet supported.';
  wrap.appendChild(banner);

  // Try to extract thumbnail
  let blobUrl = null;
  try {
    const zip = await JSZip.loadAsync(intake.bytes.buffer);
    const THUMB_PATHS = ['preview.jpg', 'preview-web.jpg', 'QuickLook/Thumbnail.jpg', 'preview.png'];
    let thumbFile = null;
    for (const p of THUMB_PATHS) {
      if (zip.files[p]) { thumbFile = zip.files[p]; break; }
      // Case-insensitive fallback
      const key = Object.keys(zip.files).find(k => k.toLowerCase() === p.toLowerCase());
      if (key) { thumbFile = zip.files[key]; break; }
    }
    if (thumbFile) {
      const blob = new Blob([await thumbFile.async('uint8array')], { type: 'image/jpeg' });
      blobUrl = URL.createObjectURL(blob);
      const img = document.createElement('img');
      img.src = blobUrl;
      img.alt = typeName + ' preview';
      img.style.cssText = 'max-width:100%;max-height:600px;object-fit:contain;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,0.15);';
      wrap.appendChild(img);
    } else {
      const noThumb = document.createElement('div');
      noThumb.style.cssText = 'color:var(--text-muted,#6b7280);font-size:13px;';
      noThumb.textContent = 'No thumbnail found in this file.';
      wrap.appendChild(noThumb);
    }
  } catch (e) {
    const err = document.createElement('div');
    err.style.cssText = 'color:var(--text-error,#dc2626);font-size:13px;';
    err.textContent = 'Could not read ZIP archive: ' + e.message;
    wrap.appendChild(err);
  }

  return {
    parentNode: wrap,
    revoke() { if (blobUrl) URL.revokeObjectURL(blobUrl); },
  };
}
