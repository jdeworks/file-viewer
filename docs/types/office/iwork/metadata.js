import { EXTS } from './detect.js';

function readVarint(bytes, off) {
  let r = 0, s = 0;
  while (off < bytes.length) {
    const b = bytes[off++];
    r |= (b & 0x7f) << s;
    if (!(b & 0x80)) break;
    s += 7;
    if (s >= 35) break;
  }
  return { value: r, offset: off };
}

// Count approximate words from raw Protobuf bytes by scanning string fields.
function countWordsInProto(bytes) {
  let wordCount = 0;
  let i = 0;
  while (i < bytes.length) {
    try {
      const tag = readVarint(bytes, i);
      if (tag.offset === i) break;
      i = tag.offset;
      const wireType = tag.value & 7;
      if (wireType === 0) {
        const v = readVarint(bytes, i);
        if (v.offset === i) break;
        i = v.offset;
      } else if (wireType === 1) {
        i += 8;
      } else if (wireType === 2) {
        const lenR = readVarint(bytes, i);
        if (lenR.offset === i) break;
        i = lenR.offset;
        const len = lenR.value;
        if (len > 0 && i + len <= bytes.length) {
          try {
            const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(i, i + len));
            if (text.length >= 3 && /^[ -~  -￿]+$/.test(text)) {
              wordCount += text.split(/\s+/).filter(Boolean).length;
            }
          } catch (_) { /* not valid UTF-8 text */ }
        }
        i += len;
      } else if (wireType === 5) {
        i += 4;
      } else {
        break;
      }
    } catch (_) { break; }
  }
  return wordCount;
}

export async function extractMetadata(intake) {
  const ext = '.' + (intake.filename || '').split('.').pop().toLowerCase();
  const typeName = EXTS[ext] || 'iWork Document';

  const fields = [
    { label: 'Type', value: 'Apple ' + typeName },
    { label: 'Size', value: (intake.size / 1024).toFixed(1) + ' KB' },
    { label: 'Format', value: 'ZIP / IWA (iWork Archive)' },
  ];

  // Best-effort: try to extract word count from IWA content.
  try {
    const { loadGlobal, vendor } = await import('../../../core/script-loader.js');
    const [JSZip, SnappyJS] = await Promise.all([
      loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip'),
      loadGlobal(vendor('snappyjs.min.js'), 'SnappyJS'),
    ]);

    const zip = await JSZip.loadAsync(intake.bytes.buffer);
    const iwaKeys = Object.keys(zip.files)
      .filter(k => k.toLowerCase().endsWith('.iwa') && !zip.files[k].dir);
    const docKey = iwaKeys.find(k => k.toLowerCase() === 'index/document.iwa') || iwaKeys[0];

    if (docKey) {
      const iwaBytes = await zip.files[docKey].async('uint8array');
      // Try snappy-decompress the whole file, then fallback to skipping 4-byte header
      let protoBytes = null;
      try {
        protoBytes = SnappyJS.uncompress(iwaBytes);
      } catch (_) {
        if (iwaBytes.length > 4) {
          try { protoBytes = SnappyJS.uncompress(iwaBytes.subarray(4)); } catch (_2) { /* give up */ }
        }
      }
      if (protoBytes) {
        const wordCount = countWordsInProto(protoBytes);
        if (wordCount > 0) {
          fields.push({ label: 'Words (approx)', value: wordCount.toLocaleString() });
        }
      }
    }
  } catch (_) {
    // Metadata extraction is best-effort; silently skip on error
  }

  return { label: typeName, fields };
}
