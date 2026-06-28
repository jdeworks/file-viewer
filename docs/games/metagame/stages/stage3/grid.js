// Interactive ASCII nonogram grid (the in-modal game view): column clues stacked above, row clues to
// the left, an H×W playfield of clickable monospace cells. Left-click fills (#), right/shift-click
// marks empty (✕). Returns { el, update(board) }. Updates are GUARDED — only changed cells / cursor /
// clues touch the DOM (the Bit-Foundry per-tick CPU lesson), so a keypress never rerenders the grid.

import { FILLED, COLOR_B, EMPTY, UNKNOWN } from "./nonogram.js";
import { lineDone } from "./board.js";
import { ALIAS_GLYPH } from "./s3aliased.js";

const GLYPH = { [FILLED]: "#", [COLOR_B]: "@", [EMPTY]: "✕", [UNKNOWN]: "·" };
const CLASS = { [FILLED]: "s3-fill", [COLOR_B]: "s3-fill-b", [EMPTY]: "s3-mark", [UNKNOWN]: "s3-blank" };
const marksFilled = (marks, x, y) => marks[y][x] === FILLED || marks[y][x] === COLOR_B;
// Clues are numbers (mono), { len, color } (two-colour), or the ALIAS_GLYPH sentinel (obscured line).
const clueLen = (c) => (typeof c === "object" ? c.len : c);
const clueColor = (c) => (typeof c === "object" ? c.color : 0);

export function buildGrid(puzzle, handlers) {
  const { rowClues, colClues, width, height } = puzzle;
  // Aliased lines (corruption ≥ ALIASED_AT) collapse their whole clue to a single "?" — the player
  // must deduce the line from crossing clues (s3aliased guarantees it stays deducible).
  const aliasRows = new Set((puzzle.aliased && puzzle.aliased.rows) || []);
  const aliasCols = new Set((puzzle.aliased && puzzle.aliased.cols) || []);
  const rowDisp = rowClues.map((c, r) => (aliasRows.has(r) ? [ALIAS_GLYPH] : c.length ? c : [0]));
  const colDisp = colClues.map((c, k) => (aliasCols.has(k) ? [ALIAS_GLYPH] : c.length ? c : [0]));
  const maxRow = Math.max(1, ...rowDisp.map((c) => c.length));
  const maxCol = Math.max(1, ...colDisp.map((c) => c.length));

  const wrap = document.createElement("div");
  wrap.className = "s3-board";
  wrap.style.gridTemplateColumns = `repeat(${maxRow}, var(--s3-clue)) repeat(${width}, var(--s3-cell))`;
  wrap.style.gridTemplateRows = `repeat(${maxCol}, var(--s3-clue)) repeat(${height}, var(--s3-cell))`;

  const place = (el, col, row) => { el.style.gridColumn = String(col); el.style.gridRow = String(row); wrap.append(el); };

  const clueEl = (n) => {
    const el = document.createElement("span");
    el.className = "s3-clue";
    if (n === ALIAS_GLYPH) { el.textContent = ALIAS_GLYPH; el.classList.add("s3-clue-alias"); return el; }
    el.textContent = String(clueLen(n));
    const col = clueColor(n);
    if (col === FILLED) el.classList.add("s3-clue-a");
    else if (col === COLOR_B) el.classList.add("s3-clue-b");
    return el;
  };

  const colClueEls = colDisp.map(() => []);
  colDisp.forEach((clues, c) => clues.forEach((n, k) => {
    const el = clueEl(n);
    place(el, maxRow + c + 1, maxCol - clues.length + k + 1); // bottom-aligned
    colClueEls[c].push(el);
  }));

  const rowClueEls = rowDisp.map(() => []);
  rowDisp.forEach((clues, r) => clues.forEach((n, k) => {
    const el = clueEl(n);
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
    const x = Number(t.dataset.x), y = Number(t.dataset.y);
    // A PLAIN tap (no modifier) defers to the on-screen verb toggle when present (touch path) so a
    // single tap can mark / fill-B / lock. Modified clicks keep the original mouse semantics:
    // mark (✕) on right/shift-click; alt-click lays Color B (two-colour snapshots).
    const modified = e.button === 2 || e.shiftKey || e.altKey;
    if (!modified && handlers.onTap) { handlers.onTap(x, y); return; }
    handlers.onCell(x, y, e.button === 2 || e.shiftKey, e.altKey);
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
    if (cur !== lastCursor && lastCursor) { const [px, py] = lastCursor.split(",").map(Number); cells[py][px].el.classList.remove("s3-cursor"); }
    lastCursor = cur;
    // Re-assert idempotently: a cell whose state changed had its className rebuilt (wiping cursor).
    cells[board.cursor.y][board.cursor.x].el.classList.add("s3-cursor");
    for (let r = 0; r < height; r += 1) {
      const d = lineDone(puzzle, marks, "row", r);
      if (d !== doneRow[r]) { doneRow[r] = d; rowClueEls[r].forEach((e) => e.classList.toggle("s3-done", d)); }
    }
    for (let c = 0; c < width; c += 1) {
      const d = lineDone(puzzle, marks, "col", c);
      if (d !== doneCol[c]) { doneCol[c] = d; colClueEls[c].forEach((e) => e.classList.toggle("s3-done", d)); }
    }
    decorateVolatile(board);
  }

  // Re-assert volatile/locked decoration each update (idempotent) — the state loop above rebuilds a
  // changed cell's className, so these extra classes must be toggled after it (like the cursor class).
  function decorateVolatile(board) {
    if (!board.volatile) return;
    for (const k of board.volatile) {
      const [x, y] = k.split(",").map(Number);
      const el = cells[y][x].el;
      const filled = marksFilled(board.marks, x, y);
      const locked = board.locked && board.locked.has(k);
      el.classList.toggle("s3-locked", filled && locked);
      el.classList.toggle("s3-volatile", filled && !locked);
    }
  }

  // Briefly highlight a list of {x,y} cells (the Parity check flags wrong fills).
  function flashWrong(list, ms = 1400) {
    for (const { x, y } of list) {
      const el = cells[y][x].el;
      el.classList.add("s3-wrong");
      setTimeout(() => el.classList.remove("s3-wrong"), ms);
    }
  }

  return { el: wrap, update, flashWrong };
}
