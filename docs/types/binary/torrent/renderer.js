import { decodeBencode, isBencodeDictionary } from './bencode.js';
import { inspectTorrentInfo } from './semantics.js';

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function fmtBytes(n) {
  if (typeof n !== 'number' || n < 0) return '—';
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  if (n < 1073741824) return (n / 1048576).toFixed(1) + ' MB';
  return (n / 1073741824).toFixed(2) + ' GB';
}

async function computeDigest(bytes, infoRange, algorithm) {
  if (!infoRange) return null;
  try {
    const hashBuf = await crypto.subtle.digest(algorithm, bytes.slice(infoRange.start, infoRange.end));
    return Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch { return null; }
}

const STYLE = `
body{font-family:system-ui,sans-serif;color:var(--fg);background:var(--bg);margin:0;padding:16px;font-size:13px}
h2{margin:0 0 16px;font-size:15px;font-weight:600;word-break:break-all}
.sec{margin-bottom:20px}
.sec-title{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--fg2);border-bottom:1px solid var(--border);padding-bottom:4px;margin-bottom:8px}
dl{margin:0;display:grid;grid-template-columns:130px 1fr;gap:3px 12px}
dt{color:var(--fg2);font-size:12px;font-weight:500;padding-top:2px}
dd{margin:0;word-break:break-all}
.mono{font-family:monospace;font-size:12px}
ul.fl{list-style:none;margin:0;padding:0}
ul.fl li{display:flex;justify-content:space-between;gap:8px;padding:2px 0;border-bottom:1px solid var(--border);font-size:12px}
ul.fl li:last-child{border-bottom:none}
.fn{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fs{flex-shrink:0;color:var(--fg2)}
.tracker{font-size:12px;color:var(--fg2);word-break:break-all;padding:1px 0}
.more{color:var(--fg2);font-style:italic;font-size:12px;margin-top:4px}
`;

export async function render(intake, _ctx) {
  let decoded;
  try {
    decoded = decodeBencode(intake.bytes);
  } catch (e) {
    return { bodyHtml: `<p style="color:var(--fg);padding:16px">Parse error: ${esc(e.message)}</p>`, hadUnsafe: false };
  }
  const torrent = decoded.value;
  if (!isBencodeDictionary(torrent)) {
    return { bodyHtml: '<p style="color:var(--fg);padding:16px">Not a valid torrent file.</p>', hadUnsafe: false };
  }

  const info = isBencodeDictionary(torrent.info) ? torrent.info : Object.create(null);
  const name = typeof info.name === 'string' ? info.name : (intake.name || '—');
  const semantics = inspectTorrentInfo(info, torrent['piece layers']);
  const inventory = semantics.inventory;

  const trackers = new Set();
  if (typeof torrent.announce === 'string') trackers.add(torrent.announce);
  if (Array.isArray(torrent['announce-list'])) {
    torrent['announce-list'].flat().forEach((t) => { if (typeof t === 'string') trackers.add(t); });
  }

  const [v1Hash, v2Hash] = await Promise.all([
    semantics.hasV1 ? computeDigest(intake.bytes, decoded.infoRange, 'SHA-1') : null,
    semantics.hasV2 ? computeDigest(intake.bytes, decoded.infoRange, 'SHA-256') : null,
  ]);
  const v2Multihash = v2Hash ? `1220${v2Hash}` : null;

  let html = `<style>${STYLE}</style><h2>${esc(name)}</h2>`;

  html += `<div class="sec"><div class="sec-title">Info</div><dl>`;
  html += `<dt>Size</dt><dd>${inventory.totalSizeComplete === false ? 'At least ' : ''}${esc(fmtBytes(inventory.totalSize))}</dd>`;
  html += `<dt>Files</dt><dd>${inventory.truncated ? 'At least ' : ''}${inventory.fileCount}</dd>`;
  if (semantics.declaresV2 && semantics.hasV1) html += '<dt>Version</dt><dd>BitTorrent v1 + v2 hybrid</dd>';
  else if (semantics.declaresV2) html += '<dt>Version</dt><dd>BitTorrent v2</dd>';
  if (typeof info['piece length'] === 'number') html += `<dt>Piece size</dt><dd>${esc(fmtBytes(info['piece length']))}</dd>`;
  if (typeof torrent.comment === 'string') html += `<dt>Comment</dt><dd>${esc(torrent.comment)}</dd>`;
  if (typeof torrent['created by'] === 'string') html += `<dt>Created by</dt><dd>${esc(torrent['created by'])}</dd>`;
  if (typeof torrent['creation date'] === 'number') {
    const created = new Date(torrent['creation date'] * 1000);
    if (Number.isFinite(created.getTime())) html += `<dt>Created</dt><dd>${esc(created.toISOString().slice(0, 10))}</dd>`;
  }
  if (v1Hash) {
    const label = v2Hash ? 'SHA-1 info hash' : 'Info hash';
    html += `<dt>${label}</dt><dd class="mono" title="Magnet info hash (SHA-1)">${esc(v1Hash)}</dd>`;
  }
  if (v2Hash) html += `<dt>SHA-256 info hash</dt><dd class="mono" title="BitTorrent v2 info hash">${esc(v2Hash)}</dd>`;
  html += `</dl></div>`;

  const exactTopics = [];
  if (v2Multihash) exactTopics.push(`xt=urn:btmh:${v2Multihash}`);
  if (v1Hash) exactTopics.push(`xt=urn:btih:${v1Hash}`);
  if (exactTopics.length) {
    const params = [...exactTopics];
    if (typeof info.name === 'string') params.push(`dn=${encodeURIComponent(info.name)}`);
    for (const t of trackers) params.push(`tr=${encodeURIComponent(t)}`);
    const magnet = `magnet:?${params.join('&')}`;
    html += `<div class="sec"><div class="sec-title">Magnet Link</div>`;
    html += `<div class="tracker mono" style="word-break:break-all"><a href="${esc(magnet)}" style="color:inherit">${esc(magnet)}</a></div>`;
    html += `</div>`;
  }

  if (inventory.files.length > 0) {
    const countLabel = inventory.truncated ? `at least ${inventory.fileCount}` : inventory.fileCount;
    html += `<div class="sec"><div class="sec-title">Files (${countLabel})</div><ul class="fl">`;
    for (const file of inventory.files) {
      html += `<li><span class="fn">${esc(file.path)}</span><span class="fs">${esc(fmtBytes(file.length))}</span></li>`;
    }
    if (inventory.inventoryTruncated && !inventory.truncated) {
      html += `<div class="more">… and ${inventory.fileCount - inventory.files.length} more files</div>`;
    }
    html += `</ul></div>`;
  }

  if (semantics.declaresV2 && inventory.truncated) {
    html += '<div class="more">File tree traversal limit reached; counts and size are partial.</div>';
  }
  if (semantics.declaresV2 && inventory.overflow) {
    html += '<div class="more">File sizes exceed the supported total-size range.</div>';
  }
  if (semantics.declaresV2 && inventory.malformed) {
    html += '<div class="more">The BitTorrent v2 file tree is malformed; totals may be incomplete.</div>';
  }
  if (semantics.declaresV2 && semantics.v2.pieceLayers.missing) {
    html += '<div class="more">Required BitTorrent v2 piece layers are missing; no v2 magnet was generated.</div>';
  } else if (semantics.declaresV2
    && (semantics.v2.pieceLayers.malformed || semantics.v2.pieceLayers.inconsistent)) {
    html += '<div class="more">The BitTorrent v2 piece layers are malformed or inconsistent; no v2 magnet was generated.</div>';
  }

  if (trackers.size > 0) {
    html += `<div class="sec"><div class="sec-title">Trackers (${trackers.size})</div>`;
    for (const t of trackers) html += `<div class="tracker">${esc(t)}</div>`;
    html += `</div>`;
  }

  return { bodyHtml: html, hadUnsafe: false };
}
