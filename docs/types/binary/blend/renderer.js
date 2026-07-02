// Blender binary file format (partial — header + block summary)
//
// Header (12 bytes):
//   0-6:   "BLENDER"
//   7:     pointer size: '_' = 4B, '-' = 8B
//   8:     endianness: 'v' = LE, 'V' = BE
//   9-11:  version string e.g. "400", "393", "279"
//
// Then a sequence of file blocks:
//   code (4 bytes): block type id (e.g. "REND", "GLOB", "SCENE", "OB", "ME", etc.)
//   size (int32): body size in bytes
//   old pointer (4 or 8 bytes): address when saved
//   SDNA index (int32)
//   count (int32)
//   body (size bytes)

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function r32le(b, off) {
  return (b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24)) >>> 0;
}
function r32be(b, off) {
  return ((b[off] << 24) | (b[off + 1] << 16) | (b[off + 2] << 8) | b[off + 3]) >>> 0;
}

const BLOCK_DESCRIPTIONS = {
  REND: 'Render settings',
  GLOB: 'Global scene settings',
  WM:   'Window manager',
  SCR:  'Screen layout',
  SN:   'Scene',
  OB:   'Object',
  ME:   'Mesh',
  MA:   'Material',
  TE:   'Texture',
  IM:   'Image',
  LA:   'Light',
  CA:   'Camera',
  CU:   'Curve',
  MB:   'MetaBall',
  AR:   'Armature',
  AC:   'Action',
  GR:   'Group / Collection',
  WO:   'World',
  NT:   'Node tree',
  SC:   'Sound',
  PA:   'Particle system',
  DNA1: 'DNA structure definitions',
  ENDB: 'End of file',
};

function parseBlocks(b, ptrSize, isLE) {
  const r32 = isLE ? r32le : r32be;
  const blockHeaderSize = 4 + 4 + ptrSize + 4 + 4; // code + size + ptr + sdnaIdx + count
  const blocks = {};
  let off = 12; // skip file header

  while (off + blockHeaderSize <= b.length) {
    const code = new TextDecoder('ascii', { fatal: false }).decode(b.slice(off, off + 4)).replace(/\x00/g, '');
    const bodySize = r32(b, off + 4);
    if (code === 'ENDB') { blocks['ENDB'] = (blocks['ENDB'] || 0) + 1; break; }
    if (off + blockHeaderSize + bodySize > b.length) break;
    blocks[code] = (blocks[code] || 0) + 1;
    off += blockHeaderSize + bodySize;
    if (Object.keys(blocks).length > 200) break;
  }
  return blocks;
}

export function render(intake) {
  const b = intake.bytes;
  if (!b || b.length < 12) {
    return { bodyHtml: '<p class="viewer-message">Not a valid Blender file.</p>', hadUnsafe: false };
  }

  const magic = new TextDecoder('ascii', { fatal: false }).decode(b.slice(0, 7));
  if (magic !== 'BLENDER') {
    return { bodyHtml: '<p class="viewer-message">Missing BLENDER magic.</p>', hadUnsafe: false };
  }

  const ptrChar = String.fromCharCode(b[7]);
  const endChar = String.fromCharCode(b[8]);
  const versionStr = new TextDecoder('ascii', { fatal: false }).decode(b.slice(9, 12));
  const ptrSize = ptrChar === '-' ? 8 : 4;
  const isLE = endChar === 'v';

  const vNum = parseInt(versionStr, 10);
  let versionDisplay = versionStr;
  if (!isNaN(vNum)) {
    const major = Math.floor(vNum / 100);
    const minor = Math.floor((vNum % 100) / 10);
    const patch = vNum % 10;
    versionDisplay = `${major}.${minor}.${patch} (${versionStr})`;
  }

  let blocks = {};
  try { blocks = parseBlocks(b, ptrSize, isLE); } catch (_) {}

  const totalBlocks = Object.values(blocks).reduce((s, n) => s + n, 0);

  const metaRows = [
    ['Format', 'Blender 3D Scene'],
    ['Blender version', versionDisplay],
    ['Pointer size', `${ptrSize} bytes (${ptrChar === '-' ? '64-bit' : '32-bit'})`],
    ['Endianness', isLE ? 'Little-endian' : 'Big-endian'],
    ['File size', `${b.length.toLocaleString()} bytes`],
    totalBlocks > 0 ? ['File blocks', `${totalBlocks.toLocaleString()}`] : null,
  ].filter(Boolean).map(([k, v]) =>
    `<div class="meta-row"><span class="meta-key">${esc(k)}</span><span class="meta-val">${esc(v)}</span></div>`
  ).join('');

  const blockEntries = Object.entries(blocks)
    .filter(([c]) => c !== 'ENDB')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 24);

  const blockTableHtml = blockEntries.length ? `
    <div class="meta-section">
      <h4 class="meta-section-title">Block Summary</h4>
      <table class="blend-table">
        <thead><tr><th>Code</th><th>Description</th><th>Count</th></tr></thead>
        <tbody>${blockEntries.map(([code, count]) =>
          `<tr><td class="blend-code">${esc(code)}</td><td class="blend-desc">${esc(BLOCK_DESCRIPTIONS[code] || '—')}</td><td>${count.toLocaleString()}</td></tr>`
        ).join('')}</tbody>
      </table>
    </div>` : '';

  return {
    bodyHtml: `
      <style>
        .badge-blend { background: #e65100; color: #fff; }
        .blend-table { border-collapse: collapse; width: 100%; font-size: 0.84rem; margin: 8px 0; }
        .blend-table th { background: #fff3e0; text-align: left; padding: 4px 8px; border-bottom: 2px solid #ffe0b2; }
        .blend-table td { padding: 3px 8px; border-bottom: 1px solid #f5f5f5; }
        .blend-code { font-family: monospace; font-weight: 700; color: #e65100; }
        .blend-desc { color: #555; font-size: 0.82rem; }
      </style>
      <div class="badge-row"><span class="badge badge-blend">Blender</span></div>
      <div class="meta-section">
        <h4 class="meta-section-title">File Info</h4>
        ${metaRows}
      </div>
      ${blockTableHtml}
      <div class="meta-section">
        <h4 class="meta-section-title">About this format</h4>
        <p style="font-size:0.85rem;line-height:1.6;margin:0">
          Blender's .blend format stores scene data in typed file blocks with a DNA structure index.
          Full scene content (meshes, materials, animations) requires Blender or <strong>bpy</strong> to parse.
        </p>
      </div>`,
    hadUnsafe: false,
  };
}
