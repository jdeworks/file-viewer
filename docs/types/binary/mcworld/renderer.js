import { loadGlobal, vendor } from '../../../core/script-loader.js';
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function fmtBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1048576).toFixed(1) + ' MB';
}

const GAMEMODES = { 0: 'Survival', 1: 'Creative', 2: 'Adventure', 3: 'Spectator' };
const DIFFICULTIES = { 0: 'Peaceful', 1: 'Easy', 2: 'Normal', 3: 'Hard' };

// Minimal NBT parser for Bedrock level.dat (little-endian NBT with 8-byte header)
function parseBedrockLevelDat(bytes) {
  // Bedrock level.dat: 4-byte version, 4-byte length, then little-endian NBT
  if (bytes.length < 8) return null;
  const view = new DataView(bytes.buffer ?? bytes);
  const storageVersion = view.getUint32(0, true);
  // Remainder is little-endian NBT (same structure as Java but little-endian for numbers)
  try {
    return parseLENBT(bytes, 8, storageVersion);
  } catch {
    return { storageVersion };
  }
}

// Parse little-endian NBT starting at offset
function parseLENBT(bytes, offset, storageVersion) {
  const view = new DataView(bytes.buffer ?? bytes);
  const result = { storageVersion };

  function readString(pos) {
    const len = view.getUint16(pos, true);
    const str = new TextDecoder().decode(bytes.slice(pos + 2, pos + 2 + len));
    return { str, next: pos + 2 + len };
  }

  function readTag(pos, typeHint) {
    const type = typeHint !== undefined ? typeHint : bytes[pos++];
    if (type === 0) return { value: null, next: pos, type: 0 };

    let nameStr = '', nameEnd = pos;
    if (typeHint === undefined) {
      const { str, next } = readString(pos);
      nameStr = str; nameEnd = next; pos = next;
    }

    let value, next = pos;
    switch (type) {
      case 1: value = view.getInt8(pos); next = pos + 1; break;
      case 2: value = view.getInt16(pos, true); next = pos + 2; break;
      case 3: value = view.getInt32(pos, true); next = pos + 4; break;
      case 4: {
        // Long: skip (no BigInt to keep it simple)
        value = view.getInt32(pos, true); next = pos + 8; break;
      }
      case 5: value = view.getFloat32(pos, true); next = pos + 4; break;
      case 6: value = view.getFloat64(pos, true); next = pos + 8; break;
      case 7: { // ByteArray
        const len = view.getInt32(pos, true);
        value = null; next = pos + 4 + len; break;
      }
      case 8: { // String
        const { str, next: n } = readString(pos);
        value = str; next = n; break;
      }
      case 9: { // List
        const listType = bytes[pos++];
        const count = view.getInt32(pos, true); pos += 4;
        value = null; // don't fully parse lists
        next = pos;
        // Skip list items (very rough — only handles scalars well)
        for (let i = 0; i < count && next < bytes.length; i++) {
          const r = readTag(next, listType);
          next = r.next;
        }
        break;
      }
      case 10: { // Compound
        const compound = {};
        next = pos;
        while (next < bytes.length) {
          const r = readTag(next);
          if (r.type === 0) { next = r.next; break; }
          if (r.name !== undefined) compound[r.name] = r.value;
          next = r.next;
        }
        value = compound; break;
      }
      case 11: { // IntArray
        const len = view.getInt32(pos, true);
        value = null; next = pos + 4 + len * 4; break;
      }
      case 12: { // LongArray
        const len = view.getInt32(pos, true);
        value = null; next = pos + 4 + len * 8; break;
      }
      default: value = null; next = pos + 1; break;
    }
    return { name: nameStr, value, next, type };
  }

  try {
    const root = readTag(offset);
    if (root.value && typeof root.value === 'object') {
      const d = root.value;
      if (d.LevelName) result.levelName = d.LevelName;
      if (d.StorageVersion !== undefined) result.storageVersion = d.StorageVersion;
      if (typeof d.GameType === 'number') result.gameMode = GAMEMODES[d.GameType] || String(d.GameType);
      if (typeof d.Difficulty === 'number') result.difficulty = DIFFICULTIES[d.Difficulty] || String(d.Difficulty);
      if (d.lastOpenedWithVersion) {
        const v = d.lastOpenedWithVersion;
        if (Array.isArray(v)) result.mcVersion = v.slice(0, 4).join('.');
      }
      if (d.worldStartCount !== undefined) result.worldStartCount = d.worldStartCount;
      if (d.SpawnX !== undefined) result.spawn = `${d.SpawnX}, ${d.SpawnY ?? 0}, ${d.SpawnZ ?? 0}`;
    }
  } catch {
    // partial info is fine
  }

  return result;
}

