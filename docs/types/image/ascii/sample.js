// Reduce a canvas to an (cols × rows) grid of RGBA cells, one entry per ASCII
// cell. Several strategies trade speed for quality:
//
//   downscale : draw the canvas into a tiny cols×rows canvas, read it back once.
//               The browser's scaler box-filters for us — fast, good, the
//               DEFAULT and the only one cheap enough for live webcam frames.
//   nearest   : same, but imageSmoothing off → crisp, good for pixel art.
//   center    : full-res, take each cell's centre pixel. Fast, noisier.
//   average   : full-res, mean of every pixel in the cell block. Accurate, slow.
//   median    : full-res, per-channel median. Robust to noise, slowest.
//
// Returns a Uint8ClampedArray of length cols*rows*4 (RGBA, row-major).

function downscaleGrid(canvas, cols, rows, scratch, smooth) {
  scratch.width = cols; scratch.height = rows;
  const ctx = scratch.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = smooth;
  ctx.clearRect(0, 0, cols, rows);
  ctx.drawImage(canvas, 0, 0, cols, rows);
  return ctx.getImageData(0, 0, cols, rows).data;
}

function fullResData(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  return { data: ctx.getImageData(0, 0, canvas.width, canvas.height).data, w: canvas.width, h: canvas.height };
}

function blockGrid(canvas, cols, rows, mode) {
  const { data, w, h } = fullResData(canvas);
  const out = new Uint8ClampedArray(cols * rows * 4);
  for (let cy = 0; cy < rows; cy++) {
    const y0 = Math.floor(cy * h / rows), y1 = Math.max(y0 + 1, Math.floor((cy + 1) * h / rows));
    for (let cx = 0; cx < cols; cx++) {
      const x0 = Math.floor(cx * w / cols), x1 = Math.max(x0 + 1, Math.floor((cx + 1) * w / cols));
      const o = (cy * cols + cx) * 4;
      if (mode === 'center') {
        const px = (x0 + x1) >> 1, py = (y0 + y1) >> 1;
        const s = (py * w + px) * 4;
        out[o] = data[s]; out[o + 1] = data[s + 1]; out[o + 2] = data[s + 2]; out[o + 3] = data[s + 3];
      } else if (mode === 'median') {
        out.set(medianBlock(data, w, x0, x1, y0, y1), o);
      } else { // average
        let r = 0, g = 0, b = 0, a = 0, n = 0;
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
          const s = (y * w + x) * 4;
          r += data[s]; g += data[s + 1]; b += data[s + 2]; a += data[s + 3]; n++;
        }
        out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = a / n;
      }
    }
  }
  return out;
}

function medianBlock(data, w, x0, x1, y0, y1) {
  const rs = [], gs = [], bs = [], as = [];
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const s = (y * w + x) * 4;
    rs.push(data[s]); gs.push(data[s + 1]); bs.push(data[s + 2]); as.push(data[s + 3]);
  }
  const mid = (arr) => { arr.sort((p, q) => p - q); return arr[arr.length >> 1]; };
  return [mid(rs), mid(gs), mid(bs), mid(as)];
}

export function gridFromCanvas(canvas, cols, rows, method, scratch) {
  switch (method) {
    case 'nearest': return downscaleGrid(canvas, cols, rows, scratch, false);
    case 'center': return blockGrid(canvas, cols, rows, 'center');
    case 'average': return blockGrid(canvas, cols, rows, 'average');
    case 'median': return blockGrid(canvas, cols, rows, 'median');
    case 'downscale':
    default: return downscaleGrid(canvas, cols, rows, scratch, true);
  }
}
