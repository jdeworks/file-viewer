// Board scaler (UX audit #1) — sizes the nonogram to its host so the puzzle is the DOMINANT object at
// every board size, centred in the grid zone. Computes --s3-cell (and a proportional --s3-clue) from
// the grid host's content box and the current grid dimensions, clamped to [minCell .. MAX_CELL], and
// re-runs on resize via a ResizeObserver. On coarse pointers the floor is 36px (thumbable) so a
// 12×12 stays tappable even if the host must then scroll; on fine pointers the floor is 24px.

export const MAX_CELL = 44;
export const CLUE_RATIO = 0.8; // clue track width relative to a cell

// PURE cell-size solve (unit-tested): given the host's available content box and the grid dimensions,
// return the largest cell size that fits, clamped to [minCell .. MAX_CELL]. The grid template is
// (maxRow clue cols + width cell cols) wide and (maxCol clue rows + height cell rows) tall, where a
// clue track = CLUE_RATIO×cell — so each axis solves for cell and we take the min. availH ≤ 0 (host
// not height-constrained) falls back to the width solve.
export function computeCell(availW, availH, dims, minCell = 24, maxCell = MAX_CELL) {
  const wTracks = dims.maxRow * CLUE_RATIO + dims.width;
  const hTracks = dims.maxCol * CLUE_RATIO + dims.height;
  const byW = availW / Math.max(1, wTracks);
  const byH = availH > 0 ? availH / Math.max(1, hTracks) : byW;
  const cell = Math.floor(Math.min(byW, byH));
  return Math.max(minCell, Math.min(maxCell, cell));
}

export function installBoardFit(root, host, getDims) {
  const coarse = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  const minCell = coarse ? 36 : 24;

  function measure() {
    const dims = getDims && getDims();
    if (!dims || !host || !host.isConnected) return;
    const cs = getComputedStyle(host);
    const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    const padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    const availW = Math.max(0, host.clientWidth - padX);
    const availH = Math.max(0, host.clientHeight - padY);
    if (availW <= 0) return; // not laid out yet — the ResizeObserver will re-fire
    const cell = computeCell(availW, availH, dims, minCell);
    root.style.setProperty("--s3-cell", `${cell}px`);
    root.style.setProperty("--s3-clue", `${Math.round(cell * CLUE_RATIO)}px`);
  }

  let ro = null;
  if (typeof ResizeObserver !== "undefined") {
    ro = new ResizeObserver(() => measure());
    ro.observe(host);
  }
  measure();
  return { measure, destroy() { ro?.disconnect(); } };
}
