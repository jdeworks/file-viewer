// WAD game data archive viewer — Doom/Doom 2/Heretic/Hexen/Quake.

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// Well-known lump name categories
const MAP_MARKERS = new Set(['E1M1','E1M2','E1M3','E1M4','E1M5','E1M6','E1M7','E1M8','E1M9',
  'E2M1','E2M2','E2M3','E2M4','E2M5','E2M6','E2M7','E2M8','E2M9',
  'E3M1','E3M2','E3M3','E3M4','E3M5','E3M6','E3M7','E3M8','E3M9',
  'E4M1','E4M2','E4M3','E4M4','MAP01','MAP02','MAP03','MAP04','MAP05',
  'MAP06','MAP07','MAP08','MAP09','MAP10','MAP11','MAP12','MAP13','MAP14',
  'MAP15','MAP16','MAP17','MAP18','MAP19','MAP20','MAP21','MAP22','MAP23',
  'MAP24','MAP25','MAP26','MAP27','MAP28','MAP29','MAP30','MAP31','MAP32',
]);
const MAP_LUMPS = new Set(['THINGS','LINEDEFS','SIDEDEFS','VERTEXES','SEGS','SSECTORS',
  'NODES','SECTORS','REJECT','BLOCKMAP','BEHAVIOR','SCRIPTS']);
const AUDIO_LUMPS = new Set(['MUSIC','SFX','DSSHOTGN','DSPISTOL','DSSHGUN','DSBFG','DSPLASMA',
  'D_E1M1','D_E1M2','D_RUNNIN','D_STALKS','DSMAPUNK']);
const TEXTURE_LUMPS = new Set(['TEXTURE1','TEXTURE2','PNAMES','PLAYPAL','COLORMAP','ENDOOM']);

function r32le(b, off) { return ((b[off] | (b[off+1]<<8) | (b[off+2]<<16)) >>> 0) + (b[off+3] * 0x1000000); }

function parseName(b, off) {
  let s = '';
  for (let i = 0; i < 8; i++) {
    if (b[off+i] === 0) break;
    s += String.fromCharCode(b[off+i]);
  }
  return s;
}

export function render(intake) {
  const b = intake.bytes;
  if (!b || b.length < 12) {
    return { bodyHtml: '<div class="wad-preview"><p class="wad-note">File too small to be a valid WAD.</p></div>' };
  }

  const magic = String.fromCharCode(b[0], b[1], b[2], b[3]);
  if (magic !== 'IWAD' && magic !== 'PWAD') {
    return { bodyHtml: '<div class="wad-preview"><p class="wad-note">Not a valid WAD file.</p></div>' };
  }

  const numLumps = r32le(b, 4);
  const dirOffset = r32le(b, 8);

  const lumps = [];
  for (let i = 0; i < numLumps && i < 10000; i++) {
    const off = dirOffset + i * 16;
    if (off + 16 > b.length) break;
    const lumpOffset = r32le(b, off);
    const lumpSize = r32le(b, off + 4);
    const name = parseName(b, off + 8);
    lumps.push({ name, size: lumpSize, offset: lumpOffset });
  }

  // Categorize
  const maps = [];
  const audio = [];
  const textures = [];
  const sprites = [];
  const flats = [];
  const other = [];
  let inSprites = false, inFlats = false, inPatches = false;
  let currentMap = null;

  for (const lump of lumps) {
    if (MAP_MARKERS.has(lump.name)) {
      currentMap = lump.name;
      maps.push(lump.name);
      inSprites = false; inFlats = false; inPatches = false;
      continue;
    }
    if (lump.name === 'S_START' || lump.name === 'SS_START') { inSprites = true; continue; }
    if (lump.name === 'S_END' || lump.name === 'SS_END') { inSprites = false; continue; }
    if (lump.name === 'F_START' || lump.name === 'FF_START') { inFlats = true; continue; }
    if (lump.name === 'F_END' || lump.name === 'FF_END') { inFlats = false; continue; }
    if (lump.name === 'P_START' || lump.name === 'PP_START') { inPatches = true; continue; }
    if (lump.name === 'P_END' || lump.name === 'PP_END') { inPatches = false; continue; }

    if (MAP_LUMPS.has(lump.name)) { /* map sublumps — don't list separately */ }
    else if (inSprites) sprites.push(lump.name);
    else if (inFlats) flats.push(lump.name);
    else if (AUDIO_LUMPS.has(lump.name) || lump.name.startsWith('D_') || lump.name.startsWith('DS')) audio.push(lump.name);
    else if (TEXTURE_LUMPS.has(lump.name)) textures.push(lump.name);
    else other.push(lump.name);
  }

  const totalSize = lumps.reduce((s, l) => s + l.size, 0);
  const isIWAD = magic === 'IWAD';

  const statItems = [
    `<div class="wad-stat"><div class="wad-stat-value">${numLumps.toLocaleString()}</div><div class="wad-stat-label">Lumps</div></div>`,
    maps.length && `<div class="wad-stat"><div class="wad-stat-value">${maps.length}</div><div class="wad-stat-label">Maps</div></div>`,
    sprites.length && `<div class="wad-stat"><div class="wad-stat-value">${sprites.length}</div><div class="wad-stat-label">Sprites</div></div>`,
    audio.length && `<div class="wad-stat"><div class="wad-stat-value">${audio.length}</div><div class="wad-stat-label">Audio</div></div>`,
    flats.length && `<div class="wad-stat"><div class="wad-stat-value">${flats.length}</div><div class="wad-stat-label">Flats</div></div>`,
  ].filter(Boolean).join('');

  const mapPills = maps.slice(0, 20).map(m => `<span class="wad-map-pill">${esc(m)}</span>`).join('');
  const moreMapsPill = maps.length > 20 ? `<span class="wad-map-pill wad-map-more">+${maps.length - 20} more</span>` : '';

  const otherRows = other.slice(0, 30).map(n => `<span class="wad-lump">${esc(n)}</span>`).join(' ');
  const moreOther = other.length > 30 ? `<span class="wad-lump wad-lump-more">+${other.length - 30} more</span>` : '';

  const bodyHtml = `<div class="wad-preview">
  <div class="wad-header">
    <span class="badge-wad">${magic}</span>
    <span class="wad-type">${isIWAD ? 'Internal WAD (IWAD)' : 'Patch WAD (PWAD)'}</span>
  </div>
  <div class="wad-stats">${statItems}</div>
  ${maps.length ? `<div class="wad-section-title">Maps</div><div class="wad-maps">${mapPills}${moreMapsPill}</div>` : ''}
  ${textures.length ? `<div class="wad-section-title">Textures &amp; palette</div><div class="wad-lumps">${textures.map(n=>`<span class="wad-lump">${esc(n)}</span>`).join(' ')}</div>` : ''}
  ${audio.length ? `<div class="wad-section-title">Audio lumps</div><div class="wad-lumps">${audio.slice(0,20).map(n=>`<span class="wad-lump">${esc(n)}</span>`).join(' ')}${audio.length>20?`<span class="wad-lump wad-lump-more">+${audio.length-20}</span>`:''}</div>` : ''}
  ${other.length ? `<div class="wad-section-title">Other lumps</div><div class="wad-lumps">${otherRows}${moreOther}</div>` : ''}
</div>`;

  return { bodyHtml };
}
