import { loadGlobal, vendor } from '../../../core/script-loader.js';
import { createPartialSupportNotice } from '../../../core/partial-support.js';

// ---------------------------------------------------------------------------
// Minimal Protobuf wire-level string extractor (no schema needed).
// Walks TLV entries and collects all wire-type-2 fields that decode as valid
// UTF-8 text that looks like real human-readable content.
// ---------------------------------------------------------------------------
function readVarint(bytes, offset) {
  let result = 0, shift = 0;
  while (offset < bytes.length) {
    const b = bytes[offset++];
    result |= (b & 0x7f) << shift;
    if (!(b & 0x80)) break;
    shift += 7;
    if (shift >= 35) break; // overflow guard
  }
  return { value: result, offset };
}

function isReadableText(text) {
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code === 9 || code === 10 || code === 13) continue;
    if (code >= 32) continue;
    return false;
  }
  return true;
}

function extractStrings(bytes, depth) {
  if (depth > 6) return [];
  const strings = [];
  let i = 0;
  while (i < bytes.length) {
    try {
      if (i >= bytes.length) break;
      const tag = readVarint(bytes, i);
      if (tag.offset === i) break; // no progress
      i = tag.offset;
      const wireType = tag.value & 7;
      if (wireType === 0) {
        // varint field — skip
        const v = readVarint(bytes, i);
        if (v.offset === i) break;
        i = v.offset;
      } else if (wireType === 1) {
        // 64-bit field — skip
        i += 8;
      } else if (wireType === 2) {
        // length-delimited — may be string or nested message
        const lenR = readVarint(bytes, i);
        if (lenR.offset === i) break;
        i = lenR.offset;
        const len = lenR.value;
        if (len <= 0 || i + len > bytes.length) { i += len; continue; }
        const field = bytes.subarray(i, i + len);
        // Try UTF-8 text
        try {
          const text = new TextDecoder('utf-8', { fatal: true }).decode(field);
          // Keep if it's at least 3 chars and looks like readable text
          if (text.length >= 3 && isReadableText(text)) {
            strings.push(text);
          }
        } catch (_) { /* binary data, not text */ }
        // Recurse as nested proto message regardless
        try {
          const nested = extractStrings(field, depth + 1);
          strings.push(...nested);
        } catch (_) { /* ignore */ }
        i += len;
      } else if (wireType === 5) {
        // 32-bit field — skip
        i += 4;
      } else {
        // Unknown wire type — stop parsing this level
        break;
      }
    } catch (_) { break; }
  }
  return strings;
}

// ---------------------------------------------------------------------------
// IWA packet stream decoder.
// IWA files contain one or more Snappy-compressed packets.
// Each packet: [1 byte flags] [3 bytes big-endian uncompressed length] [N bytes Snappy data]
// We decompress each packet and concatenate the raw Protobuf bytes.
// ---------------------------------------------------------------------------
function decodeIwaPackets(bytes, snappyUncompress) {
  // Try whole-file as a single Snappy block first (some writers skip the header)
  const tryWhole = () => {
    try { return snappyUncompress(bytes); } catch (_) { return null; }
  };

  const packets = [];
  let i = 0;
  let parsedAnyPacket = false;

  while (i < bytes.length) {
    if (i + 4 > bytes.length) break;
    const flags = bytes[i];
    // flags 0x00 = full packet, 0x02 = continuation (we handle both)
    if (flags !== 0x00 && flags !== 0x02) break;
    // uncompressed length: big-endian 24-bit
    const uncompLen = (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3];
    i += 4;
    if (uncompLen === 0 || uncompLen > 64 * 1024 * 1024) break; // sanity
    // The Snappy data follows — we don't know its compressed length explicitly.
    // Strategy: try to decompress from current position; the Snappy stream is
    // self-delimiting once we have the right start. We'll try the rest of the
    // file if only one packet, otherwise we stop at EOF.
    const remaining = bytes.subarray(i);
    try {
      const uncompressed = snappyUncompress(remaining);
      packets.push(uncompressed);
      parsedAnyPacket = true;
      // For multi-packet files we'd need to know the compressed length.
      // Since we can't determine it without Snappy stream length, we stop after
      // the first successfully decoded packet (covers most real IWA files where
      // Document.iwa has a single large packet).
      break;
    } catch (_) {
      // Decompression of whole tail failed — try increasingly smaller slices
      // (heuristic: snappy stream is at most ~8× smaller than uncompressed)
      let found = false;
      for (const guessedLen of [uncompLen >> 2, uncompLen >> 1, uncompLen, uncompLen * 2]) {
        if (guessedLen <= 0 || i + guessedLen > bytes.length) continue;
        try {
          const slice = bytes.subarray(i, i + guessedLen);
          const uncompressed = snappyUncompress(slice);
          packets.push(uncompressed);
          parsedAnyPacket = true;
          i += guessedLen;
          found = true;
          break;
        } catch (_2) { /* try next */ }
      }
      if (!found) break;
    }
  }

  if (!parsedAnyPacket) {
    // Fallback: treat whole file as raw Snappy
    const whole = tryWhole();
    if (whole) return whole;
    throw new Error('Could not decode any IWA packets');
  }

  // Concatenate all decompressed packets
  const total = packets.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of packets) { out.set(p, pos); pos += p.length; }
  return out;
}

