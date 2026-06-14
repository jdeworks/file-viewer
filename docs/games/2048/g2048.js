// 2048 — the second arcade easter-egg game. A 4×4 sliding-tile puzzle: merge equal tiles to reach
// 2048. Keyboard (arrows / WASD) + touch-swipe. Self-contained DOM grid (no canvas needed); score
// feeds the arcade high-score economy via onScore. Contract: mount(host, { onScore, onExit }).
const SIZE = 4;

export function mount(host, { onScore, onExit } = {}) {
  host.innerHTML =
    '<div class="g2048-wrap">'
    + '<div class="g2048-hud"><span class="g2048-score">Score: 0</span>'
    + '<span class="g2048-hint">Arrows / WASD · Swipe</span></div>'
    + '<div class="g2048-board"></div>'
    + '<div class="g2048-over" hidden><div class="g2048-over-box"><div class="g2048-over-msg"></div>'
    + '<button class="g2048-restart">Play again</button> <button class="g2048-quit">Back</button></div></div>'
    + '</div>';
  const boardEl = host.querySelector('.g2048-board');
  const scoreEl = host.querySelector('.g2048-score');
  const overEl = host.querySelector('.g2048-over');
  const overMsg = host.querySelector('.g2048-over-msg');

  let grid, score, dead, prevGrid;

  function reset() {
    grid = Array.from({ length: SIZE }, () => new Array(SIZE).fill(0));
    score = 0; dead = false; prevGrid = null;
    addTile(); addTile();
    overEl.hidden = true;
    scoreEl.textContent = 'Score: 0';
    draw();
  }

  function empties() {
    const out = [];
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!grid[r][c]) out.push([r, c]);
    return out;
  }
  function addTile() {
    const e = empties();
    if (!e.length) return;
    const [r, c] = e[Math.floor(Math.random() * e.length)];
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

  // Collapse one row to the left, merging equal neighbours once. Returns [newRow, gained, moved].
  function collapse(row) {
    const nums = row.filter((x) => x);
    const out = [];
    let gained = 0;
    for (let i = 0; i < nums.length; i++) {
      if (i + 1 < nums.length && nums[i] === nums[i + 1]) { out.push(nums[i] * 2); gained += nums[i] * 2; i++; }
      else out.push(nums[i]);
    }
    while (out.length < SIZE) out.push(0);
    const moved = out.some((v, i) => v !== row[i]);
    return [out, gained, moved];
  }

  const rotateCW = (g) => g[0].map((_, c) => g.map((row) => row[c]).reverse());
  const rotateCCW = (g) => g[0].map((_, c) => g.map((row) => row[SIZE - 1 - c]));

  // dir: 0 left, 1 up, 2 right, 3 down. Normalize to "left", collapse, rotate back.
  function move(dir) {
    if (dead) return;
    let g = grid;
    for (let i = 0; i < dir; i++) g = rotateCW(g);
    let moved = false, gained = 0;
    g = g.map((row) => { const [nr, gg, mv] = collapse(row); if (mv) moved = true; gained += gg; return nr; });
    for (let i = 0; i < (4 - dir) % 4; i++) g = rotateCW(g);
    if (!moved) return;
    prevGrid = grid.map((r) => [...r]);
    grid = g; score += gained;
    addTile();
    scoreEl.textContent = 'Score: ' + score;
    onScore?.(score);
    draw();
    if (!canMove()) gameOver();
  }

  function canMove() {
    if (empties().length) return true;
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      if (c + 1 < SIZE && grid[r][c] === grid[r][c + 1]) return true;
      if (r + 1 < SIZE && grid[r][c] === grid[r + 1][c]) return true;
    }
    return false;
  }
  function gameOver() { dead = true; overMsg.textContent = 'Game over — score ' + score; overEl.hidden = false; }

  function draw() {
    boardEl.innerHTML = '';
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      const v = grid[r][c];
      const cell = document.createElement('div');
      const isNew = v !== 0 && (!prevGrid || prevGrid[r][c] !== v);
      cell.className = 'g2048-cell' + (v ? ' g2048-v' + v : '') + (isNew ? ' g2048-new' : '');
      cell.textContent = v || '';
      boardEl.appendChild(cell);
    }
  }

  function onKey(e) {
    const k = e.key.toLowerCase();
    const map = { arrowleft: 0, a: 0, arrowup: 1, w: 1, arrowright: 2, d: 2, arrowdown: 3, s: 3 };
    if (!(k in map)) return;
    e.preventDefault();
    move(map[k]);
  }
  let tStart = null;
  function onTouchStart(e) { const t = e.touches[0]; tStart = { x: t.clientX, y: t.clientY }; }
  function onTouchEnd(e) {
    if (!tStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - tStart.x, dy = t.clientY - tStart.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) { tStart = null; return; }
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 2 : 0); else move(dy > 0 ? 3 : 1);
    tStart = null;
  }

  window.addEventListener('keydown', onKey);
  host.addEventListener('touchstart', onTouchStart, { passive: true });
  host.addEventListener('touchend', onTouchEnd, { passive: true });
  host.querySelector('.g2048-restart').addEventListener('click', reset);
  host.querySelector('.g2048-quit').addEventListener('click', () => onExit?.());

  reset();
  return {
    destroy() {
      window.removeEventListener('keydown', onKey);
      host.removeEventListener('touchstart', onTouchStart);
      host.removeEventListener('touchend', onTouchEnd);
      host.innerHTML = '';
    },
    _move: move,   // test seam
  };
}
