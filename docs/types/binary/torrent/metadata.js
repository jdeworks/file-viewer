const td = new TextDecoder();
const tdStrict = new TextDecoder('utf-8', { fatal: true });

function parseBencode(bytes, off) {
  const b = bytes[off];
  if (b === 105) {
    let e = off + 1; while (bytes[e] !== 101) e++;
    return { v: parseInt(td.decode(bytes.slice(off + 1, e)), 10), end: e + 1 };
  }
  if (b === 108) {
    const list = []; let p = off + 1;
    while (bytes[p] !== 101) { const r = parseBencode(bytes, p); list.push(r.v); p = r.end; }
    return { v: list, end: p + 1 };
  }
  if (b === 100) {
    const obj = {}; let p = off + 1;
    while (bytes[p] !== 101) {
      const kr = parseBencode(bytes, p); p = kr.end;
      const vr = parseBencode(bytes, p); p = vr.end;
      if (typeof kr.v === 'string') obj[kr.v] = vr.v;
    }
    return { v: obj, end: p + 1 };
  }
  let c = off; while (bytes[c] !== 58) c++;
  const len = parseInt(td.decode(bytes.slice(off, c)), 10);
  const data = bytes.slice(c + 1, c + 1 + len);
  let str; try { str = tdStrict.decode(data); } catch { str = null; }
  return { v: str !== null ? str : data, end: c + 1 + len };
}

export function extract(intake) {
  try {
    const torrent = parseBencode(intake.bytes, 0).v;
    if (typeof torrent !== 'object' || !torrent) return {};
    const info = (typeof torrent.info === 'object' && torrent.info) ? torrent.info : {};
    let totalSize = 0, fileCount = 0;
    if (Array.isArray(info.files)) {
      fileCount = info.files.length;
      totalSize = info.files.reduce((s, f) => s + (typeof f.length === 'number' ? f.length : 0), 0);
    } else if (typeof info.length === 'number') {
      fileCount = 1; totalSize = info.length;
    }
    const trackers = new Set();
    if (typeof torrent.announce === 'string') trackers.add(torrent.announce);
    if (Array.isArray(torrent['announce-list'])) {
      torrent['announce-list'].flat().forEach((t) => { if (typeof t === 'string') trackers.add(t); });
    }
    return {
      name: typeof info.name === 'string' ? info.name : null,
      totalSize,
      fileCount,
      pieceSize: typeof info['piece length'] === 'number' ? info['piece length'] : null,
      trackerCount: trackers.size,
      createdBy: typeof torrent['created by'] === 'string' ? torrent['created by'] : null,
      creationDate: typeof torrent['creation date'] === 'number'
        ? new Date(torrent['creation date'] * 1000).toISOString().slice(0, 10)
        : null,
    };
  } catch { return {}; }
}