// ---------------------------------------------------------------------------
// Deduplicate and filter extracted strings to reduce noise
// ---------------------------------------------------------------------------
function filterStrings(raw) {
  const seen = new Set();
  const result = [];
  for (const s of raw) {
    const trimmed = s.trim();
    if (trimmed.length < 3) continue;
    // Skip if it looks like a UUID, path, or technical identifier
    if (/^[0-9A-Fa-f\-]{8,}$/.test(trimmed)) continue;
    if (/^[A-Z_]+$/.test(trimmed) && trimmed.length > 10) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Main renderer
// ---------------------------------------------------------------------------
export async function render(intake) {
  const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
  const SnappyJS = await loadGlobal(vendor('snappyjs.min.js'), 'SnappyJS');

  const ext = '.' + (intake.filename || '').split('.').pop().toLowerCase();
  const NAMES = { '.pages': 'Pages Document', '.numbers': 'Numbers Spreadsheet', '.key': 'Keynote Presentation' };
  const typeName = NAMES[ext] || 'iWork Document';
  const capability = `Partial preview: an embedded ${typeName} thumbnail and heuristic text from at most four IWA files are shown when available. Page layout, formatting, images, tables, charts, comments, and the complete document structure are not decoded or rendered.`;

  const wrap = document.createElement('div');
  wrap.className = 'iwork-preview';
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:stretch;padding:24px;gap:0;';

  // ---- Tab bar ----
  const tabBar = document.createElement('div');
  tabBar.className = 'iwork-tabs';
  tabBar.style.cssText = 'display:flex;gap:0;border-bottom:2px solid var(--border,#e5e7eb);margin-bottom:16px;';

  const tabThumbnail = document.createElement('button');
  tabThumbnail.className = 'iwork-tab-thumbnail';
  tabThumbnail.textContent = 'Thumbnail';
  tabThumbnail.style.cssText = 'padding:8px 18px;font-size:13px;font-weight:600;border:none;background:none;cursor:pointer;border-bottom:2px solid var(--accent,#2563eb);margin-bottom:-2px;color:var(--accent,#2563eb);';

  const tabText = document.createElement('button');
  tabText.className = 'iwork-tab-text';
  tabText.textContent = 'Text content';
  tabText.style.cssText = 'padding:8px 18px;font-size:13px;font-weight:500;border:none;background:none;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;color:var(--text-muted,#6b7280);';

  tabBar.appendChild(tabThumbnail);
  tabBar.appendChild(tabText);
  wrap.appendChild(tabBar);
  wrap.appendChild(createPartialSupportNotice(capability));

  // ---- Thumbnail panel ----
  const thumbPanel = document.createElement('div');
  thumbPanel.className = 'iwork-thumbnail-panel';
  thumbPanel.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;';

  // ---- Text panel ----
  const textPanel = document.createElement('div');
  textPanel.className = 'iwork-text-panel';
  textPanel.style.cssText = 'display:none;flex-direction:column;gap:12px;';

  const textStatusEl = document.createElement('div');
  textStatusEl.className = 'iwork-text-status';
  textStatusEl.style.cssText = 'font-size:12px;color:var(--text-muted,#6b7280);';
  textStatusEl.textContent = 'Extracting text…';
  textPanel.appendChild(textStatusEl);

  const textPre = document.createElement('pre');
  textPre.className = 'iwork-text-content';
  textPre.style.cssText = 'white-space:pre-wrap;word-break:break-word;font-size:13px;line-height:1.6;padding:16px;background:var(--bg-code,#f9fafb);border:1px solid var(--border,#e5e7eb);border-radius:6px;max-height:600px;overflow-y:auto;margin:0;display:none;';
  textPanel.appendChild(textPre);

  wrap.appendChild(thumbPanel);
  wrap.appendChild(textPanel);

  // ---- Tab switching ----
  function activateTab(which) {
    if (which === 'thumbnail') {
      thumbPanel.style.display = 'flex';
      textPanel.style.display = 'none';
      tabThumbnail.style.cssText = 'padding:8px 18px;font-size:13px;font-weight:600;border:none;background:none;cursor:pointer;border-bottom:2px solid var(--accent,#2563eb);margin-bottom:-2px;color:var(--accent,#2563eb);';
      tabText.style.cssText = 'padding:8px 18px;font-size:13px;font-weight:500;border:none;background:none;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;color:var(--text-muted,#6b7280);';
    } else {
      thumbPanel.style.display = 'none';
      textPanel.style.display = 'flex';
      tabThumbnail.style.cssText = 'padding:8px 18px;font-size:13px;font-weight:500;border:none;background:none;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;color:var(--text-muted,#6b7280);';
      tabText.style.cssText = 'padding:8px 18px;font-size:13px;font-weight:600;border:none;background:none;cursor:pointer;border-bottom:2px solid var(--accent,#2563eb);margin-bottom:-2px;color:var(--accent,#2563eb);';
    }
  }
  tabThumbnail.addEventListener('click', () => activateTab('thumbnail'));
  tabText.addEventListener('click', () => activateTab('text'));

  // ---- ZIP + thumbnail + text extraction ----
  let blobUrl = null;
  let zip;
  try {
    zip = await JSZip.loadAsync(intake.bytes.buffer);

    // Thumbnail
    const THUMB_PATHS = ['preview.jpg', 'preview-web.jpg', 'QuickLook/Thumbnail.jpg', 'preview.png'];
    let thumbFile = null;
    for (const p of THUMB_PATHS) {
      if (zip.files[p]) { thumbFile = zip.files[p]; break; }
      const key = Object.keys(zip.files).find(k => k.toLowerCase() === p.toLowerCase());
      if (key) { thumbFile = zip.files[key]; break; }
    }
    if (thumbFile) {
      const thumbnailName = thumbFile.name.toLowerCase();
      const thumbnailType = thumbnailName.endsWith('.png') ? 'image/png' : 'image/jpeg';
      const blob = new Blob([await thumbFile.async('uint8array')], { type: thumbnailType });
      blobUrl = URL.createObjectURL(blob);
      const img = document.createElement('img');
      img.className = 'iwork-thumbnail';
      img.src = blobUrl;
      img.alt = typeName + ' preview';
      img.style.cssText = 'max-width:100%;max-height:600px;object-fit:contain;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,0.15);';
      thumbPanel.appendChild(img);
    } else {
      const noThumb = document.createElement('div');
      noThumb.className = 'iwork-thumbnail-missing';
      noThumb.style.cssText = 'color:var(--text-muted,#6b7280);font-size:13px;';
      noThumb.textContent = 'No thumbnail found in this file.';
      thumbPanel.appendChild(noThumb);
    }
  } catch (e) {
    const err = document.createElement('div');
    err.className = 'iwork-archive-error';
    err.style.cssText = 'color:var(--text-error,#dc2626);font-size:13px;';
    err.textContent = 'Could not read ZIP archive: ' + e.message;
    thumbPanel.appendChild(err);
  }

  // ---- IWA text extraction (async, non-blocking) ----
  if (zip) {
    (async () => {
      try {
        // Collect IWA files — prioritise Document.iwa, then all others in Index/
        const iwaKeys = Object.keys(zip.files)
          .filter(k => k.toLowerCase().endsWith('.iwa') && !zip.files[k].dir);
        const docKey = iwaKeys.find(k => k.toLowerCase() === 'index/document.iwa') || iwaKeys[0];
        if (!docKey) {
          textStatusEl.textContent = 'No IWA files found in this archive.';
          return;
        }

        // Process docKey first, then up to 3 more IWA files for supplemental text
        const toProcess = [docKey, ...iwaKeys.filter(k => k !== docKey).slice(0, 3)];

        const snappyUncompress = (buf) => SnappyJS.uncompress(buf);
        const allStrings = [];

        for (const key of toProcess) {
          try {
            const iwaBytes = await zip.files[key].async('uint8array');
            const protoBytes = decodeIwaPackets(iwaBytes, snappyUncompress);
            const raw = extractStrings(protoBytes, 0);
            allStrings.push(...raw);
          } catch (iwaErr) {
            // Skip files that can't be parsed
          }
        }

        const strings = filterStrings(allStrings);

        if (strings.length === 0) {
          textStatusEl.textContent = 'Text extraction failed — no readable text found in IWA data. Only thumbnail available.';
          return;
        }

        const fullText = strings.join('\n');
        const wordCount = fullText.split(/\s+/).filter(Boolean).length;
        textStatusEl.textContent = '≈ ' + wordCount.toLocaleString() + ' words extracted from ' + toProcess.length + ' IWA file' + (toProcess.length !== 1 ? 's' : '') + '.';
        textPre.textContent = fullText;
        textPre.style.display = 'block';
      } catch (e) {
        textStatusEl.textContent = 'Text extraction failed: ' + e.message;
      }
    })();
  } else {
    textStatusEl.textContent = 'Text extraction not available — ZIP could not be read.';
  }

  return {
    parentNode: wrap,
    revoke() { if (blobUrl) URL.revokeObjectURL(blobUrl); },
  };
}
