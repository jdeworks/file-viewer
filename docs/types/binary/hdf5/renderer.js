// HDF5 file format reader (partial — header info only)
// Full HDF5 parsing requires h5wasm (~2MB); this shows format info from the superblock.
//
// HDF5 superblock layout (version 0, most common):
//   offset 0: magic (8 bytes) = \x89HDF\r\n\x1a\n
//   offset 8: superblock version (uint8)
//   offset 9: free space version (uint8)
//   offset 10: root group symbol table version (uint8)
//   offset 11: reserved
//   offset 12: shared header version (uint8)
//   offset 13: size of offsets (uint8) — 4 or 8
//   offset 14: size of lengths (uint8) — 4 or 8
//   offset 15: reserved
//   offset 16: group leaf node K (uint16 LE)
//   offset 18: group internal node K (uint16 LE)
//   offset 20: file consistency flags (uint32 LE)
//   then: base address, free space address, end-of-file address, driver info addr, root group offset
//
// Superblock v2/v3 has different layout but same magic.

function r32le(b, off) {
  return ((b[off] | (b[off + 1] << 8) | (b[off + 2] << 16)) >>> 0) + b[off + 3] * 0x1000000;
}

function r16le(b, off) {
  return b[off] | (b[off + 1] << 8);
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function parseSuperblock(b) {
  const version = b[8];
  const result = { version };

  if (version === 0 || version === 1) {
    result.freeSpaceVersion = b[9];
    result.rootGroupVersion = b[10];
    result.sharedHeaderVersion = b[12];
    result.offsetSize = b[13];
    result.lengthSize = b[14];
    result.groupLeafK = r16le(b, 16);
    result.groupInternalK = r16le(b, 18);
    result.consistencyFlags = r32le(b, 20);
  } else if (version === 2 || version === 3) {
    result.offsetSize = b[9];
    result.lengthSize = b[10];
    result.consistencyFlags = b[11];
  }

  return result;
}

function consistencyFlagsLabel(flags) {
  if (flags === 0) return 'Consistent (no active writers)';
  const parts = [];
  if (flags & 0x01) parts.push('SWMR write access');
  if (flags & 0x02) parts.push('Write access');
  if (flags & 0x04) parts.push('File-space strategy tracked');
  return parts.length ? parts.join(', ') : `0x${flags.toString(16)}`;
}

export function render(intake) {
  const b = intake.bytes;
  if (!b || b.length < 9) {
    return { bodyHtml: '<p class="viewer-message">Not a valid HDF5 file.</p>', hadUnsafe: false };
  }

  const HDF5_MAGIC = [0x89, 0x48, 0x44, 0x46, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!HDF5_MAGIC.every((v, i) => b[i] === v)) {
    return { bodyHtml: '<p class="viewer-message">Missing HDF5 magic signature.</p>', hadUnsafe: false };
  }

  const sb = parseSuperblock(b);

  const versionNames = {
    0: 'HDF5 (v0 superblock — HDF5 1.0+)',
    1: 'HDF5 (v1 superblock — HDF5 1.6+)',
    2: 'HDF5 (v2 superblock — HDF5 1.8+)',
    3: 'HDF5 (v3 superblock — HDF5 1.10+ SWMR)',
  };

  const metaRows = [
    ['Format', 'HDF5 (Hierarchical Data Format 5)'],
    ['Superblock version', `${sb.version} — ${versionNames[sb.version] || 'Unknown'}`],
    ['File size', `${b.length.toLocaleString()} bytes`],
    sb.offsetSize != null ? ['Size of offsets', `${sb.offsetSize} bytes`] : null,
    sb.lengthSize != null ? ['Size of lengths', `${sb.lengthSize} bytes`] : null,
    sb.groupLeafK != null ? ['B-tree leaf K', String(sb.groupLeafK)] : null,
    sb.consistencyFlags != null ? ['Consistency flags', consistencyFlagsLabel(sb.consistencyFlags)] : null,
  ].filter(Boolean).map(([k, v]) => `<div class="meta-row"><span class="meta-key">${esc(k)}</span><span class="meta-val">${esc(v)}</span></div>`).join('');

  return {
    bodyHtml: `
      <style>
        .badge-hdf5 { background: #00695c; color: #fff; }
      </style>
      <div class="badge-row"><span class="badge badge-hdf5">HDF5</span></div>
      <div class="meta-section">
        <h4 class="meta-section-title">File Info</h4>
        ${metaRows}
      </div>
      <div class="meta-section">
        <h4 class="meta-section-title">About this format</h4>
        <p style="font-size:0.85rem;line-height:1.6;margin:0">
          HDF5 stores datasets and groups in a tree structure. Full content (datasets, attributes, groups) requires
          <strong>h5wasm</strong> or similar — only the file header is shown here.
          Use <code>h5ls</code> or <code>h5dump</code> to explore the full structure.
        </p>
      </div>`,
    hadUnsafe: false,
  };
}
