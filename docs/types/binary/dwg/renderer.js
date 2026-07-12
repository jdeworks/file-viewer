// AutoCAD DWG binary format — header info only.
// Full parsing requires OpenDesign DWGdirect or LibreCAD's libdxfrw.
//
// DWG header (versions R13+):
//   bytes 0-5:   version string "AC1015" etc.
//   bytes 6-11:  5 zero bytes + maintenance release (1 byte)
//   bytes 12-13: application-specific marker (2 bytes)
//   bytes 14-17: preview image finder (varies by version)
//   ...rest is deeply version-specific

import { partialSupportHtml } from '../../../core/partial-support.js';

const CAPABILITY = 'Partial preview: the DWG version/header and an embedded JPEG thumbnail found within the first 4 KiB are shown. Drawing entities, layers, blocks, dimensions, model/paper-space layouts, and 2D/3D geometry are not decoded or rendered.';

const VERSION_MAP = {
  AC1006: 'R10',
  AC1009: 'R11/R12',
  AC1012: 'R13',
  AC1014: 'R14',
  AC1015: '2000',
  AC1018: '2004',
  AC1021: '2007',
  AC1024: '2010',
  AC1027: '2013',
  AC1032: '2018',
  AC1035: '2023',
};
const DWG_VERSION_RE = /^AC\d{4}$/;

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function render(intake) {
  const b = intake.bytes;
  if (!b || b.length < 6) {
    return { bodyHtml: partialSupportHtml(CAPABILITY) + '<p class="viewer-message">Not a valid DWG file.</p>', hadUnsafe: false };
  }

  const versionStr = new TextDecoder('ascii', { fatal: false }).decode(b.slice(0, 6));
  if (!DWG_VERSION_RE.test(versionStr)) {
    return { bodyHtml: partialSupportHtml(CAPABILITY) + '<p class="viewer-message">Missing DWG version signature.</p>', hadUnsafe: false };
  }

  const acadVersion = VERSION_MAP[versionStr] || 'Unknown';
  const maintenanceRelease = b.length > 11 ? b[11] : null;

  // Try to extract thumbnail image (PREVIEW in R13+ stored at specific offsets)
  // R14 and later: thumbnail data at offset bytes 13+ varies by version — skip
  let thumbnailInfo = null;
  if (b.length > 20) {
    // Sentinel search for JPEG SOI (0xFF 0xD8) in first 4KB
    const searchLen = Math.min(4096, b.length);
    for (let i = 14; i < searchLen - 1; i++) {
      if (b[i] === 0xff && b[i + 1] === 0xd8) {
        // Find JPEG EOI
        for (let j = i + 2; j < Math.min(i + 65536, b.length - 1); j++) {
          if (b[j] === 0xff && b[j + 1] === 0xd9) {
            thumbnailInfo = { start: i, end: j + 2, size: j + 2 - i };
            break;
          }
        }
        if (thumbnailInfo) break;
      }
    }
  }

  const metaRows = [
    ['Format', 'AutoCAD DWG'],
    ['Version string', versionStr],
    ['AutoCAD version', acadVersion === 'Unknown' ? `${versionStr} (unknown)` : `AutoCAD ${acadVersion} (${versionStr})`],
    maintenanceRelease !== null ? ['Maintenance release', String(maintenanceRelease)] : null,
    ['File size', `${b.length.toLocaleString()} bytes`],
    thumbnailInfo ? ['Embedded thumbnail', `JPEG, ${thumbnailInfo.size.toLocaleString()} bytes`] : null,
  ].filter(Boolean).map(([k, v]) =>
    `<div class="meta-row"><span class="meta-key">${esc(k)}</span><span class="meta-val">${esc(v)}</span></div>`
  ).join('');

  let thumbnailHtml = '';
  if (thumbnailInfo) {
    const thumbBytes = b.slice(thumbnailInfo.start, thumbnailInfo.end);
    const b64 = btoa(Array.from(thumbBytes, (x) => String.fromCharCode(x)).join(''));
    thumbnailHtml = `
      <div class="meta-section">
        <h4 class="meta-section-title">Embedded Thumbnail</h4>
        <img src="data:image/jpeg;base64,${b64}" style="max-width:100%;max-height:300px;border:1px solid #e0e0e0;border-radius:4px" alt="DWG thumbnail">
      </div>`;
  }

  return {
    bodyHtml: `
      <style>
        .badge-dwg { background: #1a237e; color: #fff; }
      </style>
      <div class="badge-row"><span class="badge badge-dwg">DWG</span></div>
      ${partialSupportHtml(CAPABILITY)}
      <div class="meta-section">
        <h4 class="meta-section-title">File Info</h4>
        ${metaRows}
      </div>
      ${thumbnailHtml}
      <div class="meta-section">
        <h4 class="meta-section-title">About this format</h4>
        <p style="font-size:0.85rem;line-height:1.6;margin:0">
          DWG is AutoCAD's proprietary binary format for 2D/3D drawings. Full parsing requires
          the Open Design Alliance (ODA) SDK or <strong>LibreCAD</strong>'s libdxfrw — only the file header is shown here.
          Use AutoCAD, LibreCAD, or FreeCAD to open the complete drawing.
        </p>
      </div>`,
    hadUnsafe: false,
  };
}
