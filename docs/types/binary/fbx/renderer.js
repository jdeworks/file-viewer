// Binary FBX (Filmbox) format — header and root node summary.
//
// Binary FBX layout after 27-byte magic header:
//   bytes 23-26: version (uint32 LE) e.g. 7400 = FBX 7.4, 7700 = FBX 7.7
//   bytes 27+:   sequence of node records:
//     end_offset (uint32 or uint64 depending on version)
//     num_properties (uint32)
//     property_list_len (uint32)
//     name_len (uint8)
//     name (name_len bytes)
//     properties...
//     children (recursive)
//     null record (13 or 25 bytes)

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function r32le(b, off) {
  return (b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24)) >>> 0;
}

const FBX_VERSION_NAMES = {
  6000: '6.0', 6100: '6.1',
  7000: '7.0', 7100: '7.1', 7200: '7.2', 7300: '7.3', 7400: '7.4',
  7500: '7.5', 7600: '7.6', 7700: '7.7',
};

function parseRootNodes(b, version) {
  const is64bit = version >= 7500;
  const NULL_RECORD_SIZE = is64bit ? 25 : 13;
  const nodes = [];
  let off = 27;

  while (off + NULL_RECORD_SIZE < b.length) {
    const endOffset = r32le(b, off);
    if (endOffset === 0) break;
    const numProps = r32le(b, off + (is64bit ? 8 : 4));
    const nameLen = b[off + (is64bit ? 20 : 12)];
    if (nameLen === 0 || off + (is64bit ? 21 : 13) + nameLen > b.length) break;
    const nameOff = off + (is64bit ? 21 : 13);
    const name = new TextDecoder('ascii', { fatal: false }).decode(b.slice(nameOff, nameOff + nameLen));
    nodes.push({ name, numProps, endOffset });
    if (endOffset > b.length || endOffset <= off) break;
    off = endOffset;
    if (nodes.length >= 50) break;
  }
  return nodes;
}

export function render(intake) {
  const b = intake.bytes;
  if (!b || b.length < 27) {
    // Check ASCII FBX
    const text = intake.text || '';
    if (/^;\s*FBX/m.test(text)) {
      return {
        bodyHtml: `
          <style>.badge-fbx { background: #4527a0; color: #fff; }</style>
          <div class="badge-row"><span class="badge badge-fbx">FBX</span></div>
          <div class="meta-section"><div class="meta-row"><span class="meta-key">Format</span><span class="meta-val">FBX (ASCII)</span></div></div>
          <p class="viewer-message" style="margin-top:8px">ASCII FBX — switch to Raw view for content.</p>`,
        hadUnsafe: false,
      };
    }
    return { bodyHtml: '<p class="viewer-message">Not a valid FBX file.</p>', hadUnsafe: false };
  }

  const MAGIC_STR = 'Kaydara FBX Binary  ';
  const fileMagic = new TextDecoder('ascii', { fatal: false }).decode(b.slice(0, 20));
  if (fileMagic !== MAGIC_STR) {
    return { bodyHtml: '<p class="viewer-message">Missing FBX binary magic.</p>', hadUnsafe: false };
  }

  const version = r32le(b, 23);
  const versionStr = FBX_VERSION_NAMES[version] || `${(version / 1000) | 0}.${(version % 1000) / 100 | 0}`;

  let nodes = [];
  try { nodes = parseRootNodes(b, version); } catch (_) {}

  const metaRows = [
    ['Format', 'FBX (Filmbox 3D)'],
    ['FBX version', `${versionStr} (${version})`],
    ['Encoding', 'Binary'],
    nodes.length > 0 ? ['Root nodes', String(nodes.length)] : null,
    ['File size', `${b.length.toLocaleString()} bytes`],
  ].filter(Boolean).map(([k, v]) =>
    `<div class="meta-row"><span class="meta-key">${esc(k)}</span><span class="meta-val">${esc(v)}</span></div>`
  ).join('');

  const nodeTableHtml = nodes.length ? `
    <div class="meta-section">
      <h4 class="meta-section-title">Root Nodes</h4>
      <table class="fbx-table">
        <thead><tr><th>Node</th><th>Properties</th></tr></thead>
        <tbody>${nodes.map((n) =>
          `<tr><td class="fbx-node">${esc(n.name)}</td><td>${n.numProps}</td></tr>`
        ).join('')}</tbody>
      </table>
    </div>` : '';

  return {
    bodyHtml: `
      <style>
        .badge-fbx { background: #4527a0; color: #fff; }
        .fbx-table { border-collapse: collapse; width: 100%; font-size: 0.84rem; margin: 8px 0; }
        .fbx-table th { background: #ede7f6; text-align: left; padding: 4px 8px; border-bottom: 2px solid #d1c4e9; }
        .fbx-table td { padding: 3px 8px; border-bottom: 1px solid #f5f5f5; }
        .fbx-node { font-family: monospace; font-weight: 700; color: #4527a0; }
      </style>
      <div class="badge-row"><span class="badge badge-fbx">FBX</span></div>
      <div class="meta-section">
        <h4 class="meta-section-title">File Info</h4>
        ${metaRows}
      </div>
      ${nodeTableHtml}
      <div class="meta-section">
        <h4 class="meta-section-title">About this format</h4>
        <p style="font-size:0.85rem;line-height:1.6;margin:0">
          FBX (Filmbox) is Autodesk's proprietary 3D interchange format, widely used in game engines and VFX.
          Full scene content (meshes, skinning, animations, materials) requires the FBX SDK or
          <strong>three.js FBXLoader</strong> — only the header and root node list are shown here.
        </p>
      </div>`,
    hadUnsafe: false,
  };
}
