// LRF TextBlock stream → HTML. The stream interleaves UTF-16LE text with 0xF5xx inline tags.
// Tag→HTML map follows calibre objects.py (LRFText.text_tags):
//   0xA1 start_para / 0xA2 end_para  → <p>…</p>
//   0xD2 cr                          → paragraph/line break
//   0x81 Italic / 0x82 end           → <i>…</i>
//   0xB5 Sup  / 0xB9 Sub             → <sup>/<sub>
//   0xC1 EmpLine                     → <span class="lrf-empline">
//   0xA7 char_button (link) / 0xA8   → <span> (no off-origin target)
//   0xCA space                       → ' '
//   0xD1 plot (inline image, refs an Image/ImageStream object) → <img> placeholder w/ data-ref
//   0xBB NoBR, 0xB1 Yoko, 0xA9 Rubi… → transparent <span> wrappers (best-effort)
// Unknown 0xF5xx tags are skipped using the size table in lrf-objects.js.

import { utf16le } from './lrf-objects.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// Same operand sizes as the object walker, for skipping unknown tags inside a text stream.
const SIZE = {
  0x00: 6, 0x01: 0, 0x16: 'string', 0x55: 'string', 0x59: 'string', 0x5a: 'string', 0x5d: 'string',
  0xa1: 4, 0xa5: 0, 0xa7: 4, 0xc3: 2, 0xc5: 2, 0xc6: 2, 0xc8: 2, 0xca: 2, 0xcb: 0,
  0xcc: 2,
  0xd1: 12, 0xd4: 2, 0xd7: 14, 0xd8: 4, 0xd9: 8, 0xda: 2, 0xdb: 2, 0xdc: 2,
  0xf1: 2, 0xf2: 4, 0xf3: 4, 0xf4: 2,
};
const opSize = (low) => (Object.prototype.hasOwnProperty.call(SIZE, low) ? SIZE[low] : 0);

// Decode a TextBlock stream (already inflated + descrambled) into safe HTML. `plots` collects the
// image object ids referenced by plot tags so the renderer can resolve+inline them.
export function decodeTextStream(buf, plots) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let out = '';
  let textRun = [];                       // pending text bytes (UTF-16LE) between tags
  let inPara = false;
  const flush = () => {
    if (!textRun.length) return;
    out += esc(utf16le(Uint8Array.from(textRun)));
    textRun = [];
  };
  let i = 0;
  const n = buf.length;
  while (i < n) {
    // A tag is <low> 0xF5. Text is everything else (UTF-16LE → low/high byte pairs).
    if (i + 1 < n && buf[i + 1] === 0xf5) {
      flush();
      const low = buf[i];
      i += 2;
      const size = opSize(low);
      let operand = 0;
      if (size === 'string') {
        const len = i + 2 <= n ? dv.getUint16(i, true) : 0; i += 2 + len; // skip embedded strings
      } else if (typeof size === 'number') {
        if (size === 2 && i + 2 <= n) operand = dv.getUint16(i, true);
        else if (size >= 4 && i + 4 <= n) operand = dv.getUint32(i, true);
        i += size;
      }
      if (low === 0xa1) inPara = true; else if (low === 0xa2) inPara = false;
      out += emit(low, operand, plots);
    } else {
      textRun.push(buf[i], buf[i + 1] || 0);
      i += 2;
    }
  }
  flush();
  if (inPara) out += '</p>';
  return out || '';
}

function emit(low, operand, plots) {
  switch (low) {
    case 0xa1: return '<p>';                         // start_para
    case 0xa2: return '</p>';                         // end_para
    case 0xd2: return '<br>';                         // cr
    case 0x81: return '<i>';                          // Italic
    case 0x82: return '</i>';                         // end Italic / container
    case 0xb5: return '<sup>';                        // Sup
    case 0xb6: return '</sup>';                        // end Sup
    case 0xb9: return '<sub>';                        // Sub
    case 0xba: return '</sub>';                        // end Sub
    case 0xc2: return '</span>';                       // end EmpLine
    case 0xb7: return '<b>';                          // Bold (start)
    case 0xb8: return '</b>';                          // Bold (end)
    case 0xc1: return '<span class="lrf-empline">';   // EmpLine
    case 0xa7: return '<span class="lrf-link">';      // char_button (link, no off-origin target)
    case 0xa8: return '</span>';                      // end char_button
    case 0xaa: case 0xac: return '</span>';           // end Rubi/Oyamoji containers
    case 0xa9: case 0xab: case 0xb1: case 0xbb: return '<span>';  // Rubi/Oyamoji/Yoko/NoBR
    case 0xca: return ' ';                            // space
    case 0xbd: return '';                             // EmpDots — drop
    case 0xd1: {                                      // plot → inline image ref (first u32 is the ref id)
      if (operand && plots) plots.push(operand);
      return operand ? '<img class="lrf-plot" data-ref="' + operand + '" alt="">' : '';
    }
    default:
      return '';                                       // unknown/style tag → no visible output
  }
}
