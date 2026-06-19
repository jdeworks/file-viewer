// ar archive format:
// [0-7]: "!<arch>\n" magic
// Each entry (60 bytes):
//   [0-15]:  filename (16 chars, space-padded)
//   [16-27]: timestamp (12 chars ASCII decimal)
//   [28-33]: owner ID
//   [34-39]: group ID
//   [40-47]: file mode (octal)
//   [48-57]: file size (10 chars ASCII decimal)
//   [58-59]: end marker "`\n"

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function readArEntries(b) {
  const entries = [];
  let off = 8; // skip magic
  while (off + 60 <= b.length) {
    const name = new TextDecoder('ascii', { fatal: false }).decode(b.slice(off, off + 16)).trimEnd();
    const sizeStr = new TextDecoder('ascii', { fatal: false }).decode(b.slice(off + 48, off + 58)).trimEnd();
    const size = parseInt(sizeStr, 10) || 0;
    if (b[off + 58] !== 0x60 || b[off + 59] !== 0x0a) break;
    entries.push({ name, size, offset: off + 60 });
    off += 60 + size + (size % 2); // align to 2-byte boundary
  }
  return entries;
}

function parseControl(text) {
  const info = {};
  for (const line of text.split('\n')) {
    const colon = line.indexOf(':');
    if (colon > 0) {
      const key = line.slice(0, colon).trim().toLowerCase();
      const val = line.slice(colon + 1).trim();
      if (key && val && !info[key]) info[key] = val;
    }
  }
  return info;
}

export function render(intake) {
  const b = intake.bytes;
  if (!b || b.length < 8) {
    return { bodyHtml: '<p class="viewer-message">File too small.</p>', hadUnsafe: false };
  }

  const isArMagic = b[0] === 0x21 && b[1] === 0x3c && b[2] === 0x61 && b[3] === 0x72
    && b[4] === 0x63 && b[5] === 0x68 && b[6] === 0x3e && b[7] === 0x0a;
  if (!isArMagic) {
    return { bodyHtml: '<p class="viewer-message">Not a valid Debian package (missing ar magic).</p>', hadUnsafe: false };
  }

  const entries = readArEntries(b);
  let debVersion = '';
  let controlText = '';

  for (const e of entries) {
    if (e.name.startsWith('debian-binary')) {
      debVersion = new TextDecoder('ascii', { fatal: false }).decode(b.slice(e.offset, e.offset + e.size)).trim();
    }
    if (e.name.startsWith('control.tar') && e.name.includes('.gz')) {
      // Try to find control file in the control.tar.gz — parse raw gzip looking for control text
      // Simple heuristic: scan for Package: string within the data
      const slice = b.slice(e.offset, e.offset + e.size);
      try {
        const text = new TextDecoder('ascii', { fatal: false }).decode(slice);
        const pkgMatch = text.match(/Package:\s*(\S+)/);
        if (pkgMatch) controlText = text;
      } catch { /* skip */ }
    }
    // Some debs store control file directly (old format)
    if (e.name.startsWith('control')) {
      const text = new TextDecoder('utf-8', { fatal: false }).decode(b.slice(e.offset, e.offset + e.size));
      if (text.includes('Package:')) controlText = text;
    }
  }

  const info = controlText ? parseControl(controlText) : {};

  const packageName = info['package'] || info['name'] || '';
  const version = info['version'] || '';
  const arch = info['architecture'] || '';
  const maintainer = info['maintainer'] || '';
  const description = info['description'] || '';
  const homepage = info['homepage'] || '';
  const installedSize = info['installed-size'] || '';
  const depends = info['depends'] || '';

  const rows = [
    ['Format', 'Debian Package'],
    debVersion ? ['Format version', debVersion] : null,
    packageName ? ['Package', packageName] : null,
    version ? ['Version', version] : null,
    arch ? ['Architecture', arch] : null,
    maintainer ? ['Maintainer', maintainer] : null,
    homepage ? ['Homepage', homepage] : null,
    installedSize ? ['Installed size', `${installedSize} KB`] : null,
    ['File size', `${b.length.toLocaleString()} bytes`],
  ].filter(Boolean).map(([k, v]) =>
    `<div class="meta-row"><span class="meta-key">${esc(k)}</span><span class="meta-val">${esc(v)}</span></div>`
  ).join('');

  const descHtml = description
    ? `<div class="meta-section"><h4 class="meta-section-title">Description</h4><p style="font-size:0.85rem;line-height:1.6;margin:0">${esc(description)}</p></div>`
    : '';

  const depsHtml = depends
    ? `<div class="meta-section"><h4 class="meta-section-title">Dependencies</h4><p style="font-size:0.85rem;line-height:1.6;margin:0">${esc(depends)}</p></div>`
    : '';

  const archiveRows = entries.map(e =>
    `<div class="meta-row"><span class="meta-key">${esc(e.name)}</span><span class="meta-val">${e.size.toLocaleString()} bytes</span></div>`
  ).join('');

  return {
    bodyHtml: `
      <style>.badge-deb { background: #c2185b; color: #fff; }</style>
      <div class="badge-row"><span class="badge badge-deb">DEB</span></div>
      <div class="meta-section">
        <h4 class="meta-section-title">Package Info</h4>
        ${rows}
      </div>
      ${descHtml}
      ${depsHtml}
      <div class="meta-section">
        <h4 class="meta-section-title">Archive Members</h4>
        ${archiveRows}
      </div>`,
    hadUnsafe: false,
  };
}
