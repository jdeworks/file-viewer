import { decodeBencode, isBencodeDictionary } from './bencode.js';
import { inspectTorrentInfo } from './semantics.js';

export function extract(intake) {
  try {
    const torrent = decodeBencode(intake.bytes).value;
    if (!isBencodeDictionary(torrent)) return {};
    const info = isBencodeDictionary(torrent.info) ? torrent.info : Object.create(null);
    const semantics = inspectTorrentInfo(info, torrent['piece layers']);
    const inventory = semantics.inventory;
    const trackers = new Set();
    if (typeof torrent.announce === 'string') trackers.add(torrent.announce);
    if (Array.isArray(torrent['announce-list'])) {
      torrent['announce-list'].flat().forEach((t) => { if (typeof t === 'string') trackers.add(t); });
    }
    return {
      name: typeof info.name === 'string' ? info.name : null,
      totalSize: inventory.totalSize,
      fileCount: inventory.fileCount,
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
