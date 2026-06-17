// Image → ASCII art converter. Uses a tiny offscreen canvas (document.createElement).
// No external deps — pure canvas sampling + character mapping.

const CHARSETS = {
  blocks: ['█', '▓', '▒', '░', ' '],
  classic: ['@', '#', '*', '+', '=', '-', ':', '.', ' '],
  braille: null, // handled separately
};

// Map luminance [0,1] to a character from the set (dark=high density, bright=space).
function lumToChar(lum, chars) {
  const idx = Math.floor(lum * (chars.length - 1));
  return chars[Math.max(0, Math.min(chars.length - 1, idx))];
}

// Braille 2×4 cell encoding: sample 2 cols × 4 rows → U+2800 bit mask.
// Bit layout: col0: bits 0,1,2,6 | col1: bits 3,4,5,7
const BRAILLE_BITS = [[0,3],[1,4],[2,5],[6,7]]; // row: [col0_bit, col1_bit]
function brailleChar(pixels2x4, threshold = 0.5) {
  let code = 0x2800;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 2; c++) {
      const lum = pixels2x4[r][c];
      if (lum < threshold) code |= (1 << BRAILLE_BITS[r][c]);
    }
  }
  return String.fromCodePoint(code);
}

export async function imageToAscii(imageBytes, mimeType, { cols = 80, colorMode = 'mono', charset = 'blocks' } = {}) {
  const blob = new Blob([imageBytes], { type: mimeType || 'image/png' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = () => rej(new Error('Image decode failed'));
      img.src = url;
    });

    const isBraille = charset === 'braille';
    const samplesPerCell = isBraille ? 2 : 1; // braille samples 2 cols per output col
    const sampleCols = cols * samplesPerCell;
    const aspect = img.naturalHeight / (img.naturalWidth || 1);
    const rowsRaw = isBraille
      ? Math.round(cols * aspect * 0.45 / 4) * 4 // multiple of 4 for braille rows
      : Math.round(cols * aspect * 0.45);
    const sampleRows = isBraille ? rowsRaw * 4 : rowsRaw;
    const rows = Math.max(1, Math.min(isBraille ? rowsRaw : rowsRaw, 200));

    // Draw scaled to tiny canvas
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, sampleCols);
    canvas.height = Math.max(1, sampleRows);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    function getPixel(px, py) {
      const off = (py * canvas.width + px) * 4;
      const r = data[off], g = data[off + 1], b = data[off + 2], a = data[off + 3];
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) * (a / 255) / 255;
      return { lum, r, g, b, a };
    }

    const chars = CHARSETS[charset] || CHARSETS.blocks;
    const lines = [];

    if (isBraille) {
      for (let row = 0; row < rows; row++) {
        let line = '';
        for (let col = 0; col < cols; col++) {
          const px0 = col * 2, py0 = row * 4;
          const cells = [];
          for (let dr = 0; dr < 4; dr++) {
            cells.push([
              getPixel(px0, py0 + dr).lum,
              getPixel(px0 + 1, py0 + dr).lum,
            ]);
          }
          line += brailleChar(cells);
        }
        lines.push(line);
      }
    } else if (colorMode === 'ansi') {
      for (let row = 0; row < rows; row++) {
        let line = '';
        let lastColor = null;
        const chunks = [];

        for (let col = 0; col < cols; col++) {
          const { lum, r, g, b, a } = getPixel(col, row);
          const ch = a < 20 ? ' ' : lumToChar(lum, chars);
          const color = a < 20 ? null : '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
          chunks.push({ ch, color });
        }

        // Run-length encode by color → spans
        let i = 0;
        while (i < chunks.length) {
          const c = chunks[i].color;
          let run = '';
          while (i < chunks.length && chunks[i].color === c) {
            run += chunks[i].ch;
            i++;
          }
          if (c) line += `<span style="color:${c}">${escHtml(run)}</span>`;
          else line += escHtml(run);
        }
        lines.push(line);
      }
    } else {
      // Mono
      for (let row = 0; row < rows; row++) {
        let line = '';
        for (let col = 0; col < cols; col++) {
          const { lum, a } = getPixel(col, row);
          line += a < 20 ? ' ' : lumToChar(lum, chars);
        }
        lines.push(line);
      }
    }

    return { lines, isHtml: colorMode === 'ansi' };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function escHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}
