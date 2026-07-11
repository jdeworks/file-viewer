// s4fit.js — Board scaler for Stage 4's monospace <pre> board (playtest: cells were "sub-fingertip,
// sub-glance" at a fixed 12px, making the range ring and precise tower placement hard to use).
// Mirrors stage3/s3fit.js's "largest that fits the host, clamped to [min..max]" approach, but the
// board here is a fixed 40×40 CHARACTER grid (board.js), not a CSS Grid — so instead of solving for
// a --cell width, this solves for the largest FONT-SIZE whose monospace advance width still fits the
// host, using a real (invisible) probe element so the measurement matches the actual rendered font
// stack/fallback rather than guessing a canvas ctx.font string's metrics.

export const MIN_FONT = 9;
export const MAX_FONT = 22;
const PROBE_SIZE = 100; // reference size (px) the probe is measured at

let probe = null;
const charWidthCache = new Map(); // fontFamily -> advance width per 1px of font-size

function charWidthRatio(fontFamily, lineHeight, letterSpacing) {
  const key = `${fontFamily}|${lineHeight}|${letterSpacing}`;
  if (charWidthCache.has(key)) return charWidthCache.get(key);
  if (!probe) {
    probe = document.createElement("span");
    probe.style.cssText = "position:absolute; visibility:hidden; white-space:pre; top:-9999px; left:-9999px;";
    probe.textContent = "0";
    document.body.appendChild(probe);
  }
  probe.style.font = `${PROBE_SIZE}px ${fontFamily}`;
  probe.style.lineHeight = String(lineHeight);
  probe.style.letterSpacing = `${letterSpacing}px`;
  const ratio = probe.getBoundingClientRect().width / PROBE_SIZE;
  charWidthCache.set(key, ratio);
  return ratio;
}

// PURE font-size solve (unit-tested via a stubbed charWidthRatio-equivalent computation): given the
// host's available content box, the grid dims, and one character's measured advance-width-per-px,
// return the largest font-size (px) that fits both axes, clamped to [minFont..maxFont].
export function computeFontSize(availW, availH, dims, charW, lineHeight, letterSpacing, minFont = MIN_FONT, maxFont = MAX_FONT) {
  const byW = (availW - dims.cols * letterSpacing) / Math.max(1, dims.cols * charW);
  const byH = availH / Math.max(1, dims.rows * lineHeight);
  const size = Math.floor(Math.min(byW, byH));
  return Math.max(minFont, Math.min(maxFont, size));
}

// root: the element --s4-cell-font is set on (usually the stage root, so CSS can read it via var()).
// host: the element to measure available space in (the board's scroll container).
export function installBoardFit(root, host, { cols = 40, rows = 40, lineHeight = 0.95, letterSpacing = 1,
  fontFamily = "ui-monospace, SFMono-Regular, Menlo, monospace", minFont = MIN_FONT, maxFont = MAX_FONT } = {}) {
  function measure() {
    if (!host || !host.isConnected) return;
    const cs = getComputedStyle(host);
    const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    const padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    const availW = Math.max(0, host.clientWidth - padX);
    const availH = Math.max(0, host.clientHeight - padY);
    if (availW <= 0 || availH <= 0) return; // not laid out yet — the ResizeObserver will re-fire
    const charW = charWidthRatio(fontFamily, lineHeight, letterSpacing);
    const size = computeFontSize(availW, availH, { cols, rows }, charW, lineHeight, letterSpacing, minFont, maxFont);
    root.style.setProperty("--s4-cell-font", `${size}px`);
  }

  let ro = null;
  if (typeof ResizeObserver !== "undefined") {
    ro = new ResizeObserver(() => measure());
    ro.observe(host);
  }
  measure();
  return { measure, destroy() { ro?.disconnect(); } };
}
