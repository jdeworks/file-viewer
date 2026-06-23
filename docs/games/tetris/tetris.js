// Tetris — falling-block puzzle. Self-contained canvas game, keyboard + touch (swipe + on-screen
// pad). Difficulty ESCALATES: gravity speeds up every 10 cleared lines. Scoring RAMPS: line clears
// pay 40/100/300/1200 × (level+1), plus soft/hard-drop bonuses — so deeper, faster play is worth
// disproportionately more. Contract: mount(host, { onScore, onExit }) => { destroy() }.
import { swipe, dpad } from '../controls.js';

const COLS = 10, ROWS = 20, CELL = 22;            // logical board; canvas scales to fit via CSS
const LINE_SCORES = [0, 40, 100, 300, 1200];      // by lines cleared at once (Nintendo scoring)
const LINES_PER_LEVEL = 10;
const dropMs = (lvl) => Math.max(80, 800 - lvl * 65);   // gravity cadence — escalates with level

// Tetrominoes as cells in an N×N box ([row, col]); rotation is computed, not stored.
const PIECES = [
  { n: 4, c: '#4dd0e1', cells: [[1, 0], [1, 1], [1, 2], [1, 3]] },   // I
  { n: 2, c: '#ffd54f', cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },   // O
  { n: 3, c: '#ba68c8', cells: [[0, 1], [1, 0], [1, 1], [1, 2]] },   // T
  { n: 3, c: '#81c784', cells: [[0, 1], [0, 2], [1, 0], [1, 1]] },   // S
  { n: 3, c: '#e57373', cells: [[0, 0], [0, 1], [1, 1], [1, 2]] },   // Z
  { n: 3, c: '#7986cb', cells: [[0, 0], [1, 0], [1, 1], [1, 2]] },   // J
  { n: 3, c: '#ffb74d', cells: [[0, 2], [1, 0], [1, 1], [1, 2]] },   // L
];
const rotateCW = (cells, n) => cells.map(([r, c]) => [c, n - 1 - r]);
const randPiece = () => {
  const p = PIECES[Math.floor(Math.random() * PIECES.length)];
  return { n: p.n, c: p.c, cells: p.cells.map((q) => q.slice()), x: Math.floor((COLS - p.n) / 2), y: 0 };
};

