import { decodeBencode, isBencodeDictionary } from './bencode.js';

export function extract(intake) {
  try {
    const torrent = decodeBencode(intake.bytes).value;
    if (!isBencodeDictionary(torrent)) return {};
    const info = isBencodeDictionary(torrent.info) ? torrent.info : Object.create(null);
    let totalSize = 0, fileCount = 0;
    if (Array.isArray(info.files)) {
      fileCount = info.files.length;
      totalSize = info.files.reduce((s, f) => s + (isBencodeDictionary(f) && typeof f.length === 'number' ? f.length : 0), 0);
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
      creationDate: (() => {
        if (typeof torrent['creation date'] !== 'number') return null;
        const date = new Date(torrent['creation date'] * 1000);
        return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null;
      })(),
    };
  } catch { return {}; }
}