const STYLE = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;font-size:13px;color:var(--fg,#1a1a1a);background:var(--bg,#f5f5f5);padding:18px 16px}
.mc-header{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:18px}
.badge{display:inline-block;font-weight:700;font-size:11px;letter-spacing:.06em;padding:3px 9px;border-radius:4px;border:1px solid transparent}
.badge-mc{background:#5d9e3e;color:#fff;font-size:13px;padding:4px 12px}
.badge-type{background:#e8f5e9;color:#1b5e20;border-color:#a5d6a7}
.badge-size{background:var(--bg2,#eee);color:var(--fg2,#555);border-color:var(--border,#d0d0d0)}
.sec{margin-bottom:20px}
.sec-title{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--fg2,#666);border-bottom:1px solid var(--border,#e0e0e0);padding-bottom:4px;margin-bottom:8px}
.card{background:var(--panel,#fff);border:1px solid var(--border,#e0e0e0);border-radius:6px;overflow:hidden}
dl.kv{display:grid;grid-template-columns:140px 1fr;gap:1px}
dl.kv dt{background:var(--th-bg,#f9f9f9);padding:6px 12px;font-size:12px;font-weight:500;color:var(--fg2,#555)}
dl.kv dd{padding:6px 12px;word-break:break-all}
.tag-list{display:flex;gap:6px;flex-wrap:wrap;padding:10px 12px}
.tag{font-size:11px;padding:2px 8px;border-radius:3px;background:var(--bg2,#f0f0f0);border:1px solid var(--border,#ddd);color:var(--fg,#333)}
.tag.dim{background:#e8eaf6;border-color:#9fa8da;color:#283593}
.tag.addon{background:#fce4ec;border-color:#f48fb1;color:#880e4f}
.tag.db{background:#fff8e1;border-color:#ffe082;color:#6d4c00}
table{width:100%;border-collapse:collapse}
th{text-align:left;padding:6px 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--fg2,#777);background:var(--th-bg,#f9f9f9);border-bottom:1px solid var(--border,#e8e8e8)}
td{padding:5px 12px;border-bottom:1px solid var(--border,#f0f0f0);word-break:break-all}
tr:last-child td{border-bottom:none}
.td-size{text-align:right;color:var(--fg2,#888);white-space:nowrap}
.empty{padding:10px 12px;color:var(--fg2,#999);font-style:italic}
.err{background:#fff3f3;border:1px solid #f5c6c6;border-radius:6px;padding:10px 14px;color:#b00020;font-size:12px;margin-bottom:16px}
`;

export async function render(intake) {
  const bytes = intake.bytes;
  if (!bytes || bytes.length < 4) {
    return { bodyHtml: `<style>${STYLE}</style><div class="err">File too small.</div>` };
  }

  const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
  let zip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch (e) {
    return { bodyHtml: `<style>${STYLE}</style><div class="err">Could not open archive: ${esc(e.message)}</div>` };
  }

  const files = Object.keys(zip.files).sort();

  // Determine package type
  const hasLevelDat  = files.some((f) => f === 'level.dat' || f.endsWith('/level.dat'));
  const hasLevelName = files.some((f) => f === 'levelname.txt' || f.endsWith('/levelname.txt'));
  const hasMcMeta    = files.some((f) => f === 'pack.mcmeta' || f.endsWith('/pack.mcmeta'));
  const hasManifest  = files.some((f) => f === 'manifest.json' || f.endsWith('/manifest.json'));
  const hasBehavior  = files.some((f) => /behavior_packs?/i.test(f));
  const hasResource  = files.some((f) => /resource_packs?/i.test(f));
  const ext = (intake.filename || '').split('.').pop().toLowerCase();

  let packageType = 'World';
  if (ext === 'mctemplate') packageType = 'World Template';
  else if (ext === 'mcpack') packageType = hasBehavior ? 'Behavior Pack' : hasResource ? 'Resource Pack' : 'Add-On Pack';
  else if (!hasLevelDat && hasMcMeta) packageType = 'Resource Pack';
  else if (!hasLevelDat && hasBehavior) packageType = 'Behavior Pack';
  else if (!hasLevelDat && hasManifest) packageType = 'Add-On Pack';

  // Try to read level name from levelname.txt (Bedrock)
  let levelName = null;
  const levelNameFile = zip.file('levelname.txt') || zip.file(files.find((f) => f.endsWith('/levelname.txt')) || '');
  if (levelNameFile) {
    try { levelName = (await levelNameFile.async('string')).trim(); } catch {}
  }

  // Try to parse level.dat
  let levelInfo = null;
  const levelDatFile = zip.file('level.dat') || zip.file(files.find((f) => f === 'level.dat' || f.endsWith('/level.dat')) || '');
  if (levelDatFile) {
    try {
      const dat = await levelDatFile.async('uint8array');
      levelInfo = parseBedrockLevelDat(dat);
      if (!levelName && levelInfo?.levelName) levelName = levelInfo.levelName;
    } catch {}
  }

  // Categorize files
  const dimensions = [...new Set(
    files.filter((f) => /\bdimension\b|-1\/|\b1\/|\b2\/|nether|end/i.test(f)).map((f) => {
      if (/nether|-1/i.test(f)) return 'Nether';
      if (/end|2/i.test(f) && !/begin/i.test(f)) return 'The End';
      return 'Overworld';
    })
  )];

  const hasDb      = files.some((f) => f.startsWith('db/') || f === 'db');
  const dbFiles    = files.filter((f) => f.startsWith('db/'));
  const addonDirs  = [...new Set(files.filter((f) => /behavior_pack|resource_pack/i.test(f)).map((f) => f.split('/')[0]))];
  const iconFile   = files.find((f) => /world_icon\.(png|jpeg|jpg)/i.test(f));

  // Top-level content files
  const topLevel = [...new Set(files.map((f) => f.split('/')[0]).filter(Boolean))].sort();

  let html = `<style>${STYLE}</style>`;

  // Header
  html += `<div class="mc-header">`;
  html += `<span class="badge badge-mc">⛏ Minecraft</span>`;
  html += `<span class="badge badge-type">${esc(packageType)}</span>`;
  html += `<span class="badge badge-size">${esc(fmtBytes(intake.size ?? bytes.length))}</span>`;
  html += `</div>`;

  // World info
  const hasInfo = levelName || levelInfo?.gameMode || levelInfo?.difficulty || levelInfo?.mcVersion || levelInfo?.spawn;
  if (hasInfo) {
    html += `<div class="sec"><div class="sec-title">World Info</div><div class="card"><dl class="kv">`;
    if (levelName) html += `<dt>World name</dt><dd>${esc(levelName)}</dd>`;
    if (levelInfo?.mcVersion) html += `<dt>MC version</dt><dd>${esc(levelInfo.mcVersion)}</dd>`;
    if (levelInfo?.gameMode) html += `<dt>Game mode</dt><dd>${esc(levelInfo.gameMode)}</dd>`;
    if (levelInfo?.difficulty) html += `<dt>Difficulty</dt><dd>${esc(levelInfo.difficulty)}</dd>`;
    if (levelInfo?.spawn) html += `<dt>Spawn point</dt><dd>${esc(levelInfo.spawn)}</dd>`;
    if (levelInfo?.storageVersion) html += `<dt>Storage version</dt><dd>${levelInfo.storageVersion}</dd>`;
    html += `</dl></div></div>`;
  }

  // Dimensions / structure
  if (hasLevelDat) {
    const dimsToShow = dimensions.length > 0 ? dimensions : ['Overworld'];
    html += `<div class="sec"><div class="sec-title">Dimensions</div><div class="card"><div class="tag-list">`;
    for (const dim of dimsToShow) html += `<span class="tag dim">${esc(dim)}</span>`;
    html += `</div></div></div>`;
  }

  if (addonDirs.length > 0) {
    html += `<div class="sec"><div class="sec-title">Add-On Packs (${addonDirs.length})</div><div class="card"><div class="tag-list">`;
    for (const d of addonDirs.slice(0, 20)) html += `<span class="tag addon">${esc(d)}</span>`;
    html += `</div></div></div>`;
  }

  if (hasDb && dbFiles.length > 0) {
    html += `<div class="sec"><div class="sec-title">LevelDB Chunks (${dbFiles.length} files)</div><div class="card"><div class="tag-list">`;
    html += `<span class="tag db">db/ directory present (${dbFiles.length} entries)</span>`;
    html += `</div></div></div>`;
  }

  // File listing
  const maxFiles = 40;
  const displayFiles = files.slice(0, maxFiles);
  html += `<div class="sec"><div class="sec-title">Contents (${files.length} files)</div><div class="card">`;
  if (files.length === 0) {
    html += `<div class="empty">No files in archive.</div>`;
  } else {
    html += `<table><thead><tr><th>Path</th><th style="text-align:right">Size</th></tr></thead><tbody>`;
    for (const f of displayFiles) {
      if (zip.files[f]?.dir) continue;
      const entry = zip.files[f];
      const size = entry?._data?.uncompressedSize ?? entry?.comment?.length ?? 0;
      html += `<tr><td>${esc(f)}</td><td class="td-size">${size > 0 ? fmtBytes(size) : '—'}</td></tr>`;
    }
    if (files.length > maxFiles) {
      html += `<tr><td colspan="2" class="empty">…and ${files.length - maxFiles} more files</td></tr>`;
    }
    html += `</tbody></table>`;
  }
  html += `</div></div>`;

  return { bodyHtml: html, hadUnsafe: false };
}