export function mount(host, { onScore, onExit } = {}) {
  host.innerHTML =
    '<div class="tetris-wrap" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:6px">'
    + '<div class="tetris-hud" style="display:flex;gap:16px;font-size:14px;font-weight:600">'
    + '<span class="tetris-score">Score: 0</span><span class="tetris-level">Lv 1</span>'
    + '<span class="tetris-lines">Lines: 0</span></div>'
    + '<div style="position:relative">'
    + '<canvas class="tetris-canvas" width="' + COLS * CELL + '" height="' + ROWS * CELL + '" '
    + 'style="display:block;max-width:100%;height:auto;border-radius:8px;background:#10131a;touch-action:none"></canvas>'
    + '<div class="tetris-over" hidden style="position:absolute;inset:0;display:flex;flex-direction:column;'
    + 'align-items:center;justify-content:center;gap:10px;background:rgba(8,10,15,.78);color:#fff;border-radius:8px">'
    + '<div class="tetris-over-msg" style="font-size:18px;font-weight:700"></div>'
    + '<div><button class="tetris-restart">Play again</button> <button class="tetris-quit">Back</button></div></div>'
    + '</div>'
    + '<div class="tetris-hint" style="font-size:12px;opacity:.7">← → move · ↑ rotate · ↓ soft · Space hard drop · swipe/tap on touch</div>'
    + '</div>';

  const wrap = host.querySelector('.tetris-wrap');
  const canvas = host.querySelector('.tetris-canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = host.querySelector('.tetris-score');
  const levelEl = host.querySelector('.tetris-level');
  const linesEl = host.querySelector('.tetris-lines');
  const overEl = host.querySelector('.tetris-over');
  const overMsg = host.querySelector('.tetris-over-msg');

  let grid, cur, score, lines, level, dead, timer, curMs;

  const abs = (p) => p.cells.map(([r, c]) => [p.y + r, p.x + c]);
  function collides(p) {
    return abs(p).some(([r, c]) => c < 0 || c >= COLS || r >= ROWS || (r >= 0 && grid[r][c]));
  }

  function setSpeed(ms) { if (ms === curMs) return; curMs = ms; if (timer) clearInterval(timer); timer = setInterval(gravity, ms); }

  function reset() {
    grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    cur = randPiece();
    score = 0; lines = 0; level = 0; dead = false;
    overEl.hidden = true;
    syncHud();
    curMs = null;
    if (timer) clearInterval(timer);
    setSpeed(dropMs(0));
    draw();
  }

  function syncHud() {
    scoreEl.textContent = 'Score: ' + score;
    levelEl.textContent = 'Lv ' + (level + 1);
    linesEl.textContent = 'Lines: ' + lines;
  }

  function lock() {
    for (const [r, c] of abs(cur)) { if (r < 0) { return gameOver(); } grid[r][c] = cur.c; }
    // clear full rows
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid[r].every(Boolean)) { grid.splice(r, 1); grid.unshift(Array(COLS).fill(null)); cleared++; r++; }
    }
    if (cleared) {
      score += LINE_SCORES[cleared] * (level + 1);     // RAMP: clear value scales with level
      lines += cleared;
      level = Math.floor(lines / LINES_PER_LEVEL);
      setSpeed(dropMs(level));
      onScore?.(score);
    }
    syncHud();
    cur = randPiece();
    if (collides(cur)) return gameOver();
  }

  function move(dx, dy) {
    if (dead) return false;
    cur.x += dx; cur.y += dy;
    if (collides(cur)) { cur.x -= dx; cur.y -= dy; return false; }
    draw();
    return true;
  }

  function softDrop() {
    if (dead) return;
    if (move(0, 1)) { score += 1; syncHud(); onScore?.(score); }   // small ramp incentive to push down
    else lock();
  }

  function hardDrop() {
    if (dead) return;
    let d = 0;
    while (move(0, 1)) d++;
    score += d * 2; syncHud(); onScore?.(score);
    lock(); draw();
  }

  function rotate() {
    if (dead) return;
    const rc = rotateCW(cur.cells, cur.n);
    const test = { ...cur, cells: rc };
    for (const kick of [0, -1, 1, -2, 2]) {            // simple wall-kick: nudge horizontally
      test.x = cur.x + kick;
      if (!collides(test)) { cur.cells = rc; cur.x = test.x; draw(); return; }
    }
  }

  function gravity() { if (!dead && !move(0, 1)) lock(); }

  function gameOver() {
    dead = true;
    if (timer) clearInterval(timer); timer = null;
    overMsg.textContent = 'Game over — score ' + score;
    overEl.hidden = false;
  }

  function drawCell(r, c, color) {
    if (r < 0) return;
    ctx.fillStyle = color;
    ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
  }
  function draw() {
    ctx.fillStyle = '#10131a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(255,255,255,.04)';
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) ctx.strokeRect(c * CELL, r * CELL, CELL, CELL);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (grid[r][c]) drawCell(r, c, grid[r][c]);
    for (const [r, c] of abs(cur)) drawCell(r, c, cur.c);
  }

  function onKey(e) {
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a') move(-1, 0);
    else if (k === 'arrowright' || k === 'd') move(1, 0);
    else if (k === 'arrowdown' || k === 's') softDrop();
    else if (k === 'arrowup' || k === 'w' || k === 'x') rotate();
    else if (k === ' ') hardDrop();
    else return;
    e.preventDefault();
  }

  const detachSwipe = swipe(canvas, (dir) => {
    if (dir === 'left') move(-1, 0);
    else if (dir === 'right') move(1, 0);
    else if (dir === 'down') hardDrop();
    else if (dir === 'tap' || dir === 'up') rotate();
  });
  const pad = dpad(wrap, [
    { id: 'l', label: '◀', hold: true }, { id: 'rot', label: '⟳' },
    { id: 'r', label: '▶', hold: true }, { id: 'soft', label: '▼', hold: true }, { id: 'drop', label: '⤓' },
  ], (id) => {
    if (id === 'l') move(-1, 0); else if (id === 'r') move(1, 0); else if (id === 'rot') rotate();
    else if (id === 'soft') softDrop(); else if (id === 'drop') hardDrop();
  });

  window.addEventListener('keydown', onKey);
  host.querySelector('.tetris-restart').addEventListener('click', reset);
  host.querySelector('.tetris-quit').addEventListener('click', () => onExit?.());

  // Test/debug hook.
  wrap.__tetris = { state: () => ({ score, lines, level, dead, ms: curMs }), speedAt: (lvl) => dropMs(lvl) };

  reset();

  return {
    destroy() {
      if (timer) clearInterval(timer);
      window.removeEventListener('keydown', onKey);
      detachSwipe(); pad.destroy();
      host.innerHTML = '';
    },
  };
}
