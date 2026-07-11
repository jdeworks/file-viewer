import { decodeBencode, isBencodeDictionary } from './bencode.js';

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

async function computeInfoHash(bytes, infoRange) {
  if (!infoRange) return null;
  try {
    const hashBuf = await crypto.subtle.digest('SHA-1', bytes.slice(infoRange.start, infoRange.end));
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

  const infoHash = await computeInfoHash(intake.bytes, decoded.infoRange);

  let html = `<style>${STYLE}</style><h2>${esc(name)}</h2>`;

  html += `<div class="sec"><div class="sec-title">Info</div><dl>`;
  html += `<dt>Size</dt><dd>${esc(fmtBytes(totalSize))}</dd>`;
  html += `<dt>Files</dt><dd>${fileCount}</dd>`;
  if (typeof info['piece length'] === 'number') html += `<dt>Piece size</dt><dd>${esc(fmtBytes(info['piece length']))}</dd>`;
  if (typeof torrent.comment === 'string') html += `<dt>Comment</dt><dd>${esc(torrent.comment)}</dd>`;
  if (typeof torrent['created by'] === 'string') html += `<dt>Created by</dt><dd>${esc(torrent['created by'])}</dd>`;
  if (typeof torrent['creation date'] === 'number') {
    const created = new Date(torrent['creation date'] * 1000);
    if (Number.isFinite(created.getTime())) html += `<dt>Created</dt><dd>${esc(created.toISOString().slice(0, 10))}</dd>`;
  }
  if (infoHash) html += `<dt>Info hash</dt><dd class="mono" title="Magnet info hash (SHA-1)">${esc(infoHash)}</dd>`;
  html += `</dl></div>`;

  if (infoHash) {
    const params = [`xt=urn:btih:${infoHash}`];
    if (typeof info.name === 'string') params.push(`dn=${encodeURIComponent(info.name)}`);
    for (const t of trackers) params.push(`tr=${encodeURIComponent(t)}`);
    const magnet = `magnet:?${params.join('&')}`;
    html += `<div class="sec"><div class="sec-title">Magnet Link</div>`;
    html += `<div class="tracker mono" style="word-break:break-all"><a href="${esc(magnet)}" style="color:inherit">${esc(magnet)}</a></div>`;
    html += `</div>`;
  }

  if (Array.isArray(info.files) && info.files.length > 0) {
    const MAX = 200;
    html += `<div class="sec"><div class="sec-title">Files (${info.files.length})</div><ul class="fl">`;
    for (const f of info.files.slice(0, MAX)) {
      const path = isBencodeDictionary(f) && Array.isArray(f.path)
        ? f.path.map((p) => (typeof p === 'string' ? p : '?')).join('/')
        : '?';
      html += `<li><span class="fn">${esc(path)}</span><span class="fs">${esc(fmtBytes(isBencodeDictionary(f) && typeof f.length === 'number' ? f.length : null))}</span></li>`;
    }
    if (info.files.length > MAX) html += `<div class="more">… and ${info.files.length - MAX} more files</div>`;
    html += `</ul></div>`;
  }

  if (trackers.size > 0) {
    html += `<div class="sec"><div class="sec-title">Trackers (${trackers.size})</div>`;
    for (const t of trackers) html += `<div class="tracker">${esc(t)}</div>`;
    html += `</div>`;
  }

  return { bodyHtml: html, hadUnsafe: false };
}
