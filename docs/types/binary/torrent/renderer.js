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

const td = new TextDecoder();
const tdStrict = new TextDecoder('utf-8', { fatal: true });

function parseBencode(bytes, off) {
  const b = bytes[off];
  if (b === 105) { // 'i'
    let e = off + 1; while (bytes[e] !== 101) e++;
    return { v: parseInt(td.decode(bytes.slice(off + 1, e)), 10), end: e + 1 };
  }
  if (b === 108) { // 'l'
    const list = []; let p = off + 1;
    while (bytes[p] !== 101) { const r = parseBencode(bytes, p); list.push(r.v); p = r.end; }
    return { v: list, end: p + 1 };
  }
  if (b === 100) { // 'd'
    const obj = {}; let p = off + 1;
    while (bytes[p] !== 101) {
      const kr = parseBencode(bytes, p); p = kr.end;
      const vr = parseBencode(bytes, p); p = vr.end;
      if (typeof kr.v === 'string') obj[kr.v] = vr.v;
    }
    return { v: obj, end: p + 1 };
  }
  // string: N:data
  let c = off; while (bytes[c] !== 58) c++; // ':'
  const len = parseInt(td.decode(bytes.slice(off, c)), 10);
  const data = bytes.slice(c + 1, c + 1 + len);
  let str; try { str = tdStrict.decode(data); } catch { str = null; }
  return { v: str !== null ? str : data, end: c + 1 + len };
}

// Find raw bytes of the info dict value for SHA-1 infohash computation.
async function computeInfoHash(bytes) {
  // Search for "4:info" marker [0x34,0x3a,0x69,0x6e,0x66,0x6f]
  for (let i = 1; i < bytes.length - 6; i++) {
    if (bytes[i] === 52 && bytes[i+1] === 58 && bytes[i+2] === 105 &&
        bytes[i+3] === 110 && bytes[i+4] === 102 && bytes[i+5] === 111) {
      try {
        const infoStart = i + 6;
        const { end } = parseBencode(bytes, infoStart);
        const hashBuf = await crypto.subtle.digest('SHA-1', bytes.slice(infoStart, end));
        return Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');
      } catch { return null; }
    }
  }
  return null;
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
  let torrent;
  try {
    torrent = parseBencode(intake.bytes, 0).v;
  } catch (e) {
    return { bodyHtml: `<p style="color:var(--fg);padding:16px">Parse error: ${esc(e.message)}</p>`, hadUnsafe: false };
  }
  if (typeof torrent !== 'object' || !torrent) {
    return { bodyHtml: '<p style="color:var(--fg);padding:16px">Not a valid torrent file.</p>', hadUnsafe: false };
  }

  const info = (typeof torrent.info === 'object' && torrent.info) ? torrent.info : {};
  const name = typeof info.name === 'string' ? info.name : (intake.name || '—');

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

  const infoHash = await computeInfoHash(intake.bytes);

  let html = `<style>${STYLE}</style><h2>${esc(name)}</h2>`;

  html += `<div class="sec"><div class="sec-title">Info</div><dl>`;
  html += `<dt>Size</dt><dd>${esc(fmtBytes(totalSize))}</dd>`;
  html += `<dt>Files</dt><dd>${fileCount}</dd>`;
  if (typeof info['piece length'] === 'number') html += `<dt>Piece size</dt><dd>${esc(fmtBytes(info['piece length']))}</dd>`;
  if (typeof torrent.comment === 'string') html += `<dt>Comment</dt><dd>${esc(torrent.comment)}</dd>`;
  if (typeof torrent['created by'] === 'string') html += `<dt>Created by</dt><dd>${esc(torrent['created by'])}</dd>`;
  if (typeof torrent['creation date'] === 'number') {
    html += `<dt>Created</dt><dd>${esc(new Date(torrent['creation date'] * 1000).toISOString().slice(0, 10))}</dd>`;
  }
  if (infoHash) html += `<dt>Info hash</dt><dd class="mono" title="Magnet info hash (SHA-1)">${esc(infoHash)}</dd>`;
  html += `</dl></div>`;

  if (Array.isArray(info.files) && info.files.length > 0) {
    const MAX = 200;
    html += `<div class="sec"><div class="sec-title">Files (${info.files.length})</div><ul class="fl">`;
    for (const f of info.files.slice(0, MAX)) {
      const path = Array.isArray(f.path)
        ? f.path.map((p) => (typeof p === 'string' ? p : '?')).join('/')
        : '?';
      html += `<li><span class="fn">${esc(path)}</span><span class="fs">${esc(fmtBytes(typeof f.length === 'number' ? f.length : null))}</span></li>`;
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
