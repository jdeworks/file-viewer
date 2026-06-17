function parseIco(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const type = dv.getUint16(2, true); // 1=ICO, 2=CUR
  const count = dv.getUint16(4, true);
  const entries = [];
  for (let i = 0; i < count; i++) {
    const base = 6 + i * 16;
    const w = bytes[base] || 256;
    const h = bytes[base + 1] || 256;
    const hotX = type === 2 ? dv.getUint16(base + 4, true) : null;
    const hotY = type === 2 ? dv.getUint16(base + 6, true) : null;
    const bitCount = type === 1 ? dv.getUint16(base + 6, true) : 0;
    const size = dv.getUint32(base + 8, true);
    const offset = dv.getUint32(base + 12, true);
    entries.push({ w, h, bitCount, hotX, hotY, size, offset });
  }
  return { type: type === 2 ? 'CUR' : 'ICO', entries };
}

async function entryToBlob(bytes, entry) {
  const data = bytes.slice(entry.offset, entry.offset + entry.size);
  // PNG-embedded check
  if (data[0] === 0x89 && data[1] === 0x50) {
    return new Blob([data], { type: 'image/png' });
  }
  // BMP-in-ICO: reconstruct with BMP file header
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const biBitCount = dv.getUint16(14, true);
  const paletteColors = biBitCount <= 8 ? (1 << biBitCount) : 0;
  const paletteBytes = paletteColors * 4;
  const pixelOffset = 14 + 40 + paletteBytes;
  const fileSize = 14 + data.byteLength;

  const header = new Uint8Array(14);
  const hdv = new DataView(header.buffer);
  header[0] = 0x42; header[1] = 0x4d; // BM
  hdv.setUint32(2, fileSize, true);
  hdv.setUint32(10, pixelOffset, true);

  // Fix biHeight: stored as 2× for ICO
  const fixed = new Uint8Array(data);
  const bmpDv = new DataView(fixed.buffer, fixed.byteOffset, fixed.byteLength);
  const origH = bmpDv.getInt32(8, true);
  if (origH > 0) bmpDv.setInt32(8, origH / 2, true);

  return new Blob([header, fixed], { type: 'image/bmp' });
}

export async function render(intake, _ctx) {
  const wrap = document.createElement('div');
  wrap.className = 'ico-wrap';

  let parsed;
  try {
    parsed = parseIco(intake.bytes);
  } catch (e) {
    wrap.textContent = 'Could not parse icon file: ' + e.message;
    return { parentNode: wrap, revoke() {} };
  }

  const typeTag = document.createElement('div');
  typeTag.className = 'ico-type-tag';
  typeTag.textContent = parsed.type + ' · ' + parsed.entries.length + ' image' + (parsed.entries.length !== 1 ? 's' : '');
  wrap.appendChild(typeTag);

  const grid = document.createElement('div');
  grid.className = 'ico-grid';
  wrap.appendChild(grid);

  const bitmaps = [];

  await Promise.all(parsed.entries.map(async (entry) => {
    const cell = document.createElement('div');
    cell.className = 'ico-cell';

    try {
      const blob = await entryToBlob(intake.bytes, entry);
      const bmp = await createImageBitmap(blob);
      bitmaps.push(bmp);

      const cv = document.createElement('canvas');
      cv.className = 'ico-canvas';
      cv.width = entry.w;
      cv.height = entry.h;
      cv.getContext('2d').drawImage(bmp, 0, 0);

      const lbl = document.createElement('span');
      lbl.className = 'ico-label';
      let txt = `${entry.w}×${entry.h}`;
      if (entry.bitCount) txt += ` / ${entry.bitCount}bpp`;
      if (entry.hotX !== null) txt += ` · hot ${entry.hotX},${entry.hotY}`;
      lbl.textContent = txt;

      cell.appendChild(cv);
      cell.appendChild(lbl);
    } catch {
      const lbl = document.createElement('span');
      lbl.className = 'ico-label';
      lbl.textContent = `${entry.w}×${entry.h} (unreadable)`;
      cell.appendChild(lbl);
    }

    grid.appendChild(cell);
  }));

  return {
    parentNode: wrap,
    revoke() { bitmaps.forEach((b) => b.close?.()); },
  };
}
