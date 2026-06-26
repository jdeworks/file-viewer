// Interactive ASCII nonogram grid (the in-modal game view): column clues stacked above, row clues to
// the left, an H×W playfield of clickable monospace cells. Left-click fills (#), right/shift-click
// marks empty (✕). Returns { el, update(board) }. Updates are GUARDED — only changed cells / cursor /
// clues touch the DOM (the Bit-Foundry per-tick CPU lesson), so a keypress never rerenders the grid.

import { FILLED, EMPTY, UNKNOWN } from "./nonogram.js";
import { lineDone } from "./board.js";

const GLYPH = { [FILLED]: "#", [EMPTY]: "✕", [UNKNOWN]: "·" };
const CLASS = { [FILLED]: "s3-fill", [EMPTY]: "s3-mark", [UNKNOWN]: "s3-blank" };

export function buildGrid(puzzle, handlers) {
  const { rowClues, colClues, width, height } = puzzle;
  const rowDisp = rowClues.map((c) => (c.length ? c : [0]));
  const colDisp = colClues.map((c) => (c.length ? c : [0]));
  const maxRow = Math.max(1, ...rowDisp.map((c) => c.length));
  const maxCol = Math.max(1, ...colDisp.map((c) => c.length));

  const wrap = document.createElement("div");
  wrap.className = "s3-board";
  wrap.style.gridTemplateColumns = `repeat(${maxRow}, var(--s3-clue)) repeat(${width}, var(--s3-cell))`;
  wrap.style.gridTemplateRows = `repeat(${maxCol}, var(--s3-clue)) repeat(${height}, var(--s3-cell))`;

  const place = (el, col, row) => { el.style.gridColumn = String(col); el.style.gridRow = String(row); wrap.append(el); };

  const colClueEls = colDisp.map(() => []);
  colDisp.forEach((clues, c) => clues.forEach((n, k) => {
    const el = document.createElement("span");
    el.className = "s3-clue";
    el.textContent = String(n);
    place(el, maxRow + c + 1, maxCol - clues.length + k + 1); // bottom-aligned
    colClueEls[c].push(el);
  }));

  const rowClueEls = rowDisp.map(() => []);
  rowDisp.forEach((clues, r) => clues.forEach((n, k) => {
    const el = document.createElement("span");
    el.className = "s3-clue";
    el.textContent = String(n);
    place(el, maxRow - clues.length + k + 1, maxCol + r + 1); // right-aligned
    rowClueEls[r].push(el);
  }));

  const cells = Array.from({ length: height }, () => new Array(width));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const el = document.createElement("span");
      el.className = "s3-cell s3-blank";
      el.dataset.x = String(x);
      el.dataset.y = String(y);
      el.textContent = "·";
      place(el, maxRow + x + 1, maxCol + y + 1);
      cells[y][x] = { el, state: UNKNOWN };
    }
  }

  wrap.addEventListener("mousedown", (e) => {
    const t = e.target.closest(".s3-cell");
    if (!t || t.dataset.x === undefined) return;
    e.preventDefault();
    handlers.onCell(Number(t.dataset.x), Number(t.dataset.y), e.button === 2 || e.shiftKey);
  });
  wrap.addEventListener("contextmenu", (e) => e.preventDefault());

  let lastCursor = null;
  const doneRow = new Array(height).fill(null);
  const doneCol = new Array(width).fill(null);

  function update(board) {
    const marks = board.marks;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const cell = cells[y][x];
        const v = marks[y][x];
        if (cell.state !== v) { cell.state = v; cell.el.textContent = GLYPH[v]; cell.el.className = "s3-cell " + CLASS[v]; }
      }
    }
    const cur = `${board.cursor.x},${board.cursor.y}`;
    if (cur !== lastCursor) {
      if (lastCursor) { const [px, py] = lastCursor.split(",").map(Number); cells[py][px].el.classList.remove("s3-cursor"); }
      cells[board.cursor.y][board.cursor.x].el.classList.add("s3-cursor");
      lastCursor = cur;
    }
    for (let r = 0; r < height; r += 1) {
      const d = lineDone(puzzle, marks, "row", r);
      if (d !== doneRow[r]) { doneRow[r] = d; rowClueEls[r].forEach((e) => e.classList.toggle("s3-done", d)); }
    }
    for (let c = 0; c < width; c += 1) {
      const d = lineDone(puzzle, marks, "col", c);
      if (d !== doneCol[c]) { doneCol[c] = d; colClueEls[c].forEach((e) => e.classList.toggle("s3-done", d)); }
    }
  }

  return { el: wrap, update };
}
