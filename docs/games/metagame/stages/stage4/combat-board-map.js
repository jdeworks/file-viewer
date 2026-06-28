// combat-board-map.js — Stage 4 Fractal Bastion: tap/click → board-cell mapping (PURE arithmetic).
//
// The board is a <pre> in a scroll container (overflow:auto, max-height:60vh). On a phone the 40×40
// grid is taller (and, at the larger mobile font, wider) than the visible box, so it SCROLLS. The
// caller measures the rendered text with a DOM Range (range.getBoundingClientRect()), which already
// reports the glyph block's on-screen rect AFTER scroll/transform — so this function only needs the
// rect + pointer client coords. No pageX / scrollTop math (the old code divided the click by the
// VISIBLE box and ignored scroll, so once the board scrolled, taps landed on the wrong row).
//
// `textRect` is the union client-rect of the rendered characters; cols/rows are the grid dimensions.
export function cellFromTextRect({ clientX, clientY, textRect, cols, rows }) {
  if (!textRect || cols <= 0 || rows <= 0) return null;
  if (!(textRect.width > 0) || !(textRect.height > 0)) return null;
  const cellW = textRect.width / cols;
  const cellH = textRect.height / rows;
  const x = Math.floor((clientX - textRect.left) / cellW);
  const y = Math.floor((clientY - textRect.top) / cellH);
  if (x < 0 || y < 0 || x >= cols || y >= rows) return null;
  return { x, y };
}
